/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaDate, koreaTime } from '../assistant/korea-time.js';

// How a Friend reads among all of the viewer's Friends. text, the same as name, is the given name, or the full name
// when another Friend has the same given name. aside tells apart Friends of one full name: the department, or since
// when the two are Friends when the department is shared too.
export interface FriendLabel {
  text: string;
  name: string;
  aside: string | null;
}

export interface LabelledFriend {
  id: string;
  name: string;
  department: string;
  acceptedAt: Date;
}

// Each step tells a Friend apart from more of the others than the one before.
const STEPS = ['given', 'full', 'department', 'day', 'minute'] as const;

type Step = (typeof STEPS)[number];

const LAST = STEPS.length - 1;

// As the app's map writes a name under a face: a name of exactly three Hangul syllables without its family name.
function givenName(name: string): string {
  const trimmed = name.trim();
  return /^[가-힣]{3}$/u.test(trimmed) ? trimmed.slice(1) : trimmed;
}

function bare(words: string): string {
  return words.replaceAll(/\s/gu, '').toLowerCase();
}

function keyOf(...words: string[]): string {
  return JSON.stringify(words.map((word) => bare(word)));
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const found = key(item);
    counts.set(found, (counts.get(found) ?? 0) + 1);
  }
  return counts;
}

// "10월 3일부터 친구", or "10월 3일 14:05부터 친구", in Korea.
function since(acceptedAt: Date, withTime: boolean): string {
  const time = koreaTime(acceptedAt);
  const day = `${Number(time.slice(5, 7))}월 ${Number(time.slice(8, 10))}일`;
  return `${withTime ? `${day} ${time.slice(11, 16)}` : day}부터 친구`;
}

function asideAt(friend: LabelledFriend, step: Step): string | null {
  if (step === 'department') {
    return friend.department;
  }
  if (step === 'day' || step === 'minute') {
    return since(friend.acceptedAt, step === 'minute');
  }
  return null;
}

function labelAt(friend: LabelledFriend, step: Step): FriendLabel {
  const name = step === 'given' ? givenName(friend.name) : friend.name;
  return { text: name, name, aside: asideAt(friend, step) };
}

// The first step whose words no other Friend shares: the given name, the full name, the full name with the
// department, and these with the day the friendship began. Past them, the minute.
function firstSteps(friends: readonly LabelledFriend[]): number[] {
  const keys = [
    ({ name }: LabelledFriend): string => keyOf(givenName(name)),
    ({ name }: LabelledFriend): string => keyOf(name),
    ({ name, department }: LabelledFriend): string => keyOf(name, department),
    ({ name, department, acceptedAt }: LabelledFriend): string => keyOf(name, department, koreaDate(acceptedAt)),
  ].map((key) => ({ key, counts: countBy(friends, key) }));
  return friends.map((friend) => {
    const step = keys.findIndex(({ key, counts }) => counts.get(key(friend)) === 1);
    return step === -1 ? LAST : step;
  });
}

const readAs = ({ text, aside }: FriendLabel): string =>
  JSON.stringify([bare(text), aside === null ? null : bare(aside)]);

// The final check: labels that still read the same move one step down together, until none does but those at the
// last step.
function settled(friends: readonly LabelledFriend[], steps: readonly number[]): FriendLabel[] {
  const labels = friends.map((friend, at) => labelAt(friend, STEPS[steps[at]]));
  const read = countBy(labels, readAs);
  const next = steps.map((step, at) => (step < LAST && read.get(readAs(labels[at])) !== 1 ? step + 1 : step));
  return next.some((step, at) => step !== steps[at]) ? settled(friends, next) : labels;
}

// One label for each of the viewer's accepted Friends, by their User id; the viewer is not among them. Two friendships
// that began in the same minute leave two equal labels, and a press, which goes by id, still tells them apart.
export function friendLabels(friends: readonly LabelledFriend[]): Map<string, FriendLabel> {
  const labels = settled(friends, firstSteps(friends));
  return new Map(friends.map(({ id }, at) => [id, labels[at]]));
}
