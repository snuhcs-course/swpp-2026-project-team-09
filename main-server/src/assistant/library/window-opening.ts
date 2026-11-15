/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { addDays } from './booking-rules.js';
import { type LibrarySpace } from './catalogue.js';

// When the booking window opens for a date, by windowRefusal's rule: a date can be booked once it is at most
// bookingAheadDays after today. The hour is the wireframe's.
const OPENS_AT = '09:00';

export function windowOpensOn(space: LibrarySpace, date: string): string {
  return addDays(date, -space.bookingAheadDays);
}

export function windowOpening(space: LibrarySpace, date: string): Date {
  return new Date(`${windowOpensOn(space, date)}T${OPENS_AT}:00+09:00`);
}
