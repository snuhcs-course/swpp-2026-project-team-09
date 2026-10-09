/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

// Times are shown and entered in Asia/Seoul, whatever the browser's or the server's time zone. Korea has kept UTC+9
// without daylight saving since 1988, so a fixed offset is exact.
const OFFSET = 9 * 60 * 60 * 1000;

export interface DayAndTime {
  day: string;
  time: string;
}

// '2026-10-12T09:30:00.000Z' → { day: '2026-10-12', time: '18:30' }
export function inSeoul(instant: string): DayAndTime {
  const shifted = new Date(Date.parse(instant) + OFFSET).toISOString();
  return { day: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

// { day: '2026-10-12', time: '18:30' } → '2026-10-12T18:30:00+09:00'
export function fromSeoul({ day, time }: DayAndTime): string {
  return `${day}T${time}:00+09:00`;
}

export function formatInSeoul(instant: string): string {
  const { day, time } = inSeoul(instant);
  return `${day} ${time}`;
}

// A collected start at 00:00 is often a day read without its time.
export function isMidnightInSeoul(instant: string): boolean {
  return inSeoul(instant).time === '00:00';
}
