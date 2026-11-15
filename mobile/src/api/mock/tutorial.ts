/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { Tutorial, TutorialCompletedBy, TutorialState } from '@/api/tutorial-types';
import { now } from '@/clock';
import { koreaYear } from '@/korea-time';
import { readKept } from '@/storage/kept';
import { answer } from './answer';
import { TUTORIAL_CATEGORIES, TUTORIAL_CONTENT, type TutorialContent } from './data/tutorial';

// The tutorial's routes as the main server answers them (P06 spec "Progress: server-side" and "Endpoints"), with the
// User's progress kept in memory while the app runs. Each call answers with the new `GET /tutorial` body. For the
// mock build and the tests only: the server build reads `main-server/src/tutorial`.

// The mock's stand-in for the main server's rule (`eligibleByDefault` in `main-server/src/tutorial/tutorial-state.ts`),
// over the onboarding answers kept on the phone: admitted this year in Korea or later. The answers hold no 소속, so
// the mock has no exchange student. No screen reads it; they read the answer's `eligibleByDefault`.
async function mockEligibleByDefault(): Promise<boolean> {
  const { answers } = await readKept();
  const admissionYear = answers?.admissionYear ?? null;
  return admissionYear !== null && admissionYear >= koreaYear(now());
}

// The mock's TUTORIAL_KWANJEONG_CHECK, off as on the main server by default: the 관정 quest is then served, and
// completed, as a button quest. An object, so that a test of the phone's check can turn it on.
export const MOCK_TUTORIAL_SWITCHES = { kwanjeongCheck: false };

// A quest as the main server serves it (`servedContent`), with 관정 booking on.
function served(quest: TutorialContent): TutorialContent {
  return quest.completion.kind === 'kwanjeongCheck' && !MOCK_TUTORIAL_SWITCHES.kwanjeongCheck
    ? { ...quest, completion: { kind: 'button' } }
    : quest;
}

interface Progress {
  enabled: boolean;
  stopped: boolean;
  finished: boolean;
  rowHidden: boolean;
  // By key: null while started, how it was completed once it is.
  quests: Map<string, TutorialCompletedBy | null>;
}

function freshProgress(): Progress {
  return { enabled: false, stopped: false, finished: false, rowHidden: false, quests: new Map() };
}

let progress = freshProgress();

// For the tests: a User without progress, as at the first start.
export function resetMockTutorial(): void {
  progress = freshProgress();
}

// The main server's order, the first that holds.
function stateOf(): TutorialState {
  if (progress.finished) {
    return 'finished';
  }
  if (progress.stopped) {
    return 'stopped';
  }
  if (!progress.enabled) {
    return 'off';
  }
  return TUTORIAL_CONTENT.some(({ key }) => progress.quests.has(key)) ? 'active' : 'available';
}

async function body(): Promise<Tutorial> {
  return {
    state: stateOf(),
    rowHidden: progress.rowHidden,
    eligibleByDefault: await mockEligibleByDefault(),
    categories: [...TUTORIAL_CATEGORIES],
    quests: TUTORIAL_CONTENT.map((content) => {
      const kept = progress.quests.get(content.key);
      return {
        ...served(content),
        status: kept === undefined ? 'notStarted' : kept === null ? 'started' : 'completed',
      };
    }),
  };
}

// The first read stores "eligible by default" for a User admitted this year or an exchange student, once.
async function read(): Promise<Tutorial> {
  if (!progress.enabled && !progress.stopped && (await mockEligibleByDefault())) {
    progress.enabled = true;
  }
  return body();
}

function questOf(key: string): TutorialContent {
  const quest = TUTORIAL_CONTENT.find((each) => each.key === key);
  if (quest === undefined) {
    throw new ApiError(404, 'TUTORIAL_QUEST_NOT_FOUND');
  }
  return served(quest);
}

function isCompleted(key: string): boolean {
  const by = progress.quests.get(key);
  return by !== undefined && by !== null;
}

function complete(key: string, by: TutorialCompletedBy): Promise<Tutorial> {
  const quest = questOf(key);
  if ((quest.completion.kind === 'button') !== (by === 'button')) {
    throw new ApiError(400, 'TUTORIAL_COMPLETION_MISMATCH');
  }
  if (!isCompleted(key)) {
    progress.quests.set(key, by);
  }
  if (TUTORIAL_CONTENT.every((each) => isCompleted(each.key))) {
    progress.finished = true;
  }
  return body();
}

type MockTutorial = Pick<
  ApiClient,
  'getTutorial' | 'enableTutorial' | 'stopTutorial' | 'hideTutorialRow' | 'startTutorialQuest' | 'completeTutorialQuest'
>;

export const mockTutorial: MockTutorial = {
  getTutorial: () => answer('getTutorial', read),
  enableTutorial: () =>
    answer('enableTutorial', () => {
      progress = { ...progress, enabled: true, stopped: false, finished: false };
      return body();
    }),
  stopTutorial: () =>
    answer('stopTutorial', () => {
      progress.stopped = true;
      return body();
    }),
  hideTutorialRow: () =>
    answer('hideTutorialRow', () => {
      progress.rowHidden = true;
      return body();
    }),
  startTutorialQuest: (key) =>
    answer('startTutorialQuest', () => {
      questOf(key);
      if (!progress.quests.has(key)) {
        progress.quests.set(key, null);
      }
      return body();
    }),
  completeTutorialQuest: (key, by) => answer('completeTutorialQuest', () => complete(key, by)),
};
