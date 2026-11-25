/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, AnswerReply, MapScene, Plan, TimeBand } from '@/api/assistant-types';
import type { DroppedPlace, PlanPart } from '@/api/plan-part-types';
import { field, hasTexts, isNumber, isText, isTextOrNull, listOf } from './answers';
import { isClosedOrAbsent, isLatLng, isPlacePoint } from './place-answers';
import { isChip } from './chip-answers';
import { hasMissingParts } from './missing-input-answers';
import { isRecruitingQuest } from './party-client';
import { isInput, isOneOf } from './plan-inputs';
import { hasRelax } from './relax-answers';
import { isKeptOneOrAbsent, isKeptOrAbsent } from './kept-answers';
import { isPlanMenuOrAbsent } from './plan-menu-answers';

// The check of a Place, used beside these by other answers' checks.
export { isPlacePoint } from './place-answers';

// The `answer` and the `lookup` of the Assistant's reply, as main-server `assistant/dto/answer.dto.ts` fixes them:
// every field, since the answer screen draws each. An answer or a Lookup the app cannot read fails the reply. The
// input's checks are in `plan-inputs.ts`.

// The keys of a record typed by a union of the contract, so that the compiler refuses a value left out or one too many.
export function isKeyOf<Value extends string>(values: Record<Value, true>): (value: unknown) => value is Value {
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

const isFlagRole = isKeyOf<Role<'flags'>>({
  place: true,
  meeting: true,
  leave: true,
  late: true,
  shuttle: true,
  away: true,
});

const isPersonSource = isKeyOf<MapScene['people'][number]['source']>({ exact: true, building: true, timetable: true });

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

// A mode is absent for a walk.
function isMode(value: unknown): boolean {
  return value === undefined || isOneOf(['walk', 'shuttle'])(value);
}

export function isLine(value: unknown): value is AnswerLine {
  return listOf((part): part is AnswerLine[number] => isText(field(part, 'text')) && isBoolean(field(part, 'strong')))(
    value,
  );
}

// The Place the input fixed carries each person's part there.
function isDropped(value: unknown): value is DroppedPlace {
  const parts = field(value, 'parts');
  return (
    isPlacePoint(field(value, 'place')) &&
    isText(field(value, 'reason')) &&
    (parts === undefined || listOf(isPart)(parts))
  );
}

function isNoPlan(value: unknown): value is AnswerReply['noPlan'] {
  return (
    value === null ||
    (isOneOf(['no-menu', 'no-shared-time', 'no-fit'])(field(value, 'reason')) &&
      listOf(isLine)(field(value, 'lines')) &&
      hasRelax(value))
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
  const arriveAt = field(value, 'arriveAt');
  return (
    hasTexts(value, ['userId', 'name']) &&
    isBoolean(field(value, 'me')) &&
    isOrigin(field(value, 'origin')) &&
    ['leaveAt', 'leaveBy'].every((name) => isTextOrNull(field(value, name))) &&
    (arriveAt === undefined || isTextOrNull(arriveAt)) &&
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
  const order = field(value, 'order');
  return (
    isPlacePoint(field(value, 'place')) &&
    isPlaceRole(field(value, 'role')) &&
    isTextOrNull(field(value, 'tag')) &&
    (order === undefined || (typeof order === 'number' && Number.isInteger(order) && order >= 1))
  );
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

// `placeId` names the Place an `away` flag points to, such as 관정, whose free seats the phone adds.
function isFlag(value: unknown): value is MapScene['flags'][number] {
  const placeId = field(value, 'placeId');
  return (
    isLatLng(field(value, 'at')) &&
    isText(field(value, 'text')) &&
    isFlagRole(field(value, 'role')) &&
    (placeId === undefined || isText(placeId))
  );
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

// A busy stretch says what it is on a Plan's band, and need not elsewhere.
function isBusy(value: unknown): value is TimeBand['lanes'][number]['busy'][number] {
  const label = field(value, 'label');
  return isSpan(value) && (label === undefined || isText(label));
}

function isLane(value: unknown): value is TimeBand['lanes'][number] {
  return hasTexts(value, ['userId', 'name']) && listOf(isBusy)(field(value, 'busy'));
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

// A Global Event's own times: absent from other Plans and from a main server before P05 ticket 05's follow-up.
function isEventTimesOrAbsent(value: unknown): boolean {
  return value === undefined || (isText(field(value, 'startAt')) && isTextOrNull(field(value, 'endAt')));
}

// A meal answer's meal already set: absent from other answers and from a main server before P05 ticket 16.
function isMealSetOrAbsent(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (hasTexts(value, ['questId', 'title', 'startAt', 'place']) &&
      listOf(isText)(field(value, 'friendNames')) &&
      isBoolean(field(value, 'shared')))
  );
}

// A meal answer's other meal: absent from other answers and from a main server before P05 ticket 15.
function isOtherMealOrAbsent(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    ((field(value, 'meal') === 'lunch' || field(value, 'meal') === 'dinner') && isText(field(value, 'start')))
  );
}

// A Friend the plans add to the meal the User holds, and those Friends with the start (P05 ticket 44).
function isAddedFriend(value: unknown): value is { userId: string; name: string } {
  return isText(field(value, 'userId')) && isText(field(value, 'name'));
}
function isAddingOrAbsent(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (listOf(isAddedFriend)(field(value, 'friends')) &&
      isText(field(value, 'startAt')) &&
      isTextOrNull(field(value, 'movesTo')))
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
    isOfQuest(value) &&
    isEventTimesOrAbsent(field(value, 'event')) &&
    isPlanMenuOrAbsent(field(value, 'menu'))
  );
}

export function isAnswerReply(value: unknown): value is AnswerReply {
  return (
    isInput(field(value, 'input')) &&
    listOf(isChip)(field(value, 'chips')) &&
    listOf(isPlan)(field(value, 'plans')) &&
    listOf(isDropped)(field(value, 'dropped')) &&
    isClosedOrAbsent(field(value, 'closed')) &&
    isNoPlan(field(value, 'noPlan')) &&
    isOtherMealOrAbsent(field(value, 'otherMeal')) &&
    isMealSetOrAbsent(field(value, 'mealSet')) &&
    isKeptOneOrAbsent(field(value, 'planSet')) &&
    isKeptOrAbsent(field(value, 'related')) &&
    isAddingOrAbsent(field(value, 'adding')) &&
    hasMissingParts(value)
  );
}
