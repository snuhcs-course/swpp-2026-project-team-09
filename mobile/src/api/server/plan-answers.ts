/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type {
  AnswerLine,
  AnswerReply,
  ConditionChip,
  DroppedPlace,
  EventsInput,
  MapScene,
  MealInput,
  PersonConstraint,
  PlacePoint,
  Plan,
  PlanInput,
  PlanPart,
  PlanPerson,
  TimeBand,
} from '@/api/assistant-types';
import type { NewQuestInput, QuestsInput } from '@/api/recruiting-plan-types';
import type { LatLng } from '@/api/types';
import { field, hasTexts, isBoard, isNumber, isText, isTextOrNull, listOf } from './answers';
import { isRecruitingQuest } from './party-client';

// The `answer` and the `lookup` of the Assistant's reply, as main-server `assistant/dto/answer.dto.ts` fixes them:
// every field, since the answer screen draws each. An answer or a Lookup the app cannot read fails the reply.

export function isOneOf<Value extends string>(values: readonly Value[]): (value: unknown) => value is Value {
  return (value: unknown): value is Value => values.some((one) => one === value);
}

// The keys of a record typed by a union of the contract, so that the compiler refuses a value left out or one too many.
function isKeyOf<Value extends string>(values: Record<Value, true>): (value: unknown) => value is Value {
  return (value: unknown): value is Value => typeof value === 'string' && Object.hasOwn(values, value);
}

type Role<Part extends 'places' | 'routes' | 'flags'> = MapScene[Part][number]['role'];

const isPlaceRole = isKeyOf<Role<'places'>>({
  pick: true,
  candidate: true,
  dropped: true,
  next: true,
  meeting: true,
  stop: true,
});

const isRouteRole = isKeyOf<Role<'routes'>>({ me: true, friend: true, next: true, shuttle: true, alt: true });

const isFlagRole = isKeyOf<Role<'flags'>>({ place: true, meeting: true, leave: true, late: true, shuttle: true });

const isPersonSource = isKeyOf<MapScene['people'][number]['source']>({ exact: true, building: true, timetable: true });

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

function isMealInput(value: unknown): value is MealInput {
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

function isEventsInput(value: unknown): value is EventsInput {
  const eventIds = field(value, 'eventIds');
  return (
    field(value, 'kind') === 'events' && isText(field(value, 'date')) && (eventIds === null || listOf(isText)(eventIds))
  );
}

function isQuestsInput(value: unknown): value is QuestsInput {
  const globalEventId = field(value, 'globalEventId');
  const questIds = field(value, 'questIds');
  return (
    field(value, 'kind') === 'quests' &&
    isTextOrNull(globalEventId) &&
    (questIds === null || listOf(isText)(questIds)) &&
    (globalEventId === null) !== (questIds === null)
  );
}

function isNewQuestInput(value: unknown): value is NewQuestInput {
  const board = field(value, 'board');
  return (
    field(value, 'kind') === 'new-quest' &&
    isText(field(value, 'date')) &&
    ['globalEventId', 'title', 'placeId', 'time'].every((name) => isTextOrNull(field(value, name))) &&
    listOf(isPerson)(field(value, 'people')) &&
    (board === undefined || (board !== null && isBoard(board)))
  );
}

export function isInput(value: unknown): value is PlanInput {
  return isMealInput(value) || isEventsInput(value) || isQuestsInput(value) || isNewQuestInput(value);
}

// A mode is absent for a walk.
function isMode(value: unknown): boolean {
  return value === undefined || isOneOf(['walk', 'shuttle'])(value);
}

export function isChip(value: unknown): value is ConditionChip {
  return (
    isOneOf(['origin', 'until', 'person'])(field(value, 'kind')) &&
    isText(field(value, 'text')) &&
    isTextOrNull(field(value, 'userId'))
  );
}

export function isLine(value: unknown): value is AnswerLine {
  return listOf((part): part is AnswerLine[number] => isText(field(part, 'text')) && isBoolean(field(part, 'strong')))(
    value,
  );
}

export function isPlacePoint(value: unknown): value is PlacePoint {
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

export function isNext(value: unknown): value is PlanPart['next'] {
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
    isNext(field(value, 'next')) &&
    isMode(field(value, 'mode'))
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
    isPersonSource(field(value, 'source')) &&
    isTextOrNull(field(value, 'tag'))
  );
}

function isScenePlace(value: unknown): value is MapScene['places'][number] {
  return isPlacePoint(field(value, 'place')) && isPlaceRole(field(value, 'role')) && isTextOrNull(field(value, 'tag'));
}

function isRoute(value: unknown): value is MapScene['routes'][number] {
  return (
    isText(field(value, 'userId')) &&
    isRouteRole(field(value, 'role')) &&
    isLatLng(field(value, 'from')) &&
    isLatLng(field(value, 'to')) &&
    isNumber(field(value, 'minutes')) &&
    isMode(field(value, 'mode'))
  );
}

function isFlag(value: unknown): value is MapScene['flags'][number] {
  return isLatLng(field(value, 'at')) && isText(field(value, 'text')) && isFlagRole(field(value, 'role'));
}

export function isScene(value: unknown): value is MapScene {
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

export function isBand(value: unknown): value is TimeBand {
  return (
    isSpan(field(value, 'range')) &&
    hasTexts(value, ['now', 'startAt', 'endAt', 'text']) &&
    listOf(isLane)(field(value, 'lanes'))
  );
}

function isCandidate(value: unknown): value is NonNullable<Plan['candidates']>[number] {
  return hasTexts(value, ['userId', 'name', 'line']);
}

// A recruiting Quest's Plan carries the Quest and the Friends who hold it, and a new one's the Friends who could come;
// any other Plan none of these.
function isOfQuest(value: unknown): boolean {
  const quest = field(value, 'quest');
  const friendNames = field(value, 'friendNames');
  const candidates = field(value, 'candidates');
  return (
    (quest === undefined || isRecruitingQuest(quest)) &&
    (friendNames === undefined || listOf(isText)(friendNames)) &&
    (candidates === undefined || listOf(isCandidate)(candidates))
  );
}

export function isPlan(value: unknown): value is Plan {
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
    isBand(field(value, 'band')) &&
    isOfQuest(value)
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
