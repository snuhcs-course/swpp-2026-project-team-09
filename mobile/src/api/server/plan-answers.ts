/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type {
  AnswerLine,
  AnswerReply,
  ConditionChip,
  DroppedPlace,
  MapScene,
  PersonConstraint,
  PlacePoint,
  Plan,
  PlanInput,
  PlanPart,
  PlanPerson,
  TimeBand,
} from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { field, hasTexts, isNumber, isText, isTextOrNull, listOf } from './answers';

// The `answer` of the Assistant's reply, as main-server `assistant/dto/answer.dto.ts` fixes it: every field, since the
// answer screen draws each. An answer the app cannot read fails the reply.

function isOneOf<Value extends string>(values: readonly Value[]): (value: unknown) => value is Value {
  return (value: unknown): value is Value => values.some((one) => one === value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isLatLng(value: unknown): value is LatLng {
  return isNumber(field(value, 'latitude')) && isNumber(field(value, 'longitude'));
}

function isConstraint(value: unknown): value is PersonConstraint {
  if (!isOneOf(['asker', 'person'])(field(value, 'source'))) {
    return false;
  }
  switch (field(value, 'kind')) {
    case 'from':
      return isText(field(value, 'placeId'));
    case 'notBefore':
    case 'leaveBy':
      return isText(field(value, 'time'));
    default:
      return false;
  }
}

function isPerson(value: unknown): value is PlanPerson {
  return isText(field(value, 'userId')) && listOf(isConstraint)(field(value, 'constraints'));
}

function isInput(value: unknown): value is PlanInput {
  const window = field(value, 'window');
  return (
    field(value, 'kind') === 'meal' &&
    isText(field(value, 'date')) &&
    isOneOf(['lunch', 'dinner'])(field(value, 'meal')) &&
    listOf(isPerson)(field(value, 'people')) &&
    isTextOrNull(field(window, 'from')) &&
    isTextOrNull(field(window, 'until')) &&
    isTextOrNull(field(value, 'placeId'))
  );
}

function isChip(value: unknown): value is ConditionChip {
  return (
    isOneOf(['origin', 'until', 'person'])(field(value, 'kind')) &&
    isText(field(value, 'text')) &&
    isTextOrNull(field(value, 'userId'))
  );
}

function isLine(value: unknown): value is AnswerLine {
  return listOf((part): part is AnswerLine[number] => isText(field(part, 'text')) && isBoolean(field(part, 'strong')))(
    value,
  );
}

function isPlacePoint(value: unknown): value is PlacePoint {
  return hasTexts(value, ['placeId', 'label']) && isLatLng(value);
}

function isDropped(value: unknown): value is DroppedPlace {
  return isPlacePoint(field(value, 'place')) && isText(field(value, 'reason'));
}

function isNoPlan(value: unknown): value is AnswerReply['noPlan'] {
  return (
    value === null ||
    (isOneOf(['no-menu', 'no-shared-time', 'no-fit'])(field(value, 'reason')) && listOf(isLine)(field(value, 'lines')))
  );
}

function isMeeting(value: unknown): value is Plan['meeting'] {
  return (
    value === null ||
    (isPlacePoint(field(value, 'place')) && isText(field(value, 'at')) && listOf(isText)(field(value, 'userIds')))
  );
}

function isOrigin(value: unknown): value is PlanPart['origin'] {
  return (
    value === null ||
    (isPlacePoint(field(value, 'place')) && isOneOf(['timetable', 'location', 'chosen'])(field(value, 'basis')))
  );
}

function isNext(value: unknown): value is PlanPart['next'] {
  const place = field(value, 'place');
  return value === null || (isText(field(value, 'startAt')) && (place === null || isPlacePoint(place)));
}

function isPart(value: unknown): value is PlanPart {
  return (
    hasTexts(value, ['userId', 'name']) &&
    isBoolean(field(value, 'me')) &&
    isOrigin(field(value, 'origin')) &&
    ['leaveAt', 'leaveBy'].every((name) => isTextOrNull(field(value, name))) &&
    isNumberOrNull(field(value, 'walkMinutes')) &&
    isNext(field(value, 'next'))
  );
}

function isSubQuest(value: unknown): value is Plan['subQuests'][number] {
  return hasTexts(value, ['at', 'placeId', 'title']);
}

function isScenePerson(value: unknown): value is MapScene['people'][number] {
  return (
    hasTexts(value, ['userId', 'name']) &&
    isBoolean(field(value, 'me')) &&
    isLatLng(field(value, 'at')) &&
    isOneOf(['exact', 'timetable'])(field(value, 'source')) &&
    isTextOrNull(field(value, 'tag'))
  );
}

function isScenePlace(value: unknown): value is MapScene['places'][number] {
  return (
    isPlacePoint(field(value, 'place')) &&
    isOneOf(['pick', 'candidate', 'dropped', 'next', 'meeting'])(field(value, 'role')) &&
    isTextOrNull(field(value, 'tag'))
  );
}

function isRoute(value: unknown): value is MapScene['routes'][number] {
  return (
    isText(field(value, 'userId')) &&
    isOneOf(['me', 'friend', 'next'])(field(value, 'role')) &&
    isLatLng(field(value, 'from')) &&
    isLatLng(field(value, 'to')) &&
    isNumber(field(value, 'minutes'))
  );
}

function isFlag(value: unknown): value is MapScene['flags'][number] {
  return (
    isLatLng(field(value, 'at')) && isText(field(value, 'text')) && isOneOf(['place', 'meeting'])(field(value, 'role'))
  );
}

function isScene(value: unknown): value is MapScene {
  return (
    listOf(isScenePerson)(field(value, 'people')) &&
    listOf(isScenePlace)(field(value, 'places')) &&
    listOf(isRoute)(field(value, 'routes')) &&
    listOf(isFlag)(field(value, 'flags'))
  );
}

function isSpan(value: unknown): value is { startAt: string; endAt: string } {
  return hasTexts(value, ['startAt', 'endAt']);
}

function isLane(value: unknown): value is TimeBand['lanes'][number] {
  return hasTexts(value, ['userId', 'name']) && listOf(isSpan)(field(value, 'busy'));
}

function isBand(value: unknown): value is TimeBand {
  return (
    isSpan(field(value, 'range')) &&
    hasTexts(value, ['now', 'startAt', 'endAt', 'text']) &&
    listOf(isLane)(field(value, 'lanes'))
  );
}

function isPlan(value: unknown): value is Plan {
  return (
    hasTexts(value, ['id', 'title', 'startAt', 'endAt']) &&
    isPlacePoint(field(value, 'place')) &&
    isNumber(field(value, 'togetherMinutes')) &&
    isMeeting(field(value, 'meeting')) &&
    listOf(isPart)(field(value, 'parts')) &&
    listOf(isSubQuest)(field(value, 'subQuests')) &&
    listOf(isLine)(field(value, 'lines')) &&
    listOf(isText)(field(value, 'basis')) &&
    isScene(field(value, 'scene')) &&
    isBand(field(value, 'band'))
  );
}

export function isAnswerReply(value: unknown): value is AnswerReply {
  return (
    isInput(field(value, 'input')) &&
    listOf(isChip)(field(value, 'chips')) &&
    listOf(isPlan)(field(value, 'plans')) &&
    listOf(isDropped)(field(value, 'dropped')) &&
    isNoPlan(field(value, 'noPlan'))
  );
}
