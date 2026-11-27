/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MapScene, Plan } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import type { StudyInput } from '@/api/study-plan-types';
import { koreaClock } from '@/korea-time';
import STORED from './study-answer.json';

// "공부할 자리 있어?" answered alone (P10 tickets 17 and 23), as the main server sends it to the app, which says `study-plan`: the stored answer of
// main-server's `test/fixtures/study-answer.ts` (Wednesday 2026-11-04 at 19:10, the User at 301동 with nothing after it),
// each Plan's scene drawn as `study-plan-parts.ts` draws it. The stored scenes hold each Plan's own building alone;
// the main server's hold every ranked building, its own the pick and the others numbered candidates, the buildings no
// one may use but their students as `dropped` with their space and whose they are, the User at where they set out from,
// and the pick's arrival "19:12 공부".

const SET_OUT = { latitude: 37.4501, longitude: 126.9524 };
const SET_OUT_LABEL = '301동';

function storedAnswer(): AnswerReply & { input: StudyInput } {
  const copy: unknown = STORED;
  if (!isAnswerReply(copy) || copy.input.kind !== 'study') {
    throw new Error('The stored study answer fails the check of a reply');
  }
  return { ...copy, input: copy.input };
}

// A place's tag as the main server writes it (`tagOf`): its best space with its closing, or "시간 모름".
function tagOf(plan: Plan): string {
  const [first] = plan.lines;
  return first === undefined ? plan.place.label : first.map(({ text }) => text).join('');
}

// The dropped buildings' tags ("열람실 · 경영대학"): their space, and whose they are, from the reason's words.
const DROPPED_TAGS: Readonly<Record<string, string>> = { 경영학도서관: '열람실 · 경영대학' };

function sceneOf(plan: Plan, index: number, answer: AnswerReply): MapScene {
  const me = plan.parts.find((part) => part.me)?.userId ?? '';
  const pick = { latitude: plan.place.latitude, longitude: plan.place.longitude };
  return {
    people: [{ userId: me, name: '나', me: true, at: SET_OUT, source: 'timetable', tag: SET_OUT_LABEL }],
    places: [
      ...answer.plans.map((one, order) => ({
        place: one.place,
        role: order === index ? ('pick' as const) : ('candidate' as const),
        tag: tagOf(one),
        order: order + 1,
      })),
      ...answer.dropped.map(({ place }) => ({
        place,
        role: 'dropped' as const,
        tag: DROPPED_TAGS[place.label] ?? null,
      })),
    ],
    routes: plan.scene.routes,
    flags: [{ at: pick, text: `${koreaClock(plan.startAt)} 공부`, role: 'place' }],
  };
}

function withScenes(answer: AnswerReply & { input: StudyInput }): AnswerReply & { input: StudyInput } {
  return { ...answer, plans: answer.plans.map((plan, index) => ({ ...plan, scene: sceneOf(plan, index, answer) })) };
}

export const STUDY_PLAN_ANSWER = withScenes(storedAnswer());

// The words `study-plan-words.ts` gives the answer: why its first comes first, with nothing after it that day.
export const STUDY_PLAN_REPLY: AssistantReply & { answer: AnswerReply } = {
  text: '가장 오래 있을 수 있는 공대 신양학술정보관을 추천해요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: STUDY_PLAN_ANSWER,
};
