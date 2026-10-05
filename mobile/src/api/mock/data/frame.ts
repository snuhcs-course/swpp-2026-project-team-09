// The moment the `Main` frame shows: 1 October 2026, 13:37 in Korea.
export const FRAME_NOW = '2026-10-01T04:37:00.000Z';

// An instant of the frame's day from a time in Korea, which is nine hours ahead of UTC all year.
export function frameTime(clock: `${number}:${number}`): string {
  return new Date(`2026-10-01T${clock}:00+09:00`).toISOString();
}

// The User of the mocks. The name is the one the mock sign-in suggests.
export const ME = { id: 'me', name: '안진영', department: '컴퓨터공학부' } as const;
