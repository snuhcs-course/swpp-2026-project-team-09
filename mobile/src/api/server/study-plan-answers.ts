/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { GroupRoomKind, PlanStudy, RoomRequestState, StudyGroup, StudySpot } from '@/api/study-plan-types';
import { field, isNumber, isText, isTextOrNull, listOf } from './answers';
import { isSpace } from './library-card-answers';
import { isOneOf } from './plan-inputs';

// The app's check of a study Plan's part (P10), as main-server `assistant/dto/study-plan.dto.ts` fixes it.

function isRoomKind(value: unknown): value is GroupRoomKind {
  const capacity = field(value, 'capacity');
  return (
    isText(field(value, 'spaceId')) &&
    isNumber(field(value, 'floor')) &&
    isText(field(value, 'name')) &&
    isNumber(field(capacity, 'min')) &&
    isNumber(field(capacity, 'max')) &&
    isSpace(field(value, 'space'))
  );
}

function isListedKind(value: unknown): value is StudyGroup['rooms'][number] {
  return isRoomKind(value) && typeof field(value, 'fits') === 'boolean' && isTextOrNull(field(value, 'reason'));
}

const isStatus = isOneOf(['gathering', 'ready', 'booked', 'cancelled', 'dissolved', 'expired']);

function isRequest(value: unknown): value is RoomRequestState {
  return (
    isText(field(value, 'id')) &&
    isStatus(field(value, 'status')) &&
    isNumber(field(value, 'consented')) &&
    isNumber(field(value, 'asked')) &&
    listOf(isText)(field(value, 'waiting')) &&
    isNumber(field(value, 'moreNeeded'))
  );
}

function isGroup(value: unknown): value is StudyGroup {
  const request = field(value, 'request');
  return (
    isRoomKind(field(value, 'room')) &&
    listOf(isListedKind)(field(value, 'rooms')) &&
    isNumber(field(value, 'people')) &&
    isNumber(field(value, 'moreNeeded')) &&
    isTextOrNull(field(value, 'key')) &&
    listOf(isText)(field(value, 'useDescOptions')) &&
    isTextOrNull(field(value, 'opens')) &&
    (request === null || isRequest(request))
  );
}

const isSpotKind = isOneOf(['library', 'reading', 'lounge', 'pc', 'group']);

function isSpot(value: unknown): value is StudySpot {
  return (
    isText(field(value, 'key')) &&
    isText(field(value, 'name')) &&
    isSpotKind(field(value, 'kind')) &&
    isTextOrNull(field(value, 'hours')) &&
    isOneOf(['open', 'unknown'])(field(value, 'open')) &&
    isTextOrNull(field(value, 'closesAt'))
  );
}

// A Plan's study part: absent from other Plans.
export function isStudyOrAbsent(value: unknown): value is PlanStudy | undefined {
  if (value === undefined) {
    return true;
  }
  const [book, group] = [field(value, 'book'), field(value, 'group')];
  return (
    listOf(isSpot)(field(value, 'spaces')) &&
    (book === null || isText(field(book, 'spaceId'))) &&
    (field(value, 'liveSeats') === null || field(value, 'liveSeats') === 'kwanjeong') &&
    (group === undefined || isGroup(group))
  );
}
