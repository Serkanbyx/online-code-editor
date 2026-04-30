import clsx from 'clsx';

export function CharacterCounter({ current, max, className }) {
  const isOverLimit = current > max;

  return (
    <small
      aria-live="polite"
      className={clsx(
        'text-xs',
        isOverLimit ? 'font-medium text-danger' : 'text-muted',
        className,
      )}
    >
      {current}/{max}
    </small>
  );
}

export default CharacterCounter;
