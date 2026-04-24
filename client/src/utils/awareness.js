import { pickCursorColor } from './cursorColors.js';

function toPositiveInteger(value, fallback = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(number));
}

export function createAwarenessUser(user) {
  const id = String(user?._id || user?.id || 'anonymous');
  const name = String(user?.displayName || user?.name || 'Anonymous');
  const avatarUrl = user?.avatarUrl ? String(user.avatarUrl) : '';

  return {
    id,
    name,
    color: pickCursorColor(id),
    avatarUrl,
  };
}

export function createAwarenessCursor(position) {
  if (!position) {
    return {
      lineNumber: 1,
      column: 1,
    };
  }

  return {
    lineNumber: toPositiveInteger(position.lineNumber),
    column: toPositiveInteger(position.column),
  };
}

export function createAwarenessSelection(selection) {
  const isEmptySelection =
    typeof selection?.isEmpty === 'function' ? selection.isEmpty() : false;

  if (!selection || isEmptySelection) {
    return null;
  }

  return {
    startLineNumber: toPositiveInteger(selection.startLineNumber),
    startColumn: toPositiveInteger(selection.startColumn),
    endLineNumber: toPositiveInteger(selection.endLineNumber),
    endColumn: toPositiveInteger(selection.endColumn),
  };
}

export function createAwarenessState({ user, cursor, selection } = {}) {
  return {
    user: createAwarenessUser(user),
    cursor: createAwarenessCursor(cursor),
    selection: createAwarenessSelection(selection),
  };
}

export function setLocalAwarenessState(awareness, payload) {
  if (!awareness) {
    return;
  }

  awareness.setLocalState(createAwarenessState(payload));
}

export function clearLocalAwarenessState(awareness) {
  awareness?.setLocalState(null);
}
