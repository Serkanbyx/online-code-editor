import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import adminService from '../../api/adminService.js';
import Avatar from '../../components/common/Avatar.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import FormError from '../../components/common/FormError.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import useDebounce from '../../hooks/useDebounce.js';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';
import { showErrorToast, showSuccessToast } from '../../utils/helpers.js';

const PAGE_SIZE = 12;
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'removed', label: 'Removed' },
];
const RESTORE_REMOVED_WARNING =
  'Original content was replaced when removed; restoring will not bring it back.';

function readPage(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readStatus(value) {
  return STATUS_OPTIONS.some((option) => option.value === value) ? value : 'all';
}

function truncateText(value, maxLength = 80) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function getAuthorLabel(author) {
  return author?.displayName || author?.username || 'Unknown author';
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

function HoverTooltip({ text, children }) {
  return (
    <span className="group relative inline-flex max-w-full">
      {children}
      {text ? (
        <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-lg border border-fg/10 bg-bg p-3 text-xs leading-5 text-fg shadow-xl group-hover:block group-focus-within:block">
          {text}
        </span>
      ) : null}
    </span>
  );
}

function AdminCommentsTable({ comments, loading, onModerate, onOpenRemove }) {
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
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="border-b border-fg/10 bg-fg/5 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Snippet</th>
              <th scope="col" className="px-4 py-3">Author</th>
              <th scope="col" className="px-4 py-3">Content</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fg/10">
            {comments.map((comment) => {
              const snippet = comment.snippet;
              const snippetPath = snippet?._id ? `/snippets/${snippet._id}#comment-${comment._id}` : null;
              const author = comment.author;
              const authorPath = author?.username ? `/u/${author.username}` : null;
              const canRestore = comment.status === 'hidden' || comment.status === 'removed';
              const content = comment.content || '';
              const preview = truncateText(content);

              return (
                <tr key={comment._id} className="align-top">
                  <td className="max-w-64 px-4 py-4">
                    {snippetPath ? (
                      <Link to={snippetPath} className="font-semibold text-fg transition-colors hover:text-accent">
                        {snippet.title || 'Untitled snippet'}
                      </Link>
                    ) : (
                      <span className="font-semibold text-muted">Snippet unavailable</span>
                    )}
                    {snippet?.status ? (
                      <p className="mt-1 text-xs text-muted">Snippet status: {snippet.status}</p>
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
                  <td className="max-w-80 px-4 py-4">
                    <HoverTooltip text={content}>
                      <button
                        type="button"
                        className="line-clamp-2 text-left text-sm leading-6 text-fg underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        {preview || '-'}
                      </button>
                    </HoverTooltip>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={comment.status} /></td>
                  <td className="px-4 py-4">
                    <span title={formatAbsoluteDate(comment.createdAt)}>
                      {formatRelativeDate(comment.createdAt) || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      {canRestore ? (
                        <button
                          type="button"
                          onClick={() => onModerate(comment, 'active')}
                          className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onModerate(comment, 'hidden')}
                          className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenRemove(comment)}
                        disabled={comment.status === 'removed'}
                        className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
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

export function AdminCommentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const status = readStatus(searchParams.get('status') ?? 'all');
  const page = readPage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [comments, setComments] = useState([]);
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
      .listComments({
        q: trimmedQuery || undefined,
        status: status === 'all' ? undefined : status,
        page,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (cancelled) return;
        setComments(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
        setTotalPages(Math.max(1, data?.totalPages ?? 1));
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load comments.');
        setError(normalized.message);
        setComments([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlQuery, status, page, retryToken]);

  const hasActiveFilters = useMemo(
    () => Boolean(urlQuery.trim()) || status !== 'all',
    [urlQuery, status],
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

  function replaceComment(nextComment) {
    setComments((previous) =>
      previous.map((comment) => (comment._id === nextComment._id ? { ...comment, ...nextComment } : comment)),
    );
  }

  function updateCommentStatus(id, nextStatus) {
    setComments((previous) =>
      previous.map((comment) => (comment._id === id ? { ...comment, status: nextStatus } : comment)),
    );
  }

  async function handleModerate(comment, nextStatus) {
    const previousStatus = comment.status;
    updateCommentStatus(comment._id, nextStatus);

    try {
      const data = await adminService.moderateComment(comment._id, { status: nextStatus });
      if (data?.comment) replaceComment(data.comment);
      if (previousStatus === 'removed' && nextStatus === 'active') {
        toast(RESTORE_REMOVED_WARNING, { icon: '!' });
      } else {
        showSuccessToast(nextStatus === 'hidden' ? 'Comment hidden.' : 'Comment restored.');
      }
    } catch (apiError) {
      updateCommentStatus(comment._id, previousStatus);
      const normalized = extractApiError(apiError, 'Action failed.');
      showErrorToast(normalized.message);
    }
  }

  async function handleRemoveConfirm() {
    if (!modal?.comment || actionLoading) return;
    const previousStatus = modal.comment.status;

    setActionLoading(true);
    setModalError('');
    updateCommentStatus(modal.comment._id, 'removed');

    try {
      const data = await adminService.moderateComment(modal.comment._id, { status: 'removed' });
      if (data?.comment) replaceComment(data.comment);
      showSuccessToast('Comment removed.');
      setModal(null);
      setModalError('');
    } catch (apiError) {
      updateCommentStatus(modal.comment._id, previousStatus);
      const normalized = extractApiError(apiError, 'Could not remove comment.');
      setModalError(normalized.message);
      showErrorToast(normalized.message);
    } finally {
      setActionLoading(false);
    }
  }

  const modalComment = modal?.comment;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Comments</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Comment moderation</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Review comment content, jump to the parent snippet, and moderate conversation visibility.
        </p>
      </header>

      <section className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search comment content"
              className="w-full rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <Segmented label="Status" options={STATUS_OPTIONS} value={status} onChange={(value) => updateParam('status', value)} />
        </div>
      </section>

      {!loading && !error ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${comments.length} of ${total} comment${total === 1 ? '' : 's'}.`}
        </p>
      ) : null}

      {error ? (
        <EmptyState
          title="Couldn't load comments"
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
        <AdminCommentsTable
          comments={comments}
          loading={loading}
          onModerate={handleModerate}
          onOpenRemove={(comment) => setModal({ type: 'remove', comment })}
        />
      ) : null}

      {!loading && !error && comments.length === 0 ? (
        <EmptyState
          title="No comments found"
          description={hasActiveFilters ? 'Try clearing filters or searching for another comment.' : 'No comments are available yet.'}
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
        title="Remove comment?"
        description="The comment content will be replaced with [removed by moderator]. Restoring later will not recover the original text."
        confirmLabel="Remove comment"
        loading={actionLoading}
        onConfirm={handleRemoveConfirm}
      >
        <div className="grid gap-4">
          <FormError message={modalError} />
          {modalComment?.content ? (
            <p className="rounded-md border border-fg/10 bg-fg/5 p-3 text-sm text-muted">
              {truncateText(modalComment.content, 160)}
            </p>
          ) : null}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default AdminCommentsPage;
