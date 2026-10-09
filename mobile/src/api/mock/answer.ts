/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { mockBehaviour } from '@/dev-settings';

// A mock answers after a short wait, so that a screen's loading state is seen and tested.
export const MOCK_WAIT_MS = 300;
export const MOCK_SLOW_WAIT_MS = 3000;

async function wait(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// Answers one operation of the mock client. `value` makes the usual answer when the wait is over, and `nothing` is
// what the operation answers when it has nothing to give. A development setting picks a slow answer, a failure or
// nothing by the operation's name.
export async function answer<Answer>(
  operation: keyof ApiClient,
  value: () => Answer | Promise<Answer>,
  nothing?: Answer,
): Promise<Answer> {
  const behaviour = mockBehaviour(operation);
  await wait(behaviour === 'slow' ? MOCK_SLOW_WAIT_MS : MOCK_WAIT_MS);
  if (behaviour === 'fail') {
    throw new ApiError(500);
  }
  if (behaviour === 'empty' && nothing !== undefined) {
    return nothing;
  }
  return value();
}
