import { useState } from 'react';
import { api } from '../lib/api';

export function EventModal({ onClose, defaults }: { onClose: () => void; defaults?: { name?: string; email?: string } }) {
  const [f, setF] = useState({ hostName: defaults?.name || '', hostEmail: defaults?.email || '', title: '', eventDate: '', floor: 3, guests: 20, notes: '' });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await api.addEvent(f); setDone(true); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative card w-full max-w-md p-7 fade-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--surface)] text-[var(--muted)]">✕</button>
        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="display text-2xl font-bold text-[var(--text)]">Request sent!</h2>
            <p className="text-sm text-[var(--muted)] mt-2">The café owner will review your event and get back to you. You'll see it in the owner console instantly.</p>
            <button onClick={onClose} className="btn-primary px-6 py-2.5 text-sm font-semibold mt-5">Done</button>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="display text-2xl font-bold text-[var(--text)]">Host an event with us</h2>
            <p className="text-sm text-[var(--muted)] mt-1 mb-5">Three floors, great coffee. Tell us about your event — the owner approves in their console.</p>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="input px-3.5 py-2.5 text-sm" placeholder="Your name" value={f.hostName} onChange={(e) => set('hostName', e.target.value)} required />
                <input className="input px-3.5 py-2.5 text-sm" type="email" placeholder="Email" value={f.hostEmail} onChange={(e) => set('hostEmail', e.target.value)} required />
              </div>
              <input className="input w-full px-3.5 py-2.5 text-sm" placeholder="Event title (e.g. Builder Meetup)" value={f.title} onChange={(e) => set('title', e.target.value)} required />
              <div className="grid grid-cols-3 gap-2">
                <input className="input px-3 py-2.5 text-sm" type="date" value={f.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
                <select className="input px-3 py-2.5 text-sm" value={f.floor} onChange={(e) => set('floor', +e.target.value)}>{[1, 2, 3].map((n) => <option key={n} value={n}>Floor {n}</option>)}</select>
                <input className="input px-3 py-2.5 text-sm" type="number" min={1} placeholder="Guests" value={f.guests} onChange={(e) => set('guests', +e.target.value)} />
              </div>
              <textarea className="input w-full px-3.5 py-2.5 text-sm resize-none" rows={2} placeholder="Anything we should know?" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
              <button disabled={busy} className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-60">{busy ? 'Sending…' : 'Send request'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
