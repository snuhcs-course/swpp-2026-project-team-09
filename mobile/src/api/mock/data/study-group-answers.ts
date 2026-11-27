/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import type { StudyInput } from '@/api/study-plan-types';
import gathering from './study-group-gathering.json';
import moreNeeded from './study-group-more-needed.json';
import ready from './study-group-ready.json';
import toSend from './study-group-to-send.json';

// The main server's study answers together (P10 ticket 07), copied as JSON from its own fixtures
// (`main-server/test/fixtures/study-group-answers.ts`): asked on Wednesday 2026-11-04 at 19:10, the User and three
// Friends are all free the next day from 15:00, so the plan is a 관정 4층 6인실 from 15:00 to 17:00. The answer to send,
// the same answer rebuilt while one of three has consented and once all have, and the one with two Friends only.

export type StudyAnswer = AnswerReply & { input: StudyInput };

function checked(copy: unknown): StudyAnswer {
  if (!isAnswerReply(copy) || copy.input.kind !== 'study') {
    throw new Error('The stored answer of studying together fails the check of a reply');
  }
  return { ...copy, input: copy.input };
}

export const STUDY_GROUP_TO_SEND = checked(toSend);
export const STUDY_GROUP_GATHERING = checked(gathering);
export const STUDY_GROUP_READY = checked(ready);
export const STUDY_GROUP_MORE_NEEDED = checked(moreNeeded);

// "같이 공부할 자리 있어?" without a main server (P10 ticket 11): the answer to send when 민수 is named with the others,
// else the one short of one. The mock does not calculate.
export function studyGroupReplyTo(last: string): AssistantReply | null {
  if (!last.includes('같이 공부')) {
    return null;
  }
  const named = last.includes('민수');
  return {
    text: named ? '네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요.' : '',
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: named ? STUDY_GROUP_TO_SEND : STUDY_GROUP_MORE_NEEDED,
  };
}

// The copy for a study input: the answer to send with four people or more, and the one of three, short of one,
// otherwise. The mock does not calculate.
export function studyCopyFor(input: StudyInput): StudyAnswer {
  return input.people.length >= STUDY_GROUP_TO_SEND.input.people.length ? STUDY_GROUP_TO_SEND : STUDY_GROUP_MORE_NEEDED;
}
