/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { MakePlanQuest, PlanQuest } from '@/api/plan-quest-types';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { type Inviting, type PlanInvitation, usePlanInvitation } from '@/features/assistant/use-plan-invitation';
import { freshWrapper } from './queries';
import { HERE } from './shown-answer';

// The Quest made from the Plan on screen, held over a given answer and Plan, for the hook's own tests, with the API
// client stood in by the test.

export const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
export const CHANGED = '계획이 바뀌었어요. 다시 확인해 주세요';
export const FAILED = '초대하지 못했어요. 잠시 후 다시 시도해 주세요';
export const SENT = '김민수에게 점심 초대를 보냈어요';

type OnScreen = Pick<ShownAnswer, 'answer' | 'plan'>;
type Change = jest.Mock<void, Parameters<ShownAnswer['change']>>;

export function onScreen(answer: AnswerReply | null, plan: Plan | null): OnScreen {
  return { answer, plan };
}

export interface HeldInvitation {
  invitation: () => PlanInvitation;
  rerender: (next: OnScreen) => Promise<void>;
  say: jest.Mock<void, [string]>;
  change: Change;
}

// `where` stands in for the position at HERE: no position, and why.
export async function hold(
  first: OnScreen,
  where?: Pick<Inviting, 'location' | 'locationMissing'>,
): Promise<HeldInvitation> {
  const say = jest.fn<void, [string]>();
  const change: Change = jest.fn<void, Parameters<ShownAnswer['change']>>();
  const { result, rerender } = await renderHook(
    (given: OnScreen) => usePlanInvitation({ ...given, change }, { location: HERE, say, ...where }),
    { initialProps: first, wrapper: freshWrapper() },
  );
  return {
    invitation: () => result.current,
    rerender: async (next): Promise<void> => {
      await rerender(next);
    },
    say,
    change,
  };
}

export async function pressed(held: HeldInvitation): Promise<void> {
  await act(async () => {
    held.invitation().invite();
    await Promise.resolve();
  });
}

type Make = jest.MockedFunction<(making: MakePlanQuest, key: string) => Promise<PlanQuest>>;

// The keys of the requests sent, in order.
export function keys(make: Make): string[] {
  return make.mock.calls.map(([, key]) => key);
}

// The next request's reply, which the test lets come when it chooses, and the User's Quests then read (real timers).
export function heldBack(make: Make): { come: (made: PlanQuest) => Promise<void> } {
  let resolve: ((made: PlanQuest) => void) | null = null;
  make.mockImplementationOnce(
    () =>
      new Promise<PlanQuest>((given) => {
        resolve = given;
      }),
  );
  return {
    come: async (made): Promise<void> => {
      await act(async () => {
        resolve?.(made);
        await Promise.resolve();
      });
      await act(async () => {
        await new Promise((done) => {
          setTimeout(done, 0);
        });
      });
    },
  };
}
