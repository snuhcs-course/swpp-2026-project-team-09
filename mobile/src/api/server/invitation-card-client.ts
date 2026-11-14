/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { InvitationCard, OwnWay } from '@/api/invitation-card-types';
import { field, hasTexts, isNumber, isPlace, isText, isTextOrNull, listOf } from './answers';
import { call } from './http';
import { isLine, isNext, isPlacePoint, isScene } from './plan-answers';
import { isQuestSummary } from './waiting-answers';

// The card of a received invitation, checked whole, since the card draws every field.

const STATUSES: readonly OwnWay['status'][] = ['ok', 'unknown', 'off-campus', 'busy'];

function isStep(value: unknown): value is InvitationCard['steps'][number] {
  return (
    hasTexts(value, ['id', 'title']) &&
    isTextOrNull(field(value, 'startsAt')) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isPlace(field(value, 'place'))
  );
}

function isHolder(value: unknown): value is InvitationCard['holders'][number] {
  return hasTexts(value, ['id', 'name']);
}

function isGathering(value: unknown): value is InvitationCard['gathering'] {
  return (
    value === null ||
    (isPlacePoint(field(value, 'place')) && isText(field(value, 'startAt')) && isTextOrNull(field(value, 'endAt')))
  );
}

function isOrigin(value: unknown): value is OwnWay['origin'] {
  const basis = field(value, 'basis');
  return value === null || (isPlacePoint(field(value, 'place')) && (basis === 'timetable' || basis === 'location'));
}

function isMeeting(value: unknown): value is OwnWay['meeting'] {
  return value === null || (isPlacePoint(field(value, 'place')) && isText(field(value, 'at')));
}

function isWay(value: unknown): value is InvitationCard['way'] {
  if (value === null) {
    return true;
  }
  const walkMinutes = field(value, 'walkMinutes');
  return (
    STATUSES.some((status) => status === field(value, 'status')) &&
    isOrigin(field(value, 'origin')) &&
    ['leaveAt', 'arriveAt', 'leaveBy'].every((name) => isTextOrNull(field(value, name))) &&
    (walkMinutes === null || isNumber(walkMinutes)) &&
    isMeeting(field(value, 'meeting')) &&
    isNext(field(value, 'next')) &&
    listOf(isLine)(field(value, 'lines')) &&
    isScene(field(value, 'scene'))
  );
}

export function isInvitationCard(value: unknown): value is InvitationCard {
  return (
    hasTexts(value, ['id', 'sentAt']) &&
    isQuestSummary(field(value, 'quest')) &&
    listOf(isHolder)(field(value, 'holders')) &&
    listOf(isStep)(field(value, 'steps')) &&
    isGathering(field(value, 'gathering')) &&
    isWay(field(value, 'way'))
  );
}

export const invitationCardClient: Pick<ApiClient, 'getInvitationCard'> = {
  getInvitationCard: (invitationId, location) =>
    call('GET', `/quest-invitations/${encodeURIComponent(invitationId)}`, isInvitationCard, {
      query: location === null ? {} : { latitude: location.latitude, longitude: location.longitude },
    }),
};
