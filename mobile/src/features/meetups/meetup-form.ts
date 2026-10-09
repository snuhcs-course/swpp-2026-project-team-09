// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { ApiError, isRefusal } from '@/api/errors';
import type { Place } from '@/api/types';
import type { MeetupProposal } from '@/api/waiting-types';
import type { PickedPlace } from '@/features/places/picked-place';

// What the Meetup form holds until it is sent.
export interface MeetupDraft {
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: PickedPlace | null;
}

export const EMPTY_MEETUP: MeetupDraft = { title: '', startsAt: null, endsAt: null, place: null };

export const START_PASSED = '시작 시간이 지났어요. 다시 골라 주세요';
export const END_NOT_AFTER_START = '끝나는 시간이 시작 시간보다 늦어야 해요';

// A Place of the list as the form holds it.
export function pickedOf({ id, name, number, latitude, longitude }: Place): PickedPlace {
  return { placeId: id, position: { latitude, longitude }, words: number === null ? name : `${name} ${number}동` };
}

export function isReady({ title, startsAt, place }: MeetupDraft): boolean {
  return title.trim() !== '' && startsAt !== null && place !== null;
}

export function startPassed({ startsAt }: MeetupDraft, now: Date): boolean {
  return startsAt !== null && Date.parse(startsAt) <= now.getTime();
}

export function endNotAfterStart({ startsAt, endsAt }: MeetupDraft): boolean {
  return startsAt !== null && endsAt !== null && Date.parse(endsAt) <= Date.parse(startsAt);
}

// The body of `POST /meetups`. A Place of the list is sent as itself, a point with the words the app showed for it.
export function proposalOf(receiverId: string, draft: MeetupDraft): MeetupProposal | null {
  const { title, startsAt, endsAt, place } = draft;
  if (startsAt === null || place === null) {
    return null;
  }
  return {
    receiverId,
    title: title.trim(),
    startsAt,
    ...(endsAt === null ? {} : { endsAt }),
    place: place.placeId === null ? { ...place.position, label: place.words } : { placeId: place.placeId },
  };
}

export function proposeRefusalWords(error: unknown, name: string): string {
  if (isRefusal(error, 400, 'MEETUP_START_PASSED')) {
    return START_PASSED;
  }
  if (isRefusal(error, 404, 'FRIEND_NOT_FOUND')) {
    return `${name}님과 더 이상 친구가 아니에요`;
  }
  if (isRefusal(error, 404, 'PLACE_NOT_FOUND')) {
    return '장소를 다시 골라 주세요';
  }
  return '보내지 못했어요. 다시 시도해 주세요';
}

// Whether the main server answered, a refusal included: then a next press is another proposal with a key of its own.
export function wasAnswered(error: unknown): boolean {
  return error instanceof ApiError && error.status !== 0;
}
