import clsx from 'clsx';

export function RoleBadge({ role = 'user', className }) {
  const normalized = role || 'user';

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        normalized === 'admin' ? 'bg-accent/10 text-accent' : 'bg-fg/5 text-muted',
        className,
      )}
    >
      {normalized}
    </span>
  );
}

export default RoleBadge;
