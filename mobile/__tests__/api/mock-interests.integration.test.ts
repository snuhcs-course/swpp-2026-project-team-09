/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import { now } from '@/clock';

// The mock of the watched interests, which answers as the main server does (main-server's README, Interests): kept
// in memory, none at the start, each kept at the app's clock.

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

async function refusalOf(asked: Promise<unknown>): Promise<ApiError> {
  try {
    await answered(asked);
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error('Not refused');
}

describe('the mock of the watched interests', () => {
  it('starts with none', async () => {
    expect(await answered(mockClient.listInterests())).toEqual([]);
  });

  it('keeps trimmed words with their normalised words as the topic, the newest first', async () => {
    const jobs = await answered(mockClient.watchInterest('  채용 관련 행사 '));
    await answered(mockClient.watchInterest('배드민턴'));

    expect(jobs).toEqual({
      id: jobs.id,
      words: '채용 관련 행사',
      topics: ['채용관련행사'],
      createdAt: now().toISOString(),
    });
    expect((await answered(mockClient.listInterests()))?.map(({ words }) => words)).toEqual([
      '배드민턴',
      '채용 관련 행사',
    ]);
  });

  it('answers the interest of the same words, compared without spaces and case, and keeps nothing new', async () => {
    const first = await answered(mockClient.watchInterest('AI 커리어'));

    expect(await answered(mockClient.watchInterest('ai커리어'))).toEqual(first);
    expect(await answered(mockClient.listInterests())).toHaveLength(1);
  });
});

describe('the refusals of the mock of the watched interests', () => {
  it('refuses empty words and words over 60 characters with 400', async () => {
    expect((await refusalOf(mockClient.watchInterest('   '))).status).toBe(400);
    expect((await refusalOf(mockClient.watchInterest('가'.repeat(61)))).status).toBe(400);
  });

  it('refuses a 21st with 409 INTERESTS_FULL', async () => {
    await answered(Promise.all(Array.from({ length: 20 }, (_, index) => mockClient.watchInterest(`관심 ${index}`))));

    const refusal = await refusalOf(mockClient.watchInterest('하나 더'));

    expect([refusal.status, refusal.code]).toEqual([409, 'INTERESTS_FULL']);
  });

  it('removes one, and refuses one it does not keep with 404 INTEREST_NOT_FOUND', async () => {
    const jobs = await answered(mockClient.watchInterest('채용'));

    await answered(mockClient.removeInterest(jobs.id));
    const refusal = await refusalOf(mockClient.removeInterest(jobs.id));

    expect(await answered(mockClient.listInterests())).toEqual([]);
    expect([refusal.status, refusal.code]).toEqual([404, 'INTEREST_NOT_FOUND']);
  });
});
