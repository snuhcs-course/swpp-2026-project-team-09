/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { FreeTimeStage, inKorea, shownCards } from './free-time.js';
import { storeEvent } from './quests.js';

// The cards of a reply after findFreeTimeEvents: their 이동 시간 fields and their order across kinds, with the scripted
// model in the model's place.

const stage = new FreeTimeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

describe('The cards after a run that called findFreeTimeEvents', () => {
  it('carry the 이동 시간 box in its forms, soonest first across kinds, whatever order they were shown in', async () => {
    const date = '2098-03-17';
    const { here, near, prisma } = stage;
    await stage.asking(date);
    const before = await stage.classOn('monday', '09:00', '10:00', here.id);
    const after = await stage.classOn('monday', '15:00', '16:00', near.id);
    const timed = await stage.questAt({ date, start: '11:00', end: '12:00', place: { placeId: near.id } });
    const open = await stage.questAt({ date, start: '13:00', place: { placeId: here.id } });
    const event = await storeEvent(prisma, {
      title: '긴 전시',
      startsAt: new Date(inKorea(date, '10:30')),
      endsAt: new Date(inKorea(date, '19:00')),
      place: '제1공학관 로비',
      latitude: here.latitude,
      longitude: here.longitude,
    });

    const response = await stage.send(
      { tool: 'findFreeTimeEvents', input: { date, from: before, to: after } },
      { tool: 'showQuests', input: { ids: [open, timed] } },
      { tool: 'showGlobalEvents', input: { ids: [event.id] } },
      { text: '…' },
    );

    expect(response.status).toBe(200);
    expect(shownCards(response.body)).toEqual([
      { id: event.id, rest: { travel: { mode: 'walk', minutes: 0 }, leaveBy: '14:52' } },
      { id: timed, rest: { travel: { mode: 'shuttle', minutes: 7 }, next: { minutes: 0, isClass: true } } },
      { id: open, rest: { travel: { mode: 'walk', minutes: 0 }, leaveBy: '14:52', endUnknown: true } },
    ]);
  });
});

describe('The order of the cards after a run that called findFreeTimeEvents', () => {
  it('puts a Quest by the Sub Quest judged in the gap, not the one its card shows', async () => {
    const date = '2098-03-24';
    const { here, prisma } = stage;
    await stage.asking(date);
    const from = await stage.classOn('monday', '14:00', '15:00', here.id);
    const place = { placeId: here.id };
    const shownSooner = await stage.questAt({ date, start: '12:00', place }, '오전에도 만나는 모임');
    const soon = await stage.questAt({ date, start: '16:00', place });
    await prisma.subQuest.create({
      data: { questId: shownSooner, title: '저녁', startsAt: new Date(inKorea(date, '17:00')), placeId: here.id },
    });

    const response = await stage.send(
      { tool: 'findFreeTimeEvents', input: { date, from, to: 'end' } },
      { tool: 'showQuests', input: { ids: [shownSooner, soon] } },
      { text: '…' },
    );

    expect(shownCards(response.body)).toEqual([
      { id: soon, rest: { travel: { mode: 'walk', minutes: 0 } } },
      { id: shownSooner, rest: { travel: { mode: 'walk', minutes: 0 } } },
    ]);
  });

  it('keeps the cards of other tools after them, with no box', async () => {
    const date = '2098-03-31';
    await stage.asking(date);
    const from = await stage.classOn('monday', '09:00', '10:00', stage.here.id);
    const place = { placeId: stage.here.id };
    const candidate = await stage.questAt({ date, start: '12:00', place });
    const otherDay = await stage.questAt({ date: '2098-04-02', start: '12:00', place });

    const response = await stage.send(
      { tool: 'searchRecruitingQuests', input: { from: '2098-04-02', to: '2098-04-02' } },
      { tool: 'showQuests', input: { ids: [otherDay] } },
      { tool: 'findFreeTimeEvents', input: { date, from, to: 'end' } },
      { tool: 'showQuests', input: { ids: [candidate] } },
      { text: '…' },
    );

    expect(shownCards(response.body)).toEqual([
      { id: candidate, rest: { travel: { mode: 'walk', minutes: 0 } } },
      { id: otherDay, rest: {} },
    ]);
  });
});

describe('The cards of a run that did not call findFreeTimeEvents', () => {
  it('stay as they were shown', async () => {
    const date = '2098-04-07';
    await stage.asking(date);
    const place = { placeId: stage.here.id };
    const later = await stage.questAt({ date, start: '16:00', place });
    const sooner = await stage.questAt({ date, start: '12:00', place });

    const response = await stage.send(
      { tool: 'searchRecruitingQuests', input: { from: date, to: date } },
      { tool: 'showQuests', input: { ids: [later, sooner] } },
      { text: '…' },
    );

    expect(shownCards(response.body)).toEqual([
      { id: later, rest: {} },
      { id: sooner, rest: {} },
    ]);
  });
});
