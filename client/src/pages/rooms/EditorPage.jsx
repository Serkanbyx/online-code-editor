import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';

import codeService from '../../api/codeService.js';
import roomService from '../../api/roomService.js';
import snippetService from '../../api/snippetService.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import EditorToolbar from '../../components/editor/EditorToolbar.jsx';
import MonacoPane from '../../components/editor/MonacoPane.jsx';
import OutputPanel from '../../components/editor/OutputPanel.jsx';
import SaveSnippetModal from '../../components/editor/SaveSnippetModal.jsx';
import UserListSidebar from '../../components/editor/UserListSidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.js';
import { useSocket } from '../../hooks/useSocket.js';
import { useYjsRoom } from '../../hooks/useYjsRoom.js';
import { createAwarenessUser } from '../../utils/awareness.js';
import { extractApiError } from '../../utils/apiError.js';
import { showErrorToast, showSuccessToast } from '../../utils/helpers.js';

const DEFAULT_CODE = `// Welcome to your collaborative room.
// Start typing to sync this document with everyone in the room.

const greeting = 'Hello from CodeNest!';
greeting;
`;

const MOBILE_TABS = [
  { id: 'code', label: 'Code' },
  { id: 'output', label: 'Output' },
  { id: 'users', label: 'Users' },
];

const RUN_THROTTLE_MS = 2000;
const STDIN_MAX_LENGTH = 8 * 1024;

const DEFAULT_OUTPUT_STATE = {
  stdout: '',
  stderr: '',
  code: null,
  signal: null,
  version: null,
  stdin: '',
};

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

function compareRuntimeVersions(leftVersion = '', rightVersion = '') {
  const leftParts = leftVersion.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = rightVersion.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const difference = leftParts[index] - rightParts[index];

    if (difference !== 0) return difference;
  }

  return 0;
}

function getLatestRuntime(runtimes, language) {
  if (!language) return null;

  return runtimes
    .filter((runtime) => runtime.language === language)
    .sort((left, right) => compareRuntimeVersions(right.version, left.version))[0] ?? null;
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

export function EditorPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { updatePref, prefs } = usePreferences();
  const { socket } = useSocket();
  const [, copyToClipboard] = useCopyToClipboard();
  const monacoBindingRefs = useRef({ editor: null, monaco: null });
  const runtimeCatalogRef = useRef(null);
  const lastRunClickRef = useRef(0);

  const [room, setRoom] = useState(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [outputState, setOutputState] = useState(DEFAULT_OUTPUT_STATE);
  const [runtimeCatalog, setRuntimeCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingSnippet, setSavingSnippet] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [snippetId, setSnippetId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [retryToken, setRetryToken] = useState(0);

  const activeRoomId = room ? roomId : null;
  const { ytext, awareness, status } = useYjsRoom(activeRoomId);
  const isOwner = useMemo(() => isOwnedByUser(room, user), [room, user]);
  const currentRuntime = useMemo(
    () => getLatestRuntime(runtimeCatalog, room?.language),
    [room?.language, runtimeCatalog],
  );
  const displayedRuntimeVersion = outputState.version ?? currentRuntime?.version ?? null;

  useEffect(() => {
    if (!socket || !activeRoomId) return undefined;

    socket.emit('room:join', { roomId: activeRoomId });

    function handleLanguageChange(payload = {}) {
      if (payload.roomId !== activeRoomId || !payload.language) return;

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
      socket.emit('room:leave', { roomId: activeRoomId });
    };
  }, [activeRoomId, socket]);

  useEffect(() => {
    if (runtimeCatalogRef.current) return undefined;

    let cancelled = false;

    codeService
      .runtimes()
      .then((data) => {
        if (cancelled) return;
        const runtimes = Array.isArray(data?.runtimes) ? data.runtimes : [];
        runtimeCatalogRef.current = runtimes;
        setRuntimeCatalog(runtimes);
      })
      .catch(() => {
        if (!cancelled) {
          runtimeCatalogRef.current = [];
          setRuntimeCatalog([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setRoom(null);

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
        if (successMessage) showSuccessToast(successMessage);
        return nextRoom;
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not update the room.');
        showErrorToast(normalized.message);
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
      showSuccessToast('Link copied');
    } else {
      showErrorToast('Could not copy link');
    }
  }, [copyToClipboard]);

  const handleSaveSnippet = useCallback(
    async (metadata) => {
      if (savingSnippet) return;

      const currentRoomId = getRoomId(room) ?? roomId;
      const currentCode = ytext?.toString() ?? code;
      const payload = {
        ...metadata,
        language: room.language,
        code: currentCode,
      };

      setSavingSnippet(true);
      try {
        if (snippetId) {
          await snippetService.update(snippetId, payload);
        } else {
          const data = await snippetService.create({
            ...payload,
            roomId: currentRoomId,
          });
          const nextSnippetId = data?.snippet?._id ?? data?.snippet?.id ?? null;
          if (nextSnippetId) setSnippetId(nextSnippetId);
        }

        showSuccessToast('Saved!');
        setSaveModalOpen(false);
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not save this snippet.');
        showErrorToast(normalized.message);
      } finally {
        setSavingSnippet(false);
      }
    },
    [code, room, roomId, savingSnippet, snippetId, ytext],
  );

  const handleAddParticipant = useCallback(
    async (username) => {
      const currentRoomId = getRoomId(room) ?? roomId;
      if (!isOwner || !currentRoomId || addingParticipant) return false;

      setAddingParticipant(true);
      try {
        const data = await roomService.addParticipant(currentRoomId, username);
        if (data?.room) setRoom(data.room);
        showSuccessToast('Participant added');
        return true;
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not add this participant.');
        showErrorToast(normalized.message);
        return false;
      } finally {
        setAddingParticipant(false);
      }
    },
    [addingParticipant, isOwner, room, roomId],
  );

  const handleMount = useCallback((editor, monaco) => {
    monacoBindingRefs.current = { editor, monaco };
  }, []);

  const handleStdinChange = useCallback((nextStdin) => {
    setOutputState((currentOutput) => ({
      ...currentOutput,
      stdin: nextStdin.slice(0, STDIN_MAX_LENGTH),
    }));
  }, []);

  const handleClearOutput = useCallback(() => {
    setOutputState((currentOutput) => ({
      ...DEFAULT_OUTPUT_STATE,
      stdin: currentOutput.stdin,
    }));
  }, []);

  const handleRun = useCallback(async () => {
    const now = Date.now();

    if (isRunning || now - lastRunClickRef.current < RUN_THROTTLE_MS) return;

    lastRunClickRef.current = now;
    setIsRunning(true);
    setActiveTab('output');

    try {
      const result = await codeService.run({
        language: room.language,
        code: ytext?.toString() ?? code,
        stdin: outputState.stdin,
      });

      setOutputState((currentOutput) => ({
        ...currentOutput,
        stdout: result?.stdout ?? '',
        stderr: result?.stderr ?? '',
        code: result?.code ?? null,
        signal: result?.signal ?? null,
        version: result?.version ?? currentRuntime?.version ?? null,
      }));
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not run this code.');

      setOutputState((currentOutput) => ({
        ...currentOutput,
        stdout: '',
        stderr: normalized.message,
        code: null,
        signal: null,
        version: currentRuntime?.version ?? currentOutput.version,
      }));
      showErrorToast('Run failed');
    } finally {
      setIsRunning(false);
    }
  }, [code, currentRuntime?.version, isRunning, outputState.stdin, room?.language, ytext]);

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
          isRunning={isRunning}
          status={status}
          onRename={handleRename}
          onLanguageChange={handleLanguageChange}
          onThemeToggle={handleThemeToggle}
          onShare={handleShare}
          onSave={() => setSaveModalOpen(true)}
          onRun={handleRun}
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
            <UserListSidebar
              awareness={awareness}
              animations={prefs.animations !== false}
              isOwner={isOwner}
              addingParticipant={addingParticipant}
              onAddParticipant={handleAddParticipant}
            />
          </div>
          <div className={clsx('h-full min-h-0 md:block', activeTab !== 'output' && 'hidden')}>
            <OutputPanel
              output={outputState}
              runtimeLanguage={room.language}
              runtimeVersion={displayedRuntimeVersion}
              onClear={handleClearOutput}
              onStdinChange={handleStdinChange}
            />
          </div>
        </div>
      </div>

      <p className="px-1 text-xs text-muted">
        Room ID: <span className="font-mono">{getRoomId(room) ?? roomId}</span>
        {!isOwner ? ' · Owner-only controls are read-only for this account.' : null}
      </p>

      <SaveSnippetModal
        open={saveModalOpen}
        roomName={room.name}
        saving={savingSnippet}
        onClose={() => setSaveModalOpen(false)}
        onSubmit={handleSaveSnippet}
      />
    </div>
  );
}

export default EditorPage;
