import clsx from 'clsx';

import { usePreferences } from '../../context/PreferencesContext.jsx';

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function Spinner({ size = 'md', label = 'Loading', className }) {
  const { prefs } = usePreferences();
  const shouldAnimate = prefs.animations !== false;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={clsx('inline-flex items-center justify-center text-accent', className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={clsx(
          'text-current',
          shouldAnimate && 'animate-spin',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        )}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}

export default Spinner;
