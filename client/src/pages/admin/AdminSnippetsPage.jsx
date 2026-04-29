import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import adminService from '../../api/adminService.js';
import Avatar from '../../components/common/Avatar.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import FormError from '../../components/common/FormError.jsx';
import LanguageBadge from '../../components/common/LanguageBadge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import useDebounce from '../../hooks/useDebounce.js';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';
import { SUPPORTED_LANGUAGES, getLanguageLabel } from '../../utils/languages.js';

const PAGE_SIZE = 12;
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'removed', label: 'Removed' },
];

function readPage(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readStatus(value) {
  return STATUS_OPTIONS.some((option) => option.value === value) ? value : 'all';
}

function readLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : 'all';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number.isFinite(value) ? value : 0);
}

function getAuthorLabel(author) {
  return author?.displayName || author?.username || 'Unknown author';
}

function StatusBadge({ status }) {
  const normalized = status || 'active';

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        normalized === 'active' && 'bg-success/10 text-success',
        normalized === 'hidden' && 'bg-accent/10 text-accent',
        normalized === 'removed' && 'bg-danger/10 text-danger',
      )}
    >
      {normalized}
    </span>
  );
}

function BooleanBadge({ value }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
        value ? 'bg-success/10 text-success' : 'bg-fg/5 text-muted',
      )}
    >
      {value ? 'Public' : 'Private'}
    </span>
  );
}

function Segmented({ label, options, value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</legend>
      <div className="inline-flex w-fit rounded-lg border border-fg/10 bg-bg p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              value === option.value ? 'bg-accent text-white' : 'text-muted hover:bg-fg/5 hover:text-fg',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function AdminSnippetsTable({ snippets, loading, onModerate, onOpenRemove, onOpenDelete }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead className="border-b border-fg/10 bg-fg/5 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Author</th>
              <th scope="col" className="px-4 py-3">Language</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Public</th>
              <th scope="col" className="px-4 py-3">Likes</th>
              <th scope="col" className="px-4 py-3">Comments</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fg/10">
            {snippets.map((snippet) => {
              const snippetPath = `/snippets/${snippet._id}`;
              const author = snippet.author;
              const authorPath = author?.username ? `/u/${author.username}` : null;
              const canRestore = snippet.status === 'hidden' || snippet.status === 'removed';

              return (
                <tr key={snippet._id} className="align-top">
                  <td className="max-w-72 px-4 py-4">
                    <Link to={snippetPath} className="font-semibold text-fg transition-colors hover:text-accent">
                      {snippet.title || 'Untitled snippet'}
                    </Link>
                    {snippet.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{snippet.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    {authorPath ? (
                      <Link to={authorPath} className="flex items-center gap-2 text-fg transition-colors hover:text-accent">
                        <Avatar user={author} size="sm" />
                        <span className="max-w-36 truncate font-medium">@{author.username}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 text-muted">
                        <Avatar user={author} size="sm" />
                        <span>{getAuthorLabel(author)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4"><LanguageBadge language={snippet.language} /></td>
                  <td className="px-4 py-4"><StatusBadge status={snippet.status} /></td>
                  <td className="px-4 py-4"><BooleanBadge value={snippet.isPublic} /></td>
                  <td className="px-4 py-4 text-muted">{formatNumber(snippet.likesCount)}</td>
                  <td className="px-4 py-4 text-muted">{formatNumber(snippet.commentsCount)}</td>
                  <td className="px-4 py-4">
                    <span title={formatAbsoluteDate(snippet.createdAt)}>
                      {formatRelativeDate(snippet.createdAt) || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <a
                        href={snippetPath}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5"
                      >
                        Open
                      </a>
                      {canRestore ? (
                        <button
                          type="button"
                          onClick={() => onModerate(snippet, 'active')}
                          className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onModerate(snippet, 'hidden')}
                          className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenRemove(snippet)}
                        disabled={snippet.status === 'removed'}
                        className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDelete(snippet)}
                        className="rounded-md bg-danger px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger/90"
                      >
                        Delete forever
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSnippetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const status = readStatus(searchParams.get('status') ?? 'all');
  const language = readLanguage(searchParams.get('language') ?? 'all');
  const page = readPage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [snippets, setSnippets] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isInitialSearchSyncRef = useRef(true);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (isInitialSearchSyncRef.current) {
      isInitialSearchSyncRef.current = false;
      return;
    }

    const trimmed = debouncedSearch.trim();
    if (trimmed === urlQuery) return;

    const next = new URLSearchParams(searchParams);
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (!value || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      if (key !== 'page') next.delete('page');
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    const trimmedQuery = urlQuery.trim();

    setLoading(true);
    setError('');

    adminService
      .listSnippets({
        q: trimmedQuery || undefined,
        status: status === 'all' ? undefined : status,
        language: language === 'all' ? undefined : language,
        page,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (cancelled) return;
        setSnippets(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
        setTotalPages(Math.max(1, data?.totalPages ?? 1));
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load snippets.');
        setError(normalized.message);
        setSnippets([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlQuery, status, language, page, retryToken]);

  const hasActiveFilters = useMemo(
    () => Boolean(urlQuery.trim()) || status !== 'all' || language !== 'all',
    [urlQuery, status, language],
  );

  function handleResetFilters() {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    updateParam('page', String(nextPage));
  }

  function closeModal() {
    if (actionLoading) return;
    setModal(null);
    setModalError('');
  }

  function updateSnippetStatus(id, nextStatus) {
    setSnippets((previous) =>
      previous.map((snippet) => (snippet._id === id ? { ...snippet, status: nextStatus } : snippet)),
    );
  }

  async function handleModerate(snippet, nextStatus) {
    const previousStatus = snippet.status;
    updateSnippetStatus(snippet._id, nextStatus);

    try {
      await adminService.moderateSnippet(snippet._id, { status: nextStatus });
      toast.success(nextStatus === 'hidden' ? 'Snippet hidden.' : 'Snippet restored.');
    } catch (apiError) {
      updateSnippetStatus(snippet._id, previousStatus);
      const normalized = extractApiError(apiError, 'Action failed.');
      toast.error(normalized.message);
    }
  }

  async function handleRemoveConfirm() {
    if (!modal?.snippet || actionLoading) return;
    const previousStatus = modal.snippet.status;

    setActionLoading(true);
    setModalError('');
    updateSnippetStatus(modal.snippet._id, 'removed');

    try {
      await adminService.moderateSnippet(modal.snippet._id, { status: 'removed' });
      toast.success('Snippet removed.');
      setModal(null);
      setModalError('');
    } catch (apiError) {
      updateSnippetStatus(modal.snippet._id, previousStatus);
      const normalized = extractApiError(apiError, 'Could not remove snippet.');
      setModalError(normalized.message);
      toast.error(normalized.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!modal?.snippet || actionLoading) return;
    setActionLoading(true);
    setModalError('');

    try {
      await adminService.deleteSnippet(modal.snippet._id);
      setSnippets((previous) => previous.filter((snippet) => snippet._id !== modal.snippet._id));
      setTotal((previous) => Math.max(0, previous - 1));
      toast.success('Snippet permanently deleted.');
      setModal(null);
      setModalError('');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete snippet.');
      setModalError(normalized.message);
    } finally {
      setActionLoading(false);
    }
  }

  const modalSnippet = modal?.snippet;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Snippets</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Snippet moderation</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Search public content, review visibility, and moderate snippet status without leaving the admin panel.
        </p>
      </header>

      <section className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_auto_minmax(12rem,14rem)] xl:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search title, description or tags"
              className="w-full rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <Segmented label="Status" options={STATUS_OPTIONS} value={status} onChange={(value) => updateParam('status', value)} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Language</span>
            <select
              value={language}
              onChange={(event) => updateParam('language', event.target.value)}
              className="rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="all">All languages</option>
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {getLanguageLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!loading && !error ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${snippets.length} of ${total} snippet${total === 1 ? '' : 's'}.`}
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
              Retry
            </button>
          }
        />
      ) : null}

      {!error ? (
        <AdminSnippetsTable
          snippets={snippets}
          loading={loading}
          onModerate={handleModerate}
          onOpenRemove={(snippet) => setModal({ type: 'remove', snippet })}
          onOpenDelete={(snippet) => setModal({ type: 'delete', snippet })}
        />
      ) : null}

      {!loading && !error && snippets.length === 0 ? (
        <EmptyState
          title="No snippets found"
          description={hasActiveFilters ? 'Try clearing filters or searching for another snippet.' : 'No snippets are available yet.'}
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
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-muted">
            Page <span className="font-semibold text-fg">{page}</span> of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}

      <ConfirmModal
        open={modal?.type === 'remove'}
        onClose={closeModal}
        title="Remove snippet?"
        description={`${modalSnippet?.title || 'This snippet'} will be hidden from public listings, but admins can recover it later.`}
        confirmLabel="Remove snippet"
        loading={actionLoading}
        onConfirm={handleRemoveConfirm}
      >
        <FormError message={modalError} />
      </ConfirmModal>

      <ConfirmModal
        open={modal?.type === 'delete'}
        onClose={closeModal}
        title="Delete snippet forever?"
        description={`${modalSnippet?.title || 'This snippet'} and its related comments and likes will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete forever"
        tone="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
      >
        <FormError message={modalError} />
      </ConfirmModal>
    </div>
  );
}

export default AdminSnippetsPage;
