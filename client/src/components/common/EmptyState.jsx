import clsx from 'clsx';

function DefaultIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className={clsx(
        'mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-fg/15 bg-bg/60 p-8 text-center',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-fg/5 text-muted">
        {icon ?? <DefaultIcon />}
      </span>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export default EmptyState;
