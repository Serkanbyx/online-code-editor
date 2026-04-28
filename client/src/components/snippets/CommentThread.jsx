import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import Avatar from '../common/Avatar.jsx';
import CommentItem from './CommentItem.jsx';
import commentService from '../../api/commentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractApiError } from '../../utils/apiError.js';

const COMMENTS_PAGE_LIMIT = 12;
const CONTENT_MAX_LENGTH = 1000;

function CommentBubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

function GuestPrompt() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-fg/15 bg-bg/40 px-4 py-3">
      <p className="text-sm text-muted">Sign in to join the conversation.</p>
      <Link
        to="/login"
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
      >
        Login to comment
      </Link>
    </div>
  );
}

function NewCommentForm({ user, onSubmit }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fieldId = useId();

  const trimmed = value.trim();
  const charactersLeft = CONTENT_MAX_LENGTH - value.length;
  const canSubmit = trimmed.length > 0 && trimmed.length <= CONTENT_MAX_LENGTH && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setValue('');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not post your comment.');
      setError(normalized.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-fg/10 bg-bg/60 p-3"
    >
      <div className="flex items-center gap-2">
        <Avatar user={user} size="sm" />
        <label htmlFor={fieldId} className="text-sm font-medium text-fg">
          Add a comment
        </label>
      </div>

      <textarea
        id={fieldId}
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, CONTENT_MAX_LENGTH))}
        placeholder="Share your thoughts on this snippet…"
        maxLength={CONTENT_MAX_LENGTH}
        disabled={submitting}
        aria-invalid={error ? true : undefined}
        className={clsx(
          'w-full resize-y rounded-md border bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted',
          'transition-colors focus:outline-none focus:ring-2 disabled:opacity-60',
          error
            ? 'border-danger/60 focus:border-danger focus:ring-danger/30'
            : 'border-fg/10 focus:border-accent focus:ring-accent/30',
        )}
      />

      <div className="flex items-center justify-between gap-3">
        <span
          className={clsx(
            'text-[11px]',
            charactersLeft < 50 ? 'text-danger' : 'text-muted',
          )}
          aria-live="polite"
        >
          {charactersLeft} characters left
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function CommentThread({ snippetId, initialCount = 0 }) {
  const { user, isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Reset thread state when navigating between snippets without unmounting.
  const previousSnippetIdRef = useRef(snippetId);
  useEffect(() => {
    if (previousSnippetIdRef.current !== snippetId) {
      previousSnippetIdRef.current = snippetId;
      setPage(1);
      setItems([]);
      setError(null);
    }
  }, [snippetId]);

  useEffect(() => {
    if (!snippetId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    commentService
      .listForSnippet(snippetId, { page, limit: COMMENTS_PAGE_LIMIT })
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Math.max(1, data?.totalPages ?? 1));
        setTotal(data?.total ?? 0);
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load comments.');
        setError(normalized.message);
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [snippetId, page, refreshToken]);

  const handleCommentAdded = useCallback(async (content) => {
    const data = await commentService.create({ snippet: snippetId, content });
    const created = data?.comment;
    if (!created) return;

    const newTotal = total + 1;
    const newTotalPages = Math.max(1, Math.ceil(newTotal / COMMENTS_PAGE_LIMIT));

    setTotal(newTotal);
    setTotalPages(newTotalPages);

    // New top-level comments append at the bottom (sorted asc). Jump to the
    // last page so the author sees their comment immediately; otherwise just
    // bump the refresh token to refetch and surface server-authored fields.
    if (page !== newTotalPages) {
      setPage(newTotalPages);
    } else {
      setItems((previous) => [...previous, created]);
    }

    toast.success('Comment posted');
  }, [snippetId, page, total]);

  const handleCommentUpdated = useCallback((updated) => {
    setItems((previous) =>
      previous.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
    );
  }, []);

  const handleCommentDeleted = useCallback((removed) => {
    setItems((previous) => previous.filter((item) => item._id !== removed._id));
    setTotal((previous) => {
      const next = Math.max(previous - 1, 0);
      setTotalPages(Math.max(1, Math.ceil(next / COMMENTS_PAGE_LIMIT)));
      return next;
    });

    // Step back a page if we just emptied the current one (except page 1).
    if (items.length === 1 && page > 1) {
      setPage((previous) => Math.max(previous - 1, 1));
    } else {
      setRefreshToken((token) => token + 1);
    }
  }, [items.length, page]);

  const handleReplyAdded = useCallback(() => {
    // Replies don't change top-level pagination, but a fresh reply count means
    // the snippet header counter (commentsCount) might shift; thread state is
    // already updated optimistically by the child item.
  }, []);

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  }

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 id="comments-heading" className="inline-flex items-center gap-2 text-lg font-semibold text-fg">
          <CommentBubbleIcon />
          Comments
          <span className="text-sm font-normal text-muted">({total})</span>
        </h2>
      </header>

      {isAuthenticated ? (
        <NewCommentForm user={user} onSubmit={handleCommentAdded} />
      ) : (
        <GuestPrompt />
      )}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            className="rounded-md border border-danger/40 bg-bg/60 px-3 py-1.5 text-xs font-medium hover:bg-danger/10"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted" aria-live="polite">
          Loading comments…
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-fg/10 bg-bg/40 px-4 py-6 text-center text-sm text-muted">
          No comments yet. Be the first to start the discussion.
        </p>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((comment) => (
            <li key={comment._id}>
              <CommentItem
                comment={comment}
                snippetId={snippetId}
                onUpdated={handleCommentUpdated}
                onDeleted={handleCommentDeleted}
                onReplyAdded={handleReplyAdded}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && totalPages > 1 ? (
        <nav aria-label="Comments pagination" className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span>
            Prev
          </button>
          <span className="text-xs text-muted">
            Page <span className="font-semibold text-fg">{page}</span> of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      ) : null}
    </section>
  );
}

export default CommentThread;
