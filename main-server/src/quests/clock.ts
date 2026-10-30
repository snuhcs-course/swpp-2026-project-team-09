/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-30  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

// The time by which a Sub Quest is ended. A test replaces `now` to move it:
// `vi.spyOn(app.get(CLOCK), 'now')`.
export const CLOCK = 'CLOCK';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

const MINUTE_MS = 60 * 1000;

// The system clock moved by CLOCK_OFFSET_MINUTES, which a developer sets to try what the server decides by the time of
// day at another hour. Sessions, tokens and the database's own defaults keep the real time.
export function clockWithOffset(minutes: number): Clock {
  return minutes === 0 ? systemClock : { now: () => new Date(Date.now() + minutes * MINUTE_MS) };
}
