import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import Avatar from '../common/Avatar.jsx';

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

export function UserListSidebar({ awareness, animations = true }) {
  const [users, setUsers] = useState(() => normalizeAwarenessUsers(awareness));
  const [wavingClientIds, setWavingClientIds] = useState(() => new Set());
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

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 md:rounded-none md:border-0 md:border-l md:border-fg/10">
      <div className="border-b border-fg/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Users</h2>
        <p className="text-xs text-muted">{users.length} users in room</p>
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
