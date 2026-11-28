/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import request from 'supertest';
import { type GlobalSettings } from '../src/global-settings/global-settings.service.js';
import { answer, draftPost } from './judgements.js';
import { PUBLISHED_OWN, SameEventWorld } from './same-event.js';
import { askAsWorker, refusal } from './worker.js';

// The Collections' switches as global settings: the server starts with every env setting off, and an Administrator
// turns them on and off on the Settings page while it runs. The database is this file's own, so a save reaches no other file.
const world = new SameEventWorld(989_000);
let settings: GlobalSettings;

beforeAll(async () => {
  await world.start({ SAME_EVENT_TITLE_RULE: 'off', AUTOMATIC_JUDGEMENT: 'off' });
  // Imported after startApp, so that it is the class this app registers.
  const { GlobalSettings } = await import('../src/global-settings/global-settings.service.js');
  settings = world.judging.get(GlobalSettings);
});

afterEach(async () => {
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

// Saves on the Settings page's route, then runs the minute's check, as every pod does at second 0.
async function switched(name: string, on: boolean): Promise<void> {
  const response = await request(world.judging.getHttpServer())
    .put(`/admin/settings/${name}`)
    .auth(world.administrator, { type: 'bearer' })
    .send({ value: String(on) });
  expect(response.status).toBe(200);
  await settings.check();
}

describe('The title rule, switched by an Administrator', () => {
  it('attaches an equal title and start once on, and publishes both once off again', async () => {
    const before = world.uniqueTitle();
    await world.publishedThrough('snu_events', world.snuPost(before));
    const unswitched = world.programme(before);
    await world.collectedOf('extra_snu', unswitched);
    expect(await world.onlySession('extra_snu', unswitched)).toMatchObject(PUBLISHED_OWN);

    await switched('sameEvent.titleRule', true);
    const on = world.uniqueTitle();
    const event = await world.publishedThrough('snu_events', world.snuPost(on));
    const attached = world.programme(on);
    await world.collectedOf('extra_snu', attached);
    expect(await world.onlySession('extra_snu', attached)).toMatchObject({
      globalEventId: event.id,
      attachedBy: 'rule',
      reason: 'equal_title_and_start',
    });

    await switched('sameEvent.titleRule', false);
    const off = world.uniqueTitle();
    await world.publishedThrough('snu_events', world.snuPost(off));
    const published = world.programme(off);
    await world.collectedOf('extra_snu', published);
    expect(await world.onlySession('extra_snu', published)).toMatchObject(PUBLISHED_OWN);
  });
});

describe('Judgements, switched by an Administrator', () => {
  it('ask the model about a Draft once on, and no more once off again', async () => {
    await switched('judgement.automatic', true);
    world.scripted.script(answer());
    const judged = world.postNumber();
    await world.collected(draftPost(judged));
    expect(await world.judgementOf(judged)).toMatchObject({ outcome: 'judged' });
    expect(world.scripted.received()).toHaveLength(1);

    await switched('judgement.automatic', false);
    world.scripted.script();
    const left = world.postNumber();
    await world.collected(draftPost(left));
    expect(world.scripted.received()).toEqual([]);
    expect(await world.judgementOf(left)).toBeNull();
    expect((await world.onlyEvent(left)).state).toBe('draft');
  });
});

function asked(source: string): Promise<unknown> {
  return askAsWorker(world.judging, '/collections/scheduled', { source });
}

describe("extra.snu's Collections, switched by an Administrator", () => {
  it('are scheduled while collection.extraSnu is on, and the other Sources always', async () => {
    expect(await asked('extra_snu')).toEqual({ scheduled: false });
    expect(await asked('snu_events')).toEqual({ scheduled: true });

    await switched('collection.extraSnu', true);
    expect(await asked('extra_snu')).toEqual({ scheduled: true });

    await switched('collection.extraSnu', false);
    expect(await asked('extra_snu')).toEqual({ scheduled: false });
  });

  it('refuse a question that names no Source', async () => {
    expect(await refusal(world.judging, '/collections/scheduled', { source: 'nowhere' })).toContain('source');
  });
});
