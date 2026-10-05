import type {
  Friend,
  Lobby,
  MyParty,
  Party,
  PartyQuest,
  Position,
  Quest,
  SubQuest,
  Suggestion,
  WalkingRoute,
} from '@/api/types';

// What the app checks of each answer of the main server before it believes it. The fields the screens read are
// checked; a field the app does not read may be there or not. An answer of another shape is a failure, as no answer is.

export type Guard<Answer> = (value: unknown) => value is Answer;

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || isText(value);
}

function listOf<Item>(isItem: Guard<Item>): Guard<Item[]> {
  return (value: unknown): value is Item[] => Array.isArray(value) && value.every((item) => isItem(item));
}

function hasTexts(value: unknown, names: readonly string[]): boolean {
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

export function isLobby(value: unknown): value is Lobby {
  const profile = field(value, 'profile');
  const admissionYear = field(profile, 'admissionYear');
  return (
    hasTexts(profile, ['name', 'department']) &&
    (admissionYear === null || isNumber(admissionYear)) &&
    listOf(isText)(field(profile, 'hashtags'))
  );
}

function isFriend(value: unknown): value is Friend {
  return (
    hasTexts(value, ['id', 'name', 'department']) &&
    typeof field(value, 'sharing') === 'boolean' &&
    typeof field(value, 'visible') === 'boolean'
  );
}

export const isFriends = listOf(isFriend);

function isPosition(value: unknown): value is Position {
  return (
    hasTexts(value, ['userId', 'measuredAt']) &&
    isNumber(field(value, 'latitude')) &&
    isNumber(field(value, 'longitude'))
  );
}

export const isPositions = listOf(isPosition);

function isEventName(value: unknown): value is { id: string; title: string } | null {
  return value === null || hasTexts(value, ['id', 'title']);
}

function isPlace(value: unknown): value is SubQuest['place'] {
  return (
    value === null ||
    (isTextOrNull(field(value, 'placeId')) &&
      isText(field(value, 'label')) &&
      isNumber(field(value, 'latitude')) &&
      isNumber(field(value, 'longitude')))
  );
}

function isSubQuest(value: unknown): value is SubQuest {
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

function isHolder(value: unknown): value is Quest['holders'][number] {
  return hasTexts(value, ['id', 'name', 'department']);
}

function isQuest(value: unknown): value is Quest {
  return (
    hasTexts(value, ['id', 'title']) &&
    isEventName(field(value, 'globalEvent')) &&
    listOf(isHolder)(field(value, 'holders')) &&
    listOf(isSubQuest)(field(value, 'subQuests')) &&
    typeof field(value, 'classQuest') === 'boolean'
  );
}

export const isQuests = listOf(isQuest);

function isJoinPolicy(value: unknown): value is Party['joinPolicy'] {
  return value === 'open' || value === 'approval' || value === 'closed';
}

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
  return (
    isPartyHead(value) &&
    isNumber(field(value, 'memberCount')) &&
    typeof field(value, 'holdsQuest') === 'boolean' &&
    listOf(isHolder)(field(value, 'friends'))
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

const NO_ROUTE = new Set([
  'SAME_POINT',
  'START_LINK_NOT_FOUND',
  'END_LINK_NOT_FOUND',
  'TOO_MANY_SEARCH_LINK',
  'TOO_FAR_AWAY',
  'ROUTE_RESULT_NOT_FOUND',
]);

function isPoint(value: unknown): value is { latitude: number; longitude: number } {
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
