import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import Avatar from '../../components/common/Avatar.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import LanguageBadge from '../../components/common/LanguageBadge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import CommentThread from '../../components/snippets/CommentThread.jsx';
import likeService from '../../api/likeService.js';
import snippetService from '../../api/snippetService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.js';
import { extractApiError } from '../../utils/apiError.js';
import { EDITOR_VIEWER_OPTIONS } from '../../utils/constants.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="3" r="2" />
      <circle cx="6" cy="21" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 5v14" />
      <path d="M18 8a4 4 0 0 1-4 4H8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function VisibilityPill({ isPublic }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        isPublic
          ? 'bg-success/10 text-success'
          : 'bg-fg/5 text-muted',
      )}
    >
      <span aria-hidden="true" className={clsx('h-1.5 w-1.5 rounded-full', isPublic ? 'bg-success' : 'bg-muted')} />
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}

function StatPill({ icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" aria-label={`${label}: ${value}`}>
      <span aria-hidden="true">{icon}</span>
      <span className="font-medium text-fg/80">{value}</span>
    </span>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-fg/10 bg-bg/60 p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

function ViewerSkeleton() {
  return <Skeleton className="h-[60vh] w-full" />;
}

export function SnippetDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { prefs, monacoOptions } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [, copyToClipboard] = useCopyToClipboard();

  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [forking, setForking] = useState(false);

  // Snippet load + view counter increment (server-side).
  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    snippetService
      .getById(id)
      .then((data) => {
        if (cancelled) return;
        setSnippet(data?.snippet ?? null);
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load this snippet.');
        setLoadError(normalized);
        setSnippet(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshToken]);

  // Initial liked state — only meaningful for authenticated users; resets when
  // snippet changes (back/forward navigation between detail pages).
  useEffect(() => {
    if (!snippet?._id) return undefined;
    if (!isAuthenticated) {
      setLiked(false);
      return undefined;
    }

    let cancelled = false;
    likeService
      .hasLiked(snippet._id)
      .then((data) => {
        if (cancelled) return;
        setLiked(Boolean(data?.liked));
      })
      .catch(() => {
        if (cancelled) return;
        setLiked(false);
      });

    return () => {
      cancelled = true;
    };
  }, [snippet?._id, isAuthenticated]);

  const author = snippet?.author ?? {};
  const authorName = author.displayName || author.username || 'Unknown user';
  const profilePath = author.username ? `/u/${author.username}` : null;
  const isOwner = Boolean(
    isAuthenticated && user?._id && (author._id === user._id || snippet?.author === user._id),
  );

  const detailUrl = useMemo(() => {
    if (typeof window === 'undefined' || !snippet?._id) return '';
    return `${window.location.origin}/snippets/${snippet._id}`;
  }, [snippet?._id]);

  const editorTheme = prefs?.editorTheme ?? monacoOptions?.theme ?? 'vs-dark';
  const editorOptions = useMemo(
    () => ({
      ...monacoOptions,
      ...EDITOR_VIEWER_OPTIONS,
    }),
    [monacoOptions],
  );

  const handleCopyUrl = useCallback(async () => {
    if (!detailUrl) return;
    const success = await copyToClipboard(detailUrl);
    if (success) {
      toast.success('Link copied');
    } else {
      toast.error('Could not copy link');
    }
  }, [copyToClipboard, detailUrl]);

  const handleCopyCode = useCallback(async () => {
    if (!snippet?.code) {
      toast.error('Nothing to copy');
      return;
    }
    const success = await copyToClipboard(snippet.code);
    if (success) {
      toast.success('Code copied');
    } else {
      toast.error('Could not copy code');
    }
  }, [copyToClipboard, snippet?.code]);

  const handleLike = useCallback(async () => {
    if (!snippet?._id || likeBusy) return;

    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }

    const previousLiked = liked;
    const previousCount = snippet.likesCount ?? 0;
    const optimisticLiked = !previousLiked;
    const optimisticCount = previousLiked ? Math.max(previousCount - 1, 0) : previousCount + 1;

    setLikeBusy(true);
    setLiked(optimisticLiked);
    setSnippet((current) => (current ? { ...current, likesCount: optimisticCount } : current));

    try {
      const data = await likeService.toggle(snippet._id);
      setLiked(Boolean(data?.liked));
      setSnippet((current) =>
        current ? { ...current, likesCount: data?.likesCount ?? optimisticCount } : current,
      );
    } catch (apiError) {
      setLiked(previousLiked);
      setSnippet((current) => (current ? { ...current, likesCount: previousCount } : current));
      const normalized = extractApiError(apiError, 'Could not update like.');
      toast.error(normalized.message);
    } finally {
      setLikeBusy(false);
    }
  }, [snippet, liked, likeBusy, isAuthenticated, navigate, location]);

  const handleFork = useCallback(async () => {
    if (!snippet?._id || forking) return;

    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }

    setForking(true);
    try {
      const data = await snippetService.fork(snippet._id);
      const newId = data?.snippet?._id;
      if (!newId) {
        throw new Error('Fork response missing snippet id');
      }
      toast.success('Forked! Now editing your copy');
      navigate(`/snippets/${newId}/edit`);
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not fork this snippet.');
      toast.error(normalized.message);
    } finally {
      setForking(false);
    }
  }, [snippet?._id, forking, isAuthenticated, navigate, location]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <HeaderSkeleton />
        <ViewerSkeleton />
      </div>
    );
  }

  if (loadError && loadError.status === 404) {
    return (
      <EmptyState
        title="Snippet not found"
        description="It may have been removed by its author or made private."
        action={
          <Link
            to="/"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Back to explore
          </Link>
        }
      />
    );
  }

  if (loadError || !snippet) {
    return (
      <EmptyState
        title="Couldn't load this snippet"
        description={loadError?.message ?? 'Please try again in a moment.'}
        action={
          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Try again
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-fg/10 bg-bg/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <LanguageBadge language={snippet.language} />
          <VisibilityPill isPublic={snippet.isPublic} />
          {snippet.forkedFrom ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <ForkIcon />
              Forked
            </span>
          ) : null}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {snippet.title}
        </h1>

        {snippet.description ? (
          <p className="max-w-3xl text-sm text-muted">{snippet.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fg/5 pt-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {profilePath ? (
              <Link to={profilePath} className="inline-flex items-center gap-2 font-medium text-fg/90 hover:text-accent">
                <Avatar user={author} size="sm" />
                <span>@{author.username}</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 font-medium text-fg/90">
                <Avatar user={author} size="sm" />
                {authorName}
              </span>
            )}

            {snippet.createdAt ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={new Date(snippet.createdAt).toISOString()} title={formatAbsoluteDate(snippet.createdAt)}>
                  {formatRelativeDate(snippet.createdAt)}
                </time>
              </>
            ) : null}

            <span aria-hidden="true">·</span>
            <StatPill icon={<EyeIcon />} label="Views" value={snippet.views ?? 0} />
          </div>

          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
          >
            <LinkIcon />
            Copy URL
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-fg/5 pt-4">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
          >
            <CopyIcon />
            Copy code
          </button>

          <button
            type="button"
            onClick={handleLike}
            disabled={likeBusy}
            aria-pressed={liked}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              liked
                ? 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/15'
                : 'border-fg/10 bg-bg text-fg hover:border-fg/20 hover:bg-fg/5',
              likeBusy && 'cursor-not-allowed opacity-60',
            )}
          >
            <HeartIcon filled={liked} />
            {liked ? 'Liked' : 'Like'}
            <span className="text-xs font-semibold">{snippet.likesCount ?? 0}</span>
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleFork}
              disabled={forking}
              className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ForkIcon />
              {forking ? 'Forking…' : 'Fork'}
            </button>
          ) : (
            <Link
              to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
            >
              <ForkIcon />
              Login to fork
            </Link>
          )}

          {isOwner ? (
            <Link
              to={`/snippets/${snippet._id}/edit`}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Edit snippet
            </Link>
          ) : null}
        </div>
      </header>

      <section
        aria-label={`${snippet.title} source code`}
        className="overflow-hidden rounded-2xl border border-fg/10 bg-bg/60"
      >
        <Editor
          height="60vh"
          theme={editorTheme}
          language={snippet.language}
          value={snippet.code ?? ''}
          options={editorOptions}
          loading={<div className="flex h-[60vh] items-center justify-center text-sm text-muted">Loading editor…</div>}
        />
      </section>

      <CommentThread snippetId={snippet._id} initialCount={snippet.commentsCount ?? 0} />
    </div>
  );
}

export default SnippetDetailPage;
