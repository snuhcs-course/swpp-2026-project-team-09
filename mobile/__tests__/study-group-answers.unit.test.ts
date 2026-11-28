/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RequestContext } from '@/api/assistant-types';
import { ANSWER_CAPABILITIES } from '@/api/capabilities';
import { mockAssistantReply, mockRecalculation } from '@/api/mock/assistant';
import { STUDY_GROUP_MORE_NEEDED, STUDY_GROUP_TO_SEND, studyGroupReplyTo } from '@/api/mock/data/study-group-answers';
import { STUDY_PLAN_REPLY } from '@/api/mock/data/study-plan-answer';
import { isAnswerReply } from '@/api/server/plan-answers';
import {
  hasPeople,
  windowOf,
  withBound,
  withChosenRoom,
  withoutPerson,
  withPerson,
  withStart,
} from '@/features/assistant/plan-input';
import { addNameOf } from '@/screens/main/answer/who-words';
import alone from '@/api/mock/data/study-answer.json';
import gathering from '@/api/mock/data/study-group-gathering.json';
import moreNeeded from '@/api/mock/data/study-group-more-needed.json';
import ready from '@/api/mock/data/study-group-ready.json';
import toSend from '@/api/mock/data/study-group-to-send.json';

// The app reads a study answer with Friends (P10 ticket 09): the main server's copies of its own fixtures
// (`main-server/test/fixtures/study-answer.ts` and `study-group-answers.ts`, PR 643), as JSON.

const FIXTURES = { alone, gathering, moreNeeded, ready, toSend };

const CONTEXT: RequestContext = {
  location: { latitude: 37.45016, longitude: 126.95259 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

function firstGroupOf(copy: unknown): unknown {
  if (!isAnswerReply(copy)) {
    throw new Error('not an answer');
  }
  return copy.plans[0]?.study?.group;
}

// A copy of the answer to send with one change in its first plan's group.
function withGroup(change: Record<string, unknown>): unknown {
  const [plan, ...rest] = toSend.plans;
  return {
    ...toSend,
    plans: [{ ...plan, study: { ...plan?.study, group: { ...plan?.study.group, ...change } } }, ...rest],
  };
}

// Partitions: the answer alone, and the four answers together. Expected values: the server's fixtures.
describe('A study answer from the main server', () => {
  it.each(Object.entries(FIXTURES))('is read whole: %s', (_name, copy) => {
    expect(isAnswerReply(copy)).toBe(true);
  });

  it('keeps the group of the room to send: the kind with its library space, the people, the key, and no request yet', () => {
    expect(firstGroupOf(toSend)).toMatchObject({
      room: { spaceId: '4F-group-6', floor: 4, name: '6인실', space: { unit: 'room', roomNo: 141, sectorNo: 14103 } },
      people: 4,
      moreNeeded: 0,
      key: 'book:4F-group-6:2026-11-05:1500:120',
      request: null,
    });
  });

  it('keeps the request of the answer rebuilt from it, and the missing person of three', () => {
    expect(firstGroupOf(gathering)).toMatchObject({
      request: { status: 'gathering', consented: 1, asked: 3, waiting: ['박민수', '이서연'] },
    });
    expect(firstGroupOf(moreNeeded)).toMatchObject({ people: 3, moreNeeded: 1, key: null });
  });
});

// Partitions: a group missing its key, a count that is not a number, an unknown request status, a kind without its
// floor, and an input without `together`. Expected values: the server's DTO, which every one breaks.
describe('A study answer that breaks the contract', () => {
  it.each([
    ['a group without its key', withGroup({ key: undefined })],
    ['a count that is not a number', withGroup({ moreNeeded: '1' })],
    ['an unknown request status', withGroup({ request: { ...ready.plans[0]?.study.group.request, status: 'held' } })],
    ['a room kind without its floor', withGroup({ room: { spaceId: '4F-group-6', name: '6인실' } })],
    [
      'a room kind without its library space',
      withGroup({ room: { ...toSend.plans[0]?.study.group.room, space: undefined } }),
    ],
    ['an input without together', { ...toSend, input: { ...toSend.input, together: undefined } }],
  ])('is refused: %s', (_case, copy) => {
    expect(isAnswerReply(copy)).toBe(false);
  });
});

const STUDY = STUDY_GROUP_TO_SEND.input;
const FRIEND = '9f9f9f9f-0000-4000-8000-0000000000ff';

// Partitions: adding and removing a person, and fixing the window. Expected values: the meal's helpers, which carry
// the rest of the conditions over.
describe('A study input changed on the card', () => {
  it('has people, and "＋ 같이" names the Friend to study with', () => {
    expect(hasPeople(STUDY)).toBe(true);
    expect(addNameOf('study')).toBe('같이 공부할 친구 추가');
  });

  it('takes a Friend in and out, keeping together, the choice, and the length', () => {
    const added = withPerson(STUDY, FRIEND);
    expect(added).toMatchObject({ together: true, chosen: STUDY.chosen, minutes: 120 });
    expect(hasPeople(added) ? added.people.map(({ userId }) => userId) : []).toContain(FRIEND);

    const [, firstFriend] = STUDY.people;
    const removed = withoutPerson(STUDY, firstFriend?.userId ?? '');
    expect(removed).toMatchObject({ together: true, chosen: STUDY.chosen, minutes: 120 });
    expect(hasPeople(removed) ? removed.people : []).toHaveLength(3);
  });

  it('asks again with the kind of room chosen, and leaves other conditions as they are', () => {
    expect(withChosenRoom(STUDY, '2F-group-6')).toEqual({
      ...STUDY,
      chosen: { seatSpaceId: null, roomSpaceId: '2F-group-6' },
    });
    expect(withChosenRoom(mockRecalculation(STUDY).input, '2F-group-6').kind).toBe('study');
  });

  it('fixes its window from the band', () => {
    expect(windowOf(withBound(STUDY, 'from', '15:30'))).toEqual({ from: '15:30', until: null });
    expect(windowOf(withStart(STUDY, '16:00'))).toEqual({ from: '16:00', until: null });
  });
});

// Partitions: the capabilities sent today. Expected values: P10 ticket 16 turns study-group on; study-plan is ticket
// 23's (`mock-study-plan.unit`).
describe('The capabilities the app sends', () => {
  it('say study-group', () => {
    expect(ANSWER_CAPABILITIES).toContain('study-group');
  });
});

// Partitions: four people and three. Expected values: the mock's copies of the server's answers, which it does not
// calculate.
describe('A study input asked again without a main server', () => {
  it('answers with the room to send for four people, and with one more needed for three', () => {
    const four = mockRecalculation(STUDY);
    expect(four.input).toBe(STUDY);
    expect(four.plans[0]?.study?.group).toMatchObject({ people: 4, moreNeeded: 0 });

    const three = withoutPerson(STUDY, STUDY.people[1]?.userId ?? '');
    expect(mockRecalculation(three).plans[0]?.study?.group).toMatchObject({ people: 3, moreNeeded: 1 });
  });
});

// Partitions: the words with the Friends named, without, and other words. Expected values: the mock's copies (P10 ticket
// 11), which make the answer screen's pictures without a main server.
describe('Studying together asked without a main server', () => {
  it('answers the room to send with 민수 named, the one short of one without, and nothing to other words', () => {
    expect(studyGroupReplyTo('민수, 서연, 지은이랑 같이 공부할 자리 있어?')?.answer).toBe(STUDY_GROUP_TO_SEND);
    expect(studyGroupReplyTo('같이 공부할 자리 있어?')?.answer).toBe(STUDY_GROUP_MORE_NEEDED);
    expect(studyGroupReplyTo('공부할 자리 있어?')).toBeNull();
  });

  // With `study-plan` said too (P10 ticket 23), "공부할 자리 있어?" is the places to study alone (`mock-study-plan.unit`).
  it('answers "같이 공부할 자리 있어?" with the answer together, and "공부할 자리 있어?" with the places to study alone', () => {
    const together = mockAssistantReply([{ role: 'user', text: '같이 공부할 자리 있어?' }], CONTEXT);
    const studyAlone = mockAssistantReply([{ role: 'user', text: '공부할 자리 있어?' }], CONTEXT);

    expect(together.answer).toBe(STUDY_GROUP_MORE_NEEDED);
    expect(together.cards).toEqual([]);
    expect(studyAlone).toBe(STUDY_PLAN_REPLY);
  });
});
