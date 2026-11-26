/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { putConsent } from './consent.js';
import { MealPlanStage } from './meal-plan.js';
import * as planQuests from './plan-quests.js';
import { PostHogStub, settle, usageSettings } from './usage.js';

// The usage event of a Plan made at POST /plans, over the started server with the seed's walking table and Places and
// a stand-in for PostHog's client: a meal with a Friend is a 파티 made, a meal taken alone is not. Each test stands on
// a Tuesday of September 2083, which no other file uses.

vi.setConfig({ testTimeout: 30_000 });

const posthog = new PostHogStub();
const stage = new MealPlanStage();

beforeAll(async () => {
  await stage.start({ settings: usageSettings, posthog: posthog.clients });
});

afterAll(async () => {
  await stage.stop();
});

// The worked example for an asker who chose usage data, with nothing of PostHog's sent yet.
async function chosenExample(date: string): Promise<void> {
  await planQuests.workedExample(stage, date);
  await putConsent(stage.app, stage.asker.accessToken, { version: 1, usage: true }).expect(204);
}

const creations = (): object[] =>
  posthog.of(stage.asker.id).filter(({ event }) => event === 'party_creation_completed');

describe('party_creation_completed of a Plan', () => {
  it("a meal's Plan with a Friend sends one for the asker, with the Closed Quest's visibility, private", async () => {
    const date = '2083-09-07';
    await chosenExample(date);
    const friend = await planQuests.minsu(stage);
    const plan = await planQuests.firstPlan(stage, date, [stage.asker.id, friend.id]);

    await planQuests.partyOf(stage, {
      date,
      people: [stage.asker.id, friend.id],
      planId: plan.id,
      startAt: plan.startAt,
    });

    await vi.waitFor(() => {
      expect(creations()).toHaveLength(1);
    });
    await settle();
    expect(creations()).toEqual([
      {
        distinctId: stage.asker.id,
        event: 'party_creation_completed',
        properties: { visibility: 'private', source: 'server' },
      },
    ]);
  });

  it("a meal's Plan taken alone sends nothing", async () => {
    const date = '2083-09-14';
    await chosenExample(date);
    const plan = await planQuests.firstPlan(stage, date, [stage.asker.id]);
    posthog.reset();

    const response = await planQuests.makePlanQuest(stage, {
      input: planQuests.inputOf(date, [stage.asker.id]),
      planId: plan.id,
      startAt: plan.startAt,
      location: null,
    });

    expect(response.status).toBe(201);
    await settle();
    expect(posthog.events).toEqual([]);
  });
});
