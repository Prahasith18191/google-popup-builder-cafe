import { useEffect, useState } from 'react';
import { api, type Order, type EventReq, type Sentiment } from '../lib/api';

const STATUS_FLOW = ['new', 'preparing', 'ready', 'done'];
const STATUS_COLOR: Record<string, string> = { new: 'var(--g-blue)', preparing: 'var(--g-yellow)', ready: 'var(--g-green)', done: 'var(--muted)', cancelled: 'var(--g-red)' };

export function Admin({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'orders' | 'events' | 'sentiment' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventReq[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [sent, setSent] = useState<Sentiment | null>(null);

  const loadOrders = () => api.orders().then(setOrders).catch(() => {});
  const loadEvents = () => api.events().then(setEvents).catch(() => {});
  useEffect(() => { loadOrders(); loadEvents(); api.menu().then(setMenu).catch(() => {}); }, []);
  useEffect(() => { if (tab === 'sentiment' && !sent) api.sentiment().then(setSent).catch(() => {}); }, [tab, sent]);
  useEffect(() => { const t = setInterval(loadOrders, 5000); return () => clearInterval(t); }, []); // live board

  const pendingEvents = events.filter((e) => e.status === 'pending').length;
  const activeOrders = orders.filter((o) => o.status !== 'done' && o.status !== 'cancelled');
  const revenue = orders.filter((o) => o.status === 'done').reduce((s, o) => s + o.total, 0);

  async function advance(o: Order) {
    const i = STATUS_FLOW.indexOf(o.status);
    const next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
    await api.setOrderStatus(o.id, next); loadOrders();
  }

  return (
    <div className="fixed inset-0 z-[55] bg-[var(--bg)] overflow-y-auto">
      <header className="sticky top-0 z-10 glass border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-[var(--espresso)] text-[var(--crema)]">🛠️</span>
            <div><div className="display font-bold text-[var(--text)] leading-tight">Owner Console</div><div className="text-[11px] text-[var(--muted)]">Google Popup Builder Café</div></div>
          </div>
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm font-semibold">← Back to café</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { l: 'Active orders', v: activeOrders.length, c: 'var(--g-blue)' },
            { l: 'Pending events', v: pendingEvents, c: 'var(--g-yellow)' },
            { l: 'Completed today', v: orders.filter(o => o.status === 'done').length, c: 'var(--g-green)' },
            { l: 'Revenue (₹)', v: revenue, c: 'var(--caramel)' },
          ].map((k) => (
            <div key={k.l} className="card p-4">
              <div className="text-xs text-[var(--muted)]">{k.l}</div>
              <div className="display text-3xl font-bold mt-1" style={{ color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] w-fit mb-5 text-sm">
          {(['orders', 'events', 'sentiment', 'menu'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full font-medium capitalize ${tab === t ? 'bg-[var(--card)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>
              {t === 'menu' ? 'Menu & Stock' : t}{t === 'events' && pendingEvents > 0 ? ` (${pendingEvents})` : ''}
            </button>
          ))}
        </div>

        {/* Orders board */}
        {tab === 'orders' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {STATUS_FLOW.map((st) => (
              <div key={st} className="bg-[var(--surface)] rounded-2xl p-3 min-h-[200px]">
                <div className="flex items-center gap-2 mb-2 px-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[st] }} /><span className="text-xs font-semibold capitalize text-[var(--text)]">{st}</span><span className="text-[11px] text-[var(--muted)] ml-auto">{orders.filter(o => o.status === st).length}</span></div>
                <div className="space-y-2">
                  {orders.filter(o => o.status === st).map((o) => (
                    <div key={o.id} className="card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--caramel)]">{o.order_no || '—'}</span>
                        {o.channel === 'ai' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--g-blue)_15%,transparent)] text-[var(--g-blue)]">🤖 AI</span>}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-sm font-semibold text-[var(--text)]">{o.customer_name}</span>
                        {o.table_no && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text)]">{o.table_no}</span>}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-1">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
                      {o.interests && <div className="text-[10px] text-[var(--faint)] mt-0.5 italic">likes: {o.interests}</div>}
                      <div className="flex items-center justify-between mt-2"><span className="text-xs font-bold text-[var(--text)]">₹{o.total}</span>{st !== 'done' && <button onClick={() => advance(o)} className="text-[11px] btn-primary px-2.5 py-1 font-semibold">{st === 'new' ? 'Start' : st === 'preparing' ? 'Ready' : 'Done'}</button>}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events */}
        {tab === 'events' && (
          <div className="space-y-3">
            {events.length === 0 && <p className="text-sm text-[var(--muted)]">No event requests yet.</p>}
            {events.map((e) => (
              <div key={e.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-[var(--text)]">{e.title} <span className="text-xs text-[var(--muted)]">· Floor {e.floor} · {e.guests} guests</span></div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{e.host_name} ({e.host_email}){e.event_date ? ` · ${new Date(e.event_date).toLocaleDateString()}` : ''}</div>
                  {e.notes && <div className="text-xs text-[var(--muted)] mt-1 italic">“{e.notes}”</div>}
                </div>
                {e.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button onClick={() => api.setEventStatus(e.id, 'accepted').then(loadEvents)} className="btn-primary px-4 py-2 text-sm font-semibold">Accept</button>
                    <button onClick={() => api.setEventStatus(e.id, 'declined').then(loadEvents)} className="btn-ghost px-4 py-2 text-sm font-semibold">Decline</button>
                  </div>
                ) : (
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${e.status === 'accepted' ? 'bg-[color-mix(in_srgb,var(--g-green)_18%,transparent)] text-[var(--g-green)]' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>{e.status}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sentiment */}
        {tab === 'sentiment' && (
          <div className="card p-6">
            <div className="text-xs uppercase tracking-wider text-[var(--caramel)] font-semibold mb-1">Sentiment Agent · Understand the Room</div>
            {!sent ? <p className="text-sm text-[var(--muted)]">Analysing reviews…</p> : (
              <>
                <div className="flex items-center gap-4"><div className="display text-5xl font-bold text-[var(--g-green)]">{sent.score}</div><div><div className="font-semibold text-[var(--text)]">{sent.mood}</div><div className="text-sm text-[var(--muted)]">{sent.summary}</div></div></div>
                {sent.tips?.length > 0 && <ul className="mt-4 space-y-1.5">{sent.tips.map((t, i) => <li key={i} className="text-sm text-[var(--text)] flex gap-2"><span className="text-[var(--caramel)]">→</span>{t}</li>)}</ul>}
              </>
            )}
          </div>
        )}

        {/* Menu & Stock */}
        {tab === 'menu' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {menu.map((m) => (
              <div key={m.id} className="card p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--surface)] grid place-items-center text-xl">{m.emoji}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[var(--text)] truncate">{m.name}</div><div className="text-xs text-[var(--muted)]">₹{m.price}</div></div>
                <div className="text-right"><div className={`text-sm font-bold ${m.stock_qty > 10 ? 'text-[var(--g-green)]' : m.stock_qty > 0 ? 'text-[var(--g-yellow)]' : 'text-[var(--g-red)]'}`}>{m.stock_qty}</div><div className="text-[10px] text-[var(--muted)]">in stock</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
