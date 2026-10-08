import type {
  Board,
  ClassTime,
  Friend,
  InviteLink,
  Lobby,
  MyParty,
  OpenedInviteLink,
  Party,
  PartyQuest,
  Person,
  Place,
  Position,
  PositionKept,
  Profile,
  Quest,
  SentFriendRequest,
  SubQuest,
  Suggestion,
  TimetableClass,
  UserSummary,
} from '@/api/types';
import type { WalkingRoute } from '@/api/walking-route-types';

// What the app checks of each answer of the main server before it believes it. The fields the screens read are
// checked; a field the app does not read may be there or not. An answer of another shape is a failure, as no answer is.

export type Guard<Answer> = (value: unknown) => value is Answer;

export function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
}

export function isText(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isTextOrNull(value: unknown): value is string | null {
  return value === null || isText(value);
}

export function listOf<Item>(isItem: Guard<Item>): Guard<Item[]> {
  return (value: unknown): value is Item[] => Array.isArray(value) && value.every((item) => isItem(item));
}

export function hasTexts(value: unknown, names: readonly string[]): boolean {
  return names.every((name) => isText(field(value, name)));
}

// An answer that has no body: 204.
export function isNothing(value: unknown): value is null {
  return value === null;
}

export function isSuggestion(value: unknown): value is Suggestion {
  return isTextOrNull(field(value, 'name')) && isTextOrNull(field(value, 'department'));
}

export interface SignInAnswer {
  accessToken: string;
  refreshToken: string;
  onboarding: { completed: boolean; suggestion?: Suggestion };
}

export function isSignInAnswer(value: unknown): value is SignInAnswer {
  const onboarding = field(value, 'onboarding');
  const suggestion = field(onboarding, 'suggestion');
  return (
    hasTexts(value, ['accessToken', 'refreshToken']) &&
    typeof field(onboarding, 'completed') === 'boolean' &&
    (suggestion === undefined || isSuggestion(suggestion))
  );
}

export function isTokens(value: unknown): value is { accessToken: string; refreshToken: string } {
  return hasTexts(value, ['accessToken', 'refreshToken']);
}

export function isProfile(value: unknown): value is Profile {
  const admissionYear = field(value, 'admissionYear');
  return (
    hasTexts(value, ['name', 'department', 'friendId']) &&
    (admissionYear === null || isNumber(admissionYear)) &&
    listOf(isText)(field(value, 'hashtags'))
  );
}

export function isLobby(value: unknown): value is Lobby {
  return isProfile(field(value, 'profile')) && typeof field(value, 'masterSwitch') === 'boolean';
}

export function isPositionKept(value: unknown): value is PositionKept {
  return typeof field(value, 'offCampus') === 'boolean';
}

function isFriend(value: unknown): value is Friend {
  return (
    hasTexts(value, ['id', 'name', 'department']) &&
    typeof field(value, 'sharing') === 'boolean' &&
    typeof field(value, 'visible') === 'boolean'
  );
}

export const isFriends = listOf(isFriend);

export function isUserSummary(value: unknown): value is UserSummary {
  return hasTexts(value, ['name', 'department']);
}

export function isSentFriendRequest(value: unknown): value is SentFriendRequest {
  const status = field(value, 'status');
  return status === 'waiting' || status === 'friends';
}

export function isInviteLink(value: unknown): value is InviteLink {
  return hasTexts(value, ['url', 'expiresAt']);
}

const INVITE_LINK_STATUSES = new Set(['usable', 'used', 'expired', 'own', 'friend']);

export function isOpenedInviteLink(value: unknown): value is OpenedInviteLink {
  const status = field(value, 'status');
  return isUserSummary(field(value, 'sender')) && isText(status) && INVITE_LINK_STATUSES.has(status);
}

function isPosition(value: unknown): value is Position {
  return (
    hasTexts(value, ['userId', 'measuredAt']) &&
    isNumber(field(value, 'latitude')) &&
    isNumber(field(value, 'longitude'))
  );
}

export const isPositions = listOf(isPosition);

export function isEventName(value: unknown): value is { id: string; title: string } | null {
  return value === null || hasTexts(value, ['id', 'title']);
}

export function isPlace(value: unknown): value is SubQuest['place'] {
  return (
    value === null ||
    (isTextOrNull(field(value, 'placeId')) &&
      isText(field(value, 'label')) &&
      isNumber(field(value, 'latitude')) &&
      isNumber(field(value, 'longitude')))
  );
}

export function isSubQuest(value: unknown): value is SubQuest {
  const completion = field(value, 'completion');
  return (
    hasTexts(value, ['id', 'title']) &&
    isTextOrNull(field(value, 'startsAt')) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isPlace(field(value, 'place')) &&
    (completion === 'by_time' || completion === 'by_hand') &&
    ['attending', 'cancelled', 'done', 'ended'].every((name) => typeof field(value, name) === 'boolean')
  );
}

export function isHolder(value: unknown): value is Person {
  return hasTexts(value, ['id', 'name', 'department']);
}

export function isJoinPolicy(value: unknown): value is Party['joinPolicy'] {
  return value === 'open' || value === 'approval' || value === 'closed';
}

const BOARDS = new Set(['meal', 'career', 'hobby', 'show']);

export function isBoard(value: unknown): value is Board | null {
  return value === null || (isText(value) && BOARDS.has(value));
}

export function isQuest(value: unknown): value is Quest {
  const leader = field(value, 'leader');
  return (
    isBoard(field(value, 'board')) &&
    isText(field(value, 'description')) &&
    isTextOrNull(field(value, 'createdAt')) &&
    hasTexts(value, ['id', 'title']) &&
    isEventName(field(value, 'globalEvent')) &&
    (leader === null || isHolder(leader)) &&
    isNumber(field(value, 'capacity')) &&
    isJoinPolicy(field(value, 'joinPolicy')) &&
    listOf(isHolder)(field(value, 'holders')) &&
    listOf(isSubQuest)(field(value, 'subQuests')) &&
    typeof field(value, 'classQuest') === 'boolean' &&
    isNumber(field(value, 'waitingJoinRequests'))
  );
}

export const isQuests = listOf(isQuest);

function isPartyQuest(value: unknown): value is PartyQuest | null {
  return value === null || (hasTexts(value, ['id', 'title']) && isEventName(field(value, 'globalEvent')));
}

function isPartyHead(value: unknown): boolean {
  return (
    hasTexts(value, ['id', 'title']) &&
    isNumber(field(value, 'capacity')) &&
    isJoinPolicy(field(value, 'joinPolicy')) &&
    isPartyQuest(field(value, 'quest'))
  );
}

function isParty(value: unknown): value is Party {
  const leader = field(value, 'leader');
  return (
    isPartyHead(value) &&
    isNumber(field(value, 'memberCount')) &&
    typeof field(value, 'holdsQuest') === 'boolean' &&
    listOf(isHolder)(field(value, 'friends')) &&
    (leader === undefined || hasTexts(leader, ['id', 'name']))
  );
}

export const isParties = listOf(isParty);

function isMember(value: unknown): value is MyParty['members'][number] {
  return (
    hasTexts(value, ['id', 'name', 'department']) &&
    typeof field(value, 'leader') === 'boolean' &&
    typeof field(value, 'visible') === 'boolean'
  );
}

export function isMyParty(value: unknown): value is MyParty {
  return (
    isPartyHead(value) && typeof field(value, 'sharing') === 'boolean' && listOf(isMember)(field(value, 'members'))
  );
}

const WEEKDAYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

function isClassTime(value: unknown): value is ClassTime {
  const weekday = field(value, 'weekday');
  return (
    hasTexts(value, ['id', 'startTime', 'endTime']) &&
    isText(weekday) &&
    WEEKDAYS.has(weekday) &&
    isTextOrNull(field(value, 'placeId')) &&
    isTextOrNull(field(value, 'room'))
  );
}

function isOverlap(value: unknown): value is TimetableClass['overlaps'][number] {
  return hasTexts(value, ['id', 'courseName']);
}

export function isTimetableClass(value: unknown): value is TimetableClass {
  return (
    hasTexts(value, ['id', 'courseName']) &&
    listOf(isClassTime)(field(value, 'times')) &&
    listOf(isOverlap)(field(value, 'overlaps'))
  );
}

export const isTimetableClasses = listOf(isTimetableClass);

export function isCampusPlace(value: unknown): value is Place {
  return (
    hasTexts(value, ['id', 'name']) &&
    isTextOrNull(field(value, 'number')) &&
    isNumber(field(value, 'latitude')) &&
    isNumber(field(value, 'longitude'))
  );
}

export const isPlaces = listOf(isCampusPlace);

const NO_ROUTE = new Set([
  'SAME_POINT',
  'START_LINK_NOT_FOUND',
  'END_LINK_NOT_FOUND',
  'TOO_MANY_SEARCH_LINK',
  'TOO_FAR_AWAY',
  'ROUTE_RESULT_NOT_FOUND',
]);

export function isPoint(value: unknown): value is { latitude: number; longitude: number } {
  return isNumber(field(value, 'latitude')) && isNumber(field(value, 'longitude'));
}

export function isWalkingRoute(value: unknown): value is WalkingRoute {
  const status = field(value, 'status');
  const route = field(value, 'route');
  if (status === 'OK') {
    return (
      listOf(isPoint)(field(route, 'line')) && isNumber(field(route, 'distance')) && isNumber(field(route, 'duration'))
    );
  }
  return isText(status) && NO_ROUTE.has(status) && route === null;
}
