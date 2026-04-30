import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import adminService from '../../api/adminService.js';
import Avatar from '../../components/common/Avatar.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import FormError from '../../components/common/FormError.jsx';
import RoleBadge from '../../components/common/RoleBadge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useDebounce from '../../hooks/useDebounce.js';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';
import { showSuccessToast } from '../../utils/helpers.js';

const PAGE_SIZE = 12;
const ROLE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];
const BAN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'false', label: 'Active' },
  { value: 'true', label: 'Banned' },
];

function readPage(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readRole(value) {
  return ROLE_OPTIONS.some((option) => option.value === value) ? value : 'all';
}

function readBanned(value) {
  return BAN_OPTIONS.some((option) => option.value === value) ? value : 'all';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number.isFinite(value) ? value : 0);
}

function getUserLabel(user) {
  return user?.displayName || user?.username || user?.email || 'this user';
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

function UserDetailDrawer({ detail, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="grid gap-4 rounded-xl border border-fg/10 bg-fg/3 p-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-danger/30 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Retry details
        </button>
      </div>
    );
  }

  if (!detail) return null;

  const counts = detail.counts ?? {};
  const metrics = [
    { label: 'Snippets', value: counts.snippets },
    { label: 'Comments', value: counts.comments },
    { label: 'Likes', value: counts.likes },
    { label: 'Rooms', value: counts.rooms },
  ];

  return (
    <div className="rounded-xl border border-fg/10 bg-fg/3 p-4">
      <dl className="grid gap-3 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-fg/10 bg-bg/70 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{metric.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-fg">{formatNumber(metric.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted">
        Last login:{' '}
        <span className="font-medium text-fg">
          {formatAbsoluteDate(detail.lastLoginAt) || 'Never recorded'}
        </span>
      </p>
      {detail.bannedReason ? (
        <p className="mt-2 text-sm text-muted">
          Ban reason: <span className="font-medium text-fg">{detail.bannedReason}</span>
        </p>
      ) : null}
    </div>
  );
}

function AdminUsersTable({
  users,
  loading,
  expandedUserId,
  userDetails,
  detailLoadingId,
  detailErrors,
  currentUserId,
  onToggleView,
  onOpenRole,
  onOpenBan,
  onOpenDelete,
}) {
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
              <th scope="col" className="px-4 py-3">User</th>
              <th scope="col" className="px-4 py-3">Display name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fg/10">
            {users.map((user) => {
              const isSelf = user._id === currentUserId;
              const isExpanded = expandedUserId === user._id;

              return (
                <Fragment key={user._id}>
                  <tr className="align-top">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-fg">@{user.username}</p>
                          <p className="text-xs text-muted">{user._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-fg">{user.displayName || '-'}</td>
                    <td className="px-4 py-4 text-muted">{user.email || '-'}</td>
                    <td className="px-4 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-4">
                      <StatusBadge status={user.isBanned ? 'banned' : 'active'} />
                    </td>
                    <td className="px-4 py-4">
                      <span title={formatAbsoluteDate(user.createdAt)}>{formatRelativeDate(user.createdAt) || '-'}</span>
                    </td>
                    <td className="px-4 py-4">
                      {isSelf ? (
                        <div className="flex justify-end">
                          <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                            It's you
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => onToggleView(user)} className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5">
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                          <button type="button" onClick={() => onOpenRole(user)} className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5">
                            Change role
                          </button>
                          <button type="button" onClick={() => onOpenBan(user)} className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5">
                            {user.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button type="button" onClick={() => onOpenDelete(user)} className="rounded-md bg-danger px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger/90">
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4">
                        <UserDetailDrawer
                          detail={userDetails[user._id]}
                          loading={detailLoadingId === user._id}
                          error={detailErrors[user._id]}
                          onRetry={() => onToggleView(user, { forceReload: true })}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const role = readRole(searchParams.get('role') ?? 'all');
  const banned = readBanned(searchParams.get('banned') ?? 'all');
  const page = readPage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailErrors, setDetailErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [banReason, setBanReason] = useState('');
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

  const fetchUserDetail = useCallback(
    async (targetUserId, { forceReload = false } = {}) => {
      if (!forceReload && userDetails[targetUserId]) return userDetails[targetUserId];

      setDetailLoadingId(targetUserId);
      setDetailErrors((previous) => ({ ...previous, [targetUserId]: '' }));

      try {
        const data = await adminService.getUserById(targetUserId);
        const detail = data?.user ?? null;
        setUserDetails((previous) => ({ ...previous, [targetUserId]: detail }));
        return detail;
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not load user details.');
        setDetailErrors((previous) => ({ ...previous, [targetUserId]: normalized.message }));
        return null;
      } finally {
        setDetailLoadingId((current) => (current === targetUserId ? null : current));
      }
    },
    [userDetails],
  );

  useEffect(() => {
    let cancelled = false;
    const trimmedQuery = urlQuery.trim();

    setLoading(true);
    setError('');

    adminService
      .listUsers({
        q: trimmedQuery || undefined,
        role: role === 'all' ? undefined : role,
        banned: banned === 'all' ? undefined : banned,
        page,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (cancelled) return;
        setUsers(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
        setTotalPages(Math.max(1, data?.totalPages ?? 1));
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load users.');
        setError(normalized.message);
        setUsers([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlQuery, role, banned, page, retryToken]);

  const hasActiveFilters = useMemo(
    () => Boolean(urlQuery.trim()) || role !== 'all' || banned !== 'all',
    [urlQuery, role, banned],
  );

  function handleResetFilters() {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    updateParam('page', String(nextPage));
  }

  function handleToggleView(targetUser, options) {
    const nextExpandedId = expandedUserId === targetUser._id && !options?.forceReload ? null : targetUser._id;
    setExpandedUserId(nextExpandedId);
    if (nextExpandedId) fetchUserDetail(targetUser._id, options);
  }

  function refreshUser(nextUser) {
    setUsers((previous) => previous.map((item) => (item._id === nextUser._id ? nextUser : item)));
    setUserDetails((previous) => ({
      ...previous,
      [nextUser._id]: { ...(previous[nextUser._id] ?? {}), ...nextUser },
    }));
  }

  function closeModal() {
    if (actionLoading) return;
    setModal(null);
    setModalError('');
    setBanReason('');
  }

  function openRoleModal(targetUser) {
    setSelectedRole(targetUser.role === 'admin' ? 'user' : 'admin');
    setModal({ type: 'role', user: targetUser });
    setModalError('');
  }

  function openBanModal(targetUser) {
    setBanReason('');
    setModal({ type: 'ban', user: targetUser });
    setModalError('');
  }

  function openDeleteModal(targetUser) {
    setModal({ type: 'delete', user: targetUser });
    setModalError('');
    fetchUserDetail(targetUser._id);
  }

  async function handleRoleConfirm() {
    if (!modal?.user || actionLoading) return;
    setActionLoading(true);
    setModalError('');

    try {
      const data = await adminService.updateUserRole(modal.user._id, { role: selectedRole });
      refreshUser(data.user);
      showSuccessToast('User role updated.');
      closeModal();
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not update user role.');
      setModalError(normalized.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBanConfirm() {
    if (!modal?.user || actionLoading) return;
    const shouldBan = !modal.user.isBanned;
    const reason = banReason.trim();

    if (shouldBan && !reason) {
      setModalError('Ban reason is required.');
      return;
    }
    if (reason.length > 240) {
      setModalError('Ban reason must be at most 240 characters.');
      return;
    }

    setActionLoading(true);
    setModalError('');

    try {
      const data = await adminService.banUser(modal.user._id, {
        banned: shouldBan,
        reason: shouldBan ? reason : undefined,
      });
      refreshUser(data.user);
      showSuccessToast(shouldBan ? 'User banned.' : 'User unbanned.');
      closeModal();
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not update ban status.');
      setModalError(normalized.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!modal?.user || actionLoading) return;
    setActionLoading(true);
    setModalError('');

    try {
      await adminService.deleteUser(modal.user._id);
      setUsers((previous) => previous.filter((item) => item._id !== modal.user._id));
      setTotal((previous) => Math.max(0, previous - 1));
      setExpandedUserId((current) => (current === modal.user._id ? null : current));
      showSuccessToast('User deleted.');
      closeModal();
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete user.');
      setModalError(normalized.message);
    } finally {
      setActionLoading(false);
    }
  }

  const modalUser = modal?.user;
  const deleteDetail = modalUser ? userDetails[modalUser._id] : null;
  const deleteCounts = deleteDetail?.counts ?? {};

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Users</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">User management</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Search accounts, review activity, update roles, and moderate access with self-protection.
        </p>
      </header>

      <section className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_auto_auto] lg:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search username, display name or email"
              className="w-full rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <Segmented label="Role" options={ROLE_OPTIONS} value={role} onChange={(value) => updateParam('role', value)} />
          <Segmented label="Ban status" options={BAN_OPTIONS} value={banned} onChange={(value) => updateParam('banned', value)} />
        </div>
      </section>

      {!loading && !error ? (
        <p className="text-xs text-muted" aria-live="polite">
          {`Showing ${users.length} of ${total} user${total === 1 ? '' : 's'}.`}
        </p>
      ) : null}

      {error ? (
        <EmptyState
          title="Couldn't load users"
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
        <AdminUsersTable
          users={users}
          loading={loading}
          expandedUserId={expandedUserId}
          userDetails={userDetails}
          detailLoadingId={detailLoadingId}
          detailErrors={detailErrors}
          currentUserId={currentUser?._id}
          onToggleView={handleToggleView}
          onOpenRole={openRoleModal}
          onOpenBan={openBanModal}
          onOpenDelete={openDeleteModal}
        />
      ) : null}

      {!loading && !error && users.length === 0 ? (
        <EmptyState
          title="No users found"
          description={hasActiveFilters ? 'Try clearing the filters or searching for another account.' : 'No users are available yet.'}
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
        open={modal?.type === 'role'}
        onClose={closeModal}
        title="Change user role?"
        description={`Update ${getUserLabel(modalUser)}'s platform permissions.`}
        confirmLabel="Update role"
        loading={actionLoading}
        onConfirm={handleRoleConfirm}
      >
        <div className="grid gap-4">
          <FormError message={modalError} />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
            New role
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={modal?.type === 'ban'}
        onClose={closeModal}
        title={modalUser?.isBanned ? 'Unban user?' : 'Ban user?'}
        description={
          modalUser?.isBanned
            ? `${getUserLabel(modalUser)} will regain access to the platform.`
            : `${getUserLabel(modalUser)} will lose access until an admin unbans them.`
        }
        confirmLabel={modalUser?.isBanned ? 'Unban user' : 'Ban user'}
        tone={modalUser?.isBanned ? 'default' : 'danger'}
        loading={actionLoading}
        onConfirm={handleBanConfirm}
      >
        <div className="grid gap-4">
          <FormError message={modalError} />
          {!modalUser?.isBanned ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              Reason
              <textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                maxLength={240}
                required
                rows={4}
                className="resize-none rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/30"
                placeholder="Explain why this account is being banned."
              />
              <span className="text-xs text-muted">{banReason.length}/240 characters</span>
            </label>
          ) : null}
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={modal?.type === 'delete'}
        onClose={closeModal}
        title="Delete user?"
        description={`This will permanently delete ${getUserLabel(modalUser)} and related content.`}
        confirmLabel="Delete user"
        tone="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
      >
        <div className="grid gap-4">
          <FormError message={modalError} />
          {detailLoadingId === modalUser?._id ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner size="sm" label="Loading cascade warning" />
              Loading cascade warning...
            </div>
          ) : (
            <p className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              This will also delete {formatNumber(deleteCounts.snippets)} snippets,{' '}
              {formatNumber(deleteCounts.comments)} comments, and remove this user from{' '}
              {formatNumber(deleteCounts.rooms)} rooms.
            </p>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default AdminUsersPage;
