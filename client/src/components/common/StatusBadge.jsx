import clsx from 'clsx';

import { STATUS_COLORS } from '../../utils/constants.js';

function formatStatusLabel(status) {
  const normalized = status || 'active';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function StatusBadge({ status = 'active', className }) {
  const normalized = status || 'active';

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        STATUS_COLORS[normalized] ?? 'bg-fg/5 text-muted',
        className,
      )}
    >
      {formatStatusLabel(normalized)}
    </span>
  );
}

export default StatusBadge;
