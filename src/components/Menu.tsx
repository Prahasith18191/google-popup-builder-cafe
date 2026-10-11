import { useState } from 'react';
import { MENU, CATEGORIES } from '../data/menu';

interface Props {
  onAdd: (id: string, qty: number) => void;
}

export function Menu({ onAdd }: Props) {
  const [cat, setCat] = useState<string>('All');
  const items = cat === 'All' ? MENU : MENU.filter((m) => m.category === cat);

  return (
    <section id="menu" className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto scroll-mt-20">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--caramel)] font-semibold mb-2">The Menu</p>
        <h2 className="display text-3xl sm:text-5xl font-bold text-[var(--text)]">Crafted, every cup</h2>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-9">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              cat === c ? 'bg-[var(--espresso)] text-[var(--crema)] border-transparent' : 'bg-[var(--card)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--border-strong)]'
            }`}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((m, idx) => (
          <div key={m.id} className="card card-hover p-5 flex flex-col fade-up" style={{ animationDelay: `${idx * 0.04}s` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] grid place-items-center text-3xl shrink-0">{m.emoji}</div>
              <div className="flex flex-col items-end gap-1">
                <span className="display text-lg font-bold text-[var(--text)] tabular-nums">₹{m.price}</span>
                {m.popular && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--g-yellow)_25%,transparent)] text-[var(--caramel-deep)]">★ Popular</span>}
              </div>
            </div>
            <h3 className="text-base font-bold text-[var(--text)] mt-4">{m.name}</h3>
            <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed flex-1">{m.desc}</p>
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {m.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)]">{t}</span>
              ))}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] ml-auto">~{m.prepMins} min</span>
            </div>
            <button onClick={() => onAdd(m.id, 1)} className="btn-primary w-full mt-4 py-2.5 text-sm font-semibold">Add to cart</button>
          </div>
        ))}
      </div>
    </section>
  );
}
