import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import profileService from '../../api/profileService.js';
import Avatar from '../../components/common/Avatar.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import SnippetGrid from '../../components/snippets/SnippetGrid.jsx';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';

const PAGE_SIZE = 9;
const DEFAULT_TAB = 'snippets';
const TABS = [
  { value: 'snippets', label: 'Snippets' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
];

function readPage(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readTab(value) {
  return TABS.some((tab) => tab.value === value) ? value : DEFAULT_TAB;
}

function getSnippetId(snippet) {
  return snippet?._id ?? snippet?.id;
}

function ProfileHeaderSkeleton() {
  return (
    <section className="rounded-3xl border border-fg/10 bg-bg/70 p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </section>
  );
}

function ListSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-fg/10 bg-bg/70 p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceholderButton({ children }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-fg/10 bg-fg/5 px-4 py-2 text-sm font-medium text-muted"
    >
      {children}
    </button>
  );
}

function LikeRow({ like }) {
  const snippet = like?.snippet;
  if (!snippet) return null;

  const snippetId = getSnippetId(snippet);
  const likedAt = like.createdAt;

  return (
    <article className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm transition-colors hover:border-accent/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {likedAt ? (
            <time
              dateTime={new Date(likedAt).toISOString()}
              title={formatAbsoluteDate(likedAt)}
              className="text-xs text-muted"
            >
              Liked {formatRelativeDate(likedAt)}
            </time>
          ) : null}
          <h3 className="mt-1 truncate text-base font-semibold text-fg">
            <Link to={`/snippets/${snippetId}`} className="hover:text-accent">
              {snippet.title}
            </Link>
          </h3>
          {snippet.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{snippet.description}</p>
          ) : null}
        </div>
        <Link
          to={`/snippets/${snippetId}`}
          className="inline-flex w-fit items-center justify-center rounded-md border border-fg/10 px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
        >
          Open
        </Link>
      </div>
    </article>
  );
}

function CommentRow({ comment }) {
  const snippet = comment?.snippet;
  const snippetId = getSnippetId(snippet);
  const createdAt = comment?.createdAt;

  return (
    <article className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm transition-colors hover:border-accent/25">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {createdAt ? (
            <time dateTime={new Date(createdAt).toISOString()} title={formatAbsoluteDate(createdAt)}>
              Commented {formatRelativeDate(createdAt)}
            </time>
          ) : null}
          {snippet && snippetId ? (
            <Link to={`/snippets/${snippetId}`} className="font-medium text-accent hover:text-accent/80">
              {snippet.title}
            </Link>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-fg/90">
          {comment?.content}
        </p>
      </div>
    </article>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-2 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
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
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1.5 rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}

export function ProfilePage() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = readTab(searchParams.get('tab'));
  const page = readPage(searchParams.get('page'));

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(null);
  const [isPrivacyBlocked, setIsPrivacyBlocked] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const activeTabLabel = useMemo(
    () => TABS.find((tab) => tab.value === activeTab)?.label ?? 'Snippets',
    [activeTab],
  );

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    profileService
      .getPublic(username)
      .then((data) => {
        if (cancelled) return;
        setProfile(data?.user ?? null);
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load this profile.');
        setProfileError(normalized.message);
        setProfile(null);
      })
      .finally(() => {
        if (cancelled) return;
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, retryToken]);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    const requestMap = {
      snippets: profileService.getSnippets,
      likes: profileService.getLikes,
      comments: profileService.getComments,
    };

    setContentLoading(true);
    setContentError(null);
    setIsPrivacyBlocked(false);

    requestMap[activeTab](username, { page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
        setTotalPages(Math.max(1, data?.totalPages ?? 1));
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, `Could not load ${activeTabLabel.toLowerCase()}.`);
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setIsPrivacyBlocked(normalized.status === 403);
        setContentError(normalized.status === 403 ? null : normalized.message);
      })
      .finally(() => {
        if (cancelled) return;
        setContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, activeTabLabel, page, retryToken, username]);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value === '' || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, String(value));
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

  if (profileLoading) {
    return (
      <div className="flex flex-col gap-8">
        <ProfileHeaderSkeleton />
        <SnippetGrid loading skeletonCount={PAGE_SIZE} />
      </div>
    );
  }

  if (profileError) {
    return (
      <EmptyState
        title="Profile unavailable"
        description={profileError}
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
    );
  }

  const displayName = profile?.displayName || profile?.username || 'User';
  const joinedAt = profile?.createdAt;
  const privateContentName = activeTab === 'likes' ? 'likes' : 'comments';

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl border border-fg/10 bg-bg/70 p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar user={profile} size="lg" className="h-20 w-20 text-2xl" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Public Profile
              </p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {profile?.username ? <span>@{profile.username}</span> : null}
                {profile?.email ? (
                  <a href={`mailto:${profile.email}`} className="hover:text-accent">
                    {profile.email}
                  </a>
                ) : null}
                {joinedAt ? (
                  <time dateTime={new Date(joinedAt).toISOString()} title={formatAbsoluteDate(joinedAt)}>
                    Joined {formatAbsoluteDate(joinedAt)}
                  </time>
                ) : null}
              </div>
              {profile?.bio ? (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap wrap-break-word text-sm leading-6 text-fg/85">
                  {profile.bio}
                </p>
              ) : (
                <p className="mt-4 max-w-2xl text-sm text-muted">
                  This user has not added a bio yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <PlaceholderButton>Follow</PlaceholderButton>
            <PlaceholderButton>Message</PlaceholderButton>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Profile content">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => updateParam('tab', tab.value === DEFAULT_TAB ? '' : tab.value)}
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

      {!contentLoading && !contentError && !isPrivacyBlocked && total > 0 ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${items.length} of ${total} ${activeTabLabel.toLowerCase()}.`}
        </p>
      ) : null}

      {contentError ? (
        <EmptyState
          title={`Couldn't load ${activeTabLabel.toLowerCase()}`}
          description={contentError}
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
      ) : isPrivacyBlocked ? (
        <EmptyState
          title="Private content"
          description={`This user keeps their ${privateContentName} private.`}
        />
      ) : activeTab === 'snippets' ? (
        <SnippetGrid snippets={items} loading={contentLoading} skeletonCount={PAGE_SIZE} />
      ) : contentLoading ? (
        <ListSkeleton count={PAGE_SIZE} />
      ) : (
        <div className="flex flex-col gap-3">
          {activeTab === 'likes'
            ? items.map((like) => <LikeRow key={like._id ?? like.id} like={like} />)
            : items.map((comment) => <CommentRow key={comment._id ?? comment.id} comment={comment} />)}
        </div>
      )}

      {!contentLoading && !contentError && !isPrivacyBlocked && items.length === 0 ? (
        <EmptyState
          title={`No ${activeTabLabel.toLowerCase()} yet`}
          description={
            activeTab === 'snippets'
              ? 'Public snippets shared by this user will appear here.'
              : `Public ${activeTabLabel.toLowerCase()} from this user will appear here.`
          }
        />
      ) : null}

      {!contentLoading && !contentError && !isPrivacyBlocked ? (
        <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
      ) : null}
    </div>
  );
}

export default ProfilePage;
