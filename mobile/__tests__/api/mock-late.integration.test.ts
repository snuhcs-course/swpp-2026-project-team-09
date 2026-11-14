/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import { LATE_WAY } from '@/api/mock/data/late-way';

// The mock of a late report, where the app asks no main server: the main server's real way for 민수 5 minutes late in
// the worked example, whatever is reported.

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the mock of a late report', () => {
  it("answers with the main server's way", async () => {
    await expect(answered(mockClient.reportLate('quest-1', 5, null))).resolves.toEqual(LATE_WAY);
  });
});
