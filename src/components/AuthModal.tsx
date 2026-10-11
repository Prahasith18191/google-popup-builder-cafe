import { useState } from 'react';
import { api, type User } from '../lib/api';

export function AuthModal({ onClose, onAuth }: { onClose: () => void; onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'visitor' | 'host'>('visitor');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.login(email.trim(), password)
        : await api.register({ email: email.trim(), password, name: name.trim(), role });
      onAuth(res.user);
      onClose();
    } catch (e: any) { setErr(e.message || 'Something went wrong'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative card w-full max-w-sm p-7 fade-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--surface)] text-[var(--muted)]">✕</button>
        <div className="text-3xl mb-2">☕</div>
        <h2 className="display text-2xl font-bold text-[var(--text)]">{mode === 'login' ? 'Welcome back' : 'Join the café'}</h2>
        <p className="text-sm text-[var(--muted)] mt-1 mb-5">{mode === 'login' ? 'Sign in to order, host events, or manage the café.' : 'Create your account to order & host events.'}</p>

        <div className="flex p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm mb-5">
          {(['login', 'register'] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setErr(''); }}
              className={`flex-1 py-2 rounded-full font-medium transition-all ${mode === m ? 'bg-[var(--card)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {err && <div className="mb-3 p-2.5 rounded-xl bg-[#fdecea] text-[#c5221f] text-sm">{err}</div>}

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <>
              <input className="input w-full px-3.5 py-2.5 text-sm" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              <div className="flex gap-2">
                {(['visitor', 'host'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${role === r ? 'bg-[var(--espresso)] text-[var(--crema)] border-transparent' : 'bg-[var(--card)] text-[var(--muted)] border-[var(--border)]'}`}>
                    {r === 'visitor' ? '☕ Café visitor' : '🎉 Event host'}
                  </button>
                ))}
              </div>
            </>
          )}
          <input className="input w-full px-3.5 py-2.5 text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input w-full px-3.5 py-2.5 text-sm" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy} className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-60">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>

        <div className="mt-4 text-[11px] text-[var(--muted)] text-center leading-relaxed">
          Owner demo: <b>owner@googlepopup.cafe</b> / <b>owner123</b><br/>Host demo: <b>host@demo.com</b> / <b>host123</b>
        </div>
      </div>
    </div>
  );
}
