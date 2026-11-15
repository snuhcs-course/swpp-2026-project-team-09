/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, PlacePoint } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { field, hasTexts, isNumber, isText, isTextOrNull, listOf } from './answers';

// The map scene of an answer or a Lookup, as main-server `assistant/dto/answer.dto.ts` fixes it: every field, since
// the answer screen draws each.

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

const isFlagRole = isKeyOf<Role<'flags'>>({
  place: true,
  meeting: true,
  leave: true,
  late: true,
  shuttle: true,
  away: true,
});

const isPersonSource = isKeyOf<MapScene['people'][number]['source']>({ exact: true, building: true, timetable: true });

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isLatLng(value: unknown): value is LatLng {
  return isNumber(field(value, 'latitude')) && isNumber(field(value, 'longitude'));
}

// A mode is absent for a walk.
export function isMode(value: unknown): boolean {
  return value === undefined || value === 'walk' || value === 'shuttle';
}

export function isPlacePoint(value: unknown): value is PlacePoint {
  return hasTexts(value, ['placeId', 'label']) && isLatLng(value);
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

// A main server before P05-11 sends no `placeId`.
function isFlag(value: unknown): value is MapScene['flags'][number] {
  const placeId = field(value, 'placeId');
  const pointed = placeId === undefined || isText(placeId);
  return pointed && isLatLng(field(value, 'at')) && isText(field(value, 'text')) && isFlagRole(field(value, 'role'));
}

export function isScene(value: unknown): value is MapScene {
  return (
    listOf(isScenePerson)(field(value, 'people')) &&
    listOf(isScenePlace)(field(value, 'places')) &&
    listOf(isRoute)(field(value, 'routes')) &&
    listOf(isFlag)(field(value, 'flags'))
  );
}
