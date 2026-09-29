// Sent by the main server once it has recorded the session as ended in Redis. `end` is `replaced` after a sign-in on
// another phone and `ended` after a sign-out or a used refresh token.
export interface SessionEndedEvent {
  sessionId: string;
  end: string;
}
