/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
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
import { type BookingOptions, proposeLibraryBooking } from './propose-library-booking.js';
import { proposeStudyRoom } from './propose-study-room.js';

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

export interface LibraryToolOptions extends BookingOptions {
  // The app draws answers on the map: the Assistant picks a study group's time in a group study room.
  picksStudyTime?: boolean;
  // The app draws answers on the map: of several seat spaces, the first is filled.
  picksFirstSeat?: boolean;
}

// The options for an app that draws answers on the map, or for any other.
export function answeringOptions(drawsAnswers: boolean): LibraryToolOptions {
  return { fillsSeatTime: drawsAnswers, picksStudyTime: drawsAnswers, picksFirstSeat: drawsAnswers };
}

export function libraryTools(
  services: LibraryServices,
  options?: LibraryToolOptions,
): LibraryTools | (LibraryTools & { proposeStudyRoom: Tool }) {
  const tools: LibraryTools = {
    findLibrarySpace: findLibrarySpace(services, { picksFirstSeat: options?.picksFirstSeat ?? false }),
    findLibraryFreeSlots: findLibraryFreeSlots(services),
    proposeLibraryBooking: proposeLibraryBooking(services, options),
    proposeLibraryCancel: proposeLibraryCancel(services),
    proposeLibraryReturn: proposeLibraryReturn(services),
    showLibrarySeats: showLibrarySeats(services),
    showMyLibraryBookings: showMyLibraryBookings(services),
  };
  return options?.picksStudyTime === true ? { ...tools, proposeStudyRoom: proposeStudyRoom(services) } : tools;
}
