import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import adminService from '../../api/adminService.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { extractApiError } from '../../utils/apiError.js';

const STAT_CARDS = [
  {
    key: 'totalUsers',
    title: 'Total users',
    getValue: (stats) => stats.totalUsers,
  },
  {
    key: 'totalSnippets',
    title: 'Total snippets',
    getValue: (stats) => stats.totalSnippets,
    getSubtitle: (stats) => `${formatNumber(stats.publicSnippets)} public / ${formatNumber(stats.totalSnippets)} total`,
  },
  {
    key: 'totalComments',
    title: 'Total comments',
    getValue: (stats) => stats.totalComments,
  },
  {
    key: 'openReports',
    title: 'Open reports',
    getValue: (stats) => stats.openReports,
    getSubtitle: (stats) => (stats.openReports > 0 ? 'Needs moderator attention' : 'Queue is clear'),
    dangerWhenPositive: true,
  },
  {
    key: 'totalRooms',
    title: 'Active rooms',
    getValue: (stats) => stats.totalRooms,
    getSubtitle: () => 'Last 24h',
  },
  {
    key: 'runsLast24h',
    title: 'Code runs',
    getValue: (stats) => stats.runsLast24h,
    getSubtitle: () => 'Last 24h',
  },
  {
    key: 'signupsLast7Days',
    title: 'Signups',
    getValue: (stats) => stats.signupsLast7Days,
    getSubtitle: () => 'Last 7 days',
    trend: 'Sparkline coming soon',
  },
];

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number.isFinite(value) ? value : 0);
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function AdminStatsCard({ title, value, subtitle, trend, danger }) {
  return (
    <article
      className={clsx(
        'rounded-2xl border bg-bg/70 p-5 shadow-sm transition-colors',
        danger ? 'border-danger/50 bg-danger/5' : 'border-fg/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-fg">{formatNumber(value)}</p>
        </div>
        {danger ? (
          <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
            Open
          </span>
        ) : null}
      </div>
      {subtitle ? <p className="mt-3 text-sm text-muted">{subtitle}</p> : null}
      {trend ? <p className="mt-3 text-xs font-medium text-accent">{trend}</p> : null}
    </article>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    adminService
      .getStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data?.stats ?? {});
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Failed to load stats.');
        setError(normalized.message);
        setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  const cards = useMemo(
    () =>
      STAT_CARDS.map((card) => ({
        ...card,
        value: card.getValue(stats ?? {}),
        subtitle: card.getSubtitle?.(stats ?? {}),
        danger: card.dangerWhenPositive && (stats?.[card.key] ?? 0) > 0,
      })),
    [stats],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Dashboard</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Platform overview</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Monitor the core CodeNest activity counters and moderation workload from one place.
        </p>
      </header>

      {error ? (
        <EmptyState
          icon={<ErrorIcon />}
          title="Failed to load stats"
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-fg/10 bg-bg/70 p-5 shadow-sm">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-4 h-9 w-24" />
              <Skeleton className="mt-4 h-3 w-36" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <AdminStatsCard
              key={card.key}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              trend={card.trend}
              danger={card.danger}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboardPage;
