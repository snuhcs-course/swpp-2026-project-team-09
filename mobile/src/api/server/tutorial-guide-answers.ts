/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { TutorialAction, TutorialGuide, TutorialStep } from '@/api/tutorial-types';
import { field, hasTexts, isNumber, isText, listOf } from './answers';

// The check of a Tutorial Quest's guide as the main server serves it (`main-server/src/tutorial/tutorial-guide.ts`).
// A field the app does not read is let through, so that a newer server's guide still opens.

function isOptional(value: unknown, isValue: (each: unknown) => boolean): boolean {
  return value === undefined || isValue(value);
}

function isFlag(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

const isTexts = listOf(isText);

function isGuidePlace(value: unknown): boolean {
  const point = field(value, 'point');
  return point === undefined
    ? isText(field(value, 'place'))
    : isNumber(field(point, 'latitude')) && isNumber(field(point, 'longitude'));
}

const isChips = listOf((chip: unknown): chip is { icon: string; words: string } => hasTexts(chip, ['icon', 'words']));

function isAction(value: unknown): value is TutorialAction {
  const kind = field(value, 'kind');
  return (
    isText(field(value, 'words')) &&
    (kind === 'route' ||
      (kind === 'link' && isText(field(value, 'url'))) ||
      (kind === 'ask' && isText(field(value, 'ask'))))
  );
}

function isRow(value: unknown): boolean {
  return (
    isText(field(value, 'words')) && isOptional(field(value, 'note'), isText) && isOptional(field(value, 'url'), isText)
  );
}

function isSpot(value: unknown): boolean {
  return (
    isText(field(value, 'name')) &&
    isOptional(field(value, 'sub'), isText) &&
    isOptional(field(value, 'place'), isGuidePlace) &&
    isOptional(field(value, 'chips'), isChips)
  );
}

function isStep(value: unknown): value is TutorialStep {
  return (
    hasTexts(value, ['tab', 'title']) &&
    ['name', 'sub', 'pinText'].every((name) => isOptional(field(value, name), isText)) &&
    isFlag(field(value, 'optional')) &&
    isFlag(field(value, 'showName')) &&
    isOptional(field(value, 'about'), isTexts) &&
    isOptional(field(value, 'place'), isGuidePlace) &&
    isOptional(field(value, 'link'), (link) => hasTexts(link, ['words', 'url'])) &&
    isOptional(
      field(value, 'rows'),
      listOf((row: unknown): row is object => isRow(row)),
    ) &&
    isOptional(field(value, 'chips'), isChips) &&
    isOptional(field(value, 'actions'), listOf(isAction)) &&
    isOptional(
      field(value, 'spots'),
      listOf((spot: unknown): spot is object => isSpot(spot)),
    )
  );
}

const isSteps = listOf(isStep);

function isKind(value: unknown): boolean {
  return (
    hasTexts(value, ['key', 'label', 'icon', 'title']) &&
    isTexts(field(value, 'route')) &&
    isSteps(field(value, 'steps'))
  );
}

export function isTutorialGuide(value: unknown): value is TutorialGuide {
  const steps = field(value, 'steps');
  const kinds = field(value, 'kinds');
  return (
    isFlag(field(value, 'together')) &&
    isFlag(field(value, 'withoutUser')) &&
    isOptional(field(value, 'about'), isTexts) &&
    (steps === undefined) !== (kinds === undefined) &&
    isOptional(steps, (list) => isSteps(list) && list.length > 0) &&
    isOptional(
      kinds,
      listOf((kind: unknown): kind is object => isKind(kind)),
    )
  );
}
