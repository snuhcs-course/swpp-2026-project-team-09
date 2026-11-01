/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { refusal } from '../support/fake-server';
import { answered, startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW, TOKENS } from '../support/server';
import { apiClient } from '@/api/client';
import { TUTORIAL_CONTENT } from '@/api/mock/data/tutorial';
import { TUTORIAL_SERVED, tutorialClient } from '@/api/server/tutorial-client';
import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import { googleAvailable } from '@/auth/google';

// The 새내기 튜토리얼's routes (P06 spec "Endpoints") through the main server's client, ready for the switch from
// the mock once ticket P06-02 serves them, and the mock that answers until then.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const BEARER = `Bearer ${TOKENS.accessToken}`;

// The content as the main server serves it, with the first quest started.
function bodyOf(): Tutorial {
  const quests: TutorialQuest[] = [];
  for (const [index, quest] of TUTORIAL_CONTENT.entries()) {
    quests.push({ ...quest, status: index === 0 ? 'started' : 'notStarted' });
  }
  return { state: 'active', quests };
}

const BODY = bodyOf();

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the main server's tutorial routes", () => {
  it('reads the tutorial as the signed-in User', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /tutorial', { status: 200, body: BODY });

    await expect(tutorialClient.getTutorial()).resolves.toEqual(BODY);
    expect(server.received('GET /tutorial')[0]?.authorization).toBe(BEARER);
  });

  it.each([
    ['enable', (): Promise<Tutorial> => tutorialClient.enableTutorial(), 'POST /tutorial/enable'],
    ['stop', (): Promise<Tutorial> => tutorialClient.stopTutorial(), 'POST /tutorial/stop'],
    ['hide the row', (): Promise<Tutorial> => tutorialClient.hideTutorialRow(), 'POST /tutorial/hide-row'],
    [
      'start a quest',
      (): Promise<Tutorial> => tutorialClient.startTutorialQuest('s-card'),
      'POST /tutorial/quests/s-card/start',
    ],
  ])('can %s, answered with the new tutorial', async (_, send, route) => {
    const server = await askMainServer({ signedIn: true });
    server.on(route, { status: 200, body: BODY });

    await expect(send()).resolves.toEqual(BODY);
    expect(server.received(route)).toHaveLength(1);
  });

  it('completes a quest with how it was completed', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /tutorial/quests/kwanjeong/complete', { status: 200, body: BODY });

    await tutorialClient.completeTutorialQuest('kwanjeong', 'skipped');

    expect(server.received('POST /tutorial/quests/kwanjeong/complete')[0]?.body).toEqual({ by: 'skipped' });
  });
});

describe("the main server's tutorial answers", () => {
  it('takes the row hidden and a Place with its words', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /tutorial', { status: 200, body: { ...BODY, state: 'off', rowHidden: true } });

    const tutorial = await tutorialClient.getTutorial();

    expect(tutorial.rowHidden).toBe(true);
    expect(tutorial.quests[0]?.places[1]).toEqual({ place: '4', label: '우리은행 (4동)' });
  });

  it.each([
    ['an unknown state', { ...BODY, state: 'paused' }],
    ['a quest without its body', { ...BODY, quests: [{ ...BODY.quests[0], body: undefined }] }],
    ['an unknown status', { ...BODY, quests: [{ ...BODY.quests[0], status: 'done' }] }],
    ['a place without a point or a number', { ...BODY, quests: [{ ...BODY.quests[0], places: [{ floor: 2 }] }] }],
  ])('fails %s, as an answer of another shape', async (_, body) => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /tutorial', { status: 200, body });

    await expect(tutorialClient.getTutorial()).rejects.toMatchObject({ status: 0, code: 'UNEXPECTED_ANSWER' });
  });

  it('gives a refusal as it came', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /tutorial/quests/s-card/complete', refusal(400, 'TUTORIAL_COMPLETION_MISMATCH'));

    await expect(tutorialClient.completeTutorialQuest('s-card', 'checked')).rejects.toMatchObject({ status: 400 });
  });
});

describe('until the main server serves the tutorial', () => {
  it('the server build answers it from the mock, and asks no route', async () => {
    expect(TUTORIAL_SERVED).toBe(false);
    const server = await askMainServer({ signedIn: true });

    const tutorial = await answered(apiClient.getTutorial());

    expect(tutorial.quests.map(({ key }) => key)).toEqual([
      's-card',
      'admin-shuttle',
      'kwanjeong',
      'health-clinic',
      'art-museum',
    ]);
    expect(server.received().filter(({ path }) => path.startsWith('/tutorial'))).toEqual([]);
  });

  it("the mock refuses a completion that does not fit the quest's kind, and an unknown key", async () => {
    await expect(answered(apiClient.completeTutorialQuest('s-card', 'skipped'))).rejects.toMatchObject({
      status: 400,
    });
    await expect(answered(apiClient.startTutorialQuest('nope'))).rejects.toMatchObject({ status: 404 });
  });
});
