/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// P15-52 review: a request with a timeout is given up as no answer (status 0) once the time is past, so that the
// timetable reading falls back to the phone's own reader instead of keeping the User on the sheet.

import { READING_TIMEOUT_MS, timetableReadingClient } from '@/api/server/timetable-reading-client';

jest.mock('@/api/servers', () => ({ mainServerUrl: (): string => 'http://main.test' }));
jest.mock('@/auth/tokens', () => ({ heldTokens: jest.fn(() => null), keepTokens: jest.fn() }));
jest.mock('@/session/session-events', () => ({ endSession: jest.fn(), requireOnboarding: jest.fn() }));

const realFetch = globalThis.fetch;

// A server that never answers: the request settles only when it is aborted.
function silentFetch(): jest.Mock {
  return jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
      }),
  );
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  jest.useRealTimers();
});

it('gives up the reading after 25 s as no answer', async () => {
  globalThis.fetch = silentFetch();
  let settled = false;
  const reading = timetableReadingClient.readTimetableImage('iVBORw0KGgo=', null).finally(() => {
    settled = true;
  });
  const failed = expect(reading).rejects.toMatchObject({ status: 0 });

  await jest.advanceTimersByTimeAsync(READING_TIMEOUT_MS - 1);
  expect(settled).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  await failed;
  expect(READING_TIMEOUT_MS).toBe(25_000);
});
