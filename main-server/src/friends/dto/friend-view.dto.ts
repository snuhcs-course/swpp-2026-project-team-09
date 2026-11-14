/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// 'building' is for the per-Friend levels, and is not given yet.
export type FriendLevel = 'timetable' | 'building' | 'exact';

// What a viewer sees of a Friend now. A Friend's Timetable is visible at every level.
export interface FriendView {
  id: string;
  name: string;
  department: string;
  level: FriendLevel;
  // Only at 'exact'.
  position: { latitude: number; longitude: number; measuredAt: string } | null;
  // The Place of the position; at 'building' all there is of it.
  placeId: string | null;
}
