const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const TIME_UNITS = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

/**
 * Format a date relative to the current time (e.g. "2 hours ago", "in 3 days").
 * Falls back to an empty string when the input cannot be parsed so the UI never
 * shows "Invalid Date" for missing values.
 */
export function formatRelativeDate(input) {
  if (!input) return '';

  const target = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(target.getTime())) return '';

  const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 5) return 'just now';

  for (const { unit, seconds } of TIME_UNITS) {
    if (absSeconds >= seconds) {
      const value = Math.round(diffSeconds / seconds);
      return RELATIVE_FORMATTER.format(value, unit);
    }
  }

  return '';
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatAbsoluteDate(input) {
  if (!input) return '';
  const target = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(target.getTime())) return '';
  return DATE_TIME_FORMATTER.format(target);
}
