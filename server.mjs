import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import express from 'express';
import pg from 'pg';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = process.env.PORT || 8080;
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'project-881d951c-b5be-4ecb-b3f';
const LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const MODEL = 'gemini-2.5-flash';

// ── Cloud SQL (Postgres) ────────────────────────────────────────
const DB_HOST = process.env.DB_HOST || '34.139.168.178';
const pool = new pg.Pool({
  host: DB_HOST,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'cafe',
  port: 5432,
  ssl: DB_HOST.startsWith('/cloudsql') ? false : { rejectUnauthorized: false },
  max: 5,
});
const q = (text, params) => pool.query(text, params);

// ── Vertex AI Gemini (auth via the service account / ADC) ───────
const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
async function gen(systemInstruction, prompt, schema) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      temperature: 0.6,
      ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}),
    },
  });
  return res.text || '';
}

// ════════════════════════════════════════════════════════════════
//  THE AGENT TEAM  (each specialist = its own prompt / DB logic;
//  the Concierge orchestrates and they pass structured data A2A)
// ════════════════════════════════════════════════════════════════

// 1) CONCIERGE — a warm, human barista that chats, suggests, and collects
//    the customer's name + table number before placing an order.
async function conciergeAgent(message, history, menu) {
  const schema = {
    type: Type.OBJECT,
    properties: {
      intent: { type: Type.STRING, enum: ['order', 'place_order', 'recommend', 'wait_time', 'menu', 'smalltalk', 'off_topic'] },
      items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.NUMBER } }, required: ['name'] } },
      customerName: { type: Type.STRING },
      tableNo: { type: Type.STRING },
      preferences: { type: Type.STRING },
      reply: { type: Type.STRING },
    },
    required: ['intent', 'reply'],
  };
  const sys = `You are "Brew", a warm, friendly human barista at "Google Popup Builder Café" — a cosy 3-floor café in Hyderabad. Chat like a real person: greet, read the customer's mood, and gently SUGGEST things ("that'd pair lovely with our almond croissant 🥐") — never just dump items on them.

GUARDRAILS: Only café topics (menu, drinks, food, recommendations, waits, events, hours, the vibe). Anything off-topic -> intent "off_topic" + a one-line friendly redirect. Never invent items/prices — use only the MENU. Prices in ₹.

ORDERING RULES (important):
- To PLACE an order you MUST know three things: the item(s), the customer's NAME, and their TABLE NUMBER.
- If the customer wants something but you don't yet have their name/table, set intent="order" and in "reply" warmly confirm the item, add ONE suggestion, and ask for their name + table number in a single friendly line.
- Once you have item(s) AND name AND table AND they've confirmed, set intent="place_order" with items[], customerName, tableNo, and preferences (their taste e.g. "cold, strong").
- Read NAME and TABLE from the whole conversation (e.g. "I'm Rahul at table 5").
Keep replies to 1-3 warm sentences, max one emoji.
MENU: ${JSON.stringify(menu.map(m => ({ name: m.name, price: m.price, tags: m.tags })))}`;
  const convo = (history || []).slice(-8).map(h => `${h.role === 'user' ? 'Customer' : 'Brew'}: ${h.text}`).join('\n');
  const raw = await gen(sys, `${convo ? convo + '\n' : ''}Customer: "${message}"`, schema);
  try { return JSON.parse(raw); } catch { return { intent: 'smalltalk', reply: raw || "Welcome in! What are you in the mood for today? ☕" }; }
}

const newOrderNo = () => 'A-' + (Math.floor(Math.random() * 900) + 100);

// 2) BARISTA — resolve free-text item names to real menu rows (fuzzy)
function baristaResolve(items, menu) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  return (items || []).map((it) => {
    const name = norm(it.name);
    let best = null, score = 0;
    for (const m of menu) {
      const mn = norm(m.name);
      let s = 0;
      if (mn === name) s = 100;
      else if (mn.includes(name) || name.includes(mn)) s = 70;
      else { const w = name.split(' ').filter(x => x.length > 2); s = w.filter(x => mn.includes(x)).length * 20; }
      if (s > score) { score = s; best = m; }
    }
    return best && score >= 20 ? { item: best, qty: Math.max(1, it.quantity || 1) } : null;
  }).filter(Boolean);
}

// 3) INVENTORY — live stock check from Cloud SQL
async function inventoryAgent(ids) {
  if (!ids.length) return {};
  const { rows } = await q('select id, stock_qty, active from menu_items where id = any($1)', [ids]);
  const map = {};
  for (const r of rows) map[r.id] = r.active && r.stock_qty > 0;
  return map;
}

// 4) WAIT-TIME — live ETA from the real order queue in Cloud SQL
async function waitTimeAgent(extraPrep = 0) {
  const { rows } = await q("select count(*)::int as n from orders where status in ('new','preparing')");
  const queue = rows[0]?.n || 0;
  return Math.max(2, extraPrep + Math.ceil(queue * 1.5) + 2);
}

// 5) RECOMMENDER — personalized picks (Gemini over the real menu)
async function recommenderAgent(prefs, menu) {
  const schema = { type: Type.OBJECT, properties: { ids: { type: Type.ARRAY, items: { type: Type.STRING } }, reply: { type: Type.STRING } }, required: ['ids', 'reply'] };
  const sys = `You are the Recommender agent for the café. Pick 1-3 items from the MENU that best match the customer's taste. Return their ids and a warm 1-2 sentence reply naming them with price (₹). Use ONLY the menu.
MENU: ${JSON.stringify(menu.map(m => ({ id: m.id, name: m.name, price: m.price, tags: m.tags, desc: m.description })))}`;
  const raw = await gen(sys, `Customer taste: "${prefs || 'surprise me'}"`, schema);
  try { return JSON.parse(raw); } catch { return { ids: [], reply: raw }; }
}

// 6) SENTIMENT — "Understand the Room" for the owner dashboard
async function sentimentAgent() {
  const { rows } = await q('select customer_name, rating, text from reviews order by created_at desc limit 20');
  if (!rows.length) return { score: 0, mood: 'No reviews yet', summary: '', tips: [] };
  const schema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, mood: { type: Type.STRING }, summary: { type: Type.STRING }, tips: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['score', 'mood', 'summary', 'tips'] };
  const sys = `You are the Sentiment agent ("Understand the Room") for a café owner. Analyze recent reviews. Return: score 0-100 (overall happiness), mood (2-3 words), a one-sentence summary, and up to 3 short actionable tips for staff.`;
  const raw = await gen(sys, `Reviews: ${JSON.stringify(rows)}`, schema);
  try { return JSON.parse(raw); } catch { return { score: 80, mood: 'Positive', summary: raw, tips: [] }; }
}

// ── Orchestrated endpoint: Concierge routes to the specialists ──
async function orchestrate(message, history, userId) {
  const menu = (await q('select * from menu_items where active = true order by id')).rows;
  const trace = [];
  const plan = await conciergeAgent(message, history, menu);
  trace.push({ agent: 'Concierge', intent: plan.intent });

  // Agent PLACES the order once it has item(s) + name + table
  if (plan.intent === 'place_order' && plan.items?.length && plan.customerName && plan.tableNo) {
    const resolved = baristaResolve(plan.items, menu); // Barista
    trace.push({ agent: 'Barista', resolved: resolved.map(r => r.item.name) });
    const stock = await inventoryAgent(resolved.map(r => r.item.id)); // Inventory
    const inStock = resolved.filter(r => stock[r.item.id]);
    const out = resolved.filter(r => !stock[r.item.id]);
    trace.push({ agent: 'Inventory', inStock: inStock.map(r => r.item.name), out: out.map(r => r.item.name) });
    if (!inStock.length) return { reply: `So sorry — those are sold out right now. Want me to suggest something similar? ☕`, trace };
    const maxPrep = inStock.reduce((m, r) => Math.max(m, r.item.prep_mins), 0);
    const eta = await waitTimeAgent(maxPrep); // Wait-Time
    trace.push({ agent: 'WaitTime', eta });
    // Create the real order in Cloud SQL
    const total = inStock.reduce((s, r) => s + r.item.price * r.qty, 0);
    const orderNo = newOrderNo();
    const client = await pool.connect();
    try {
      await client.query('begin');
      const o = (await client.query(
        'insert into orders(customer_name,user_id,order_no,table_no,status,channel,total,eta_mins,interests) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
        [plan.customerName, userId || null, orderNo, plan.tableNo, 'new', 'ai', total, eta, plan.preferences || ''])).rows[0];
      for (const r of inStock) {
        await client.query('insert into order_items(order_id,menu_item_id,name,qty,price) values($1,$2,$3,$4,$5)', [o.id, r.item.id, r.item.name, r.qty, r.item.price]);
        await client.query('update menu_items set stock_qty = greatest(0, stock_qty - $1) where id = $2', [r.qty, r.item.id]);
      }
      await client.query('commit');
    } catch (e) { await client.query('rollback'); } finally { client.release(); }
    let reply = `Order ${orderNo} placed for ${plan.customerName} at ${plan.tableNo}! ${inStock.map(r => `${r.qty}× ${r.item.name}`).join(', ')} — ₹${total}, ready in ~${eta} min. I'll send it right over ☕`;
    if (out.length) reply += ` (Heads up: ${out.map(r => r.item.name).join(', ')} is sold out today.)`;
    return { reply, orderNo, placed: true, highlightIds: inStock.map(r => r.item.id), trace };
  }

  // Wants to order but we still need name/table — Concierge already asked warmly
  if (plan.intent === 'order') {
    const ids = baristaResolve(plan.items || [], menu).map(r => r.item.id);
    return { reply: plan.reply, highlightIds: ids, trace };
  }

  if (plan.intent === 'recommend') {
    const rec = await recommenderAgent(plan.preferences || message, menu); // Recommender
    trace.push({ agent: 'Recommender', ids: rec.ids });
    return { reply: rec.reply, highlightIds: rec.ids, trace };
  }

  if (plan.intent === 'wait_time') {
    const eta = await waitTimeAgent(4);
    trace.push({ agent: 'WaitTime', eta });
    return { reply: `Right now I could have your drink ready in about ~${eta} minutes ⏱️ Want me to start one for you?`, trace };
  }

  return { reply: plan.reply, highlightIds: [], trace };
}

// ════════════════════════════════════════════════════════════════
//  REST API
// ════════════════════════════════════════════════════════════════
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, project: PROJECT, model: MODEL }));

app.get('/api/menu', async (_req, res) => {
  try { res.json((await q('select * from menu_items order by id')).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agent', async (req, res) => {
  try { res.json(await orchestrate(String(req.body?.message || ''), req.body?.history || [], req.body?.userId)); }
  catch (e) { console.error(e); res.status(500).json({ reply: 'My espresso machine hiccuped — try again ☕', actions: [], error: e.message }); }
});

app.get('/api/myorders', async (req, res) => {
  try {
    const { rows } = await q(`select o.*, coalesce(json_agg(json_build_object('name',oi.name,'qty',oi.qty)) filter (where oi.id is not null),'[]') as items
      from orders o left join order_items oi on oi.order_id=o.id where o.user_id=$1 group by o.id order by o.created_at desc limit 30`, [req.query.userId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/myevents', async (req, res) => {
  try { res.json((await q('select * from events where host_email=$1 order by created_at desc', [req.query.email])).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await q('select id, email, name, role from users where email = $1 and password_hash = crypt($2, password_hash)', [email, password]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: rows[0], token: Buffer.from(rows[0].id).toString('base64') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body || {};
    const r = role === 'host' ? 'host' : 'visitor';
    const { rows } = await q('insert into users(email,password_hash,name,role) values($1,crypt($2,gen_salt(\'bf\')),$3,$4) on conflict(email) do nothing returning id,email,name,role', [email, password, name || 'Guest', r]);
    if (!rows.length) return res.status(409).json({ error: 'Email already registered' });
    res.json({ user: rows[0], token: Buffer.from(rows[0].id).toString('base64') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customerName, items, channel, userId, tableNo } = req.body || {};
    const ids = (items || []).map(i => i.itemId);
    const menu = (await q('select * from menu_items where id = any($1)', [ids])).rows;
    const byId = Object.fromEntries(menu.map(m => [m.id, m]));
    let total = 0; let maxPrep = 0;
    for (const it of items) { const m = byId[it.itemId]; if (m) { total += m.price * it.qty; maxPrep = Math.max(maxPrep, m.prep_mins); } }
    const eta = await waitTimeAgent(maxPrep);
    await client.query('begin');
    const o = (await client.query('insert into orders(customer_name,user_id,order_no,table_no,status,channel,total,eta_mins) values($1,$2,$3,$4,$5,$6,$7,$8) returning *', [customerName || 'Guest', userId || null, newOrderNo(), tableNo || null, 'new', channel === 'ai' ? 'ai' : 'manual', total, eta])).rows[0];
    for (const it of items) { const m = byId[it.itemId]; if (m) { await client.query('insert into order_items(order_id,menu_item_id,name,qty,price) values($1,$2,$3,$4,$5)', [o.id, m.id, m.name, it.qty, m.price]); await client.query('update menu_items set stock_qty = greatest(0, stock_qty - $1) where id = $2', [it.qty, m.id]); } }
    await client.query('commit');
    res.json({ order: o, eta });
  } catch (e) { await client.query('rollback'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.get('/api/orders', async (_req, res) => {
  try {
    const { rows } = await q(`select o.*, coalesce(json_agg(json_build_object('name',oi.name,'qty',oi.qty)) filter (where oi.id is not null),'[]') as items
      from orders o left join order_items oi on oi.order_id=o.id group by o.id order by o.created_at desc limit 50`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/orders/:id', async (req, res) => {
  try { res.json((await q('update orders set status=$1 where id=$2 returning *', [req.body.status, req.params.id])).rows[0]); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reviews', async (_req, res) => {
  try { res.json((await q('select * from reviews order by created_at desc limit 30')).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/reviews', async (req, res) => {
  try {
    const { customerName, rating, text } = req.body || {};
    const sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';
    res.json((await q('insert into reviews(customer_name,rating,text,sentiment) values($1,$2,$3,$4) returning *', [customerName || 'Guest', rating || 5, text || '', sentiment])).rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/sentiment', async (_req, res) => {
  try { res.json(await sentimentAgent()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/events', async (_req, res) => {
  try { res.json((await q('select * from events order by created_at desc')).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/events', async (req, res) => {
  try {
    const { hostName, hostEmail, title, eventDate, floor, guests, notes } = req.body || {};
    res.json((await q('insert into events(host_name,host_email,title,event_date,floor,guests,notes) values($1,$2,$3,$4,$5,$6,$7) returning *', [hostName, hostEmail, title, eventDate || null, floor || 3, guests || 20, notes || ''])).rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/events/:id', async (req, res) => {
  try { res.json((await q('update events set status=$1 where id=$2 returning *', [req.body.status, req.params.id])).rows[0]); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/subscribe', async (req, res) => {
  try { await q('insert into subscribers(email) values($1) on conflict(email) do nothing', [req.body?.email]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Static frontend (built dist) + SPA fallback ─────────────────
const DIST = join(process.cwd(), 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webp': 'image/webp' };
app.use(async (req, res) => {
  try {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = normalize(join(DIST, p));
    if (!file.startsWith(DIST)) return res.status(403).end();
    if (p === '/' || !existsSync(file)) file = join(DIST, 'index.html');
    if (!existsSync(file)) return res.status(404).end('build missing');
    const data = await readFile(file);
    res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.status(500).end('err'); }
});

http.createServer(app).listen(PORT, () => console.log(`Google Popup Builder Café serving on :${PORT} (Vertex ${LOCATION}, DB ${DB_HOST})`));
