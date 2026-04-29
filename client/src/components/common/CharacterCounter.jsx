import clsx from 'clsx';

export function CharacterCounter({ current, max, className }) {
  const isOverLimit = current > max;

  return (
    <p
      aria-live="polite"
      className={clsx(
        'text-xs',
        isOverLimit ? 'font-medium text-danger' : 'text-muted',
        className,
      )}
    >
      {current}/{max}
    </p>
  );
}

export default CharacterCounter;
