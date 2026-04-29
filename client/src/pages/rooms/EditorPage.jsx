import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import roomService from '../../api/roomService.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import EditorToolbar from '../../components/editor/EditorToolbar.jsx';
import MonacoPane from '../../components/editor/MonacoPane.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.js';
import { useSocket } from '../../hooks/useSocket.js';
import { extractApiError } from '../../utils/apiError.js';

const DEFAULT_CODE = `// Welcome to your collaborative room.
// Realtime sync arrives in Step 33. For now, this editor uses local state.

console.log('Hello from CodeNest!');
`;

const MOBILE_TABS = [
  { id: 'code', label: 'Code' },
  { id: 'output', label: 'Output' },
  { id: 'users', label: 'Users' },
];

function getRoomId(room) {
  return room?.roomId ?? room?.id ?? room?._id;
}

function getOwnerId(room) {
  return room?.owner?._id ?? room?.owner;
}

function isOwnedByUser(room, user) {
  const ownerId = getOwnerId(room);
  return Boolean(ownerId && user?._id && String(ownerId) === String(user._id));
}

function getDisplayName(user) {
  return user?.displayName || user?.username || 'Unknown user';
}

function EditorShellSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-fg/10 bg-bg/70">
      <div className="flex flex-col gap-3 border-b border-fg/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-9 w-64 max-w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Skeleton className="h-[70vh] w-full rounded-none" />
    </div>
  );
}

function MobileTabSwitcher({ activeTab, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-fg/10 bg-fg/5 p-1 md:hidden">
      {MOBILE_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            activeTab === tab.id ? 'bg-bg text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
          aria-pressed={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function UsersSidebar({ room }) {
  const participants = Array.isArray(room?.participants) ? room.participants : [];

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 md:rounded-none md:border-0 md:border-l md:border-fg/10">
      <div className="border-b border-fg/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Users</h2>
        <p className="text-xs text-muted">{participants.length} participants</p>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {participants.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {participants.map((participant) => {
              const participantId = participant?._id ?? participant;
              return (
                <li
                  key={participantId}
                  className="flex items-center gap-3 rounded-xl border border-fg/10 bg-fg/5 px-3 py-2"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-xs font-semibold uppercase text-accent">
                    {getDisplayName(participant).charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {getDisplayName(participant)}
                    </span>
                    {participant?.username ? (
                      <span className="block truncate text-xs text-muted">@{participant.username}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-fg/15 p-4 text-sm text-muted">
            No participants are listed yet.
          </p>
        )}
      </div>
    </aside>
  );
}

function OutputPanel() {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-slate-950 text-slate-100 md:rounded-none md:border-0 md:border-t md:border-fg/10">
      <div className="border-b border-white/10 px-4 py-2">
        <h2 className="text-sm font-semibold">Output</h2>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-sm text-slate-300">
        Run output will appear here in Step 35.
      </pre>
    </section>
  );
}

export function EditorPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { updatePref, prefs } = usePreferences();
  const { socket } = useSocket();
  const [, copyToClipboard] = useCopyToClipboard();
  const monacoBindingRefs = useRef({ editor: null, monaco: null });

  const [room, setRoom] = useState(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingRoom, setSavingRoom] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [retryToken, setRetryToken] = useState(0);

  const isOwner = useMemo(() => isOwnedByUser(room, user), [room, user]);

  useEffect(() => {
    if (!roomId) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    roomService
      .getById(roomId)
      .then((data) => {
        if (cancelled) return;
        setRoom(data?.room ?? null);
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load this room.');
        setLoadError(normalized);
        setRoom(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, retryToken]);

  const updateRoom = useCallback(
    async (updates, successMessage) => {
      const currentRoomId = getRoomId(room);
      if (!currentRoomId || savingRoom) return null;

      setSavingRoom(true);
      try {
        const data = await roomService.update(currentRoomId, updates);
        const nextRoom = data?.room ?? null;
        if (nextRoom) setRoom(nextRoom);
        if (successMessage) toast.success(successMessage);
        return nextRoom;
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not update the room.');
        toast.error(normalized.message);
        return null;
      } finally {
        setSavingRoom(false);
      }
    },
    [room, savingRoom],
  );

  const handleRename = useCallback(
    async (nextName) => {
      const trimmedName = nextName.trim();
      if (!isOwner || !trimmedName || trimmedName === room?.name) return;
      await updateRoom({ name: trimmedName }, 'Room renamed');
    },
    [isOwner, room?.name, updateRoom],
  );

  const handleLanguageChange = useCallback(
    async (nextLanguage) => {
      if (!isOwner || !nextLanguage || nextLanguage === room?.language) return;
      const nextRoom = await updateRoom({ language: nextLanguage }, 'Language updated');
      if (nextRoom) {
        socket?.emit('room:languageChange', {
          roomId: getRoomId(nextRoom),
          language: nextRoom.language,
        });
      }
    },
    [isOwner, room?.language, socket, updateRoom],
  );

  const handleThemeToggle = useCallback(() => {
    const nextTheme = prefs.editorTheme === 'vs-dark' ? 'vs' : 'vs-dark';
    void updatePref('editorTheme', nextTheme);
  }, [prefs.editorTheme, updatePref]);

  const handleShare = useCallback(async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      toast.success('Link copied');
    } else {
      toast.error('Could not copy link');
    }
  }, [copyToClipboard]);

  const handleMount = useCallback((editor, monaco) => {
    monacoBindingRefs.current = { editor, monaco };
  }, []);

  if (loading) {
    return <EditorShellSkeleton />;
  }

  if (loadError || !room) {
    return (
      <EmptyState
        title="Couldn't load this room"
        description={loadError?.message ?? 'Please try again in a moment.'}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Try again
            </button>
            <Link
              to="/rooms"
              className="rounded-md border border-fg/10 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-fg/5"
            >
              Back to rooms
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 shadow-sm">
        <EditorToolbar
          room={room}
          isOwner={isOwner}
          savingRoom={savingRoom}
          onRename={handleRename}
          onLanguageChange={handleLanguageChange}
          onThemeToggle={handleThemeToggle}
          onShare={handleShare}
          onSave={() => toast('Save snippet arrives in Step 36.')}
          onRun={() => toast('Run support arrives in Step 35.')}
        />

        <div className="p-3 md:hidden">
          <MobileTabSwitcher activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="h-[72vh] min-h-[520px] p-3 md:grid md:min-h-[620px] md:grid-cols-[minmax(0,1fr)_280px] md:grid-rows-[minmax(0,1fr)_180px] md:p-0">
          <main className={clsx('h-full min-h-0 min-w-0 md:block', activeTab !== 'code' && 'hidden')}>
            <MonacoPane
              language={room.language}
              value={code}
              onChange={setCode}
              onMount={handleMount}
            />
          </main>
          <div className={clsx('h-full min-h-0 md:row-span-2 md:block', activeTab !== 'users' && 'hidden')}>
            <UsersSidebar room={room} />
          </div>
          <div className={clsx('h-full min-h-0 md:block', activeTab !== 'output' && 'hidden')}>
            <OutputPanel />
          </div>
        </div>
      </div>

      <p className="px-1 text-xs text-muted">
        Room ID: <span className="font-mono">{getRoomId(room) ?? roomId}</span>
        {!isOwner ? ' · Owner-only controls are read-only for this account.' : null}
      </p>
    </div>
  );
}

export default EditorPage;
