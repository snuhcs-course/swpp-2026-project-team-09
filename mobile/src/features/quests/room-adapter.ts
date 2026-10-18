/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ShownQuest } from '@/api/quest-parts-types';
import type { LatLng, MyParty, Party, SubQuest } from '@/api/types';
import { koreaClock } from '@/korea-time';
import { editsSubQuests } from './rules';

// What a Quest's room shows: the frame's `PartyDetail`. The room is the Quest's; its 활성화 is the domain Party opened
// for the Quest.

export type ActivationView =
  // No Party runs for the Quest.
  | { state: 'none' }
  // The User is in it. `sharing` counts the members the User sees, and the User.
  | { state: 'in'; sharing: number; leadsParty: boolean; switchOn: boolean }
  // It runs without the User, who has not answered: `leader` is who leads it, null where the answer does not say.
  | { state: 'waiting'; partyId: string; title: string; leader: string | null }
  // It runs without the User, who declined it on this phone.
  | { state: 'declined'; partyId: string; title: string };

export interface BadgeView {
  label: string;
  tone: 'party' | 'warning' | 'neutral' | 'official';
  icon?: 'lock';
}

export interface PlanStepView {
  subQuest: SubQuest;
  // "17:40", "18:00–20:00", or "".
  time: string;
  place: string;
  // The first Sub Quest ahead.
  next: boolean;
  // Done by the User, ended or cancelled: dimmed.
  over: boolean;
}

export interface MemberView {
  id: string;
  name: string;
  department: string;
  leader: boolean;
  me: boolean;
  // While the User is in the Party: "위치 공유 중", "위치 꺼짐", "공유 일시정지" or "응답 대기". Null otherwise.
  state: { words: string; tone: 'live' | 'muted' | 'waiting' } | null;
  // The User sees the member on the map now.
  seen: boolean;
}

// Where the members walk to: the place of the first Sub Quest ahead that has a position.
export interface RoomDestination {
  // "301동 앞"
  label: string;
  at: LatLng;
}

// The other Party the User is in: switching to this Quest's leaves it, or ends it when the User leads it.
export interface OtherParty {
  title: string;
  leads: boolean;
}

export interface RoomView {
  quest: ShownQuest;
  leads: boolean;
  // `모집글 보기` for an Open or Approval Quest, which has a post.
  hasPost: boolean;
  // The text in the room, for a Closed Quest only: an Open or Approval Quest's is on its post. "" for none.
  text: string;
  // "#AI커리어"
  tags: string[];
  destination: RoomDestination | null;
  editsPlan: boolean;
  badges: BadgeView[];
  activation: ActivationView;
  // The other Party the User is in, or null.
  otherParty: OtherParty | null;
  plan: PlanStepView[];
  members: MemberView[];
  // "2자리 남음" for an Open or Approval Quest, or null.
  left: string | null;
}

export interface RoomSources {
  quest: ShownQuest;
  myParty: MyParty | null;
  parties: readonly Party[];
  declined: readonly string[];
  // The Friends the User sees, by id.
  seenFriends: readonly string[];
  meId: string;
}

function activationOf({ quest, myParty, parties, declined, meId }: RoomSources): ActivationView {
  if (myParty?.quest?.id === quest.id) {
    const others = myParty.members.filter(({ id, visible }) => id !== meId && visible).length;
    const leadsParty = myParty.members.some(({ id, leader }) => id === meId && leader);
    return { state: 'in', sharing: others + 1, leadsParty, switchOn: myParty.sharing };
  }
  const running = parties.find((party) => party.quest?.id === quest.id);
  if (running === undefined) {
    return { state: 'none' };
  }
  const { id, title } = running;
  return declined.includes(id)
    ? { state: 'declined', partyId: id, title }
    : { state: 'waiting', partyId: id, title, leader: running.leader?.name ?? null };
}

function badgesOf(quest: ShownQuest, leads: boolean): BadgeView[] {
  const closed = quest.joinPolicy === 'closed';
  const holders = quest.holders.length;
  return [
    { label: closed ? `파티 · ${holders}명` : `파티 · ${holders}/${quest.capacity}명`, tone: 'party' },
    ...(leads ? [{ label: '내가 만든 파티', tone: 'warning' } as const] : []),
    ...(closed ? [{ label: '비공개', tone: 'neutral', icon: 'lock' } as const] : []),
    ...(quest.globalEvent === null ? [] : [{ label: quest.globalEvent.title, tone: 'official' } as const]),
  ];
}

function timeOf({ startsAt, endsAt }: SubQuest): string {
  if (startsAt === null) {
    return '';
  }
  return endsAt === null ? koreaClock(startsAt) : `${koreaClock(startsAt)}–${koreaClock(endsAt)}`;
}

function startOf({ startsAt }: SubQuest): number {
  return startsAt === null ? Number.POSITIVE_INFINITY : new Date(startsAt).getTime();
}

// By their start, those without one last.
function planOf(quest: ShownQuest): PlanStepView[] {
  const steps = quest.subQuests.toSorted((one, other) => startOf(one) - startOf(other));
  const next = steps.find(({ done, ended, cancelled }) => !done && !ended && !cancelled);
  return steps.map((subQuest) => ({
    subQuest,
    time: timeOf(subQuest),
    place: subQuest.place?.label ?? '',
    next: subQuest === next,
    over: subQuest.done || subQuest.ended || subQuest.cancelled,
  }));
}

function stateOf(id: string, myParty: MyParty | null, meId: string): MemberView['state'] {
  const member = myParty?.members.find((one) => one.id === id);
  if (member === undefined) {
    return { words: '응답 대기', tone: 'waiting' };
  }
  if (id === meId) {
    return myParty?.sharing === true
      ? { words: '위치 공유 중', tone: 'live' }
      : { words: '공유 일시정지', tone: 'muted' };
  }
  return member.visible ? { words: '위치 공유 중', tone: 'live' } : { words: '위치 꺼짐', tone: 'muted' };
}

function membersOf(sources: RoomSources, inParty: boolean): MemberView[] {
  const { quest, myParty, seenFriends, meId } = sources;
  return quest.holders.map(({ id, name, department }) => ({
    id,
    name,
    department,
    leader: quest.leader?.id === id,
    me: id === meId,
    state: inParty ? stateOf(id, myParty, meId) : null,
    seen:
      id !== meId &&
      (seenFriends.includes(id) ||
        (inParty && myParty?.members.some((member) => member.id === id && member.visible) === true)),
  }));
}

function destinationOf(plan: readonly PlanStepView[]): RoomDestination | null {
  const ahead = plan.find(
    ({ over, subQuest: { place } }) => !over && place !== null && place.latitude !== null && place.longitude !== null,
  )?.subQuest.place;
  if (ahead === undefined || ahead === null || ahead.latitude === null || ahead.longitude === null) {
    return null;
  }
  return { label: ahead.label, at: { latitude: ahead.latitude, longitude: ahead.longitude } };
}

function otherPartyOf(myParty: MyParty | null, inParty: boolean, meId: string): OtherParty | null {
  if (myParty === null || inParty) {
    return null;
  }
  return { title: myParty.title, leads: myParty.members.some(({ id, leader }) => id === meId && leader) };
}

export function toRoom(sources: RoomSources): RoomView {
  const { quest, myParty, meId } = sources;
  const leads = quest.leader?.id === meId;
  const activation = activationOf(sources);
  const inParty = activation.state === 'in';
  const closed = quest.joinPolicy === 'closed';
  const plan = planOf(quest);
  return {
    quest,
    leads,
    hasPost: !closed,
    text: closed ? quest.description : '',
    tags: quest.tags.map((tag) => `#${tag}`),
    destination: destinationOf(plan),
    editsPlan: editsSubQuests(quest, meId),
    badges: badgesOf(quest, leads),
    activation,
    otherParty: otherPartyOf(myParty, inParty, meId),
    plan,
    members: membersOf(sources, inParty),
    left: quest.joinPolicy === 'closed' ? null : `${quest.capacity - quest.holders.length}자리 남음`,
  };
}

const MINUTE_MS = 60_000;

// "방금", "10분 전", "3시간 전", "2일 전".
export function agoWords(instant: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(instant).getTime()) / MINUTE_MS);
  if (minutes < 1) {
    return '방금';
  }
  if (minutes < 60) {
    return `${minutes}분 전`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}시간 전` : `${Math.floor(hours / 24)}일 전`;
}
