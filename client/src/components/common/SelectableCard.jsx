import clsx from 'clsx';

export function SelectableCard({ selected, onSelect, title, description, className }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        'w-full rounded-2xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30',
        selected
          ? 'border-accent bg-accent/10 text-fg shadow-sm'
          : 'border-fg/10 bg-bg/70 text-fg hover:border-accent/40 hover:bg-fg/5',
        className,
      )}
    >
      <span className="block text-sm font-semibold">{title}</span>
      {description ? <span className="mt-1 block text-sm text-muted">{description}</span> : null}
    </button>
  );
}

export default SelectableCard;
