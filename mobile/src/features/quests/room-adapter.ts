/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ShownQuest } from '@/api/quest-parts-types';
import type { LatLng, MyParty, Party, SubQuest } from '@/api/types';
import { koreaClock, koreaDay } from '@/korea-time';
import { shownSubQuest } from './adapter';
import { placeWithRoom } from './booked-room';
import { standingsOf } from './plan-steps';
import { editsSubQuests } from './rules';

// What a Quest's room shows: the frame's `PartyDetail`. The room is the Quest's; its 활성화 is the domain Party opened
// for the Quest.

// One of those in the running Party, in the order they entered.
export interface PartyPerson {
  id: string;
  name: string;
  me: boolean;
}

export type ActivationView =
  // No Party runs for the Quest.
  | { state: 'none' }
  // The User is in it. `joined`: the Master Switch and the Party switch are both on, without which nobody sees the
  // User, who then reads as not in. `people` names the members the User sees, and the User once joined.
  | { state: 'in'; leadsParty: boolean; switchOn: boolean; joined: boolean; people: PartyPerson[] }
  // It runs without the User, who has not answered. `people`: its members, which `GET /parties` names for a Quest the
  // User holds, else its Leader.
  | { state: 'waiting'; partyId: string; title: string; people: PartyPerson[] }
  // It runs without the User, who declined it on this phone.
  | { state: 'declined'; partyId: string; title: string; people: PartyPerson[] };

export interface PlanStepView {
  subQuest: SubQuest;
  // "17:40", "18:00–20:00", or "".
  time: string;
  place: string;
  // The orange step of `plan-steps`.
  next: boolean;
  // A grey step of `plan-steps`: dimmed.
  over: boolean;
}

export interface MemberView {
  id: string;
  name: string;
  department: string;
  leader: boolean;
  me: boolean;
  // While the User is in the Party: "위치 공유 중", "위치 꺼짐" or "응답 대기", none for the User while not joined.
  // Null otherwise.
  state: { words: string; tone: 'live' | 'muted' | 'waiting' } | null;
  // "5분 늦어요" for a member who reported being late, whether or not the User is in the Party. Null otherwise.
  late: string | null;
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

// The 모집글's Leader row: "김하늘" over "컴퓨터공학부 · 19시간 전".
export interface HostView {
  name: string;
  line: string;
}

export interface RoomView {
  quest: ShownQuest;
  leads: boolean;
  // An Open or Approval Quest, which has a post.
  hasPost: boolean;
  // The Leader's row, null for a Quest without a Leader.
  host: HostView | null;
  // The Quest's text, "" for none.
  text: string;
  // "#AI커리어"
  tags: string[];
  // The time and place box: the orange step's, "내일 10:00" and its place as the step shows it, else "시간 미정" and
  // "장소 미정".
  time: string;
  place: string;
  destination: RoomDestination | null;
  editsPlan: boolean;
  activation: ActivationView;
  // The other Party the User is in, or null.
  otherParty: OtherParty | null;
  plan: PlanStepView[];
  members: MemberView[];
  // "3/4명" for an Open or Approval Quest, or null.
  fill: string | null;
}

export interface RoomSources {
  quest: ShownQuest;
  myParty: MyParty | null;
  parties: readonly Party[];
  declined: readonly string[];
  // The Friends the User sees, by id.
  seenFriends: readonly string[];
  meId: string;
  // The Master Switch, on while the Lobby is not known.
  masterOn: boolean;
  now: Date;
}

function peopleOf(members: readonly { id: string; name: string }[], meId: string): PartyPerson[] {
  return members.map(({ id, name }) => ({ id, name, me: id === meId }));
}

function activationOf({ quest, myParty, parties, declined, meId, masterOn }: RoomSources): ActivationView {
  if (myParty?.quest?.id === quest.id) {
    const leadsParty = myParty.members.some(({ id, leader }) => id === meId && leader);
    const joined = masterOn && myParty.sharing;
    const members = myParty.members.filter(({ id, visible }) => (id === meId ? joined : visible));
    return {
      state: 'in',
      leadsParty,
      switchOn: myParty.sharing,
      joined,
      people: peopleOf(members, meId),
    };
  }
  const running = parties.find((party) => party.quest?.id === quest.id);
  if (running === undefined) {
    return { state: 'none' };
  }
  const { id, title, leader } = running;
  const people = peopleOf(running.members ?? (leader === undefined ? [] : [leader]), meId);
  return declined.includes(id)
    ? { state: 'declined', partyId: id, title, people }
    : { state: 'waiting', partyId: id, title, people };
}

function timeOf({ startsAt, endsAt }: SubQuest): string {
  if (startsAt === null) {
    return '';
  }
  return endsAt === null ? koreaClock(startsAt) : `${koreaClock(startsAt)}–${koreaClock(endsAt)}`;
}

// By their start, those without one last, grey and orange by `plan-steps`. The room booked is on the shown step's
// place, as the lists show it.
function planOf(quest: ShownQuest, now: Date): PlanStepView[] {
  const shown = shownSubQuest(quest);
  return standingsOf(quest.subQuests, now).map(({ subQuest, stand }) => {
    const label = subQuest.place?.label ?? '';
    return {
      subQuest,
      time: timeOf(subQuest),
      place: subQuest === shown ? placeWithRoom(label, quest.bookedRoom) : label,
      next: stand === 'now',
      over: stand === 'past',
    };
  });
}

// The User has no line while not joined: the activation card says why.
function stateOf(id: string, myParty: MyParty | null, sources: RoomSources): MemberView['state'] {
  const member = myParty?.members.find((one) => one.id === id);
  if (member === undefined) {
    return { words: '응답 대기', tone: 'waiting' };
  }
  if (id === sources.meId) {
    return sources.masterOn && myParty?.sharing === true ? { words: '위치 공유 중', tone: 'live' } : null;
  }
  return member.visible ? { words: '위치 공유 중', tone: 'live' } : { words: '위치 꺼짐', tone: 'muted' };
}

function lateOf(quest: RoomSources['quest'], id: string): string | null {
  const minutes = quest.members?.find(({ user }) => user.id === id)?.lateMinutes ?? null;
  return minutes === null ? null : `${String(minutes)}분 늦어요`;
}

function membersOf(sources: RoomSources, inParty: boolean): MemberView[] {
  const { quest, myParty, seenFriends, meId } = sources;
  return quest.holders.map(({ id, name, department }) => ({
    id,
    name,
    department,
    leader: quest.leader?.id === id,
    me: id === meId,
    state: inParty ? stateOf(id, myParty, sources) : null,
    late: lateOf(quest, id),
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

export function otherPartyOf(myParty: MyParty | null, inParty: boolean, meId: string): OtherParty | null {
  if (myParty === null || inParty) {
    return null;
  }
  return { title: myParty.title, leads: myParty.members.some(({ id, leader }) => id === meId && leader) };
}

function hostOf({ leader, createdAt }: ShownQuest, now: Date): HostView | null {
  if (leader === null) {
    return null;
  }
  return {
    name: leader.name,
    line: createdAt === null ? leader.department : `${leader.department} · ${agoWords(createdAt, now)}`,
  };
}

export function toRoom(sources: RoomSources): RoomView {
  const { quest, myParty, meId, now } = sources;
  const activation = activationOf(sources);
  const inParty = activation.state === 'in';
  const closed = quest.joinPolicy === 'closed';
  const plan = planOf(quest, now);
  const orange = plan.find(({ next }) => next);
  const start = orange?.subQuest.startsAt ?? null;
  return {
    quest,
    leads: quest.leader?.id === meId,
    hasPost: !closed,
    host: hostOf(quest, now),
    text: quest.description,
    tags: quest.tags.map((tag) => `#${tag}`),
    time: start === null ? '시간 미정' : `${koreaDay(start, now)} ${koreaClock(start)}`,
    place: orange === undefined || orange.place === '' ? '장소 미정' : orange.place,
    destination: destinationOf(plan),
    editsPlan: editsSubQuests(quest, meId),
    activation,
    otherParty: otherPartyOf(myParty, inParty, meId),
    plan,
    members: membersOf(sources, inParty),
    fill: closed ? null : `${String(quest.holders.length)}/${String(quest.capacity)}명`,
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
