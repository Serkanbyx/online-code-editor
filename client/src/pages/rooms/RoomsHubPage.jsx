import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import roomService from '../../api/roomService.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import FormError from '../../components/common/FormError.jsx';
import FormField from '../../components/common/FormField.jsx';
import LanguageBadge from '../../components/common/LanguageBadge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractApiError } from '../../utils/apiError.js';
import { formatAbsoluteDate, formatRelativeDate } from '../../utils/formatDate.js';
import { SUPPORTED_LANGUAGES, getLanguageLabel } from '../../utils/languages.js';

const ROOM_LIST_LIMIT = 12;
const DEFAULT_LANGUAGE = 'javascript';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function getRoomId(room) {
  return room?.roomId ?? room?.id ?? room?._id;
}

function getOwnerId(room) {
  return room?.owner?._id ?? room?.owner;
}

function getParticipantCount(room) {
  return Array.isArray(room?.participants) ? room.participants.length : 0;
}

function isOwnedByUser(room, user) {
  const ownerId = getOwnerId(room);
  return Boolean(ownerId && user?._id && String(ownerId) === String(user._id));
}

function RoomRowSkeleton() {
  return (
    <div className="rounded-2xl border border-fg/10 bg-bg/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3 max-w-md" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

function VisibilityPill({ isPublic }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
        isPublic
          ? 'border-success/20 bg-success/10 text-success'
          : 'border-fg/15 bg-fg/5 text-muted',
      )}
    >
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}

function RoomRow({ room, user, onDelete }) {
  const roomId = getRoomId(room);
  const lastActiveAt = room.lastActiveAt ?? room.updatedAt ?? room.createdAt;
  const canDelete = isOwnedByUser(room, user);

  return (
    <article className="rounded-2xl border border-fg/10 bg-bg/70 p-4 shadow-sm transition-colors hover:border-accent/25">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 truncate text-base font-semibold text-fg">
              {room.name || 'Untitled room'}
            </h2>
            <LanguageBadge language={room.language} />
            <VisibilityPill isPublic={room.isPublic} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>
              <span className="font-semibold text-fg/80">{getParticipantCount(room)}</span>{' '}
              participants
            </span>
            {lastActiveAt ? (
              <time dateTime={new Date(lastActiveAt).toISOString()} title={formatAbsoluteDate(lastActiveAt)}>
                Last active {formatRelativeDate(lastActiveAt)}
              </time>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            to={`/room/${roomId}`}
            className="rounded-md border border-accent/20 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Open
          </Link>
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(room)}
              className="rounded-md border border-danger/20 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function RoomsHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  const [roomName, setRoomName] = useState('');
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isPublic, setIsPublic] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [createMessage, setCreateMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinError, setJoinError] = useState('');

  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const ownedRoomCount = useMemo(
    () => rooms.filter((room) => isOwnedByUser(room, user)).length,
    [rooms, user],
  );

  useEffect(() => {
    let cancelled = false;

    setLoadingRooms(true);
    setRoomsError('');

    roomService
      .getMy({ page: 1, limit: ROOM_LIST_LIMIT })
      .then((data) => {
        if (cancelled) return;
        setRooms(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load your rooms.');
        setRoomsError(normalized.message);
        setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  function validateCreateForm() {
    const errors = {};
    const trimmedName = roomName.trim();

    if (!trimmedName) {
      errors.name = 'Room name is required.';
    } else if (trimmedName.length > 80) {
      errors.name = 'Room name must be 80 characters or fewer.';
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      errors.language = 'Choose a supported language.';
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateRoom(event) {
    event.preventDefault();
    if (creating) return;

    setCreateMessage('');
    setCreateErrors({});

    if (!validateCreateForm()) return;

    setCreating(true);
    try {
      const data = await roomService.create({
        name: roomName.trim(),
        language,
        isPublic,
      });
      const nextRoomId = getRoomId(data?.room);

      toast.success('Room created');
      if (nextRoomId) {
        navigate(`/room/${nextRoomId}`);
      } else {
        setRetryToken((token) => token + 1);
      }
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not create the room.');
      setCreateMessage(normalized.message);
      setCreateErrors(normalized.fieldErrors);
    } finally {
      setCreating(false);
    }
  }

  function handleJoinRoom(event) {
    event.preventDefault();
    const normalizedRoomId = joinRoomId.trim();

    if (!UUID_V4_PATTERN.test(normalizedRoomId)) {
      setJoinError('Enter a valid UUID v4 room ID.');
      return;
    }

    setJoinError('');
    navigate(`/room/${normalizedRoomId}`);
  }

  async function handleConfirmDelete() {
    const roomId = getRoomId(roomToDelete);
    if (!roomId) return;

    setDeleting(true);
    try {
      await roomService.remove(roomId);
      setRooms((previous) => previous.filter((room) => getRoomId(room) !== roomId));
      setRoomToDelete(null);
      toast.success('Room deleted');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete the room.');
      toast.error(normalized.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Rooms</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Collaborative rooms
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Create a new coding room, join by room ID, or reopen a room where you already
              participate.
            </p>
          </div>
          <div className="rounded-2xl border border-fg/10 bg-bg/70 px-4 py-3 text-sm text-muted">
            <span className="font-semibold text-fg">{rooms.length}</span> rooms ·{' '}
            <span className="font-semibold text-fg">{ownedRoomCount}</span> owned
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <article className="rounded-2xl border border-fg/10 bg-bg/70 p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-fg">Create new room</h2>
            <p className="mt-1 text-sm text-muted">
              Start a shared editor with a name, default language, and optional public access.
            </p>
          </div>

          <form
            onSubmit={handleCreateRoom}
            noValidate
            className="mt-5 grid gap-4 md:grid-cols-2"
            aria-describedby={createMessage ? 'create-room-error' : undefined}
          >
            {createMessage ? (
              <div id="create-room-error" className="md:col-span-2">
                <FormError message={createMessage} />
              </div>
            ) : null}

            <FormField
              label="Room name"
              name="name"
              required
              maxLength={80}
              placeholder="Frontend pairing"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              error={createErrors.name}
            />

            <FormField label="Language" error={createErrors.language}>
              {({ id, ...controlProps }) => (
                <select
                  id={id}
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className={clsx(
                    'w-full rounded-md border bg-bg/60 px-3 py-2 text-sm text-fg transition-colors focus:outline-none focus:ring-2',
                    createErrors.language
                      ? 'border-danger/60 focus:border-danger focus:ring-danger/30'
                      : 'border-fg/10 focus:border-accent focus:ring-accent/30',
                  )}
                  {...controlProps}
                >
                  {SUPPORTED_LANGUAGES.map((item) => (
                    <option key={item} value={item}>
                      {getLanguageLabel(item)}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-fg/10 bg-fg/5 px-4 py-3 md:col-span-2">
              <span>
                <span className="block text-sm font-medium text-fg">Make room public</span>
                <span className="mt-1 block text-xs text-muted">
                  Public rooms can be opened by anyone with the room ID.
                </span>
              </span>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="h-5 w-5 rounded border-fg/20 text-accent focus:ring-accent/40"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? <Spinner size="sm" label="Creating room" className="text-white" /> : null}
                Create room
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-fg/10 bg-bg/70 p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-fg">Join by Room ID</h2>
            <p className="mt-1 text-sm text-muted">
              Paste a UUID v4 room ID. Private room access is checked when the room loads.
            </p>
          </div>

          <form onSubmit={handleJoinRoom} noValidate className="mt-5 flex flex-col gap-4">
            <FormField
              label="Room ID"
              name="roomId"
              required
              placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
              value={joinRoomId}
              onChange={(event) => {
                setJoinRoomId(event.target.value);
                if (joinError) setJoinError('');
              }}
              error={joinError}
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border border-accent/20 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              Join
            </button>
          </form>
        </article>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-fg">My rooms</h2>
            <p className="mt-1 text-sm text-muted">
              Only rooms you own or participate in are shown here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRetryToken((token) => token + 1)}
            disabled={loadingRooms}
            className="w-fit rounded-md border border-fg/10 px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {roomsError ? (
          <EmptyState
            title="Couldn't load rooms"
            description={roomsError}
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
        ) : (
          <div className="flex flex-col gap-3">
            {loadingRooms
              ? Array.from({ length: 4 }).map((_, index) => <RoomRowSkeleton key={index} />)
              : rooms.map((room) => (
                  <RoomRow
                    key={getRoomId(room)}
                    room={room}
                    user={user}
                    onDelete={setRoomToDelete}
                  />
                ))}
          </div>
        )}

        {!loadingRooms && !roomsError && rooms.length === 0 ? (
          <EmptyState
            title="No rooms yet"
            description="Create your first collaborative room or join one with a room ID."
          />
        ) : null}
      </section>

      <ConfirmModal
        open={Boolean(roomToDelete)}
        onClose={() => {
          if (!deleting) setRoomToDelete(null);
        }}
        title="Delete room?"
        description={
          roomToDelete
            ? `This permanently deletes "${roomToDelete.name}" and its realtime document. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete room"
        tone="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default RoomsHubPage;
