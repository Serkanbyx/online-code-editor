import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import roomService from '../../api/roomService.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import EditorToolbar from '../../components/editor/EditorToolbar.jsx';
import MonacoPane from '../../components/editor/MonacoPane.jsx';
import UserListSidebar from '../../components/editor/UserListSidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.js';
import { useSocket } from '../../hooks/useSocket.js';
import { useYjsRoom } from '../../hooks/useYjsRoom.js';
import { createAwarenessUser } from '../../utils/awareness.js';
import { extractApiError } from '../../utils/apiError.js';

const DEFAULT_CODE = `// Welcome to your collaborative room.
// Start typing to sync this document with everyone in the room.

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

function isValidHexColor(color) {
  return /^#[\da-f]{6}$/i.test(color);
}

function hexToRgba(color, alpha) {
  if (!isValidHexColor(color)) return `rgba(99, 102, 241, ${alpha})`;

  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildRemoteCursorStyles(awareness) {
  if (!awareness) return '';

  return Array.from(awareness.getStates(), ([clientId, state]) => {
    const color = state?.user?.color;

    if (!isValidHexColor(color)) return '';

    return `
.yRemoteSelection-${clientId} {
  background-color: ${hexToRgba(color, 0.22)} !important;
}

.yRemoteSelectionHead-${clientId} {
  border-color: ${color} !important;
  border-left-color: ${color} !important;
}
`;
  }).join('\n');
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
  const { ytext, awareness, status } = useYjsRoom(roomId);
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
    if (!socket || !roomId) return undefined;

    socket.emit('room:join', { roomId });

    function handleLanguageChange(payload = {}) {
      if (payload.roomId !== roomId || !payload.language) return;

      setRoom((currentRoom) => {
        if (!currentRoom) return currentRoom;
        return { ...currentRoom, language: payload.language };
      });

      const { editor, monaco } = monacoBindingRefs.current;
      const model = editor?.getModel();

      if (monaco && model) {
        monaco.editor.setModelLanguage(model, payload.language);
      }
    }

    socket.on('room:languageChange', handleLanguageChange);

    return () => {
      socket.off('room:languageChange', handleLanguageChange);
      socket.emit('room:leave', { roomId });
    };
  }, [roomId, socket]);

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

  useEffect(() => {
    if (!awareness || !user) return undefined;

    awareness.setLocalStateField('user', createAwarenessUser(user));

    return () => {
      awareness.setLocalState(null);
    };
  }, [awareness, user]);

  useEffect(() => {
    if (!awareness || typeof document === 'undefined') return undefined;

    const styleElement = document.createElement('style');
    styleElement.dataset.codenestRemoteCursors = roomId ?? '';
    document.head.append(styleElement);

    function syncRemoteCursorStyles() {
      styleElement.textContent = buildRemoteCursorStyles(awareness);
    }

    syncRemoteCursorStyles();
    awareness.on('change', syncRemoteCursorStyles);

    return () => {
      awareness.off('change', syncRemoteCursorStyles);
      styleElement.remove();
    };
  }, [awareness, roomId]);

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
          status={status}
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
              ytext={ytext}
              awareness={awareness}
              onChange={setCode}
              onMount={handleMount}
            />
          </main>
          <div className={clsx('h-full min-h-0 md:row-span-2 md:block', activeTab !== 'users' && 'hidden')}>
            <UserListSidebar awareness={awareness} animations={prefs.animations !== false} />
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
