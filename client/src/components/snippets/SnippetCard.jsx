import { Link } from 'react-router-dom';
import clsx from 'clsx';

import Avatar from '../common/Avatar.jsx';
import LanguageBadge from '../common/LanguageBadge.jsx';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';

const PREVIEW_LINE_COUNT = 4;

function buildCodePreview(snippet) {
  if (typeof snippet?.codePreview === 'string' && snippet.codePreview.length > 0) {
    return snippet.codePreview;
  }
  if (typeof snippet?.code === 'string') {
    return snippet.code.split('\n').slice(0, PREVIEW_LINE_COUNT).join('\n');
  }
  return '';
}

function MetaIcon({ children, label, value }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" aria-label={`${label}: ${value}`}>
      <span aria-hidden="true" className="text-muted/80">
        {children}
      </span>
      <span className="font-medium text-fg/80">{value}</span>
    </span>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

export function SnippetCard({ snippet, className }) {
  if (!snippet) return null;

  const author = snippet.author ?? {};
  const authorName = author.displayName || author.username || 'Unknown user';
  const profilePath = author.username ? `/u/${author.username}` : null;
  const detailPath = `/snippets/${snippet._id ?? snippet.id}`;
  const preview = buildCodePreview(snippet);
  const createdAt = snippet.createdAt;

  return (
    <article
      className={clsx(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md focus-within:border-accent/40 focus-within:shadow-md',
        className,
      )}
    >
      <Link
        to={detailPath}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-label={`Open snippet ${snippet.title}`}
      >
        <span className="sr-only">Open snippet</span>
      </Link>

      <header className="flex items-center justify-between gap-3 border-b border-fg/5 px-4 py-3">
        <LanguageBadge language={snippet.language} />
        {createdAt ? (
          <time
            dateTime={new Date(createdAt).toISOString()}
            title={formatAbsoluteDate(createdAt)}
            className="text-xs text-muted"
          >
            {formatRelativeDate(createdAt)}
          </time>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg group-hover:text-accent">
          {snippet.title}
        </h3>
        {snippet.description ? (
          <p className="line-clamp-2 text-sm text-muted">{snippet.description}</p>
        ) : null}

        {preview ? (
          <pre
            aria-hidden="true"
            className="mt-auto max-h-28 overflow-hidden rounded-md border border-fg/5 bg-fg/3 p-3 font-mono text-[12px] leading-relaxed text-fg/80"
          >
            <code>{preview}</code>
          </pre>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-fg/5 bg-bg/40 px-4 py-3">
        {profilePath ? (
          <Link
            to={profilePath}
            onClick={(event) => event.stopPropagation()}
            className="relative z-20 inline-flex items-center gap-2 rounded-md text-xs font-medium text-fg/80 hover:text-accent"
          >
            <Avatar user={author} size="xs" />
            <span className="max-w-[120px] truncate">@{author.username}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
            <Avatar user={author} size="xs" />
            {authorName}
          </span>
        )}

        <div className="flex items-center gap-3">
          <MetaIcon label="Views" value={snippet.views ?? 0}>
            <EyeIcon />
          </MetaIcon>
          <MetaIcon label="Likes" value={snippet.likesCount ?? 0}>
            <HeartIcon />
          </MetaIcon>
          <MetaIcon label="Comments" value={snippet.commentsCount ?? 0}>
            <CommentIcon />
          </MetaIcon>
        </div>
      </footer>
    </article>
  );
}

export default SnippetCard;
