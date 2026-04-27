import clsx from 'clsx';

const LEVELS = [
  { label: 'Too short', tone: 'bg-fg/15' },
  { label: 'Weak', tone: 'bg-danger' },
  { label: 'Fair', tone: 'bg-amber-500' },
  { label: 'Strong', tone: 'bg-success' },
];

/**
 * Score mirrors the server rule (`authValidator.js`): 8+ chars AND a letter AND
 * a digit. It does not leak the exact regex — only encourages users to meet it.
 */
export function scorePassword(password) {
  if (!password) return 0;

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasLongLength = password.length >= 12;

  if (!hasMinLength) return 0;

  let score = 1;
  if (hasLetter && hasDigit) score = 2;
  if (hasLetter && hasDigit && (hasSymbol || hasLongLength)) score = 3;

  return score;
}

export function PasswordStrengthMeter({ password, id }) {
  const score = scorePassword(password);
  const level = LEVELS[score];
  const isPresent = Boolean(password);

  return (
    <div id={id} aria-live="polite" className="mt-1 flex flex-col gap-1.5">
      <div className="flex gap-1.5" aria-hidden="true">
        {LEVELS.slice(1).map((_, index) => (
          <div
            key={index}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-colors',
              isPresent && index < score ? level.tone : 'bg-fg/10',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        {isPresent
          ? `Strength: ${level.label}`
          : 'Use at least 8 characters with a letter and a number.'}
      </p>
    </div>
  );
}

export default PasswordStrengthMeter;
