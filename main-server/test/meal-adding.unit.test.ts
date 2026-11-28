/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { vi } from 'vitest';
import { type AnswerReply, type MealInput, type Plan } from '../src/assistant/dto/answer.dto.js';
import { addingDto, addingTo, asHeld, pinnedTo, withItsPeople } from '../src/assistant/gathering/meal-adding.js';
import { addingWords } from '../src/assistant/gathering/meal-tool-words.js';
import { mealChangeable } from '../src/assistant/gathering/meal-plan-parts.js';
import { type KeptQuest } from '../src/quests/kept-quests.js';
import { type HeldMeal } from '../src/quests/held-meal.js';

// A Friend added to the meal the asker already holds (P05 ticket 44). The asker's lunch at 302동식당 from 12:16, made
// with 민수, who entered it; 지은 is the Friend to add, 하은 another.

const ME = 'me';
const MINSU = 'minsu';
const JIEUN = 'jieun';
const HAEUN = 'haeun';
const PLACE_302 = 'place-302';
const STARTS = new Date('2101-03-01T12:16:00+09:00');

const heldWith = (otherIds: string[], invitedIds: string[] = []): HeldMeal => ({
  id: 'quest',
  title: '302동식당에서 점심',
  startsAt: new Date('2101-03-01T12:00:00+09:00'),
  subQuestIds: ['merging', 'meal'],
  others: otherIds.map((id) => `${id}-name`),
  otherIds,
  invitedIds,
  meal: { placeId: PLACE_302, startsAt: STARTS },
});

const lunchOf = (...people: string[]): MealInput => ({
  kind: 'meal',
  date: '2101-03-01',
  meal: 'lunch',
  people: [ME, ...people].map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null, now: true },
  placeId: null,
});

const PLAN: Plan = {
  id: '302동식당',
  title: '302동식당에서 점심',
  place: { placeId: PLACE_302, label: '302동식당', latitude: 0, longitude: 0 },
  startAt: '2101-03-01T12:16:00+09:00',
  endAt: '2101-03-01T13:00:00+09:00',
  togetherMinutes: 44,
  meeting: null,
  parts: [],
  subQuests: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: {
    range: { startAt: '2101-03-01T11:30:00+09:00', endAt: '2101-03-01T13:30:00+09:00' },
    now: '2101-03-01T10:30:00+09:00',
    lanes: [],
    startAt: '2101-03-01T12:16:00+09:00',
    endAt: '2101-03-01T13:00:00+09:00',
    text: '12:16–13:00 · 식사 44분',
  },
};

const idsOf = ({ people }: MealInput): string[] => people.map(({ userId }) => userId);

describe('The Friends a plan adds to the meal held', () => {
  it('are those asked for beside everyone in it, at its Place and from its start, by its Restaurant', () => {
    expect(addingTo(heldWith([MINSU]), lunchOf(MINSU, JIEUN))).toEqual({
      friendIds: [JIEUN],
      placeId: PLACE_302,
      startsAt: STARTS,
      key: '302동식당',
    });
  });

  it('are none when nobody new is asked for, when someone in it is left out, or when no meal is held', () => {
    expect(addingTo(heldWith([MINSU, JIEUN]), lunchOf(MINSU, JIEUN))).toBeNull();
    expect(addingTo(heldWith([MINSU]), lunchOf(JIEUN))).toBeNull();
    expect(addingTo(null, lunchOf(JIEUN))).toBeNull();
  });

  it('are anyone asked for when the asker holds it alone', () => {
    expect(addingTo(heldWith([]), lunchOf(JIEUN))?.friendIds).toEqual([JIEUN]);
  });

  it('plan the meal at its Place from its start, with nothing else of the window kept', () => {
    const adding = addingTo(heldWith([MINSU]), lunchOf(MINSU, JIEUN));
    if (adding === null) {
      throw new Error('지은 is added');
    }

    expect(pinnedTo(lunchOf(MINSU, JIEUN), adding)).toMatchObject({
      placeId: PLACE_302,
      window: { from: '12:16', until: null },
    });
  });
});

describe('A Friend asked for by the model', () => {
  it('is asked for with everyone in the meal held, before them', () => {
    expect(idsOf(withItsPeople(lunchOf(JIEUN), heldWith([MINSU, HAEUN], [HAEUN])))).toEqual([ME, MINSU, HAEUN, JIEUN]);
  });

  it('keeps the input as it is when they are all in it already, or none is asked for, or no meal is held', () => {
    const asked = lunchOf(MINSU);

    expect(withItsPeople(asked, heldWith([MINSU, JIEUN]))).toBe(asked);
    expect(withItsPeople(lunchOf(), heldWith([MINSU]))).toEqual(lunchOf());
    expect(withItsPeople(asked, null)).toBe(asked);
  });
});

// A Plan with only its start, which is all `addingDto` reads.
const planAt = (startAt: string): Plan => ({ ...PLAN, startAt });

describe('What the app reads of the Friends added', () => {
  const adding = { friendIds: [JIEUN], placeId: PLACE_302, startsAt: STARTS, key: '302동식당' };
  const people = [{ userId: JIEUN, name: '지은' }];

  it('names them, with the meal kept at its start', () => {
    expect(addingDto(adding, people, [planAt('2101-03-01T12:16:00+09:00')])).toEqual({
      adding: { friends: [{ userId: JIEUN, name: '지은' }], startAt: '2101-03-01T12:16:00+09:00', movesTo: null },
    });
  });

  it('gives the start the first plan moves the meal to', () => {
    expect(addingDto(adding, people, [planAt('2101-03-01T12:58:00+09:00')]).adding?.movesTo).toBe(
      '2101-03-01T12:58:00+09:00',
    );
  });

  it('moves nothing when there is no plan', () => {
    expect(addingDto(adding, people, []).adding?.movesTo).toBeNull();
  });
});

const kept = (people: KeptQuest['people']): Pick<KeptQuest, 'people' | 'changeable'> => ({ people, changeable: true });

describe('A meal held, asked for with more Friends than are in it', () => {
  it('is changeable in place, those who declined being asked again', () => {
    const minsuIn = { userId: MINSU, name: '민수', answer: 'accepted' as const };
    const jieunDeclined = { userId: JIEUN, name: '지은', answer: 'declined' as const };

    expect(mealChangeable(kept([minsuIn]), [MINSU, JIEUN], true)).toBe(true);
    expect(mealChangeable(kept([minsuIn, jieunDeclined]), [MINSU, JIEUN], true)).toBe(true);
    expect(mealChangeable(kept([]), [JIEUN], false)).toBe(true);
  });

  it('is not changeable when someone in it is left out', () => {
    expect(mealChangeable(kept([{ userId: MINSU, name: '민수', answer: 'waiting' }]), [JIEUN], true)).toBe(false);
  });
});

// P05 ticket 85: no plan has 지은 in it, so the lunch is shown as it is held, with why she cannot join it.
const partOf = (userId: string): Plan['parts'][number] => ({
  userId,
  name: userId,
  me: false,
  origin: null,
  leaveAt: null,
  walkMinutes: null,
  leaveBy: null,
  next: null,
});

const ADDING_JIEUN = { friendIds: [JIEUN], placeId: PLACE_302, startsAt: STARTS, key: '302동식당' };

const answerOf = (plans: Plan[], reasons: string[], note?: string): AnswerReply => ({
  input: lunchOf(MINSU, JIEUN),
  chips: [],
  plans,
  dropped: [],
  noPlan:
    plans.length > 0 ? null : { reason: 'no-shared-time', lines: reasons.map((text) => [{ text, strong: false }]) },
  ...(note === undefined ? {} : { note }),
});

const HELD = answerOf([PLAN], []);

describe('The Friends added, when no plan has them in it', () => {
  const names = { adding: ADDING_JIEUN, people: [{ userId: JIEUN, name: '지은' }], meal: 'lunch' as const };
  const heldFor = vi.fn((isKept: (userId: string) => boolean) => (isKept(JIEUN) ? answerOf([], []) : HELD));

  it('shows the meal as it is held for everyone but them, with the reasons that name them as its note', () => {
    const late = answerOf([], ['지은은 12:33에야 도착해요', '12:30 수업에 가려면 12:11엔 나서야 해요']);

    expect(asHeld(late, names, heldFor)).toEqual({
      ...late,
      plans: [PLAN],
      noPlan: null,
      note: '지은은 12:33에야 도착해요\n12:30 수업에 가려면 12:11엔 나서야 해요',
    });
  });

  it('names them when the reasons do not, before the note the answer had', () => {
    const none = answerOf([], ['그 시간에는 같이 비는 시간이 없어요'], '시간표를 넣으면 더 정확해요');

    expect(asHeld(none, names, heldFor).note).toBe('지은은 이 점심에 시간이 안 돼요\n시간표를 넣으면 더 정확해요');
  });

  it('leaves an answer with a plan, one adding nobody, and one whose meal cannot be planned as held either', () => {
    const late = answerOf([], ['지은은 12:33에야 도착해요']);

    expect(asHeld(HELD, names, heldFor)).toBe(HELD);
    expect(asHeld(late, { ...names, adding: null }, heldFor)).toBe(late);
    expect(asHeld(late, names, () => answerOf([], []))).toBe(late);
  });
});

describe('What the model is told of the Friends added', () => {
  const shown = {
    ...HELD,
    adding: { friends: [{ userId: JIEUN, name: '지은' }], startAt: PLAN.startAt, movesTo: null },
  };
  const withHer = { ...shown, plans: [{ ...PLAN, parts: [partOf(JIEUN)] }] };

  it('says they do not fit, and why, when the plan has no part of theirs', () => {
    expect(addingWords({ ...shown, note: '지은은 12:33에야 도착해요' }, [])).toMatchObject({
      adding: { fits: false, why: '지은은 12:33에야 도착해요' },
    });
  });

  it('says they fit, with no why, when it has', () => {
    expect(addingWords(withHer, [])).toMatchObject({ adding: { fits: true } });
    expect(addingWords(withHer, [])).not.toMatchObject({ adding: { why: expect.anything() as unknown } });
  });
});
