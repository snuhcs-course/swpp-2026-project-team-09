/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type Presented, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { mealAsk } from '../src/assistant/gathering/meal-after-hours.js';
import {
  askedReply,
  askPast,
  askPastTime,
  hasPassed,
  namedTimeAsk,
  pastTimeRule,
  questionOf,
} from '../src/assistant/past-time.js';

// A time of today the User named that has passed is asked back before anything is planned (P05 ticket 80). On the phone
// at 11:13, "아침 7시에 도서관 갔다가 점심" was answered at once for 내일(일). Expected: "오늘 아침 7시는 지났어요. 내일로
// 볼까요?" with 내일로 and 오늘 지금부터, one question for the whole message, and nothing drawn before the choice.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const at = (time: string): Date => new Date(`2026-11-28T${time}:00+09:00`);

const emptyPresented = (): Presented => ({
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
});

function contextAt(time: string): ToolContext {
  return {
    userId: ME,
    now: at(time),
    context: NO_CONTEXT,
    capabilities: new Set<ClientCapability>(['answer', 'answers']),
    found: new FoundIds(),
    shown: null,
    presented: emptyPresented(),
    judged: new Map(),
    restaurants: new Map(),
  };
}

// Partitions: a clock time before now, at this minute, and after it; a part of the day before its end, at it, after it.
describe('A time of today that has passed', () => {
  it.each([
    [{ at: '07:00' }, '11:13', true],
    [{ at: '11:12' }, '11:13', true],
    [{ at: '11:13' }, '11:13', false],
    [{ at: '19:00' }, '11:13', false],
    [{ part: 'morning' as const }, '10:59', false],
    [{ part: 'morning' as const }, '11:00', true],
    [{ part: 'lunch' as const }, '14:29', false],
    [{ part: 'lunch' as const }, '14:30', true],
    [{ part: 'evening' as const }, '21:00', false],
    [{ part: 'dawn' as const }, '06:30', true],
  ])('%o at %s has passed: %s', (time, now, passed) => {
    expect(hasPassed(time, at(now))).toBe(passed);
  });
});

describe('The question back', () => {
  it('names the time and asks for tomorrow', () => {
    expect(questionOf(namedTimeAsk('아침 7시'))).toBe('오늘 아침 7시는 지났어요. 내일로 볼까요?');
    expect(questionOf(namedTimeAsk('오늘 점심'))).toBe('오늘 점심은 지났어요. 내일로 볼까요?');
  });

  it('sends, for each button, the time named on the next day and today from now', () => {
    expect(namedTimeAsk('아침 7시')).toEqual({
      named: '아침 7시',
      tomorrow: '내일 아침 7시로 해 줘',
      today: '오늘 지금부터 해 줘',
    });
    expect(namedTimeAsk('점심').tomorrow).toBe('내일 점심으로 해 줘');
    expect(namedTimeAsk('07:00').tomorrow).toBe('내일 07:00으로 해 줘');
  });

  it('is asked once for the message, the first time that passed', () => {
    const presented = emptyPresented();
    askPast(presented, namedTimeAsk('아침 7시'));
    askPast(presented, namedTimeAsk('10시'));

    expect(presented.asks).toEqual({
      text: '오늘 아침 7시는 지났어요. 내일로 볼까요?',
      offers: [
        { kind: 'ask', label: '내일로', text: '내일 아침 7시로 해 줘' },
        { kind: 'ask', label: '오늘 지금부터', text: '오늘 지금부터 해 줘' },
      ],
    });
  });

  it('has no 오늘 지금부터 when nothing is left of today for it', () => {
    const presented = emptyPresented();
    askPast(presented, mealAsk('dinner', { laterToday: false }, []));

    expect(presented.asks).toEqual({
      text: '오늘 저녁 시간은 지났어요. 내일로 볼까요?',
      offers: [{ kind: 'ask', label: '내일로', text: '내일 저녁으로 해 줘' }],
    });
  });
});

// The meal's own check, the one mechanism with the same buttons: lunch named at 15:00, a meal named none after dinner.
describe("A meal's question back once it is over today", () => {
  it('asks for tomorrow’s lunch or today from now, with the same Friends', () => {
    expect(mealAsk('lunch', { laterToday: true }, ['민수'])).toEqual({
      named: '점심 시간',
      tomorrow: '민수와 내일 점심으로 해 줘',
      today: '민수와 오늘 지금부터 해 줘',
    });
  });

  it('asks for tomorrow’s lunch alone when the User named no meal and dinner is over', () => {
    expect(mealAsk(undefined, { laterToday: false }, [])).toEqual({
      named: '식사 시간',
      tomorrow: '내일 점심으로 해 줘',
      today: null,
    });
  });
});

describe('askPastTime', () => {
  it('asks back about a time of today before now', async () => {
    const context = contextAt('11:13');

    const result = await askPastTime().run({ named: '아침 7시', at: '07:00' }, context);

    expect(result).toMatchObject({ result: 'asked' });
    expect(context.presented.asks?.text).toBe('오늘 아침 7시는 지났어요. 내일로 볼까요?');
  });

  it('asks back about a part of the day that is over', async () => {
    const context = contextAt('15:00');

    const result = await askPastTime().run({ named: '점심', part: 'lunch' }, context);

    expect(result).toMatchObject({ result: 'asked' });
    expect(context.presented.asks?.offers.map(({ label }) => label)).toEqual(['내일로', '오늘 지금부터']);
  });

  it('lets a time still to come today go on, asking nothing', async () => {
    const context = contextAt('06:30');

    const result = await askPastTime().run({ named: '아침 7시', at: '07:00' }, context);

    expect(result).toMatchObject({ result: 'not-past' });
    expect(context.presented.asks).toBeUndefined();
  });

  it('refuses a time with neither a clock time nor a part of the day', async () => {
    const context = contextAt('11:13');

    expect(await askPastTime().run({ named: '그때' }, context)).toMatchObject({ result: 'refused' });
    expect(context.presented.asks).toBeUndefined();
  });
});

describe('The Past times line the model reads', () => {
  it('gives the time now and what of today is over', () => {
    const rule = pastTimeRule(at('11:13'));

    expect(rule).toContain('now is 11:13');
    expect(rule).toContain('새벽, 아침 are over');
    expect(rule).toContain('점심 14:30');
    expect(rule).toContain('askPastTime');
    expect(rule).toContain('Never move it to another day yourself');
  });

  it('says none is over early in the morning', () => {
    expect(pastTimeRule(at('05:00'))).toContain('none of them is over yet');
  });
});

describe('The reply of a message that asked back, beside a request that ended with none', () => {
  it('keeps the answers that request took off the screen', () => {
    const presented: Presented = { ...emptyPresented(), withdrawn: ['meal 2026-11-28 lunch alone'], clears: true };
    askPast(presented, namedTimeAsk('점심'));

    expect(askedReply(presented)).toMatchObject({ withdrawn: ['meal 2026-11-28 lunch alone'], clears: true });
  });

  it('is left to the run when nothing was asked', () => {
    expect(askedReply(emptyPresented())).toBeNull();
  });
});
