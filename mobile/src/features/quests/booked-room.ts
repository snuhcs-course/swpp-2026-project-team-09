/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The Place of a Quest's step with the room the library booked for its booking party (P05 ticket 68, P10 ticket 25),
// on every line that says the Quest's place: the room first, so that a narrow row that cuts the line keeps it.
export function placeWithRoom(label: string, bookedRoom: string | null | undefined): string {
  if (bookedRoom === null || bookedRoom === undefined || bookedRoom === '') {
    return label;
  }
  return label === '' ? bookedRoom : `${bookedRoom} · ${label}`;
}
