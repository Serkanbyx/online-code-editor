// NOTE: STEP 24 intentionally ships this hook as an inert shell.
// The full implementation — Y.Doc lifecycle, WebsocketProvider wiring,
// awareness broadcast, and the React Strict Mode useRef guard — lands in
// STEP 33 once the Yjs y-websocket server (STEP 15) is available.

export function useYjsRoom(_roomId) {
  return {
    ydoc: null,
    ytext: null,
    awareness: null,
    provider: null,
    status: 'disconnected',
  };
}

export default useYjsRoom;
