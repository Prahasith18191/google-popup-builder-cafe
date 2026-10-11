import { useState, useMemo, useEffect } from 'react';
import { MENU } from './data/menu';
import { Hero } from './components/Hero';
import { Menu } from './components/Menu';
import { Barista } from './components/Barista';
import { AuthModal } from './components/AuthModal';
import { Admin } from './components/Admin';
import { EventModal } from './components/EventModal';
import { api, type User } from './lib/api';

const FEATURES = [
  { icon: '🗣️', title: 'Smarter Ordering', desc: 'Chat your order in plain language — our agent team understands taste and adds it to your cart.', color: 'var(--g-blue)' },
  { icon: '⏱️', title: 'Better Waits', desc: 'Live prep-time from the real order queue so you know exactly when your cup is ready.', color: 'var(--g-red)' },
  { icon: '✨', title: 'Discovery', desc: 'Personal drink & snack picks tuned to your taste — sweet, strong, cold, vegan.', color: 'var(--g-green)' },
  { icon: '🤝', title: 'Host Events', desc: 'Three floors for your meetup — request a date, the owner approves in one tap.', color: 'var(--caramel)' },
  { icon: '📊', title: 'Understand the Room', desc: 'Live review sentiment helps the café team respond and improve in real time.', color: 'var(--g-yellow)' },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('brew_theme', theme); } catch {} }, [theme]);
  return (
    <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme"
      className="w-9 h-9 grid place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--border-strong)] transition-colors">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

export default function App() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [baristaOpen, setBaristaOpen] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [placed, setPlaced] = useState<{ eta: number; total: number } | null>(null);
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('cafe_user') || 'null'); } catch { return null; } });
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [subEmail, setSubEmail] = useState(''); const [subbed, setSubbed] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);

  useEffect(() => { try { localStorage.setItem('cafe_user', JSON.stringify(user)); } catch {} }, [user]);

  const logout = () => { setUser(null); setShowAdmin(false); setShowAccount(false); };
  const openAccount = () => {
    if (!user) return;
    setShowAccount(true);
    if (user.role === 'host') api.myEvents(user.email).then(setMyEvents).catch(() => {});
    else api.myOrders(user.id).then(setMyOrders).catch(() => {});
  };

  const addToCart = (id: string, qty = 1, ai = false) => {
    if (!MENU.some((m) => m.id === id)) return;
    if (ai) setAiAssisted(true);
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + qty }));
  };
  const setQty = (id: string, qty: number) => setCart((c) => { const n = { ...c }; if (qty <= 0) delete n[id]; else n[id] = qty; return n; });

  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ item: MENU.find((m) => m.id === id)!, qty })).filter((l) => l.item), [cart]);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const scrollToMenu = () => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });

  async function placeOrder() {
    try {
      const res = await api.placeOrder(user?.name || 'Guest', lines.map((l) => ({ itemId: l.item.id, qty: l.qty })), aiAssisted ? 'ai' : 'manual', user?.id);
      setPlaced({ eta: res.eta, total }); setCart({}); setAiAssisted(false); setCartOpen(false);
    } catch { setPlaced({ eta: 5, total }); setCart({}); setCartOpen(false); }
  }

  async function subscribe(e: React.FormEvent) { e.preventDefault(); try { await api.subscribe(subEmail); } catch {} setSubbed(true); setSubEmail(''); }

  if (showAdmin && user?.role === 'owner') return <Admin onClose={() => setShowAdmin(false)} />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-[var(--border)]" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-[var(--espresso)] text-[var(--crema)] text-lg">☕</span>
            <div className="leading-tight"><div className="display text-base font-bold text-[var(--text)]">Google Popup Builder</div><div className="text-[10px] text-[var(--muted)] -mt-0.5">Café · Hyderabad</div></div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button onClick={scrollToMenu} className="px-3 py-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]">Menu</button>
            <a href="#how" className="px-3 py-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]">How it works</a>
            <button onClick={() => setShowEvent(true)} className="px-3 py-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]">Host an event</button>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user?.role === 'owner' && <button onClick={() => setShowAdmin(true)} className="btn-ghost px-3 py-2 text-sm font-semibold">🛠️ Console</button>}
            {user ? (
              <>
                <button onClick={openAccount} className="hidden sm:flex items-center gap-2 btn-ghost px-3 py-2 text-sm" title="My account"><span className="w-6 h-6 rounded-full bg-[var(--espresso)] text-[var(--crema)] grid place-items-center text-xs">{user.name[0]}</span>{user.name.split(' ')[0]}</button>
                <button onClick={logout} className="btn-ghost px-3 py-2 text-sm font-semibold">Log out</button>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)} className="btn-ghost px-3 py-2 text-sm font-semibold">Sign in</button>
            )}
            <button onClick={() => setCartOpen(true)} className="relative btn-primary px-4 py-2 text-sm font-semibold">Cart{count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center text-[11px] rounded-full bg-[var(--g-red)] text-white">{count}</span>}</button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Hero onOrder={scrollToMenu} onAskBrew={() => setBaristaOpen(true)} />

        <section id="how" className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto scroll-mt-20">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--caramel)] font-semibold mb-2">A team of AI agents</p>
            <h2 className="display text-3xl sm:text-5xl font-bold text-[var(--text)]">A café that thinks with you</h2>
            <p className="text-[var(--muted)] mt-3 max-w-xl mx-auto">Six Gemini agents — Concierge, Barista, Recommender, Wait-Time, Inventory & Sentiment — work together behind every order.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="card card-hover p-6 fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="w-12 h-12 rounded-2xl grid place-items-center text-2xl mb-4" style={{ background: `color-mix(in srgb, ${f.color} 15%, transparent)` }}>{f.icon}</div>
                <h3 className="text-lg font-bold text-[var(--text)]">{f.title}</h3>
                <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
            <div className="card p-6 flex flex-col justify-center bg-[var(--espresso)] text-[var(--crema)] fade-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-2xl mb-2">☕</div>
              <h3 className="display text-xl font-bold">Order with AI, end to end.</h3>
              <p className="text-sm opacity-80 mt-1.5">Tap “Ask Brew” — watch the agents check stock & wait-time live.</p>
              <button onClick={() => setBaristaOpen(true)} className="mt-4 self-start px-4 py-2 rounded-full bg-[var(--crema)] text-[var(--espresso)] text-sm font-semibold">Try the agents</button>
            </div>
          </div>
        </section>

        <Menu onAdd={(id) => addToCart(id, 1)} />

        {/* Host-event band */}
        <section className="px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
          <div className="card p-8 sm:p-10 text-center bg-gradient-to-br from-[var(--surface)] to-[var(--card)]">
            <h2 className="display text-2xl sm:text-4xl font-bold text-[var(--text)]">Three floors. Your event.</h2>
            <p className="text-[var(--muted)] mt-2 max-w-lg mx-auto">Meetups, launches, workshops — host it at Google Popup Builder Café. Send a request; the owner approves in their console.</p>
            <button onClick={() => setShowEvent(true)} className="btn-primary px-7 py-3 text-sm font-semibold mt-5">🎉 Request an event</button>
          </div>
        </section>

        {/* Newsletter */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-2xl mx-auto text-center">
          <h2 className="display text-2xl font-bold text-[var(--text)]">Fresh drops, in your inbox</h2>
          <p className="text-sm text-[var(--muted)] mt-1.5 mb-5">New seasonal menus & events. No spam.</p>
          {subbed ? <div className="text-[var(--g-green)] font-semibold">✅ You're subscribed — see you at the café!</div> : (
            <form onSubmit={subscribe} className="flex gap-2 max-w-md mx-auto"><input className="input flex-1 px-4 py-3 text-sm" type="email" placeholder="you@email.com" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required /><button className="btn-primary px-6 py-3 text-sm font-semibold">Subscribe</button></form>
          )}
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-10 px-4 text-center text-sm text-[var(--muted)]">
        <div className="display text-lg font-bold text-[var(--text)] mb-1">Google Popup Builder Café ☕</div>
        Hyderabad · 3 floors · Powered by a team of Gemini agents on Cloud Run + Cloud SQL
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[min(92vw,400px)] h-full bg-[var(--bg)] border-l border-[var(--border)] flex flex-col fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]"><h3 className="display text-xl font-bold text-[var(--text)]">Your order</h3><button onClick={() => setCartOpen(false)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--surface)] text-[var(--muted)]">✕</button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {lines.length === 0 && <p className="text-sm text-[var(--muted)] text-center mt-10">Your cart is empty. Ask Brew for a recommendation ☕</p>}
              {lines.map((l) => (
                <div key={l.item.id} className="card p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[var(--surface)] grid place-items-center text-xl">{l.item.emoji}</div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[var(--text)] truncate">{l.item.name}</div><div className="text-xs text-[var(--muted)]">₹{l.item.price}</div></div>
                  <div className="flex items-center gap-1.5"><button onClick={() => setQty(l.item.id, l.qty - 1)} className="w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--text)]">−</button><span className="w-6 text-center text-sm tabular-nums">{l.qty}</span><button onClick={() => setQty(l.item.id, l.qty + 1)} className="w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--text)]">+</button></div>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="p-5 border-t border-[var(--border)] space-y-3">
                <div className="flex justify-between text-lg"><span className="font-semibold text-[var(--text)]">Total</span><span className="display font-bold text-[var(--text)]">₹{total}</span></div>
                <button onClick={placeOrder} className="btn-primary w-full py-3 text-sm font-semibold">Place order{aiAssisted ? ' (AI-assisted)' : ''}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {placed && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 card px-5 py-4 flex items-center gap-3 fade-up" style={{ boxShadow: '0 16px 40px var(--shadow)' }}>
          <span className="text-2xl">✅</span>
          <div><div className="text-sm font-semibold text-[var(--text)]">Order placed! ₹{placed.total}</div><div className="text-xs text-[var(--muted)]">Ready in ~{placed.eta} min — tracked live in the owner console ☕</div></div>
          <button onClick={() => setPlaced(null)} className="ml-2 text-[var(--muted)]">✕</button>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={setUser} />}
      {showEvent && <EventModal onClose={() => setShowEvent(false)} defaults={{ name: user?.name, email: user?.email }} />}

      {/* Account drawer: my orders (visitor/owner) or my event invites (host) */}
      {showAccount && user && (
        <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setShowAccount(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[min(92vw,420px)] h-full bg-[var(--bg)] border-l border-[var(--border)] flex flex-col fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div><div className="display text-xl font-bold text-[var(--text)]">Hi, {user.name.split(' ')[0]} 👋</div><div className="text-[11px] text-[var(--muted)]">{user.email} · {user.role}</div></div>
              <button onClick={() => setShowAccount(false)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--surface)] text-[var(--muted)]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {user.role === 'host' ? (
                <>
                  <h3 className="text-sm font-bold text-[var(--text)]">My event requests</h3>
                  {myEvents.length === 0 && <p className="text-sm text-[var(--muted)]">No requests yet. Use “Host an event”.</p>}
                  {myEvents.map((e) => (
                    <div key={e.id} className="card p-4">
                      <div className="flex items-center justify-between"><span className="font-semibold text-[var(--text)]">{e.title}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${e.status === 'accepted' ? 'bg-[color-mix(in_srgb,var(--g-green)_18%,transparent)] text-[var(--g-green)]' : e.status === 'declined' ? 'bg-[color-mix(in_srgb,var(--g-red)_15%,transparent)] text-[var(--g-red)]' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>{e.status}</span></div>
                      <div className="text-xs text-[var(--muted)] mt-0.5">Floor {e.floor} · {e.guests} guests{e.event_date ? ` · ${new Date(e.event_date).toLocaleDateString()}` : ''}</div>
                      {e.status === 'accepted' && <div className="mt-2 p-2.5 rounded-xl bg-[color-mix(in_srgb,var(--g-green)_12%,transparent)] text-[var(--g-green)] text-sm font-medium">🎉 You're confirmed! The café approved your event — see you on all 3 floors.</div>}
                      {e.status === 'pending' && <div className="mt-2 text-xs text-[var(--muted)] italic">Waiting for the owner to approve…</div>}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-[var(--text)]">My orders</h3>
                  {myOrders.length === 0 && <p className="text-sm text-[var(--muted)]">No orders yet. Ask Brew to order for you ☕</p>}
                  {myOrders.map((o) => (
                    <div key={o.id} className="card p-4">
                      <div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--caramel)]">{o.order_no || '—'}</span><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text)] capitalize">{o.status}</span></div>
                      <div className="text-sm text-[var(--text)] mt-1">{o.items.map((i: any) => `${i.qty}× ${i.name}`).join(', ')}</div>
                      <div className="text-xs text-[var(--muted)] mt-0.5">₹{o.total}{o.table_no ? ` · ${o.table_no}` : ''} · ready ~{o.eta_mins} min</div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="p-5 border-t border-[var(--border)]"><button onClick={logout} className="btn-ghost w-full py-2.5 text-sm font-semibold">Log out</button></div>
          </div>
        </div>
      )}

      <Barista userId={user?.id} onOrderPlaced={() => user && api.myOrders(user.id).then(setMyOrders).catch(() => {})} open={baristaOpen} setOpen={setBaristaOpen} />
    </div>
  );
}
