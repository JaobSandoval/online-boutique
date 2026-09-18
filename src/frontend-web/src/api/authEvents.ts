// Tiny pub/sub so AuthContext can react when a silent token refresh fails
// (refresh token itself expired/revoked) — without this, `user` stays
// populated in memory and RequireAuth never re-checks, so the UI looks
// logged in while every API call quietly 401s.
const target = new EventTarget()
const SESSION_EXPIRED = 'session-expired'

export function emitSessionExpired() {
  target.dispatchEvent(new Event(SESSION_EXPIRED))
}

export function onSessionExpired(handler: () => void): () => void {
  target.addEventListener(SESSION_EXPIRED, handler)
  return () => target.removeEventListener(SESSION_EXPIRED, handler)
}
