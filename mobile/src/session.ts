/** An old request must never read into, or revoke, a newer signed-in session. */
export function isCurrentSession(requestToken: string, activeToken: string) {
  return requestToken.length > 0 && requestToken === activeToken;
}
