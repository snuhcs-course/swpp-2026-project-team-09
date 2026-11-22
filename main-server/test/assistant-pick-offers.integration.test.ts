/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { travel } from './events-example.js';
import { MealPlanStage } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A Place or a time asked back as a control under the question (P05 ticket 24): for an app that says `pick`, a reply
// that asks where carries `pick-place`, and one that asks when carries `pick-time` with the day and the asker's Free
// Time. An app without `pick` gets the question in words alone, since an app before it refuses a reply with an offer
// it does not know.

const stage = new MealPlanStage(travel);

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const PICK_APP = { clientCapabilities: ['library', 'answer', 'events', 'pick'] };
const EVENTS_APP = { clientCapabilities: ['library', 'answer', 'events'] };

const PICK_PLACE = { kind: 'pick-place', label: '지도에서 고르기', text: '여기서' };

const planNewQuest = (input: object): Step => ({ tool: 'planNewQuest', input });

describe('A new 파티 with no Place', () => {
  it('asks where with the map to pick on (needs-place)', async () => {
    const date = '2089-05-12';
    await stage.asking(date, '13:50');

    const response = await stage.send(
      [planNewQuest({ date, title: '보드게임' }), { text: '…' }],
      PICK_APP,
      '보드게임 모집',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'needs-place', note: expect.any(String) as unknown });
    expect(response.body).toMatchObject({ offers: [PICK_PLACE] });
  });

  it('for an app without the pickers, asks in words alone', async () => {
    const date = '2089-05-12';
    await stage.asking(date, '13:50');

    const response = await stage.send(
      [planNewQuest({ date, title: '보드게임' }), { text: '…' }],
      EVENTS_APP,
      '보드게임 모집',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'needs-place' });
    expect(stage.model.toolResults()[0]).not.toHaveProperty('note');
    expect(response.body).not.toHaveProperty('offers');
  });
});

describe('A new 파티 on another day with no time', () => {
  it('asks when with the time wheel of that day, the asker’s Classes left out of its Free Time (needs-time)', async () => {
    const date = '2089-05-12';
    await stage.asking(date, '13:50');
    await stage.classAt(stage.asker, '10:00', '11:15', '301', 'friday');
    const place = await stage.numbered('301');
    const tapped = { tapped: { kind: 'place', placeId: place.id } };

    const response = await stage.send(
      [planNewQuest({ date: '2089-05-13', title: '보드게임', placeId: place.id }), { text: '…' }],
      { ...PICK_APP, context: tapped },
      '내일 여기서 보드게임 모집',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'needs-time' });
    expect(response.body).toMatchObject({
      offers: [
        {
          kind: 'pick-time',
          label: '시간 고르기',
          date: '2089-05-13',
          free: [
            { from: '00:00', until: '10:00' },
            { from: '11:15', until: '24:00' },
          ],
        },
      ],
    });
  });
});

describe('A Proposal refused for its time or its Place', () => {
  const lunch = {
    title: '점심 같이 먹어요',
    description: '같이 점심 먹을 사람',
    joinPolicy: 'open',
    board: 'meal',
    capacity: 4,
  };

  it('with no time, offers the time wheel of today', async () => {
    await stage.asking('2089-05-12', '09:00');

    const response = await stage.send([{ tool: 'proposeQuest', input: lunch }, { text: '…' }], PICK_APP, '점심 모집');

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'refused', note: expect.any(String) as unknown });
    expect(response.body).toMatchObject({ offers: [{ kind: 'pick-time', date: '2089-05-12' }] });
  });

  it('with a Place no resolver returned, offers the map, and takes the Place tapped on it', async () => {
    await stage.asking('2089-05-12', '09:00');
    const place = await stage.numbered('301');
    const at = { ...lunch, startsAt: '2089-05-12T12:00:00+09:00', placeId: place.id };

    const refused = await stage.send([{ tool: 'proposeQuest', input: at }, { text: '…' }], PICK_APP, '301동에서');
    expect(refused.body).toMatchObject({ proposal: null, offers: [PICK_PLACE] });

    const tapped = await stage.send(
      [{ tool: 'proposeQuest', input: at }, { text: '…' }],
      {
        ...PICK_APP,
        context: { tapped: { kind: 'place', placeId: place.id } },
      },
      '여기서',
    );
    expect(tapped.body).toMatchObject({ proposal: { place: { id: place.id } } });
  });
});
