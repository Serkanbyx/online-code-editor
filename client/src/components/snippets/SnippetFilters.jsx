import clsx from 'clsx';

import { TOP_LANGUAGES, getLanguageColor, getLanguageLabel } from '../../utils/languages.js';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'mostLiked', label: 'Most liked' },
  { value: 'mostViewed', label: 'Most viewed' },
];

const ALL_VALUE = 'all';

function ChipButton({ active, onClick, children, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-fg/10 bg-bg/60 text-fg/80 hover:border-fg/20 hover:bg-fg/5',
      )}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {children}
    </button>
  );
}

export function SnippetFilters({
  searchValue,
  onSearchChange,
  language,
  onLanguageChange,
  sort,
  onSortChange,
  className,
}) {
  const activeLanguage = language || ALL_VALUE;

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      <div className="relative">
        <label htmlFor="explore-search" className="sr-only">
          Search snippets
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="explore-search"
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title, description or tag…"
          className="w-full rounded-md border border-fg/10 bg-bg/60 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter by language"
          className="-mx-1 flex flex-wrap gap-2 px-1"
        >
          <ChipButton
            active={activeLanguage === ALL_VALUE}
            onClick={() => onLanguageChange('')}
          >
            All
          </ChipButton>
          {TOP_LANGUAGES.map((lang) => (
            <ChipButton
              key={lang}
              active={activeLanguage === lang}
              onClick={() => onLanguageChange(lang)}
              color={getLanguageColor(lang)}
            >
              {getLanguageLabel(lang)}
            </ChipButton>
          ))}
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <label htmlFor="explore-sort" className="text-xs font-medium uppercase tracking-wide text-muted">
            Sort
          </label>
          <select
            id="explore-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-md border border-fg/10 bg-bg/60 px-3 py-1.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default SnippetFilters;
