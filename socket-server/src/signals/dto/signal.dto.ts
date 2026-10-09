// AI-generated with Claude Fable 5.1, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #38
// Sent by the main server for each signal to the apps. It names the Users the signal is for, or none when it is for
// every connection, the name the apps receive it under, and what it carries, if anything.
export interface SignalEvent {
  userIds?: string[];
  name: string;
  payload?: unknown;
}
