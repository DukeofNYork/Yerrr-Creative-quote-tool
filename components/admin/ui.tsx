'use client';

export const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-ink';
export const btnPrimary =
  'rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-40';
export const btnGhost =
  'rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink';
export const btnDanger =
  'rounded-lg px-3 py-2 text-sm font-medium text-rec transition-opacity hover:opacity-70';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface p-5">{children}</div>;
}

export function PanelHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-medium">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Editable list of strings (deliverables, next steps) */
export function StringListEditor({
  items, onChange, placeholder,
}: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={inputCls}
            value={item}
            placeholder={placeholder}
            onChange={e => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <button className={btnDanger} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
            ✕
          </button>
        </div>
      ))}
      <button className={`${btnGhost} self-start`} onClick={() => onChange([...items, ''])}>
        + Add
      </button>
    </div>
  );
}

/** Checkbox group for scoping (service ids, industry ids) */
export function CheckboxGroup({
  options, selected, onChange,
}: { options: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onChange(on ? selected.filter(id => id !== o.id) : [...selected, o.id])}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              on ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:border-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `item_${Date.now()}`;
}
