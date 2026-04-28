import clsx from 'clsx';

import { getLanguageColor, getLanguageLabel } from '../../utils/languages.js';

export function LanguageBadge({ language, className }) {
  const color = getLanguageColor(language);
  const label = getLanguageLabel(language);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-fg/5 px-2 py-0.5 text-xs font-medium text-fg',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export default LanguageBadge;
