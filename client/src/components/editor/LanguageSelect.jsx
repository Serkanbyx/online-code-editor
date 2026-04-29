import { SUPPORTED_LANGUAGES, getLanguageLabel } from '../../utils/languages.js';

export function LanguageSelect({ value, disabled = false, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Language</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-9 rounded-md border border-fg/10 bg-bg px-3 text-sm font-medium text-fg transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="Editor language"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {getLanguageLabel(language)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelect;
