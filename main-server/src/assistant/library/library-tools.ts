/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type Tool } from '../feature.js';
import { findLibraryFreeSlots } from './find-library-free-slots.js';
import { findLibrarySpace } from './find-library-space.js';
import {
  proposeLibraryCancel,
  proposeLibraryReturn,
  showLibrarySeats,
  showMyLibraryBookings,
} from './library-card-tools.js';
import { type LibraryServices } from './library-parts.js';
import { proposeLibraryBooking } from './propose-library-booking.js';

export { type LibraryServices } from './library-parts.js';

// The 관정도서관 tools, apart from the chat's own (ADR 0009), by the name the model calls each one.
export interface LibraryTools {
  findLibrarySpace: Tool;
  findLibraryFreeSlots: Tool;
  proposeLibraryBooking: Tool;
  proposeLibraryCancel: Tool;
  proposeLibraryReturn: Tool;
  showLibrarySeats: Tool;
  showMyLibraryBookings: Tool;
}

export function libraryTools(services: LibraryServices): LibraryTools {
  return {
    findLibrarySpace: findLibrarySpace(services),
    findLibraryFreeSlots: findLibraryFreeSlots(services),
    proposeLibraryBooking: proposeLibraryBooking(services),
    proposeLibraryCancel: proposeLibraryCancel(services),
    proposeLibraryReturn: proposeLibraryReturn(services),
    showLibrarySeats: showLibrarySeats(services),
    showMyLibraryBookings: showMyLibraryBookings(services),
  };
}
