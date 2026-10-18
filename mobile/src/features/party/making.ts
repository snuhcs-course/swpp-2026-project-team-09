/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { QuestProposal } from '@/api/assistant-types';
import type { QuestChange, QuestMaking } from '@/api/party-types';
import type { QuestEntries, QuestPhoto, ShownQuest } from '@/api/quest-parts-types';
import type { SubQuestContent, SubQuestPlace } from '@/api/room-types';
import type { Board, GlobalEvent, Quest, SubQuest } from '@/api/types';
import { eventTagsOf } from './event-kinds';

// What 파티 만들기 sends: a new Quest, or the change to one, from what the form holds.

export type Visibility = 'public' | 'private';

// The Global Event of `관련 행사`, with who announced it where the app knows.
export type FormEvent = GlobalEvent & { source: string | null };

export interface PartyForm {
  title: string;
  description: string;
  // 1 to 8: the main server's limit, for 공개 and 비공개 alike.
  capacity: number;
  visibility: Visibility;
  // Under 공개: `바로 참여` or `승인 후 참여`.
  policy: 'open' | 'approval';
  board: Board | null;
  startsAt: string | null;
  place: SubQuestPlace | undefined;
  event: FormEvent | null;
  // `사진` and `태그`, which the phone keeps. Tags without '#'.
  photo: QuestPhoto | null;
  tags: string[];
}

export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 8;

export function emptyForm(): PartyForm {
  return {
    title: '',
    description: '',
    capacity: 4,
    visibility: 'public',
    policy: 'open',
    board: null,
    startsAt: null,
    place: undefined,
    event: null,
    photo: null,
    tags: [],
  };
}

// Who announced each Global Event, as the app lists them.
export interface Announcer {
  eventId: string;
  announcer: string;
}

// `어디서` with an event chosen and no place given: the event's place, as choosing it in the form fills it.
function eventPlace(event: GlobalEvent): SubQuestPlace | undefined {
  return event.place === null
    ? undefined
    : { latitude: event.latitude, longitude: event.longitude, label: event.place };
}

// The form a Proposal of the Assistant's fills: 공개 with 바로 참여 for an Open Quest and 승인 후 참여 for an Approval
// one, 비공개 for a Closed one, with its Place, else its event's place, and its event with who announced it, as the
// form's picker gives it. The time is the Proposal's: the event's start, or a meeting before it. The Friends to invite
// are the Proposal's `invitees`, which the form keeps apart; it has no photo or tags.
export function proposalForm(proposal: QuestProposal, announcers: readonly Announcer[] = []): PartyForm {
  const { title, description, joinPolicy, board, capacity, startsAt, place, globalEvent } = proposal;
  const event =
    globalEvent === null
      ? null
      : { ...globalEvent, source: announcers.find(({ eventId }) => eventId === globalEvent.id)?.announcer ?? null };
  return {
    ...emptyForm(),
    title,
    description,
    capacity,
    visibility: joinPolicy === 'closed' ? 'private' : 'public',
    policy: joinPolicy === 'approval' ? 'approval' : 'open',
    board,
    startsAt,
    place: place === null ? (event === null ? undefined : eventPlace(event)) : { placeId: place.id },
    event,
  };
}

// "AI 커리어 설명회 같이 가요": the title an event gives.
export function eventTitle(event: Pick<GlobalEvent, 'title'>): string {
  return `${event.title} 같이 가요`;
}

// A chosen event gives its title, unless the User wrote one of their own, its start, which `언제` may move to a meeting
// before it, and its tags. An edit keeps its title: the event only fills the time, the place and the tags. Taking the
// event away leaves the title and the tags.
export function withEvent(form: PartyForm, event: FormEvent | null, editing = false): PartyForm {
  if (event === null) {
    return { ...form, event, startsAt: editing ? form.startsAt : null };
  }
  const title = form.title.trim();
  const given = !editing && (title === '' || (form.event !== null && title === eventTitle(form.event)));
  return {
    ...form,
    event,
    title: given ? eventTitle(event) : form.title,
    startsAt: event.startsAt,
    tags: [...new Set([...form.tags, ...eventTagsOf(event)])],
  };
}

function upcoming({ cancelled, ended, done }: SubQuest): boolean {
  return !cancelled && !ended && !done;
}

// The Sub Quest that editing changes the time and place of: the first still to come that is not the event itself, whose
// time and place the main server keeps as the event's.
export function editedSubQuest(quest: Quest): SubQuest | null {
  return quest.subQuests.find((subQuest) => upcoming(subQuest) && !subQuest.attending) ?? null;
}

// The time and place `언제` and `어디서` show when editing: the edited Sub Quest's, else the event's.
export function shownSubQuest(quest: Quest): SubQuest | null {
  return editedSubQuest(quest) ?? quest.subQuests.find((subQuest) => upcoming(subQuest)) ?? null;
}

// The form of a Quest the Leader edits, with its event as the picker knows it when it does.
export function formOf(quest: ShownQuest, event: FormEvent | null): PartyForm {
  const closed = quest.joinPolicy === 'closed';
  return {
    ...emptyForm(),
    title: quest.title,
    description: quest.description,
    capacity: Math.min(Math.max(quest.capacity, MIN_CAPACITY), MAX_CAPACITY),
    visibility: closed ? 'private' : 'public',
    policy: quest.joinPolicy === 'approval' ? 'approval' : 'open',
    board: quest.board,
    startsAt: shownSubQuest(quest)?.startsAt ?? null,
    event,
    photo: quest.photo,
    tags: quest.tags,
  };
}

// The least `인원`: the Holders now, at least the User, and the Friends invited in the form, so that each of them has a
// place and a form opened from a Friend's card can always be sent.
export function leastCapacity(holders: number, invited: number): number {
  return Math.min(Math.max(holders, 1) + invited, MAX_CAPACITY);
}

// 파티 올리기 waits for a title, a description and a board; 파티 만들기 for a title and a Friend; 수정 완료 as the
// first for a public Quest and for a title for a private one.
export function isReady(form: PartyForm, friends: number, editing: boolean): boolean {
  if (form.title.trim() === '') {
    return false;
  }
  if (form.visibility === 'private') {
    return editing || friends > 0;
  }
  return form.description.trim() !== '' && form.board !== null;
}

export function makingOf(form: PartyForm): QuestMaking {
  const title = form.title.trim();
  const subQuest = {
    title,
    ...(form.startsAt === null ? {} : { startsAt: form.startsAt }),
    ...(form.place === undefined ? {} : { place: form.place }),
  };
  const description = form.description.trim();
  if (form.visibility === 'private') {
    return { title, description, capacity: form.capacity, joinPolicy: 'closed', subQuest };
  }
  return {
    title,
    description,
    capacity: form.capacity,
    joinPolicy: form.policy,
    ...(form.board === null ? {} : { board: form.board }),
    subQuest,
  };
}

// What changed against the Quest: PATCH sends only that.
export function changeOf(quest: Quest, form: PartyForm): QuestChange {
  const wanted = makingOf(form);
  const change: QuestChange = {};
  if (wanted.title !== quest.title) {
    change.title = wanted.title;
  }
  if (wanted.description !== quest.description) {
    change.description = wanted.description;
  }
  if (wanted.joinPolicy !== quest.joinPolicy) {
    change.joinPolicy = wanted.joinPolicy;
  }
  if (wanted.capacity !== quest.capacity) {
    change.capacity = wanted.capacity;
  }
  if (wanted.board !== undefined && wanted.board !== quest.board) {
    change.board = wanted.board;
  }
  return change;
}

function samePhoto(one: QuestPhoto | null, other: QuestPhoto | null): boolean {
  return JSON.stringify(one) === JSON.stringify(other);
}

// What the phone keeps that changed against the Quest: the photo and the tags.
export function entriesChangeOf(quest: ShownQuest, form: PartyForm): Partial<QuestEntries> {
  return {
    ...(samePhoto(quest.photo, form.photo) ? {} : { photo: form.photo }),
    ...(quest.tags.join(' ') === form.tags.join(' ') ? {} : { tags: form.tags }),
  };
}

// How many Friends may be invited: the free places.
export function invitable(form: PartyForm, holders: number): number {
  return Math.max(form.capacity - holders, 0);
}

// The title attending the event is asked for: none when it is the event's own, which the main server gives.
export function attendingTitleOf(form: PartyForm): string | undefined {
  const title = form.title.trim();
  return title === form.event?.title ? undefined : title;
}

// The PATCH after attending the event: everything the form sets, and the title when the attended Quest has another,
// as a Quest the User already held for the event does. Its 인원 takes at least the Holders it already has.
export function recruitingOf(attended: Quest, form: PartyForm): QuestChange {
  const { title, subQuest: _subQuest, ...change } = makingOf(form);
  const capacity = Math.min(Math.max(change.capacity, attended.holders.length), MAX_CAPACITY);
  return title === attended.title ? { ...change, capacity } : { title, ...change, capacity };
}

// The Sub Quest `모이기`, when `언제` moved from the event's start to a meeting before it.
export function meetingOf(form: PartyForm): SubQuestContent | null {
  if (form.event === null || form.startsAt === null || form.startsAt === form.event.startsAt) {
    return null;
  }
  return { title: '모이기', startsAt: form.startsAt, ...(form.place === undefined ? {} : { place: form.place }) };
}

// The change to the plan an edit makes: the time and place of the Sub Quest still to come, or a first one with them.
export interface PlanChange {
  subQuestId: string | null;
  content: SubQuestContent;
}

// What editing `언제` and `어디서` changes, or null when neither changed or there is no time to give. A Quest whose
// only step is its event gets `모이기` before it, as making one does: the event's own time is the main server's.
export function planChangeOf(quest: Quest, form: PartyForm, placeChanged: boolean): PlanChange | null {
  const shown = shownSubQuest(quest);
  if (form.startsAt === null || (form.startsAt === (shown?.startsAt ?? null) && !placeChanged)) {
    return null;
  }
  const edited = editedSubQuest(quest);
  const title = edited?.title ?? (shown === null ? form.title.trim() : '모이기');
  const content = {
    title,
    startsAt: form.startsAt,
    ...(form.place === undefined ? {} : { place: form.place }),
  };
  return { subQuestId: edited?.id ?? null, content };
}
