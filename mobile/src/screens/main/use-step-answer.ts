/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { now } from '@/clock';
import type { ChosenAnswer } from '@/features/assistant/answer-state';
import {
  type ConversationAnswers,
  conversationAnswersOf,
  withoutWithdrawn,
} from '@/features/assistant/conversation-answers';
import {
  chosenAnswerOf,
  type Kept,
  keptOnScreen,
  keptWith,
  recalculatedConversation,
} from '@/features/assistant/kept-answers';
import {
  chosenOnReply,
  firstSeenIndex,
  lookupTakesTheMap,
  renamedChoice,
  stepIdOf,
} from '@/features/assistant/step-choice';
import { dueStepOf, type ShownSteps, type StepsNow } from '@/features/assistant/steps-scene';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';

// The step chosen among several and the answer it shows (P03 ticket 21). When the steps name their answers by key, the
// step chosen gives the answer on screen its own answer; what each step's answer became on screen, a recalculation and
// the plan the User was last on, is kept by key for the next time it is chosen and for the next request. Steps without
// keys keep the rule of before (`step-choice.ts`).

export interface StepAnswer {
  // The steps by the keys their answers have now, and the conversation's answers as recalculated on screen.
  steps: ShownSteps | null;
  conversation: ConversationAnswers;
  activeStep: number;
  setActiveStep: (index: number) => void;
  // The answer the step chosen shows, for the answer on screen; null for the reply's one answer, as before, and while a
  // Lookup takes the map (rule 7).
  chosen: ChosenAnswer | null;
  // Whether the steps on screen name their answers by key, which the next request tells (P03 ticket 20).
  keyed: boolean;
  // Keeps what the answer on screen became, under the key of the step chosen.
  keep: (shown: Pick<ShownAnswer, 'source' | 'answer' | 'index'>) => void;
  // The answer of another step, as last on screen: the answer and the plan, and whether either moved from the reply's.
  keptOf: (key: string) => { answer: AnswerReply; index: number; moved: boolean } | null;
}

const keyOf = ({ shows }: ReplyStep): string | null => (shows?.kind === 'answer' ? (shows.key ?? null) : null);

const lastReplyId = (bubbles: readonly ChatBubble[]): number =>
  bubbles.findLast(({ role }) => role === 'assistant')?.id ?? 0;

interface Choice {
  // The conversation, by its first bubble, whose steps the choice is of: "＋ 새 대화" drops it (rule 8).
  of: number | null;
  // The reply whose steps the choice is of; null before any.
  replyId: number | null;
  id: string | null;
  // The key of the last answer step chosen, which a booking step chosen keeps on screen.
  answerKey: string | null;
}

const noChoice = (of: number | null): Choice => ({ of, replyId: null, id: null, answerKey: null });

// The step chosen as a reply's steps arrive, by the rules of `step-choice.ts`, or the step due first without keys.
function arrived(steps: ShownSteps, bubbles: readonly ChatBubble[], last: Choice, keyed: boolean): Choice {
  const reply = bubbles.find(({ id }) => id === steps.bubbleId) ?? {};
  const at = keyed
    ? chosenOnReply(steps.steps, reply, last.replyId === null ? null : last.id, now())
    : dueStepOf(steps.steps, now());
  const step = steps.steps[at];
  const id = step === undefined ? null : stepIdOf(step);
  return {
    of: last.of,
    replyId: steps.bubbleId,
    id,
    answerKey: step === undefined ? last.answerKey : (keyOf(step) ?? last.answerKey),
  };
}

function useChoice(
  steps: ShownSteps | null,
  bubbles: readonly ChatBubble[],
  keyed: boolean,
): { choice: Choice; activeStep: number; setActiveStep: (index: number) => void; rename: Rename } {
  const of = bubbles[0]?.id ?? null;
  const [choice, setChoice] = useState<Choice>(() => noChoice(of));
  const held = choice.of === of ? choice : noChoice(of);
  const current = steps === null || held.replyId === steps.bubbleId ? held : arrived(steps, bubbles, held, keyed);
  if (current !== choice) {
    setChoice(current);
  }
  const found =
    steps === null || current.id === null ? -1 : steps.steps.findIndex((step) => stepIdOf(step) === current.id);
  const activeStep = found >= 0 ? found : steps === null ? 0 : dueStepOf(steps.steps, now());
  const setActiveStep = useCallback(
    (index: number): void => {
      const step = steps?.steps[index];
      if (steps !== null && step !== undefined) {
        const answerKey = keyOf(step);
        setChoice((last) => ({
          ...last,
          replyId: steps.bubbleId,
          id: stepIdOf(step),
          answerKey: answerKey ?? last.answerKey,
        }));
      }
    },
    [steps],
  );
  const rename = useCallback<Rename>((from, to) => {
    setChoice((last) => renamedChoice(last, from, to));
  }, []);
  return { choice: current, activeStep, setActiveStep, rename };
}

type Rename = (from: string, to: string) => void;

const NOTHING_KEPT: ReadonlyMap<string, Kept> = new Map();
const NONE_WITHDRAWN: ReadonlySet<string> = new Set();

type SetKept = (update: (last: ReadonlyMap<string, Kept>) => ReadonlyMap<string, Kept>) => void;

// What became of each step's answer on screen, for the conversation `of` its first bubble: "＋ 새 대화" drops it (rule 8).
function useKept(of: number | null): [ReadonlyMap<string, Kept>, SetKept] {
  const [held, setHeld] = useState<{ of: number | null; kept: ReadonlyMap<string, Kept> }>(() => ({
    of,
    kept: NOTHING_KEPT,
  }));
  const setKept = useCallback<SetKept>(
    (update) => {
      setHeld((last) => {
        const map = update(last.of === of ? last.kept : NOTHING_KEPT);
        return last.of === of && map === last.kept ? last : { of, kept: map };
      });
    },
    [of],
  );
  return [held.of === of ? held.kept : NOTHING_KEPT, setKept];
}

// Keeps what the answer on screen became, under the key of the step chosen: under its new key when a recalculation
// made it another request's, the step chosen moving with it.
function useKeep(
  chosen: ChosenAnswer | null,
  bubbles: readonly ChatBubble[],
  { setKept, rename }: { setKept: SetKept; rename: Rename },
): StepAnswer['keep'] {
  return useCallback(
    ({ source, answer, index }) => {
      if (chosen === null || answer === null) {
        return;
      }
      const recalculated = answer === source ? null : answer;
      const key = recalculated?.key ?? chosen.key;
      if (key !== chosen.key) {
        rename(chosen.key, key);
      }
      setKept((last) =>
        keptWith(last, chosen.key, { key, answer: recalculated, index, after: lastReplyId(bubbles) }, bubbles),
      );
    },
    [chosen, bubbles, setKept, rename],
  );
}

function useKeptOf(kept: ReadonlyMap<string, Kept>, conversation: ConversationAnswers): StepAnswer['keptOf'] {
  return useCallback(
    (key) => {
      const one = kept.get(key);
      const answer = one?.answer ?? conversation.answers.find((each) => each.key === key) ?? null;
      if (answer === null) {
        return null;
      }
      const moved = one !== undefined && (one.answer !== null || one.index !== 0);
      return { answer, index: one?.index ?? firstSeenIndex, moved };
    },
    [kept, conversation.answers],
  );
}

// `withdrawn`: the keys later replies withdrew while the steps stay on screen (P03 ticket 22).
export function useStepAnswer(
  bubbles: readonly ChatBubble[],
  replied: ShownSteps | null,
  withdrawn: ReadonlySet<string> = NONE_WITHDRAWN,
): StepAnswer {
  const [all, setKept] = useKept(bubbles[0]?.id ?? null);
  const kept = useMemo(() => keptOnScreen(all, bubbles), [all, bubbles]);
  const conversation = useMemo(
    () => withoutWithdrawn(recalculatedConversation(conversationAnswersOf(bubbles), kept), withdrawn),
    [bubbles, kept, withdrawn],
  );
  const keyed = conversation.answers.some(({ key }) => key !== undefined);
  const steps = useMemo(
    () =>
      replied === null || conversation.steps === null || !keyed ? replied : { ...replied, steps: conversation.steps },
    [replied, conversation.steps, keyed],
  );
  const { choice, activeStep, setActiveStep, rename } = useChoice(steps, bubbles, keyed);
  const active = steps?.steps[activeStep];
  const answerKey = (active === undefined ? null : keyOf(active)) ?? choice.answerKey ?? firstKeyOf(steps);
  const chosen = useMemo(
    () => (keyed && answerKey !== null ? chosenAnswerOf(answerKey, conversation, kept, bubbles) : null),
    [keyed, answerKey, conversation, kept, bubbles],
  );
  const keep = useKeep(chosen, bubbles, { setKept, rename });
  const keptOf = useKeptOf(kept, conversation);
  const lookupTurn = lookupTakesTheMap(bubbles.find(({ id }) => id === steps?.bubbleId));
  const shown = lookupTurn ? null : chosen;
  return {
    steps,
    conversation,
    activeStep,
    setActiveStep,
    chosen: shown,
    keyed: keyed && steps !== null,
    keep,
    keptOf,
  };
}

function firstKeyOf(steps: ShownSteps | null): string | null {
  const step = steps?.steps.find((each) => keyOf(each) !== null);
  return step === undefined ? null : keyOf(step);
}

// every other as last on screen. Left out for the reply's one answer.
export function useStepAnswerOf(
  { chosen, keptOf }: Pick<StepAnswer, 'chosen' | 'keptOf'>,
  { answer, plan, source, index }: Pick<ShownAnswer, 'answer' | 'plan' | 'source' | 'index'>,
): StepsNow['answerOf'] {
  const key = chosen?.key ?? null;
  const own = useCallback(
    (asked: string): ReturnType<NonNullable<StepsNow['answerOf']>> => {
      if (asked === key) {
        return answer === null ? null : { answer, plan, moved: answer !== source || index !== 0 };
      }
      const kept = keptOf(asked);
      return kept === null
        ? null
        : { answer: kept.answer, plan: kept.answer.plans[kept.index] ?? null, moved: kept.moved };
    },
    [key, keptOf, answer, plan, source, index],
  );
  return key === null ? undefined : own;
}

// What the next request tells of the steps on screen (P03 ticket 20): their answers as recalculated on screen, and the
// steps as they stand; null for the reply's one answer.
export function useStepsNow(
  ref: RefObject<ConversationAnswers | null>,
  { keyed, conversation }: Pick<StepAnswer, 'keyed' | 'conversation'>,
  live: ShownSteps | null,
): void {
  useEffect(() => {
    ref.current = keyed ? { answers: conversation.answers, steps: live?.steps ?? conversation.steps } : null;
  });
}

// The steps of the reply on the map as their answers' keys now name them, without those later replies withdrew, and the
// answers they show.
export function useStepsOfReply<OnMap extends { steps: ShownSteps | null }>(
  replied: OnMap,
  bubbles: readonly ChatBubble[],
  withdrawn?: ReadonlySet<string>,
): { onMap: OnMap; stepAnswer: StepAnswer } {
  const stepAnswer = useStepAnswer(bubbles, replied.steps, withdrawn);
  return { onMap: { ...replied, steps: stepAnswer.steps }, stepAnswer };
}
