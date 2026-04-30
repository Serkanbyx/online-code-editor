import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState.jsx';
import SnippetFilters, { SORT_OPTIONS } from '../../components/snippets/SnippetFilters.jsx';
import SnippetGrid from '../../components/snippets/SnippetGrid.jsx';
import snippetService from '../../api/snippetService.js';
import useDebounce from '../../hooks/useDebounce.js';
import { extractApiError } from '../../utils/apiError.js';
import { TOP_LANGUAGES } from '../../utils/languages.js';

const PAGE_SIZE = 12;
const DEFAULT_SORT = 'newest';
const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

function readPage(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readSort(value) {
  return SORT_VALUES.includes(value) ? value : DEFAULT_SORT;
}

function readLanguage(value) {
  return TOP_LANGUAGES.includes(value) ? value : '';
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') ?? '';
  const language = readLanguage(searchParams.get('language') ?? '');
  const sort = readSort(searchParams.get('sort') ?? DEFAULT_SORT);
  const page = readPage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebounce(searchInput, 300);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  const isInitialSearchSyncRef = useRef(true);

  // Keep input synced when the URL changes from external sources (navbar, back button).
  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  // Push the debounced search input back into the URL. Reset to page 1 whenever
  // the query actually changes so paginated results don't desync from filters.
  useEffect(() => {
    if (isInitialSearchSyncRef.current) {
      isInitialSearchSyncRef.current = false;
      return;
    }

    const trimmed = debouncedSearch.trim();
    const currentQuery = searchParams.get('q') ?? '';
    if (trimmed === currentQuery) return;

    const next = new URLSearchParams(searchParams);
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch]);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value === '' || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      // Any filter / sort change resets pagination back to the first page.
      if (key !== 'page') {
        next.delete('page');
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const trimmedQuery = urlQuery.trim();

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    snippetService
      .getPublic({
        q: trimmedQuery || undefined,
        language: language || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Math.max(1, data?.totalPages ?? 1));
        setTotal(data?.total ?? 0);
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load snippets.');
        setError(normalized.message);
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedQuery, language, sort, page, retryToken]);

  const hasActiveFilters = useMemo(
    () => Boolean(trimmedQuery) || Boolean(language) || sort !== DEFAULT_SORT,
    [trimmedQuery, language, sort],
  );

  function handleResetFilters() {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    updateParam('page', nextPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Explore</p>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Discover Snippets
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Browse public snippets shared by the CodeNest community. Filter by language, sort by what
          matters to you, and open any card to read, fork or comment.
        </p>
      </header>

      <SnippetFilters
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        language={language}
        onLanguageChange={(value) => updateParam('language', value)}
        sort={sort}
        onSortChange={(value) => updateParam('sort', value === DEFAULT_SORT ? '' : value)}
      />

      {!loading && !error && total > 0 ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${items.length} of ${total} snippet${total === 1 ? '' : 's'}.`}
        </p>
      ) : null}

      {error ? (
        <EmptyState
          title="Couldn't load snippets"
          description={error}
          action={
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Try again
            </button>
          }
        />
      ) : (
        <SnippetGrid snippets={items} loading={loading} skeletonCount={PAGE_SIZE} />
      )}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No snippets found"
          description={
            hasActiveFilters
              ? 'Try a different keyword, language or sort. The community might not have shared one yet.'
              : 'Be the first to share a snippet — open a room and save your work as public.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-md border border-fg/15 bg-bg px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-fg/25 hover:bg-fg/5"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : null}

      {!loading && !error && totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-2 flex items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span>
            Prev
          </button>
          <span className="text-sm text-muted">
            Page <span className="font-semibold text-fg">{page}</span> of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export default HomePage;
