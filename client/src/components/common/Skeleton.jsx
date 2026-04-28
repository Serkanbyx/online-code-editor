import clsx from 'clsx';

export function Skeleton({ className, lines = 1 }) {
  if (lines > 1) {
    return (
      <div className={clsx('flex flex-col gap-2', className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <span
            key={index}
            className="block h-3 w-full animate-pulse rounded bg-fg/10 last:w-3/4"
          />
        ))}
      </div>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={clsx('block animate-pulse rounded bg-fg/10', className)}
    />
  );
}

export default Skeleton;
