/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The roles of a map scene's places, routes, and flags (main server `assistant/dto/answer.dto.ts`, the same unions).

// A shuttle stop's point holds the stop's id, not a Place's.
export type PlaceRole = 'pick' | 'candidate' | 'dropped' | 'next' | 'meeting' | 'stop';

// `shuttle` is a ride between two stops; `alt` is the way not taken, drawn faded.
export type RouteRole = 'me' | 'friend' | 'next' | 'shuttle' | 'alt';

// `leave` is when to set out, `late` an arrival after the deadline, `shuttle` the stop a shuttle passed last, `away`
// the edge of the visible area towards a Place outside it.
export type FlagRole = 'place' | 'meeting' | 'leave' | 'late' | 'shuttle' | 'away';
