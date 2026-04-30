import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import LanguageBadge from '../../components/common/LanguageBadge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import snippetService from '../../api/snippetService.js';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';
import { showErrorToast, showSuccessToast } from '../../utils/helpers.js';

const PAGE_SIZE = 10;
const VALID_VISIBILITIES = ['public', 'private', 'forked'];
const TABS = [
  { label: 'All', value: '' },
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Forked', value: 'forked' },
];

const EMPTY_STATES = {
  all: {
    title: 'No snippets yet',
    description: "You haven't saved any snippets yet — open a room and click Save to start.",
    cta: 'Open rooms',
  },
  public: {
    title: 'No public snippets',
    description: "You don't have public snippets yet. Publish a saved snippet when you are ready to share.",
    cta: 'Open rooms',
  },
  private: {
    title: 'No private snippets',
    description: 'Private snippets you save from rooms will appear here.',
    cta: 'Open rooms',
  },
  forked: {
    title: 'No forked snippets',
    description: 'Fork a public snippet to create your own editable copy.',
    cta: 'Explore snippets',
  },
};

function readPage(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readVisibility(value) {
  return VALID_VISIBILITIES.includes(value) ? value : '';
}

function getSnippetId(snippet) {
  return snippet?._id ?? snippet?.id;
}

function getVisibilityMeta(snippet) {
  if (snippet?.forkedFrom) {
    return { label: 'Forked', className: 'border-accent/20 bg-accent/10 text-accent' };
  }

  if (snippet?.isPublic) {
    return { label: 'Public', className: 'border-success/20 bg-success/10 text-success' };
  }

  return { label: 'Private', className: 'border-fg/15 bg-fg/5 text-muted' };
}

function StatItem({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="font-semibold text-fg/80">{value ?? 0}</span>
      {label}
    </span>
  );
}

function SnippetRowSkeleton() {
  return (
    <div className="rounded-2xl border border-fg/10 bg-bg/70 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3 max-w-md" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

function MySnippetRow({ snippet, onDelete }) {
  const snippetId = getSnippetId(snippet);
  const detailPath = `/snippets/${snippetId}`;
  const editPath = `/snippets/${snippetId}/edit`;
  const updatedAt = snippet.updatedAt ?? snippet.createdAt;
  const visibility = getVisibilityMeta(snippet);

  return (
    <article className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm transition-colors hover:border-accent/25">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 truncate text-base font-semibold text-fg">
              <Link to={detailPath} className="hover:text-accent">
                {snippet.title}
              </Link>
            </h2>
            <LanguageBadge language={snippet.language} />
            <span
              className={clsx(
                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                visibility.className,
              )}
            >
              {visibility.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {updatedAt ? (
              <time
                dateTime={new Date(updatedAt).toISOString()}
                title={formatAbsoluteDate(updatedAt)}
                className="text-xs text-muted"
              >
                Updated {formatRelativeDate(updatedAt)}
              </time>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <StatItem label="views" value={snippet.views} />
              <StatItem label="likes" value={snippet.likesCount} />
              <StatItem label="comments" value={snippet.commentsCount} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            to={detailPath}
            className="rounded-md border border-fg/10 px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
          >
            Open
          </Link>
          <Link
            to={editPath}
            className="rounded-md border border-accent/20 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(snippet)}
            className="rounded-md border border-danger/20 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export function MySnippetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const visibility = readVisibility(searchParams.get('visibility'));
  const page = readPage(searchParams.get('page'));

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const [snippetToDelete, setSnippetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeEmptyState = useMemo(
    () => EMPTY_STATES[visibility || 'all'],
    [visibility],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    snippetService
      .getMy({
        visibility: visibility || undefined,
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
        const normalized = extractApiError(apiError, 'Could not load your snippets.');
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
  }, [page, retryToken, visibility]);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value) {
        next.set(key, String(value));
      } else {
        next.delete(key);
      }

      if (key !== 'page') {
        next.delete('page');
      }

      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    updateParam('page', nextPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleConfirmDelete() {
    const snippetId = getSnippetId(snippetToDelete);
    if (!snippetId) return;

    setDeleting(true);
    try {
      await snippetService.remove(snippetId);
      setItems((previous) => previous.filter((snippet) => getSnippetId(snippet) !== snippetId));
      setTotal((previous) => Math.max(previous - 1, 0));
      setSnippetToDelete(null);
      showSuccessToast('Snippet deleted');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete the snippet.');
      showErrorToast(normalized.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Library</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              My Snippets
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Manage the snippets you saved from rooms, review visibility, and open any snippet for
              detail or editing.
            </p>
          </div>
          <Link
            to="/rooms"
            className="inline-flex w-fit items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            New room
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Snippet visibility">
        {TABS.map((tab) => {
          const isActive = visibility === tab.value;

          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => updateParam('visibility', tab.value)}
              className={clsx(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-accent bg-accent text-white'
                  : 'border-fg/10 bg-bg text-muted hover:border-fg/20 hover:bg-fg/5 hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!loading && !error && total > 0 ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${items.length} of ${total} snippet${total === 1 ? '' : 's'}.`}
        </p>
      ) : null}

      {error ? (
        <EmptyState
          title="Couldn't load your snippets"
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
        <div className="flex flex-col gap-3">
          {loading
            ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <SnippetRowSkeleton key={index} />
              ))
            : items.map((snippet) => (
                <MySnippetRow
                  key={getSnippetId(snippet)}
                  snippet={snippet}
                  onDelete={setSnippetToDelete}
                />
              ))}
        </div>
      )}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={activeEmptyState.title}
          description={activeEmptyState.description}
          action={
            <Link
              to={visibility === 'forked' ? '/' : '/rooms'}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              {activeEmptyState.cta}
            </Link>
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

      <ConfirmModal
        open={Boolean(snippetToDelete)}
        onClose={() => {
          if (!deleting) setSnippetToDelete(null);
        }}
        title="Delete snippet?"
        description={
          snippetToDelete
            ? `This permanently deletes "${snippetToDelete.title}" and removes its comments and likes. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete snippet"
        tone="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default MySnippetsPage;
