import { useEffect, useState } from 'react';
import clsx from 'clsx';

import LanguageSelect from './LanguageSelect.jsx';

const STATUS_META = {
  connecting: {
    label: 'Connecting...',
    className: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
  },
  connected: {
    label: 'Live',
    className: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
  },
  disconnected: {
    label: 'Offline',
    className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  },
};

export function EditorToolbar({
  room,
  isOwner,
  savingRoom,
  status = 'disconnected',
  onRename,
  onLanguageChange,
  onThemeToggle,
  onShare,
  onSave,
  onRun,
}) {
  const [draftName, setDraftName] = useState(room?.name ?? '');
  const statusMeta = STATUS_META[status] ?? STATUS_META.disconnected;

  useEffect(() => {
    setDraftName(room?.name ?? '');
  }, [room?.name]);

  async function handleNameSubmit(event) {
    event.preventDefault();
    const nextName = draftName.trim();

    if (!isOwner || !nextName || nextName === room?.name) {
      setDraftName(room?.name ?? '');
      return;
    }

    await onRename?.(nextName);
  }

  return (
    <header className="flex flex-col gap-3 border-b border-fg/10 bg-bg/95 px-4 py-3 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <form onSubmit={handleNameSubmit} className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="room-name">
          Room name
        </label>
        <input
          id="room-name"
          value={draftName}
          readOnly={!isOwner}
          disabled={savingRoom}
          maxLength={80}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => {
            if (isOwner && draftName.trim() !== room?.name) {
              void onRename?.(draftName.trim());
            }
          }}
          className={clsx(
            'w-full truncate rounded-md border bg-transparent px-2 py-1.5 text-lg font-semibold tracking-tight text-fg outline-none transition-colors',
            isOwner
              ? 'border-fg/10 focus:border-accent focus:ring-2 focus:ring-accent/30'
              : 'cursor-default border-transparent',
            savingRoom && 'opacity-70',
          )}
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={clsx(
            'inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold',
            statusMeta.className,
          )}
          aria-live="polite"
        >
          {statusMeta.label}
        </span>

        <LanguageSelect
          value={room?.language ?? 'javascript'}
          disabled={!isOwner || savingRoom}
          onChange={onLanguageChange}
        />

        <button
          type="button"
          onClick={onThemeToggle}
          className="h-9 rounded-md border border-fg/10 px-3 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
        >
          Theme
        </button>
        <button
          type="button"
          onClick={onShare}
          className="h-9 rounded-md border border-fg/10 px-3 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
        >
          Share
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-9 rounded-md border border-fg/10 px-3 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onRun}
          className="h-9 rounded-md bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
        >
          Run
        </button>
      </div>
    </header>
  );
}

export default EditorToolbar;
