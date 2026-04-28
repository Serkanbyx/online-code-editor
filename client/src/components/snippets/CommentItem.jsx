import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import Avatar from '../common/Avatar.jsx';
import commentService from '../../api/commentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';

const CONTENT_MAX_LENGTH = 1000;
const REPLIES_PAGE_LIMIT = 20;

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={clsx('transition-transform', open && 'rotate-180')}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 17 4 12l5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function AuthorRow({ comment }) {
  const author = comment.author ?? {};
  const profilePath = author.username ? `/u/${author.username}` : null;
  const name = author.displayName || author.username || 'Unknown user';
  const createdAt = comment.createdAt;
  const wasEdited =
    comment.updatedAt && createdAt && new Date(comment.updatedAt).getTime() - new Date(createdAt).getTime() > 1000;

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <Avatar user={author} size="xs" />
      {profilePath ? (
        <Link to={profilePath} className="font-medium text-fg/80 hover:text-accent">
          {name}
        </Link>
      ) : (
        <span className="font-medium text-fg/80">{name}</span>
      )}
      {createdAt ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(createdAt).toISOString()} title={formatAbsoluteDate(createdAt)}>
            {formatRelativeDate(createdAt)}
          </time>
        </>
      ) : null}
      {wasEdited ? (
        <span className="text-[11px] italic text-muted/80" title={formatAbsoluteDate(comment.updatedAt)}>
          (edited)
        </span>
      ) : null}
    </div>
  );
}

function CommentForm({
  initialValue = '',
  onSubmit,
  onCancel,
  submitLabel,
  placeholder = 'Write a reply…',
  autoFocus = false,
  compact = false,
}) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const fieldId = useId();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="sr-only">
        {submitLabel}
      </label>
      <textarea
        ref={textareaRef}
        id={fieldId}
        rows={compact ? 2 : 3}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, CONTENT_MAX_LENGTH))}
        placeholder={placeholder}
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
        <div className="flex items-center gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending…' : submitLabel}
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function CommentItem({
  comment,
  snippetId,
  isReply = false,
  onUpdated,
  onDeleted,
  onReplyAdded,
}) {
  const { user, isAuthenticated } = useAuth();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);

  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesTotalPages, setRepliesTotalPages] = useState(1);

  // Single source of truth for the reply count — keeps the toggle label in sync
  // with adds/deletes and with whatever the server returns from `listReplies`.
  const [replyCount, setReplyCount] = useState(comment.replyCount ?? 0);
  useEffect(() => {
    setReplyCount(comment.replyCount ?? 0);
  }, [comment.replyCount]);

  const author = comment.author ?? {};
  const isOwner = isAuthenticated && user?._id && author._id === user._id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;
  const isRemoved = comment.status === 'removed';

  const loadReplies = useCallback(
    async (page = 1, { append = false } = {}) => {
      setRepliesLoading(true);
      setRepliesError(null);
      try {
        const data = await commentService.listReplies(comment._id, {
          page,
          limit: REPLIES_PAGE_LIMIT,
        });
        const items = Array.isArray(data?.items) ? data.items : [];
        setReplies((previous) => (append ? [...previous, ...items] : items));
        setRepliesPage(data?.page ?? page);
        setRepliesTotalPages(Math.max(1, data?.totalPages ?? 1));
        if (typeof data?.total === 'number') {
          setReplyCount(data.total);
        }
        setRepliesLoaded(true);
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not load replies.');
        setRepliesError(normalized.message);
      } finally {
        setRepliesLoading(false);
      }
    },
    [comment._id],
  );

  function handleToggleReplies() {
    if (!repliesOpen && !repliesLoaded) {
      loadReplies(1).catch(() => {});
    }
    setRepliesOpen((value) => !value);
  }

  async function handleEditSubmit(content) {
    const data = await commentService.update(comment._id, { content });
    onUpdated?.(data?.comment ?? { ...comment, content });
    setEditing(false);
    toast.success('Comment updated');
  }

  async function handleReplySubmit(content) {
    const data = await commentService.create({
      snippet: snippetId,
      parentComment: comment._id,
      content,
    });
    const created = data?.comment;
    if (!created) {
      setReplyOpen(false);
      return;
    }

    // Make sure existing replies show up in the panel; the loaded `total`
    // already reflects the new reply (created before this fetch fires), so we
    // de-duplicate before appending to avoid showing the same comment twice.
    if (!repliesLoaded) {
      await loadReplies(1).catch(() => {});
    } else {
      setReplyCount((previous) => previous + 1);
    }

    setReplies((previous) => {
      if (previous.some((reply) => reply._id === created._id)) return previous;
      return [...previous, created];
    });
    setRepliesOpen(true);
    setReplyOpen(false);
    onReplyAdded?.(created);
    toast.success('Reply posted');
  }

  async function handleDelete() {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Delete this comment? This cannot be undone.');
      if (!confirmed) return;
    }

    setDeleting(true);
    try {
      await commentService.remove(comment._id);
      onDeleted?.(comment);
      toast.success('Comment deleted');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete the comment.');
      toast.error(normalized.message);
    } finally {
      setDeleting(false);
    }
  }

  function handleReplyDeleted(removed) {
    setReplies((previous) => previous.filter((reply) => reply._id !== removed._id));
    setReplyCount((previous) => Math.max(previous - 1, 0));
  }

  function handleReplyUpdated(updated) {
    setReplies((previous) =>
      previous.map((reply) => (reply._id === updated._id ? { ...reply, ...updated } : reply)),
    );
  }

  return (
    <article
      className={clsx(
        'flex flex-col gap-3 rounded-lg border border-fg/10 bg-bg/60 p-3',
        isReply && 'bg-bg/40',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <AuthorRow comment={comment} />
        {!isRemoved && (canEdit || canDelete) ? (
          <div className="flex items-center gap-1 text-xs">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="rounded px-2 py-1 font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
              >
                {editing ? 'Close' : 'Edit'}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded px-2 py-1 font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {editing ? (
        <CommentForm
          initialValue={comment.content}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(false)}
          submitLabel="Save changes"
          autoFocus
          compact
        />
      ) : (
        <p
          className={clsx(
            'whitespace-pre-wrap wrap-break-word text-sm leading-relaxed',
            isRemoved ? 'italic text-muted' : 'text-fg',
          )}
        >
          {comment.content}
        </p>
      )}

      {!isReply && !isRemoved ? (
        <footer className="flex flex-wrap items-center gap-3 text-xs">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setReplyOpen((value) => !value)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
            >
              <ReplyIcon />
              {replyOpen ? 'Cancel reply' : 'Reply'}
            </button>
          ) : null}

          {replyCount > 0 || repliesLoaded ? (
            <button
              type="button"
              onClick={handleToggleReplies}
              aria-expanded={repliesOpen}
              className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-accent transition-colors hover:bg-accent/10"
            >
              <ChevronIcon open={repliesOpen} />
              {repliesOpen
                ? `Hide ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                : `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
            </button>
          ) : null}
        </footer>
      ) : null}

      {!isReply && replyOpen && isAuthenticated ? (
        <div className="rounded-md border border-fg/10 bg-bg/40 p-3">
          <CommentForm
            onSubmit={handleReplySubmit}
            onCancel={() => setReplyOpen(false)}
            submitLabel="Post reply"
            placeholder={`Reply to ${author.displayName || author.username || 'this comment'}…`}
            autoFocus
            compact
          />
        </div>
      ) : null}

      {!isReply && repliesOpen ? (
        <div className="ml-3 flex flex-col gap-2 border-l border-fg/10 pl-4">
          {repliesError ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              <span>{repliesError}</span>
              <button
                type="button"
                onClick={() => loadReplies(1).catch(() => {})}
                className="rounded border border-danger/40 px-2 py-1 font-medium hover:bg-danger/10"
              >
                Retry
              </button>
            </div>
          ) : null}

          {repliesLoading && replies.length === 0 ? (
            <p className="text-xs text-muted" aria-live="polite">
              Loading replies…
            </p>
          ) : null}

          {repliesLoaded && replies.length === 0 && !repliesLoading && !repliesError ? (
            <p className="text-xs text-muted">No replies yet.</p>
          ) : null}

          {replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              snippetId={snippetId}
              isReply
              onUpdated={handleReplyUpdated}
              onDeleted={handleReplyDeleted}
            />
          ))}

          {repliesPage < repliesTotalPages ? (
            <button
              type="button"
              onClick={() => loadReplies(repliesPage + 1, { append: true }).catch(() => {})}
              disabled={repliesLoading}
              className="self-start rounded-md border border-fg/10 bg-bg px-3 py-1 text-xs font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {repliesLoading ? 'Loading…' : `Load more (${Math.max(replyCount - replies.length, 0)})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default CommentItem;
