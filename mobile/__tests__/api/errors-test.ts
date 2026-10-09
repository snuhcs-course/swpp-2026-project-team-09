/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ApiError, isRefusal } from '@/api/errors';

describe('a refusal of the main server', () => {
  it('is known by its status and its code', () => {
    expect(isRefusal(new ApiError(404, 'NOT_IN_PARTY'), 404, 'NOT_IN_PARTY')).toBe(true);
  });

  it('is not another refusal, a refusal without a code or another error', () => {
    expect(isRefusal(new ApiError(404, 'PARTY_NOT_FOUND'), 404, 'NOT_IN_PARTY')).toBe(false);
    expect(isRefusal(new ApiError(403, 'NOT_IN_PARTY'), 404, 'NOT_IN_PARTY')).toBe(false);
    expect(isRefusal(new ApiError(404), 404, 'NOT_IN_PARTY')).toBe(false);
    expect(isRefusal(new Error('NOT_IN_PARTY'), 404, 'NOT_IN_PARTY')).toBe(false);
  });
});
