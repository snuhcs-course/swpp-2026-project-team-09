/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MealInput, type Plan } from '../src/assistant/dto/answer.dto.js';
import { addingDto, addingTo, pinnedTo, withItsPeople } from '../src/assistant/gathering/meal-adding.js';
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
