import clsx from 'clsx';

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', label = 'Loading', className }) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={clsx('inline-flex items-center justify-center', className)}
    >
      <span
        className={clsx(
          'inline-block animate-spin rounded-full border-solid border-fg/20 border-t-accent',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        )}
      />
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
