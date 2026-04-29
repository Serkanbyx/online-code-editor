import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import Avatar from '../common/Avatar.jsx';
import Spinner from '../common/Spinner.jsx';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

function getCursorLabel(cursor) {
  if (!cursor?.lineNumber || !cursor?.column) {
    return 'Cursor position unavailable';
  }

  return `Line ${cursor.lineNumber}, column ${cursor.column}`;
}

function normalizeAwarenessUsers(awareness) {
  if (!awareness) return [];

  const localClientId = awareness.clientID;

  return Array.from(awareness.getStates(), ([clientId, state]) => {
    const awarenessUser = state?.user ?? {};
    const name = awarenessUser.name || 'Anonymous';

    return {
      clientId,
      id: awarenessUser.id ?? String(clientId),
      name,
      displayName: name,
      color: awarenessUser.color || '#6366f1',
      avatarUrl: awarenessUser.avatarUrl || '',
      cursor: state?.cursor ?? null,
      isLocal: Number(clientId) === localClientId,
    };
  }).sort((firstUser, secondUser) => {
    if (firstUser.isLocal) return -1;
    if (secondUser.isLocal) return 1;
    return firstUser.name.localeCompare(secondUser.name);
  });
}

export function UserListSidebar({
  awareness,
  animations = true,
  isOwner = false,
  addingParticipant = false,
  onAddParticipant,
}) {
  const [users, setUsers] = useState(() => normalizeAwarenessUsers(awareness));
  const [wavingClientIds, setWavingClientIds] = useState(() => new Set());
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const previousClientIdsRef = useRef(new Set());
  const waveTimersRef = useRef(new Map());

  useEffect(() => {
    if (!awareness) {
      setUsers([]);
      previousClientIdsRef.current = new Set();
      return undefined;
    }

    function syncUsers() {
      const nextUsers = normalizeAwarenessUsers(awareness);
      const nextClientIds = new Set(nextUsers.map((user) => user.clientId));
      const previousClientIds = previousClientIdsRef.current;

      setUsers(nextUsers);

      if (animations !== false && previousClientIds.size > 0) {
        const joinedClientIds = nextUsers
          .filter((user) => !user.isLocal && !previousClientIds.has(user.clientId))
          .map((user) => user.clientId);

        if (joinedClientIds.length > 0) {
          setWavingClientIds((currentIds) => new Set([...currentIds, ...joinedClientIds]));

          joinedClientIds.forEach((clientId) => {
            window.clearTimeout(waveTimersRef.current.get(clientId));
            const timer = window.setTimeout(() => {
              setWavingClientIds((currentIds) => {
                const nextIds = new Set(currentIds);
                nextIds.delete(clientId);
                return nextIds;
              });
              waveTimersRef.current.delete(clientId);
            }, 1200);

            waveTimersRef.current.set(clientId, timer);
          });
        }
      }

      previousClientIdsRef.current = nextClientIds;
    }

    syncUsers();
    awareness.on('change', syncUsers);

    return () => {
      awareness.off('change', syncUsers);
      waveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      waveTimersRef.current.clear();
    };
  }, [animations, awareness]);

  async function handleAddParticipant(event) {
    event.preventDefault();
    const username = usernameDraft.trim().toLowerCase();

    if (!USERNAME_PATTERN.test(username)) {
      setUsernameError('Username must be 3-24 lowercase letters, numbers, or underscores.');
      return;
    }

    const added = await onAddParticipant?.(username);
    if (added) {
      setUsernameDraft('');
      setUsernameError('');
      setAddPopoverOpen(false);
    }
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 md:rounded-none md:border-0 md:border-l md:border-fg/10">
      <div className="border-b border-fg/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <span>
            <h2 className="text-sm font-semibold text-fg">Users</h2>
            <p className="text-xs text-muted">{users.length} users in room</p>
          </span>
          {isOwner ? (
            <button
              type="button"
              onClick={() => {
                setAddPopoverOpen((isOpen) => !isOpen);
                setUsernameError('');
              }}
              className="rounded-md border border-fg/10 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fg/5"
              aria-expanded={addPopoverOpen}
            >
              Add
            </button>
          ) : null}
        </div>

        {isOwner && addPopoverOpen ? (
          <form onSubmit={handleAddParticipant} className="mt-3 rounded-xl border border-fg/10 bg-bg p-3 shadow-sm">
            <label htmlFor="participant-username" className="text-xs font-medium text-fg">
              Add by username
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="participant-username"
                value={usernameDraft}
                onChange={(event) => {
                  setUsernameDraft(event.target.value.toLowerCase());
                  setUsernameError('');
                }}
                disabled={addingParticipant}
                placeholder="username"
                className={clsx(
                  'min-w-0 flex-1 rounded-md border bg-bg px-2 py-1.5 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-70',
                  usernameError ? 'border-danger' : 'border-fg/10',
                )}
              />
              <button
                type="submit"
                disabled={addingParticipant}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {addingParticipant ? <Spinner size="sm" label="Adding participant" className="text-white" /> : null}
                Add
              </button>
            </div>
            {usernameError ? <p className="mt-2 text-xs text-danger">{usernameError}</p> : null}
          </form>
        ) : null}
      </div>
      <div className="flex-1 overflow-auto p-3">
        {users.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {users.map((roomUser) => {
              const cursorLabel = getCursorLabel(roomUser.cursor);

              return (
                <li
                  key={roomUser.clientId}
                  title={cursorLabel}
                  className={clsx(
                    'group relative flex items-center gap-3 rounded-xl border border-fg/10 bg-fg/5 px-3 py-2 transition-colors',
                    wavingClientIds.has(roomUser.clientId) && 'presence-wave',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: roomUser.color }}
                  />
                  <Avatar user={roomUser} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-fg">{roomUser.name}</span>
                      {roomUser.isLocal ? (
                        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          you
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {cursorLabel}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-fg/15 p-4 text-sm text-muted">
            No active users yet.
          </p>
        )}
      </div>
    </aside>
  );
}

export default UserListSidebar;
