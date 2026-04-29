import { useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const TOKEN_STORAGE_KEY = 'token';
const YTEXT_NAME = 'monaco';
const connectionsByRoom = new Map();

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function resolveYjsUrl() {
  const baseUrl = import.meta.env.VITE_YJS_URL;
  const normalizedBaseUrl = typeof baseUrl === 'string' ? baseUrl.replace(/\/$/, '') : '';
  return normalizedBaseUrl ? `${normalizedBaseUrl}/yjs` : undefined;
}

function createConnection(roomId) {
  const ydoc = new Y.Doc({ gc: true });
  const provider = new WebsocketProvider(resolveYjsUrl(), roomId, ydoc, {
    params: { token: readToken() },
  });
  const connection = {
    roomId,
    ydoc,
    ytext: ydoc.getText(YTEXT_NAME),
    awareness: provider.awareness,
    provider,
    status: 'connecting',
    subscribers: new Set(),
    refs: 0,
    cleanupTimer: null,
  };

  provider.on('status', (event) => {
    connection.status = event.status;
    connection.subscribers.forEach((notify) => notify(event.status));
  });

  return connection;
}

function acquireConnection(roomId) {
  const existingConnection = connectionsByRoom.get(roomId);

  if (existingConnection) {
    if (existingConnection.cleanupTimer) {
      window.clearTimeout(existingConnection.cleanupTimer);
      existingConnection.cleanupTimer = null;
    }

    existingConnection.refs += 1;
    return existingConnection;
  }

  const connection = createConnection(roomId);
  connection.refs = 1;
  connectionsByRoom.set(roomId, connection);
  return connection;
}

function releaseConnection(connection) {
  connection.refs -= 1;
  connection.awareness.setLocalState(null);

  if (connection.refs > 0) {
    return;
  }

  // React Strict Mode immediately re-runs effects in development. Deferring
  // destruction by one tick lets the second setup reuse the same provider.
  connection.cleanupTimer = window.setTimeout(() => {
    if (connection.refs > 0) return;

    connection.provider.destroy();
    connection.ydoc.destroy();
    connectionsByRoom.delete(connection.roomId);
  }, 0);
}

export function useYjsRoom(roomId) {
  const connectionRef = useRef(null);
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState(roomId ? 'connecting' : 'disconnected');

  useEffect(() => {
    if (!roomId) {
      connectionRef.current = null;
      setConnection(null);
      setStatus('disconnected');
      return undefined;
    }

    const nextConnection = acquireConnection(roomId);
    const handleStatusChange = (nextStatus) => setStatus(nextStatus);

    connectionRef.current = nextConnection;
    nextConnection.subscribers.add(handleStatusChange);
    setConnection(nextConnection);
    setStatus(nextConnection.status);

    return () => {
      nextConnection.subscribers.delete(handleStatusChange);
      releaseConnection(nextConnection);

      if (connectionRef.current === nextConnection) {
        connectionRef.current = null;
      }
    };
  }, [roomId]);

  const currentConnection = connectionRef.current ?? connection;

  return {
    ydoc: currentConnection?.ydoc ?? null,
    ytext: currentConnection?.ytext ?? null,
    awareness: currentConnection?.awareness ?? null,
    provider: currentConnection?.provider ?? null,
    status,
  };
}

export default useYjsRoom;
