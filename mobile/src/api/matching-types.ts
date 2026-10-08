// What AI 매칭 sends and reads.

// A request for Matching (`/matching-requests`). `questId` names the Quest of a matched request once it is made.
export interface MatchingRequest {
  globalEventId: string;
  size: number;
  state: 'waiting' | 'matched' | 'withdrawn' | 'expired';
  arrivedAt: string;
  questId: string | null;
}
