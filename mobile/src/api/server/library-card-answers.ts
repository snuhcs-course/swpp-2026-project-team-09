/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryAction, LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { field, hasTexts, isNumber, isText, isTextOrNull, listOf } from './answers';

// The `library` card of the Assistant's reply, as the spec ("Cards and the API contract") fixes it. A card the app
// cannot read fails the reply, as any card does. A field the server leaves out reads as empty
// (`withLibraryDefaults`).

const ACTIONS: readonly LibraryAction[] = ['book', 'cancel', 'return', 'seats', 'myBookings'];

// The longest key the main server makes.
const KEY_MAX = 120;

function isAction(value: unknown): value is LibraryAction {
  return ACTIONS.some((action) => action === value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isMapImage(value: unknown): value is LibrarySpace['mapImage'] {
  return value === null || (isNumber(field(value, 'width')) && isNumber(field(value, 'height')));
}

function isSpace(value: unknown): value is LibrarySpace {
  const unit = field(value, 'unit');
  return (
    hasTexts(value, ['id', 'name', 'placeNumber']) &&
    (unit === 'seat' || unit === 'room') &&
    ['floor', 'roomNo', 'sectorNo', 'minMinutes', 'maxMinutes', 'stepMinutes'].every((name) =>
      isNumber(field(value, name)),
    ) &&
    listOf(isNumber)(field(value, 'seatNos')) &&
    isMapImage(field(value, 'mapImage') ?? null) &&
    hasTexts(field(value, 'hours'), ['open', 'close'])
  );
}

function isCompanion(value: unknown): value is LibraryCardData['companions'][number] {
  return hasTexts(value, ['friendId', 'name']);
}

function isTarget(value: unknown): value is LibraryCardData['target'] {
  return (
    value === null ||
    (typeof value === 'object' &&
      ['date', 'spaceId', 'start'].every((name) => {
        const part = field(value, name);
        return part === undefined || isText(part);
      }))
  );
}

function hasTimes(value: unknown): boolean {
  return ['date', 'start', 'seat', 'useDesc', 'pledge', 'questId', 'until'].every((name) =>
    isTextOrNull(field(value, name) ?? null),
  );
}

export function isLibraryCardData(value: unknown): value is LibraryCardData {
  const key = field(value, 'key');
  const space = field(value, 'space') ?? null;
  return (
    isText(key) &&
    key.length > 0 &&
    key.length <= KEY_MAX &&
    isAction(field(value, 'action')) &&
    (space === null || isSpace(space)) &&
    hasTimes(value) &&
    isNumberOrNull(field(value, 'minutes') ?? null) &&
    listOf(isText)(field(value, 'useDescOptions') ?? []) &&
    listOf(isCompanion)(field(value, 'companions') ?? []) &&
    listOf(isText)(field(value, 'notes') ?? []) &&
    isTarget(field(value, 'target') ?? null)
  );
}

// The card with every field the server left out filled as empty: null, or no items.
export function withLibraryDefaults(data: LibraryCardData): LibraryCardData {
  const given: Partial<LibraryCardData> = data;
  return {
    key: data.key,
    action: data.action,
    space: given.space ?? null,
    date: given.date ?? null,
    start: given.start ?? null,
    minutes: given.minutes ?? null,
    seat: given.seat ?? null,
    useDesc: given.useDesc ?? null,
    useDescOptions: given.useDescOptions ?? [],
    pledge: given.pledge ?? null,
    companions: given.companions ?? [],
    questId: given.questId ?? null,
    notes: given.notes ?? [],
    until: given.until ?? null,
    target: given.target ?? null,
  };
}
