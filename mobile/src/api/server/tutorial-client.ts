/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { Tutorial, TutorialPlace, TutorialQuest } from '@/api/tutorial-types';
import { field, hasTexts, isNumber, isText, listOf } from './answers';
import { call } from './http';

// The 새내기 튜토리얼's routes on the main server (P06 spec "Endpoints"), each answering the `GET /tutorial` body.
//
// The switch: the main server serves these routes once ticket P06-02 is merged. Until then the server build answers
// the tutorial from the mock (`../mock/tutorial.ts`) and `TUTORIAL_SERVED` is false. Whichever of P06-02 and P06-03
// merges second sets it to true, which `serverClient` reads, and checks the tutorial on the development server.
export const TUTORIAL_SERVED = false;

const STATES = new Set(['off', 'available', 'active', 'stopped', 'finished']);
const STATUSES = new Set(['notStarted', 'started', 'completed']);

function isOneOf(value: unknown, names: ReadonlySet<string>): boolean {
  return typeof value === 'string' && names.has(value);
}

function isOptional(value: unknown, isValue: (each: unknown) => boolean): boolean {
  return value === undefined || isValue(value);
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
    listOf(isQuest)(field(value, 'quests')) &&
    isOptional(field(value, 'rowHidden'), (each: unknown): each is boolean => typeof each === 'boolean')
  );
}

function questPath(key: string, action: 'start' | 'complete'): string {
  return `/tutorial/quests/${encodeURIComponent(key)}/${action}`;
}

type TutorialClient = Pick<
  ApiClient,
  'getTutorial' | 'enableTutorial' | 'stopTutorial' | 'hideTutorialRow' | 'startTutorialQuest' | 'completeTutorialQuest'
>;

export const tutorialClient: TutorialClient = {
  getTutorial: () => call('GET', '/tutorial', isTutorial),
  enableTutorial: () => call('POST', '/tutorial/enable', isTutorial),
  stopTutorial: () => call('POST', '/tutorial/stop', isTutorial),
  hideTutorialRow: () => call('POST', '/tutorial/hide-row', isTutorial),
  startTutorialQuest: (key) => call('POST', questPath(key, 'start'), isTutorial),
  completeTutorialQuest: (key, by) => call('POST', questPath(key, 'complete'), isTutorial, { body: { by } }),
};
