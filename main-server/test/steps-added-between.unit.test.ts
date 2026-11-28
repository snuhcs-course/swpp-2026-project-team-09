/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { type LibraryCard } from '../src/assistant/library/library-card.js';
import { requestKey } from '../src/assistant/presented.js';
import { type AllStepsServices, presentAllSteps } from '../src/assistant/steps/all-steps.js';
import {
  answerOf,
  answerStepAt,
  at,
  contextWith,
  DATE,
  events,
  HALL,
  KWANJEONG,
  meal,
  services,
  stepOf,
} from './steps-fixtures.js';

// A step a follow-up adds between two steps on screen, and the steps a reply gives the app to send back, for an app
// that says `answers` (P05 ticket 74, the read of #710).

// A 7층 seat booked from 15:00 to 17:30.
const afternoonSeat: LibraryCard = {
  kind: 'library',
  library: {
    key: 'book:7F-7A-zone2:2087-01-07:1500:150',
    action: 'book',
    space: {
      id: '7F-7A-zone2',
      name: '7A 열람실 2 구역',
      floor: 7,
      kind: 'reading-room',
      placeNumber: '62-1',
      unit: 'seat',
      roomNo: 1,
      sectorNo: 2,
      seatNos: [],
      mapImage: null,
      hours: { open: '07:00', close: '23:00' },
      minMinutes: 60,
      maxMinutes: 240,
      stepMinutes: 30,
    },
    date: DATE,
    start: '15:00',
    minutes: 150,
    seat: null,
    useDesc: null,
    useDescOptions: null,
    pledge: null,
    companions: [],
    questId: null,
    notes: [],
    until: null,
    target: null,
  },
};

const kwanjeongPlace: PlaceDto = {
  id: KWANJEONG.placeId,
  number: '62-1',
  name: '관정도서관',
  latitude: 37.4596,
  longitude: 126.9497,
};

// The read of #710 (must fix): a step a follow-up adds between two on screen.
describe('A seat a follow-up adds between lunch and dinner on screen', () => {
  const lunch = meal('lunch');
  const dinner = meal('dinner', [
    { kind: 'from', placeId: 'lunch-place', source: 'step' },
    { kind: 'notBefore', time: '13:00', source: 'step' },
  ]);
  const lunchStep = answerStepAt(requestKey(lunch), '12:00', '13:00', {
    kind: 'meal',
    place: { ...HALL, placeId: 'lunch-place' },
  });
  const steps = [lunchStep, answerStepAt(requestKey(dinner), '17:00', '18:00', { kind: 'meal' })];
  const replanned = vi.fn<AllStepsServices['replan']>((input) => Promise.resolve(answerOf(input)));
  const seatServices = { ...services(replanned), kwanjeong: (): PlaceDto => kwanjeongPlace };

  it('is the step before dinner, which sets out from 관정 when the seat ends', async () => {
    const context = contextWith({ answers: [lunch, dinner], steps }, { cards: [afternoonSeat] });

    await presentAllSteps(context, seatServices);

    expect(context.presented.steps?.map(({ kind }) => kind)).toEqual(['meal', 'seat', 'meal']);
    expect(replanned).toHaveBeenCalledTimes(1);
    expect(replanned.mock.calls[0]?.[0].people[0]?.constraints).toEqual([
      { kind: 'from', placeId: KWANJEONG.placeId, source: 'step' },
      { kind: 'notBefore', time: '17:30', source: 'step' },
    ]);
  });

  it('plans nothing again when those steps come back with nothing changed ("고마워")', async () => {
    replanned.mockClear();
    const chained = meal('dinner', [
      { kind: 'from', placeId: KWANJEONG.placeId, source: 'step' },
      { kind: 'notBefore', time: '17:30', source: 'step' },
    ]);
    const seat = stepOf({
      startAt: at('15:00'),
      endAt: at('17:30'),
      shows: { kind: 'card', key: afternoonSeat.library.key },
    });
    const back = [lunchStep, seat, answerStepAt(requestKey(chained), '17:35', '18:35', { kind: 'meal' })];
    const context = contextWith({ answers: [lunch, chained], steps: back });

    await presentAllSteps(context, seatServices);

    expect(replanned).not.toHaveBeenCalled();
    expect(context.presented.steps).toHaveLength(3);
  });
});

// The read of #710 (worth a look): the steps a reply gives fit what the app may send back.
describe('The steps given', () => {
  it('have titles no longer than the app may send back', async () => {
    const long = 'ㄱ'.repeat(300);
    const event = answerStepAt(requestKey(events), '15:00', '16:00', { title: long });
    const context = contextWith({ answers: [events], steps: [stepOf({}), event] });

    await presentAllSteps(
      context,
      services(() => Promise.reject(new Error('fixed'))),
    );

    expect(context.presented.steps?.[1]?.title).toHaveLength(200);
  });
});
