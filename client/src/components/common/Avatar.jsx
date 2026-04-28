import clsx from 'clsx';

const SIZE_CLASSES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(user) {
  const source = user?.displayName || user?.username || '?';
  const parts = source.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function Avatar({ user, size = 'md', className }) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const altLabel = user?.displayName || user?.username || 'User';

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={altLabel}
        loading="lazy"
        className={clsx(
          'inline-block shrink-0 overflow-hidden rounded-full border border-fg/10 object-cover',
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-label={altLabel}
      className={clsx(
        'inline-grid shrink-0 place-items-center rounded-full border border-fg/10 bg-fg/5 font-semibold text-fg',
        sizeClass,
        className,
      )}
    >
      <span aria-hidden="true">{getInitials(user)}</span>
    </span>
  );
}

export default Avatar;
