/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { FreeTimeStage } from './free-time.js';

// When a Travel Time is the shuttle's, on a walking table of test/free-time.ts and the notice's values, with the
// scripted model in the model's place.

const stage = new FreeTimeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

describe('The shuttle against the walk', () => {
  it('is chosen when it is at least 3 minutes faster, and otherwise the walk is shown', async () => {
    const date = '2098-02-17';
    const { here, near, barely } = stage;
    await stage.asking(date);
    const item = await stage.classOn('monday', '09:00', '10:00', here.id);
    const quick = await stage.questAt({ date, start: '10:30', place: { placeId: near.id } });
    const close = await stage.questAt({ date, start: '10:31', place: { placeId: barely.id } });

    const { candidates } = await stage.find(date, item, 'end');

    expect(candidates.map(({ id, travel }) => [id, travel])).toEqual([
      [quick, { mode: 'shuttle', minutes: 7 }],
      [close, { mode: 'walk', minutes: 10 }],
    ]);
  });

  it('is not offered at a weekend', async () => {
    const date = '2098-03-01';
    await stage.asking(date);
    const item = await stage.classOn('saturday', '09:00', '10:00', stage.here.id);
    await stage.questAt({ date, start: '10:30', place: { placeId: stage.near.id } });

    const { candidates } = await stage.find(date, item, 'end');

    expect(candidates).toMatchObject([{ travel: { mode: 'walk', minutes: 10 } }]);
  });
});

describe('The shuttle in the evening', () => {
  it('is offered until 21:00 and not after it', async () => {
    const date = '2098-02-24';
    const { here, far } = stage;
    await stage.asking(date);
    const evening = await stage.classOn('monday', '19:00', '20:50', here.id);
    await stage.questAt({ date, start: '22:00', place: { placeId: far.id } });

    expect((await stage.find(date, evening, 'end')).candidates).toMatchObject([
      { travel: { mode: 'shuttle', minutes: 14 } },
    ]);

    await stage.asking(date);
    const night = await stage.classOn('monday', '19:00', '21:00', here.id);

    expect((await stage.find(date, night, 'end')).candidates).toMatchObject([
      { travel: { mode: 'walk', minutes: 25 } },
    ]);
  });

  it('gives a leave-by time by a departure the walk would still be in time for', async () => {
    const date = '2098-03-03';
    const { here, far } = stage;
    await stage.asking(date);
    const next = await stage.classOn('monday', '21:05', '22:00', far.id);
    await stage.questAt({ date, start: '19:00', place: { placeId: here.id } });

    const { candidates } = await stage.find(date, '00:00', next);

    // Departing by the walk, at 20:39, the User reaches the stop in service: 21:04 − 800 s.
    expect(candidates).toMatchObject([{ leaveBy: '20:50', endUnknown: true }]);
  });
});
