/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from '@/api/assistant-types';
import { DAY_LOOKUP } from '@/api/mock/data/day-lookup';
import { FRIEND_LOOKUP } from '@/api/mock/data/friend-lookup';
import { MENU_LOOKUP } from '@/api/mock/data/menu-lookup';
import { REFUSAL_REPLIES, type RefusalReply } from '@/api/mock/data/refusals';
import { STUDY_LOOKUP } from '@/api/mock/data/study-lookup';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { LEAVE_LOOKUP_REPLY, NOT_RUNNING_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { lookupRestOf, wordsRestOf } from '@/screens/main/answer/words-rest';

// P04 ticket 05: which reply rests in the dock with which one line and chips. Partitions: each Lookup kind the map
// draws or not, a day's, one beside a refusal; a refusal with buttons and with Friends to pick, each failure, a question
// back, an answer with an offer, and plain words.

const WORDS = '모델의 말이에요.';
// What the main server writes beside a reply without the model's words (its `wordless-reply.ts`).
const STAND_IN = '아래에서 확인해 보세요.';

function said(line: AnswerLine | null | undefined): string | null {
  return line === null || line === undefined ? null : line.map(({ text }) => text).join('');
}

function copy(words: string): RefusalReply {
  const reply = REFUSAL_REPLIES.get(words);
  if (reply === undefined) {
    throw new Error(`No stored refusal for ${words}`);
  }
  return reply;
}

function bubble(parts: Partial<ChatBubble>): ChatBubble {
  return { id: 1, role: 'assistant', text: WORDS, cards: [], mapButtons: [], proposal: null, failure: null, ...parts };
}

describe('a Lookup in the dock', () => {
  it("has the model's words as its line for a way the map draws, and no line and 근거 when it said nothing", () => {
    expect(lookupRestOf(WAY_LOOKUP, null, WORDS)).toEqual({
      line: [{ text: WORDS, strong: false }],
      offers: [],
      retry: false,
      note: null,
      basis: false,
    });
    expect(lookupRestOf(WAY_LOOKUP, null, '')).toEqual({
      line: null,
      offers: [],
      retry: false,
      note: null,
      basis: true,
    });
    expect(lookupRestOf(LEAVE_LOOKUP_REPLY.lookup, null, '')?.line).toBeNull();
    // A blank text, as the main server sends when the map says it all, is no words either.
    expect(lookupRestOf(WAY_LOOKUP, null, '  \n')?.line).toBeNull();
  });
});

describe("a Lookup's line in the dock", () => {
  it("has the model's words as its line, which are never dropped (ticket 18)", () => {
    expect(said(lookupRestOf(NOT_RUNNING_LOOKUP_REPLY.lookup, null, WORDS)?.line)).toBe(WORDS);
    expect(said(lookupRestOf(MENU_LOOKUP, null, WORDS)?.line)).toBe(WORDS);
  });

  it('has its headline for words the map does not show when the model said nothing', () => {
    expect(said(lookupRestOf(NOT_RUNNING_LOOKUP_REPLY.lookup, null, '')?.line)).toBe(
      '셔틀은 지금 다니지 않아요 (평일 8–21시)',
    );
    expect(said(lookupRestOf(MENU_LOOKUP, null, '')?.line)).toBe('301동식당 오늘 점심은 부대짬뽕&군만두');
    expect(said(lookupRestOf(FRIEND_LOOKUP, null, '')?.line)).toBe('민수는 지금 302동이에요');
  });

  it("takes a study area's ask as a chip", () => {
    const rest = lookupRestOf(STUDY_LOOKUP, null, '');

    expect(said(rest?.line)).toBe('보는 범위에선 공대 신양학술정보관');
    expect(rest?.offers).toEqual([{ kind: 'ask', label: '관정 보기', text: '관정 지금 자리 있어?' }]);
  });

  it("takes the main server's stand-in sentence for no words: the headline is the line, and a day stays open", () => {
    expect(said(lookupRestOf(NOT_RUNNING_LOOKUP_REPLY.lookup, null, STAND_IN)?.line)).toBe(
      '셔틀은 지금 다니지 않아요 (평일 8–21시)',
    );
    expect(said(lookupRestOf(STUDY_LOOKUP, null, STAND_IN)?.line)).toBe('보는 범위에선 공대 신양학술정보관');
    expect(lookupRestOf(DAY_LOOKUP, null, STAND_IN)).toBeNull();
  });

  it("keeps a day's card open when the model said nothing, and docks it under the model's words", () => {
    expect(lookupRestOf(DAY_LOOKUP, null, '')).toBeNull();
    expect(said(lookupRestOf(DAY_LOOKUP, null, WORDS)?.line)).toBe(WORDS);
  });

  it("has the refusal's line beside a Lookup the map draws, and none of the Lookup's asks", () => {
    const { lookup, refusal } = copy('신양 스터디룸 예약해 줘');
    if (lookup === null || lookup === undefined) {
      throw new Error('The copy keeps a Lookup');
    }

    expect(said(lookupRestOf(lookup, refusal, WORDS)?.line)).toBe('앱이 예약하는 곳은 관정뿐이에요');
    expect(lookupRestOf(lookup, refusal, WORDS)?.offers).toEqual([]);
  });
});

describe('words that are no answer, in the dock', () => {
  it("has a refusal's first line and its buttons", () => {
    const { refusal } = copy('자료구조 과제 풀어 줘');
    const rest = wordsRestOf(bubble({ refusal }));

    expect(said(rest?.line)).toBe('과제는 도와 드릴 수 없어요.');
    expect(rest?.offers.map(({ label }) => label)).toEqual(['배고파', '공부할 자리', '오늘 볼 만한 거 있어?']);
  });

  it('keeps the question of which Friend open', () => {
    expect(wordsRestOf(bubble({ refusal: copy('민수랑 점심').refusal }))).toBeNull();
  });

  it("has a failure's first line, with 다시 시도 only when the Assistant may get over it", () => {
    const unavailable = wordsRestOf(
      bubble({ failure: 'unavailable', text: '답을 가져오지 못했어요.\n다시 해 보세요.' }),
    );

    expect(said(unavailable?.line)).toBe('답을 가져오지 못했어요.');
    expect(unavailable?.retry).toBe(true);
    expect(wordsRestOf(bubble({ failure: 'usedUp' }))?.retry).toBe(false);
  });

  it("has a question back's line with its offers, and keeps an answer with an offer and plain words open", () => {
    const next = [{ kind: 'ask' as const, label: '내일 점심 보기', text: '내일 점심 먹을 곳' }];
    const way = [{ kind: 'ask' as const, label: '가는 길 보기', text: '가는 길' }];

    expect(wordsRestOf(bubble({ offers: next, text: '오늘 점심은 끝났어요. **내일 점심**을 볼까요?' }))).toEqual({
      line: [{ text: '오늘 점심은 끝났어요. 내일 점심을 볼까요?', strong: false }],
      offers: next,
      retry: false,
      note: null,
      basis: false,
    });
    expect(wordsRestOf(bubble({ offers: way, text: '**두레문예관**에서 받아요.\n평일에 받아요.' }))).toBeNull();
    expect(wordsRestOf(bubble({}))).toBeNull();
  });
});
