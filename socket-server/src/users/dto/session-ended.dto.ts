// How a session ended: a sign-in on another phone replaced it, the User signed out, or a used refresh token came back
// too late to be a retry.
export type SessionEndReason = 'replaced' | 'signed_out' | 'refresh_token_reused';

// Sent by the main server once it has ended a session.
export interface SessionEndedEvent {
  sessionId: string;
  reason: SessionEndReason;
}
