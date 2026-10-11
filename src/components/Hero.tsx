import { useEffect, useRef } from 'react';

function Kinetic({ text }: { text: string }) {
  let i = 0;
  return (
    <>
      {text.split(' ').map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split('').map((ch, ci) => {
            const d = (i++) * 0.03;
            return <span key={ci} className="kchar" style={{ animationDelay: `${d}s` }}>{ch}</span>;
          })}
          {wi < text.split(' ').length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </>
  );
}

function CupSVG() {
  return (
    <svg viewBox="0 0 220 220" className="w-full h-full drop-shadow-xl" aria-hidden="true">
      <defs>
        <linearGradient id="coffee" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6f4322" /><stop offset="1" stopColor="#2b1b12" />
        </linearGradient>
        <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf9" /><stop offset="1" stopColor="#efe3d4" />
        </linearGradient>
      </defs>
      {/* saucer */}
      <ellipse cx="110" cy="188" rx="86" ry="16" fill="var(--border-strong)" opacity="0.5" />
      {/* handle */}
      <path d="M168 96 a34 34 0 0 1 0 60" fill="none" stroke="url(#cupBody)" strokeWidth="14" strokeLinecap="round" />
      <path d="M168 96 a34 34 0 0 1 0 60" fill="none" stroke="var(--border-strong)" strokeWidth="2" opacity="0.5" />
      {/* cup body */}
      <path d="M44 86 h128 l-12 86 a20 20 0 0 1 -20 17 H76 a20 20 0 0 1 -20 -17 Z" fill="url(#cupBody)" stroke="var(--border-strong)" strokeWidth="2" />
      {/* coffee surface */}
      <ellipse cx="108" cy="92" rx="62" ry="13" fill="url(#coffee)" />
      <ellipse cx="108" cy="90" rx="62" ry="12" fill="#3a2416" />
      <ellipse cx="108" cy="90" rx="40" ry="7" fill="#7a5130" opacity="0.6" />
    </svg>
  );
}

export function Hero({ onOrder, onAskBrew }: { onOrder: () => void; onAskBrew: () => void }) {
  const cupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (cupRef.current) cupRef.current.style.transform = `rotate(${y * 0.12}deg)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-16">
      {/* ambient warm glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--caramel) 30%, transparent), transparent 65%)' }} />
      </div>
      {/* floating beans */}
      {[['8%', '22%', 0], ['88%', '30%', 1.2], ['14%', '72%', 2.1], ['82%', '68%', 0.6], ['50%', '12%', 1.6]].map(([l, t, delay], i) => (
        <span key={i} className="float-bean absolute text-2xl sm:text-3xl opacity-40 select-none" style={{ left: l as string, top: t as string, animationDelay: `${delay}s`, ['--r' as any]: `${i * 25}deg` }}>☕</span>
      ))}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass text-xs font-medium text-[var(--muted)] mb-6 fade-up">
            <span className="w-2 h-2 rounded-full bg-[var(--g-green)] pulse-dot" /> Powered by Google Gemini · Builder Pop-Up
          </div>
          <h1 className="display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] text-[var(--text)]">
            <Kinetic text="Your AI" /><br /><span className="text-[var(--caramel)]"><Kinetic text="Café Companion" /></span>
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-xl mx-auto lg:mx-0 mt-6 leading-relaxed fade-up" style={{ animationDelay: '0.2s' }}>
            Meet <b className="text-[var(--text)]">Brew</b> — order by chatting, get drinks picked for your mood, see live wait-times, and skip the queue. A smarter café, powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mt-8 fade-up" style={{ animationDelay: '0.3s' }}>
            <button onClick={onAskBrew} className="btn-primary w-full sm:w-auto px-7 py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2">
              ☕ Ask Brew to order for me
            </button>
            <button onClick={onOrder} className="btn-ghost w-full sm:w-auto px-6 py-3.5 text-sm font-semibold">Browse the menu</button>
          </div>
          <div className="flex items-center justify-center lg:justify-start gap-6 mt-9 text-sm text-[var(--muted)] fade-up" style={{ animationDelay: '0.4s' }}>
            <div><span className="display text-2xl font-bold text-[var(--text)]">12</span> signature drinks</div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div><span className="display text-2xl font-bold text-[var(--text)]">~4<span className="text-base">min</span></span> avg wait</div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div><span className="display text-2xl font-bold text-[var(--text)]">24/7</span> AI barista</div>
          </div>
        </div>

        {/* Animated cup */}
        <div className="relative grid place-items-center min-h-[320px]">
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-[var(--border)] spin-slow opacity-60" />
          <div className="absolute w-56 h-56 rounded-full border border-dashed border-[var(--border-strong)] spin-slow opacity-50" style={{ animationDirection: 'reverse' }} />
          {/* steam */}
          <div className="absolute top-6 flex gap-3 z-10">
            {[0, 1, 2].map((s) => (
              <span key={s} className="steam block w-2 rounded-full bg-[var(--faint)]" style={{ height: 40, animationDelay: `${s * 0.6}s`, opacity: 0.4 }} />
            ))}
          </div>
          <div ref={cupRef} className="w-60 h-60 sm:w-72 sm:h-72 will-change-transform" style={{ transition: 'transform 0.1s linear' }}>
            <CupSVG />
          </div>
        </div>
      </div>
    </section>
  );
}
