// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { MyParty, Party, Quest, SubQuest } from '@/api/types';
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

export interface RoomView {
  quest: Quest;
  leads: boolean;
  editsPlan: boolean;
  badges: BadgeView[];
  activation: ActivationView;
  // The title of the other Party the User is in, or null.
  otherParty: string | null;
  plan: PlanStepView[];
  members: MemberView[];
  // "2자리 남음" for an Open or Approval Quest, or null.
  left: string | null;
}

export interface RoomSources {
  quest: Quest;
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

function badgesOf(quest: Quest, leads: boolean): BadgeView[] {
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
function planOf(quest: Quest): PlanStepView[] {
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

export function toRoom(sources: RoomSources): RoomView {
  const { quest, myParty, meId } = sources;
  const leads = quest.leader?.id === meId;
  const activation = activationOf(sources);
  const inParty = activation.state === 'in';
  return {
    quest,
    leads,
    editsPlan: editsSubQuests(quest, meId),
    badges: badgesOf(quest, leads),
    activation,
    otherParty: myParty !== null && !inParty ? myParty.title : null,
    plan: planOf(quest),
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
