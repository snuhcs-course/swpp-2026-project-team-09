import type { Position } from './answers.js';

// Points inside the Campus Boundary, and one outside it.
export const JAHAYEON = { latitude: 37.4601, longitude: 126.9512 } satisfies Position;
export const ENGINEERING_BUILDING = { latitude: 37.45016, longitude: 126.95259 } satisfies Position;
export const NEW_MEDIA_INSTITUTE = { latitude: 37.45487, longitude: 126.95407 } satisfies Position;
export const SEOUL_STATION = { latitude: 37.5547, longitude: 126.9707 } satisfies Position;

// The calendar day in Asia/Seoul, as YYYY-MM-DD.
export function seoulDay(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(at);
}

export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
