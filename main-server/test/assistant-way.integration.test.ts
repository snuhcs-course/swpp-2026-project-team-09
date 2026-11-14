/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { WAY_RULES } from '../src/assistant/lookup/way-tools.js';
import { type Step } from './scripted-model.js';
import { MealPlanStage, planMeal } from './meal-plan.js';

// Where a Place is, drawn on the map as a Lookup, at the Assistant's endpoint with the scripted model, the seed's
// walking table, and Places: board q1 (a Tuesday at 11:50, at 301동), what the model is given, where the User sets
// out from, an app that does not draw answers, and a Plan drawn after a Lookup.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  mapButtons: z.array(z.string()),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

function lookupIn(body: unknown): Lookup {
  const { lookup } = replySchema.parse(body);
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
}

// 44 m east of 학생회관's point, and more than 20 m from every Place's outline.
const NEAR_BUT_OUTSIDE = { number: '63', location: { latitude: 37.45932, longitude: 126.95108 } };

const resolvePlace = (words: string): Step => ({ tool: 'resolvePlace', input: { words } });

const findWay = (input: object): Step => ({ tool: 'findWay', input });

// The asker of board q1: a Class in 301동 until 11:50, and one in 24동 at 13:00.
async function boardQ1(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

async function at(number: string): Promise<{ location: { latitude: number; longitude: number } }> {
  const { latitude, longitude } = await stage.numbered(number);
  return { location: { latitude, longitude } };
}

describe('Where 문화관 is (board q1)', () => {
  it('is drawn on the map as a Lookup, with the minutes on foot from 301동, and no answer', async () => {
    const date = '2096-01-03';
    await boardQ1(date);
    const cultureHall = await stage.numbered('73');

    const response = await stage.send(
      [resolvePlace('문화관'), findWay({ to: cultureHall.id }), { text: '문화관은 301동에서 걸어서 18분이에요.' }],
      { context: await at('301') },
    );

    expect(response.status).toBe(200);
    expect(replySchema.parse(response.body).answer).toBeNull();
    const lookup = lookupIn(response.body);
    expect(lookup.lines).toEqual([
      [
        { text: '문화관(73동)', strong: true },
        { text: '은 여기예요', strong: false },
      ],
      [{ text: '지금 있는 301동에서 걸어서 18분', strong: false }],
    ]);
    expect(lookup.scene.places).toEqual([
      {
        place: {
          placeId: cultureHall.id,
          label: '문화관(73동)',
          latitude: cultureHall.latitude,
          longitude: cultureHall.longitude,
        },
        role: 'pick',
        tag: '문화관(73동)',
      },
    ]);
    expect(lookup.actions).toEqual([{ kind: 'guide', to: lookup.scene.places[0]?.place }]);
  });
});

describe('What the model is given of a way', () => {
  it('gives the model Place names and minutes, and no coordinates', async () => {
    const date = '2096-01-10';
    await boardQ1(date);
    const cultureHall = await stage.numbered('73');

    await stage.send([resolvePlace('문화관'), findWay({ to: cultureHall.id }), { text: '…' }], {
      context: await at('301'),
    });

    const given = stage.model.toolResults()[1];
    expect(given).toEqual({
      result: 'found',
      from: '301동',
      to: '문화관(73동)',
      fromIs: 'where the User is now',
      walkMinutes: 18,
      deadline: null,
      shuttle: {
        taken: false,
        boardAt: '301동 정류장',
        getOffAt: '기숙사삼거리 정류장',
        leaveAt: '11:50',
        comesAt: '11:56',
        comesBy: 'the average wait at this hour',
        arrival: '12:08',
        lateMinutes: 0,
      },
    });
  });
});

describe('Where the User sets out from', () => {
  it('is the Place they named', async () => {
    const date = '2096-01-17';
    await boardQ1(date);
    const [cultureHall, place302] = [await stage.numbered('73'), await stage.numbered('302')];

    const response = await stage.send(
      [
        resolvePlace('문화관'),
        resolvePlace('302동'),
        findWay({ to: cultureHall.id, from: place302.id }),
        { text: '…' },
      ],
      { context: await at('301') },
    );

    expect(lookupIn(response.body).chips).toEqual([{ kind: 'origin', text: '302동에서', userId: null }]);
  });

  it('is the nearest Place within 150 m of their location when no Place holds it', async () => {
    const date = '2096-01-24';
    await stage.asking(date, '11:50');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send([resolvePlace('문화관'), findWay({ to: cultureHall.id }), { text: '…' }], {
      context: { location: NEAR_BUT_OUTSIDE.location },
    });

    expect(lookupIn(response.body).chips).toEqual([
      { kind: 'origin', text: `${NEAR_BUT_OUTSIDE.number}동에서`, userId: null },
    ]);
  });
});

describe('Where the User sets out from, with no location', () => {
  it('is the Place of their last item today that has ended', async () => {
    const date = '2096-01-31';
    await boardQ1(date);
    const cultureHall = await stage.numbered('73');

    const response = await stage.send([resolvePlace('문화관'), findWay({ to: cultureHall.id }), { text: '…' }]);

    expect(lookupIn(response.body).lines[1]).toEqual([{ text: '301동에서 걸어서 18분', strong: false }]);
  });

  it('is unknown with no item ended today: the tool answers none and nothing is drawn', async () => {
    const date = '2096-02-07';
    await stage.asking(date, '11:50');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send([resolvePlace('문화관'), findWay({ to: cultureHall.id }), { text: '…' }]);

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'none' });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});

describe('A Place the resolver did not return', () => {
  it('is refused, and nothing is drawn', async () => {
    await boardQ1('2096-02-14');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send([findWay({ to: cultureHall.id }), { text: '…' }], {
      context: await at('301'),
    });

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });

  it('is accepted when the User tapped it', async () => {
    await boardQ1('2096-02-21');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send([findWay({ to: cultureHall.id }), { text: '…' }], {
      context: { ...(await at('301')), tapped: { kind: 'place', placeId: cultureHall.id } },
    });

    expect(lookupIn(response.body).kind).toBe('way');
  });
});

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('An app that does not draw answers', () => {
  it('is not offered findWay nor told its rules, and gets no Lookup', async () => {
    await stage.asking('2096-02-28', '11:50');

    const response = await stage.send([{ text: '네' }], { clientCapabilities: ['library'] });

    expect(response.status).toBe(200);
    expect(toolNames()).not.toContain('findWay');
    expect(stage.model.system()).not.toContain(WAY_RULES);
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });

  it('is told apart from one that does, which is offered findWay with its rules', async () => {
    await stage.asking('2096-02-28', '11:50');

    await stage.send([{ text: '네' }]);

    expect(toolNames()).toContain('findWay');
    expect(stage.model.system()).toContain(WAY_RULES);
  });
});

describe('A Plan and a Lookup in one reply', () => {
  it('leaves only the Plan when it is drawn after the Lookup', async () => {
    const date = '2096-03-06';
    await boardQ1(date);
    await stage.menusOn(date, ['301동식당']);
    const cultureHall = await stage.numbered('73');

    const response = await stage.send(
      [resolvePlace('문화관'), findWay({ to: cultureHall.id }), planMeal(date), { text: '…' }],
      { context: await at('301') },
    );

    const { answer, lookup } = replySchema.parse(response.body);
    expect(answer).not.toBeNull();
    expect(lookup).toBeNull();
  });

  it('leaves only the Lookup when it is drawn after the Plan', async () => {
    const date = '2096-03-13';
    await boardQ1(date);
    await stage.menusOn(date, ['301동식당']);
    const cultureHall = await stage.numbered('73');

    const response = await stage.send(
      [planMeal(date), resolvePlace('문화관'), findWay({ to: cultureHall.id }), { text: '…' }],
      { context: await at('301') },
    );

    const { answer, lookup } = replySchema.parse(response.body);
    expect(answer).toBeNull();
    expect(lookup).not.toBeNull();
  });
});

describe("A layer's button beside a Lookup", () => {
  it('is not added, and the model is told why', async () => {
    await boardQ1('2096-03-20');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send(
      [
        resolvePlace('문화관'),
        findWay({ to: cultureHall.id }),
        { tool: 'showOnMap', input: { layer: 'shuttle' } },
        { text: '…' },
      ],
      { context: await at('301') },
    );

    expect(replySchema.parse(response.body).mapButtons).toEqual([]);
    expect(stage.model.toolResults()[2]).toMatchObject({ result: 'not shown' });
  });
});
