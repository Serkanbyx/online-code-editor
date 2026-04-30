import { useId } from 'react';
import clsx from 'clsx';

export function ToggleSwitch({ checked, onChange, label, description, className }) {
  const inputId = useId();

  return (
    <label
      htmlFor={inputId}
      className={clsx(
        'flex cursor-pointer flex-col gap-3 rounded-xl border border-fg/10 bg-fg/2 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description ? <span className="mt-1 block text-sm text-muted">{description}</span> : null}
      </span>

      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-fg/20 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default ToggleSwitch;
