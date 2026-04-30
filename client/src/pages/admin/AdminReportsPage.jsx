import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import adminService from '../../api/adminService.js';
import Avatar from '../../components/common/Avatar.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import LanguageBadge from '../../components/common/LanguageBadge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';
import { showErrorToast, showSuccessToast } from '../../utils/helpers.js';

const REPORT_LIMIT = 50;
const REPORT_STATUSES = ['open', 'resolved', 'dismissed'];
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];
const TARGET_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'snippet', label: 'Snippet' },
  { value: 'comment', label: 'Comment' },
];
const ACTION_OPTIONS = [
  { value: 'noop', label: 'No side effect' },
  { value: 'hideTarget', label: 'Hide target' },
  { value: 'removeTarget', label: 'Remove target' },
  { value: 'banUser', label: 'Ban target author' },
];
const REASON_LABELS = {
  spam: 'Spam',
  abuse: 'Abuse',
  copyright: 'Copyright',
  inappropriate: 'Inappropriate',
  other: 'Other',
};

function createEmptySections() {
  return REPORT_STATUSES.reduce((result, status) => {
    result[status] = { items: [], total: 0 };
    return result;
  }, {});
}

function readOption(value, options) {
  return options.some((option) => option.value === value) ? value : 'all';
}

function truncateText(value, maxLength = 100) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function getUserLabel(user) {
  return user?.username ? `@${user.username}` : user?.displayName || 'Unknown user';
}

function getId(value) {
  return typeof value === 'object' && value !== null ? value._id : value;
}

function isSameId(left, right) {
  const leftId = getId(left);
  const rightId = getId(right);
  return Boolean(leftId && rightId && String(leftId) === String(rightId));
}

function getTargetAuthor(report) {
  if (!report?.target) return null;
  return report.target.author || null;
}

function getBanDisabledReason(report) {
  const author = getTargetAuthor(report);
  if (!author) return 'Target author is unavailable.';
  if (isSameId(author, report.reporter)) return 'Target author is the reporter.';
  if (author.role === 'admin') return 'Target author is an admin.';
  return '';
}

function formatActionLabel(action) {
  return ACTION_OPTIONS.find((option) => option.value === action)?.label || action || 'No side effect';
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
            aria-pressed={value === option.value}
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

function ReporterLink({ reporter }) {
  if (!reporter?.username) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-muted">
        <Avatar user={reporter} size="sm" />
        <span>{getUserLabel(reporter)}</span>
      </span>
    );
  }

  return (
    <Link to={`/u/${reporter.username}`} className="flex min-w-0 items-center gap-2 text-fg transition-colors hover:text-accent">
      <Avatar user={reporter} size="sm" />
      <span className="truncate font-semibold">@{reporter.username}</span>
    </Link>
  );
}

function TargetPreview({ report }) {
  const target = report.target;

  if (!target) {
    return <p className="rounded-lg border border-dashed border-fg/15 bg-fg/5 p-3 text-sm text-muted">Target unavailable.</p>;
  }

  if (report.targetType === 'snippet') {
    return (
      <div className="rounded-lg border border-fg/10 bg-fg/5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/snippets/${target._id}`} className="font-semibold text-fg transition-colors hover:text-accent">
            {target.title || 'Untitled snippet'}
          </Link>
          <LanguageBadge language={target.language} />
          {target.status ? <StatusBadge status={target.status} /> : null}
        </div>
        {target.description ? <p className="mt-2 line-clamp-2 text-sm text-muted">{target.description}</p> : null}
      </div>
    );
  }

  const snippetId = target.snippet?._id || target.snippet;
  const threadPath = snippetId ? `/snippets/${snippetId}#comment-${target._id}` : null;

  return (
    <div className="rounded-lg border border-fg/10 bg-fg/5 p-3">
      <p className="text-sm leading-6 text-fg">{truncateText(target.content) || 'Comment content unavailable.'}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {target.status ? <StatusBadge status={target.status} /> : null}
        {target.snippet?.title ? <span>on {target.snippet.title}</span> : null}
        {threadPath ? (
          <Link to={threadPath} className="font-medium text-accent hover:underline">
            Open thread
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ReportCard({ report, selectedAction, loading, onActionChange, onResolve, onDismiss }) {
  const isOpen = report.status === 'open';
  const banDisabledReason = getBanDisabledReason(report);
  const createdLabel = formatRelativeDate(report.createdAt) || '-';
  const resolvedLabel = formatRelativeDate(report.resolvedAt) || '-';

  return (
    <article className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <ReporterLink reporter={report.reporter} />
            <span className="text-sm text-muted" aria-hidden="true">&middot;</span>
            <span className="text-sm text-muted" title={formatAbsoluteDate(report.createdAt)}>
              {createdLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-fg">
            Reported a <span className="font-semibold capitalize">{report.targetType}</span> - Reason:{' '}
            <span className="font-semibold">{REASON_LABELS[report.reason] || report.reason}</span>
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {report.details ? (
        <p className="mt-3 rounded-lg border border-fg/10 bg-fg/5 p-3 text-sm leading-6 text-muted">
          Details: "{report.details}"
        </p>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Target preview</p>
        <TargetPreview report={report} />
      </div>

      {isOpen ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-fg/10 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Action</span>
            <select
              value={selectedAction}
              onChange={(event) => onActionChange(report._id, event.target.value)}
              disabled={loading}
              className="min-w-52 rounded-md border border-fg/10 bg-bg px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ACTION_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.value === 'banUser' && Boolean(banDisabledReason)}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {selectedAction === 'banUser' && banDisabledReason ? (
              <span className="text-xs text-danger">{banDisabledReason}</span>
            ) : null}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onResolve(report)}
              disabled={loading || (selectedAction === 'banUser' && Boolean(banDisabledReason))}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Resolving...' : 'Resolve'}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(report)}
              disabled={loading}
              className="rounded-md border border-fg/10 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <footer className="mt-4 border-t border-fg/10 pt-4 text-sm text-muted">
          {report.status === 'resolved' ? 'Resolved' : 'Dismissed'} by {getUserLabel(report.resolvedBy)}{' '}
          &middot; <span title={formatAbsoluteDate(report.resolvedAt)}>{resolvedLabel}</span> &middot; action:{' '}
          <span className="font-medium text-fg">{formatActionLabel(report.action)}</span>
        </footer>
      )}
    </article>
  );
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-16 w-full" />
          <Skeleton className="mt-3 h-10 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = readOption(searchParams.get('status') ?? 'all', STATUS_OPTIONS);
  const targetType = readOption(searchParams.get('targetType') ?? 'all', TARGET_TYPE_OPTIONS);

  const [sections, setSections] = useState(() => createEmptySections());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [selectedActions, setSelectedActions] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState('');

  const visibleStatuses = useMemo(() => (status === 'all' ? REPORT_STATUSES : [status]), [status]);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (!value || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    Promise.all(
      visibleStatuses.map(async (currentStatus) => {
        const data = await adminService.listReports({
          status: currentStatus,
          targetType: targetType === 'all' ? undefined : targetType,
          page: 1,
          limit: REPORT_LIMIT,
        });

        return [currentStatus, {
          items: Array.isArray(data?.items) ? data.items : [],
          total: data?.total ?? 0,
        }];
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setSections({
          ...createEmptySections(),
          ...Object.fromEntries(entries),
        });
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load reports.');
        setError(normalized.message);
        setSections(createEmptySections());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetType, visibleStatuses, retryToken]);

  const visibleReports = useMemo(
    () => visibleStatuses.flatMap((currentStatus) => sections[currentStatus]?.items ?? []),
    [sections, visibleStatuses],
  );
  const visibleTotal = useMemo(
    () => visibleStatuses.reduce((sum, currentStatus) => sum + (sections[currentStatus]?.total ?? 0), 0),
    [sections, visibleStatuses],
  );
  const hasActiveFilters = status !== 'all' || targetType !== 'all';

  function handleResetFilters() {
    setSearchParams({}, { replace: true });
  }

  function handleActionChange(reportId, action) {
    setSelectedActions((previous) => ({ ...previous, [reportId]: action }));
  }

  async function resolveReport(report, statusValue, actionValue) {
    if (actionLoadingId) return;

    setActionLoadingId(report._id);

    try {
      const data = await adminService.resolveReport(report._id, {
        status: statusValue,
        action: actionValue,
      });

      showSuccessToast(data?.message === 'Already resolved' ? 'Already resolved.' : statusValue === 'dismissed' ? 'Report dismissed.' : 'Report resolved.');
      setRetryToken((token) => token + 1);
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Report action failed.');
      showErrorToast(normalized.message);
    } finally {
      setActionLoadingId('');
    }
  }

  function handleResolve(report) {
    resolveReport(report, 'resolved', selectedActions[report._id] || 'noop');
  }

  function handleDismiss(report) {
    resolveReport(report, 'dismissed', 'noop');
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Reports</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Report queue</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Review user-filed reports, inspect the target, and resolve moderation work with a single action.
        </p>
      </header>

      <section className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <Segmented label="Status" options={STATUS_OPTIONS} value={status} onChange={(value) => updateParam('status', value)} />
          <Segmented
            label="Target type"
            options={TARGET_TYPE_OPTIONS}
            value={targetType}
            onChange={(value) => updateParam('targetType', value)}
          />
        </div>
      </section>

      {!loading && !error ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${visibleReports.length} of ${visibleTotal} report${visibleTotal === 1 ? '' : 's'}.`}
        </p>
      ) : null}

      {error ? (
        <EmptyState
          title="Couldn't load reports"
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

      {!error && loading ? <ReportsSkeleton /> : null}

      {!error && !loading ? (
        <div className="grid gap-6">
          {visibleStatuses.map((currentStatus) => {
            const section = sections[currentStatus] ?? { items: [], total: 0 };

            return (
              <section key={currentStatus} className="grid gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  <span className="capitalize">{currentStatus}</span> &middot; {section.total}
                </h3>
                {section.items.length > 0 ? (
                  <div className="grid gap-4">
                    {section.items.map((report) => (
                      <ReportCard
                        key={report._id}
                        report={report}
                        selectedAction={selectedActions[report._id] || 'noop'}
                        loading={actionLoadingId === report._id}
                        onActionChange={handleActionChange}
                        onResolve={handleResolve}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                ) : visibleReports.length > 0 ? (
                  <p className="rounded-2xl border border-dashed border-fg/15 bg-bg/60 p-4 text-sm text-muted">
                    No {currentStatus} reports in this view.
                  </p>
                ) : (
                  null
                )}
              </section>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && visibleReports.length === 0 ? (
        <EmptyState
          title="No reports found"
          description={hasActiveFilters ? 'Try clearing the filters to see more reports.' : 'No user reports are waiting in the queue.'}
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
    </div>
  );
}

export default AdminReportsPage;
