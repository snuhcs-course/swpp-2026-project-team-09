/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { ownQuest } from './quests.js';
import { FreeTimeStage, inKorea, ROOM, subQuestOf } from './free-time.js';

// The 공강 tools at the Assistant's endpoint, with the scripted model in the model's place, for what the P4 world does
// not reach: asking about an item without a Place, and what the model is given. The judgement suite checks the rest
// against the labels.

const stage = new FreeTimeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

describe('An item of mine without a Place before the gap', () => {
  const date = '2098-01-06';

  it('asks where the User leaves from, and judges from the Place they give, for that message only', async () => {
    const { here, near, model } = stage;
    await stage.asking(date);
    const item = await stage.classOn('monday', '09:00', '10:00', null);
    const questId = await stage.questAt({ date, start: '10:30', end: '11:00', place: { placeId: near.id } });
    const input = { date, from: item, to: 'end' };

    await stage.send({ tool: 'findFreeTimeEvents', input }, { text: '어디서 출발하세요?' });

    expect(model.toolResults()[0]).toMatchObject({ result: 'needs', needs: { side: 'before' } });
    expect(JSON.stringify(model.toolResults()[0])).toContain('자료구조');

    await stage.send(
      { tool: 'resolvePlace', input: { words: here.name } },
      { tool: 'findFreeTimeEvents', input: { ...input, departurePlace: here.id } },
      { text: '…' },
    );

    expect(model.toolResults()[1]).toMatchObject({
      result: 'found',
      candidates: [{ id: questId, travel: { mode: 'shuttle', minutes: 7 } }],
    });

    await stage.send({ tool: 'findFreeTimeEvents', input }, { text: '…' });

    expect(model.toolResults()[0]).toMatchObject({ result: 'needs' });
  });

  it('leaves from the Place given at the time given, and never before the item ends', async () => {
    const date = '2098-01-09';
    const { here, near, model } = stage;
    await stage.asking(date);
    const item = await stage.classOn('thursday', '09:00', '10:00', null);
    const early = await stage.questAt({ date, start: '10:30', place: { placeId: near.id } }, '일찍 시작하는 모임');
    const late = await stage.questAt({ date, start: '12:00', place: { placeId: near.id } }, '늦게 시작하는 모임');
    const asked = { date, from: item, to: 'end', departurePlace: here.id };
    const resolving = { tool: 'resolvePlace', input: { words: here.name } };

    const send = (departureTime: string): Promise<unknown> =>
      stage.send(resolving, { tool: 'findFreeTimeEvents', input: { ...asked, departureTime } }, { text: '…' });

    await send('11:30');

    expect(model.toolResults()[1]).toMatchObject({ result: 'found', candidates: [{ id: late }] });

    await send('08:00');

    expect(model.toolResults()[1]).toMatchObject({ result: 'found', candidates: [{ id: early }, { id: late }] });
  });

  it('takes a departure Place only from resolvePlace, in the same message', async () => {
    const other = '2098-01-13';
    await stage.asking(other);
    const item = await stage.classOn('monday', '09:00', '10:00', null);
    const input = { date: other, from: item, to: 'end', departurePlace: stage.here.id };

    await stage.send({ tool: 'findFreeTimeEvents', input }, { text: '…' });

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
  });
});

describe('An item of mine without a Place after the gap', () => {
  it('asks by when the User must leave, which then replaces the side after the gap', async () => {
    const date = '2098-01-20';
    const { here, model } = stage;
    await stage.asking(date);
    const place = { placeId: here.id };
    const before = await stage.classOn('monday', '09:00', '10:00', here.id);
    const after = await stage.classOn('monday', '17:00', '18:00', null);
    const ended = await stage.questAt({ date, start: '10:30', end: '11:30', place });
    const late = await stage.questAt({ date, start: '11:30', end: '12:20', place }, '늦게 끝나는 모임');
    const open = await stage.questAt({ date, start: '11:40', place });
    await stage.questAt({ date, start: '11:50', place }, '오래 못 있는 모임');

    await stage.send({ tool: 'findFreeTimeEvents', input: { date, from: before, to: after } }, { text: '…' });

    expect(model.toolResults()[0]).toMatchObject({ result: 'needs', needs: { side: 'after' } });

    const { candidates } = await stage.find(date, before, after, { leaveBy: '12:10' });

    expect(candidates.map(({ id }) => id)).toEqual([ended, late, open]);
    expect(candidates[0]).not.toHaveProperty('next');
    expect(candidates[1]).toMatchObject({ leaveBy: '12:10' });
    expect(candidates[1]).not.toHaveProperty('endUnknown');
    expect(candidates[2]).toMatchObject({ leaveBy: '12:10', endUnknown: true });
  });

  it('maps a Sub Quest of mine with a label to its Place, and asks only about one it cannot map', async () => {
    const date = '2098-01-27';
    const { here, app, prisma, model } = stage;
    await stage.asking(date);
    const { reader } = stage;
    const labelled = { date, start: '09:00', end: '10:00', place: { label: here.name } };
    const unknown = { date, start: '12:00', end: '13:00', place: { label: '낙성대 카페' } };
    const mapped = await ownQuest(app, reader, { subQuest: subQuestOf(labelled) });
    const unmapped = await ownQuest(app, reader, { subQuest: subQuestOf(unknown) });
    const subQuests = await prisma.subQuest.findMany({ where: { questId: { in: [mapped, unmapped] } } });
    const from = subQuests.find(({ questId }) => questId === mapped)?.id ?? '';
    const to = subQuests.find(({ questId }) => questId === unmapped)?.id ?? '';

    await stage.send({ tool: 'findFreeTimeEvents', input: { date, from, to } }, { text: '…' });

    expect(model.toolResults()[0]).toMatchObject({ result: 'needs', needs: { side: 'after' } });
  });
});

describe('What the model is given', () => {
  it('holds no room, no Place and no coordinates of the User', async () => {
    const date = '2098-02-03';
    const { here, model } = stage;
    await stage.asking(date);
    const from = await stage.classOn('monday', '09:00', '10:00', here.id);

    await stage.send(
      { tool: 'getMyDay', input: { date } },
      { tool: 'findFreeTimeEvents', input: { date, from, to: 'end' } },
      { text: '…' },
    );

    const results = JSON.stringify(model.toolResults());
    expect(results).toContain('자료구조');
    for (const hidden of [ROOM, here.id, here.name, String(here.latitude)]) {
      expect(results).not.toContain(hidden);
    }
  });

  it('answers none for a day out of reach, and for an id that is no item of the day', async () => {
    const date = '2098-02-10';
    await stage.asking(date);
    const otherDay = await stage.classOn('tuesday', '09:00', '10:00', stage.here.id);

    await stage.send(
      { tool: 'findFreeTimeEvents', input: { date: '2098-02-18', from: 'now', to: 'end' } },
      { tool: 'getMyDay', input: { date: '2098-02-09' } },
      { tool: 'findFreeTimeEvents', input: { date, from: otherDay, to: 'end' } },
      { text: '…' },
    );

    expect(stage.model.toolResults()).toMatchObject([{ result: 'none' }, { result: 'none' }, { result: 'none' }]);
  });
});

describe('A day of the User', () => {
  it('counts a Sub Quest that is held, on the day it starts, for 30 minutes when it has no end', async () => {
    const date = '2098-02-11';
    const { here, app, prisma, model } = stage;
    await stage.asking(date);
    const { reader } = stage;
    const place = { placeId: here.id };
    await ownQuest(app, reader, { subQuest: subQuestOf({ date, start: '11:00', place }) });
    const long = await ownQuest(app, reader, {
      subQuest: subQuestOf({ date: '2098-02-10', start: '23:00', place }),
    });
    await prisma.subQuest.updateMany({
      where: { questId: long },
      data: { startsAt: new Date(inKorea(date, '13:00')), endsAt: new Date(inKorea(date, '16:01')) },
    });

    await stage.send({ tool: 'getMyDay', input: { date } }, { text: '…' });

    expect(model.toolResults()).toMatchObject([
      {
        items: [
          { start: '11:00', end: '11:30' },
          { start: '13:00', end: '13:30' },
        ],
      },
    ]);
  });
});

describe('The model call', () => {
  it('asks for providers that do not collect data, with no other restriction', async () => {
    const date = '2098-03-10';
    await stage.asking(date);

    await stage.send({ tool: 'getMyDay', input: { date } }, { text: '…' });

    expect(stage.model.received().map(({ providerOptions }) => providerOptions)).toEqual([
      { openrouter: { provider: { data_collection: 'deny' } } },
      { openrouter: { provider: { data_collection: 'deny' } } },
    ]);
  });
});
