/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type FriendLevel } from '../src/generated/prisma/client.js';
import { type FriendViewService } from '../src/friends/friend-view.service.js';
import { coordinatesIn, IN_LIBRARY, LEVEL_PAIRS } from './friend-levels.js';
import {
  expectStatus,
  getPositions,
  KEPT_POSITION,
  keptPositionIn,
  setFriendLevel,
  setMasterSwitch,
  uploadPosition,
} from './location-sharing.js';
import { MealPlanStage, type Named, planMeal, type Place, resolve } from './meal-plan.js';
import { SignalWatcher, signalsWhile } from './signals.js';

// LQ-4 of the design's section 5 with the three Friend levels: for each pair of ends, what a viewer is given of a
// Friend whose phone walks from 중앙도서관 into 두산인문관 (8동) says no more than the viewer's level. That is GET
// /positions, the signals, the Friend view, and the Assistant's plan of a meal with the Friend: its reply, its scene,
// and what the model is given and its tools answer. At the position, the Friend's coordinates may be in it; at the
// building, only the Place; at the Timetable, neither.

const stage = new MealPlanStage();
let watcher: SignalWatcher;
let view: FriendViewService;

// A Monday that no other file posts menus for.
const DATE = '2089-05-02';

beforeAll(async () => {
  [, watcher] = await Promise.all([stage.start(), SignalWatcher.start()]);
  // Imported after the start, so that it is the class the server registered.
  const { FriendViewService } = await import('../src/friends/friend-view.service.js');
  view = stage.app.get(FriendViewService);
  await stage.menusOn(DATE, ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층']);
});

afterAll(async () => {
  await watcher.stop();
  await stage.stop();
});

const replySchema = z.object({ answer: z.custom<AnswerReply | null>() });

// What the viewer, the asker at 301동 at 11:50, is given of the Friend.
async function givenOf(friend: Named): Promise<{ given: unknown[]; scenes: unknown[] }> {
  const asker = stage.asker;
  const signals = await signalsWhile(stage.app, watcher, ['position', 'position-removed'], async () => {
    await expectStatus(uploadPosition(stage.app, friend, IN_LIBRARY), 200);
    await expectStatus(uploadPosition(stage.app, friend, KEPT_POSITION), 200);
  });
  const toAsker = signals.filter(({ userIds }) => userIds?.includes(asker.id) === true);
  const positions = (await expectStatus(getPositions(stage.app, asker), 200)).body as unknown;
  const friendView = (await view.list(asker.id)).find(({ id }) => id === friend.id);
  const { latitude, longitude } = await stage.numbered('301');
  const response = await stage.send([resolve('하은'), planMeal(DATE, [friend.id]), { text: '…' }], {
    context: { location: { latitude, longitude } },
  });
  const plans = replySchema.parse(response.body).answer?.plans ?? [];
  expect(plans.length).toBeGreaterThan(0);
  const scenes = plans.map(({ scene }) => scene.people.find(({ userId }) => userId === friend.id) ?? null);
  const said: unknown[] = [response.body, stage.model.toolResults(), stage.model.received()];
  return { given: [toAsker, positions, friendView, ...said], scenes };
}

const pointOf = ({ latitude, longitude }: Place): object => ({ latitude, longitude });

// What each level allows of a Friend in 두산인문관: the given hold their coordinates or not, and the Place or not.
function expectOnly(
  seen: FriendLevel,
  { given, scenes }: { given: unknown[]; scenes: unknown[] },
  doosan: Place,
): void {
  const [toAsker, positions, friendView] = given;
  if (seen === 'exact') {
    expect(coordinatesIn([toAsker, positions, friendView], KEPT_POSITION)).toHaveLength(2);
    expect(friendView).toMatchObject({ level: 'exact', placeId: doosan.id });
    for (const person of scenes) {
      expect(person).toMatchObject({ source: 'exact', at: KEPT_POSITION });
    }
    return;
  }
  expect(coordinatesIn(given, IN_LIBRARY, KEPT_POSITION)).toEqual([]);
  if (seen === 'building') {
    expect(positions).toEqual([expect.objectContaining({ placeId: doosan.id, ...pointOf(doosan), level: 'building' })]);
    expect(friendView).toMatchObject({ level: 'building', position: null, placeId: doosan.id });
    for (const person of scenes) {
      expect(person).toMatchObject({ source: 'building', at: pointOf(doosan) });
    }
    return;
  }
  expect([toAsker, positions]).toEqual([[], []]);
  expect(friendView).toMatchObject({ level: 'timetable', position: null, placeId: null });
  expect(scenes.every((person) => person === null)).toBe(true);
  expect(keptPositionIn(given)).toEqual([]);
  expect(JSON.stringify(given)).not.toContain(doosan.id);
}

describe('What a viewer is given of a Friend', () => {
  it.each(LEVEL_PAIRS)('at %s, with the Friend at %s, is no more than %s', async (viewerEnd, subjectEnd, seen) => {
    await stage.asking(DATE, '11:50');
    const friend = await stage.friend('하은');
    const asker = stage.asker;
    await Promise.all([
      expectStatus(setMasterSwitch(stage.app, asker, true), 204),
      expectStatus(setMasterSwitch(stage.app, friend, true), 204),
    ]);
    await Promise.all([
      expectStatus(setFriendLevel(stage.app, asker, friend.id, viewerEnd), 204),
      expectStatus(setFriendLevel(stage.app, friend, asker.id, subjectEnd), 204),
    ]);

    const given = await givenOf(friend);

    expectOnly(seen, given, await stage.numbered('8'));
  });
});
