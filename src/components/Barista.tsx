import { useState, useRef, useEffect } from 'react';
import { askBarista, STARTERS, type TraceStep, type ChatTurn } from '../lib/barista';

interface Props {
  onAddToCart?: (itemId: string, qty: number) => void;
  onOrderPlaced?: () => void;
  userId?: string;
  open: boolean;
  setOpen: (o: boolean) => void;
}

interface Msg { role: 'user' | 'bot'; text: string; trace?: TraceStep[]; }

export function Barista({ onOrderPlaced, userId, open, setOpen }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: "Hey, welcome to Google Popup Builder Café! ☕ I'm Brew. What are you in the mood for — something cold, something sweet, or shall I surprise you?" },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [msgs, open, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    const history: ChatTurn[] = msgs.map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setBusy(true);
    try {
      const res = await askBarista(t, history, userId);
      setMsgs((m) => [...m, { role: 'bot', text: res.reply, trace: res.trace }]);
      if (res.placed) onOrderPlaced?.();
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: 'My espresso machine hiccuped — try that again in a sec ☕' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 pl-3 pr-4 py-3 btn-primary shadow-xl group"
        style={{ boxShadow: '0 12px 32px var(--shadow)' }}
        aria-label="Chat with Brew, the AI barista"
      >
        <span className="relative grid place-items-center w-8 h-8 rounded-full bg-[var(--caramel)] text-[#1a120c] text-lg">☕
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--g-green)] border-2 border-[var(--espresso)] pulse-dot" />
        </span>
        <span className="text-sm font-semibold">{open ? 'Close' : 'Ask Brew'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(94vw,400px)] h-[min(72vh,560px)] flex flex-col rounded-3xl overflow-hidden glass fade-up"
          style={{ boxShadow: '0 24px 60px var(--shadow)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] bg-[var(--card)]">
            <div className="grid place-items-center w-10 h-10 rounded-2xl bg-[var(--espresso)] text-[var(--crema)] text-xl">☕</div>
            <div className="min-w-0">
              <div className="font-semibold text-[var(--text)] leading-tight flex items-center gap-2">Brew
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--g-blue)_15%,transparent)] text-[var(--g-blue)]">Gemini</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--g-green)] pulse-dot" /> online · your AI barista</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg)]">
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-[var(--invert-bg)] text-[var(--invert-fg)] rounded-br-md'
                    : 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] rounded-bl-md'
                }`}>{m.text}</div>
                {m.trace && m.trace.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-[82%]">
                    {m.trace.map((s, j) => (
                      <span key={j} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--g-blue)_12%,transparent)] text-[var(--g-blue)] inline-flex items-center gap-1">
                        {j > 0 && <span className="text-[var(--faint)]">→</span>}{s.agent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--card)] border border-[var(--border)] flex gap-1">
                  {[0, 1, 2].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] pulse-dot" style={{ animationDelay: `${d * 0.2}s` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Starters */}
          {msgs.length <= 1 && (
            <div className="px-3 pb-1 flex flex-wrap gap-1.5 bg-[var(--bg)]">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--caramel)] hover:text-[var(--text)] transition-colors">{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 flex items-center gap-2 bg-[var(--bg)] border-t border-[var(--border)]">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Brew anything coffee…"
              className="flex-1 input px-3.5 py-2.5 text-sm" />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Send</button>
          </form>
        </div>
      )}
    </>
  );
}
