/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { Tutorial, TutorialCategory, TutorialPlace, TutorialQuest } from '@/api/tutorial-types';
import { field, hasTexts, isNumber, isText, listOf } from './answers';
import { call } from './http';
import { isTutorialGuide } from './tutorial-guide-answers';

// The 새내기 튜토리얼's routes on the main server (`main-server/src/tutorial`, P06 spec "Endpoints"), each answering
// the `GET /tutorial` body (`TutorialDto`).
//
// The switch, read by `serverClient`: the main server serves these routes since ticket P06-02, so the server build
// reads them. False answers the server build's tutorial from the mock (`../mock/tutorial.ts`).
export const TUTORIAL_SERVED = true;

const STATES = new Set(['off', 'available', 'active', 'stopped', 'finished']);
const STATUSES = new Set(['notStarted', 'started', 'completed']);

function isOneOf(value: unknown, names: ReadonlySet<string>): boolean {
  return typeof value === 'string' && names.has(value);
}

function isOptional(value: unknown, isValue: (each: unknown) => boolean): boolean {
  return value === undefined || isValue(value);
}

function isFlag(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isPlace(value: unknown): value is TutorialPlace {
  const point = field(value, 'point');
  if (point !== undefined) {
    return isNumber(field(point, 'latitude')) && isNumber(field(point, 'longitude')) && isText(field(value, 'label'));
  }
  return (
    isText(field(value, 'place')) &&
    isOptional(field(value, 'floor'), isNumber) &&
    isOptional(field(value, 'label'), isText)
  );
}

function isCompletion(value: unknown): boolean {
  const kind = field(value, 'kind');
  return kind === 'button' || (kind === 'kwanjeongCheck' && isText(field(value, 'skipLabel')));
}

function isQuest(value: unknown): value is TutorialQuest {
  return (
    hasTexts(value, ['key', 'title', 'brief', 'condition', 'completionMessage']) &&
    isNumber(field(value, 'order')) &&
    isOptional(field(value, 'category'), isText) &&
    isOptional(field(value, 'icon'), isText) &&
    isOptional(field(value, 'ask'), isText) &&
    listOf(isText)(field(value, 'body')) &&
    isCompletion(field(value, 'completion')) &&
    listOf(isPlace)(field(value, 'places')) &&
    listOf((link: unknown): link is { label: string; url: string } => hasTexts(link, ['label', 'url']))(
      field(value, 'links'),
    ) &&
    isOneOf(field(value, 'status'), STATUSES)
  );
}

export function isTutorial(value: unknown): value is Tutorial {
  return (
    isOneOf(field(value, 'state'), STATES) &&
    isFlag(field(value, 'rowHidden')) &&
    isFlag(field(value, 'eligibleByDefault')) &&
    listOf((category: unknown): category is TutorialCategory => hasTexts(category, ['key', 'label']))(
      field(value, 'categories'),
    ) &&
    listOf(isQuest)(field(value, 'quests'))
  );
}

// The tutorial with only the guides this app can read: a quest whose guide it cannot read (a newer server's, with a
// button of a kind it does not know) opens its sheet, and the rest of the tutorial stays.
export function withReadableGuides(tutorial: Tutorial): Tutorial {
  return {
    ...tutorial,
    quests: tutorial.quests.map((quest) => {
      if (quest.guide === undefined || isTutorialGuide(quest.guide)) {
        return quest;
      }
      const { guide: _unreadable, ...withoutGuide } = quest;
      return withoutGuide;
    }),
  };
}

function readTutorial(answer: Promise<Tutorial>): Promise<Tutorial> {
  return answer.then(withReadableGuides);
}

function questPath(key: string, action: 'start' | 'complete'): string {
  return `/tutorial/quests/${encodeURIComponent(key)}/${action}`;
}

type TutorialClient = Pick<
  ApiClient,
  'getTutorial' | 'enableTutorial' | 'stopTutorial' | 'hideTutorialRow' | 'startTutorialQuest' | 'completeTutorialQuest'
>;

export const tutorialClient: TutorialClient = {
  getTutorial: () => readTutorial(call('GET', '/tutorial', isTutorial)),
  enableTutorial: () => readTutorial(call('POST', '/tutorial/enable', isTutorial)),
  stopTutorial: () => readTutorial(call('POST', '/tutorial/stop', isTutorial)),
  hideTutorialRow: () => readTutorial(call('POST', '/tutorial/hide-row', isTutorial)),
  startTutorialQuest: (key) => readTutorial(call('POST', questPath(key, 'start'), isTutorial)),
  completeTutorialQuest: (key, by) =>
    readTutorial(call('POST', questPath(key, 'complete'), isTutorial, { body: { by } })),
};
