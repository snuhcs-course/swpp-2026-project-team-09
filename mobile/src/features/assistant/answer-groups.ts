/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { KeptQuest, MapScene } from '@/api/assistant-types';
import type { FlagRole } from '@/api/scene-roles';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, type AnswerSymbol, color, type FaceBadge, initials, type LabelSide } from '@/design-system';
import type { Standing } from './invited-friends';
import { keptTagOf } from './set-quest';

// The groups in the order their labels take sides, which is also the order of their symbols at one point but for the
// flags, which have none. `kept` is a Quest already set (P04 ticket 20): at a candidate's place the candidate's dot
// is drawn, and the point carries both labels.
export type Group = 'flag' | 'pick' | 'person' | 'next' | 'stop' | 'kept' | 'candidate' | 'dropped';

export const SIDE_ORDER: Group[] = ['flag', 'pick', 'person', 'next', 'stop', 'kept', 'candidate', 'dropped'];
export const SYMBOL_ORDER: Group[] = ['person', 'pick', 'next', 'stop', 'candidate', 'kept', 'dropped'];
export const DRAW_ORDER: Group[] = ['pick', 'person', 'flag', 'next', 'stop', 'kept', 'candidate', 'dropped'];
// A shuttle stop is the way's own: the camera keeps the stop to walk to in view. So is a Quest already set (P04 ticket
// 20): the camera keeps it in view, and a Friend's face near it gives way, so that its words are whole.
export const OWN = new Set<Group>(['person', 'pick', 'next', 'stop', 'flag', 'kept']);

export const SIDES: Record<Group, LabelSide[]> = {
  flag: ['above', 'below', 'right', 'left'],
  pick: ['below', 'above'],
  person: ['right', 'left'],
  next: ['left', 'below', 'right', 'above'],
  stop: ['left', 'right', 'below', 'above'],
  kept: ['right', 'left', 'above', 'below'],
  candidate: ['left', 'right', 'below', 'above'],
  dropped: ['left', 'right', 'below', 'above'],
};

export const ROUTE_STYLES = {
  me: { color: color.snuBlue, width: 5 },
  friend: { color: color.friend, width: 4 },
  next: { color: color.borderStrong, width: 3 },
  shuttle: { color: color.svcShuttle, width: 4 },
  alt: { color: color.inkSubtle, width: 2 },
} as const;

// A place's flag away from the pick keeps the pick's tone; a flag at the area's edge towards a place outside it (관정)
// is a next place's.
export const FLAG_TONES: Record<FlagRole, AnswerLabel['tone']> = {
  place: 'pick',
  meeting: 'meeting',
  leave: 'leave',
  late: 'late',
  shuttle: 'shuttle',
  away: 'next',
};

// A mark of a scene before its label is placed (`answer-marks.ts`).
export interface Draft {
  id: string;
  name: string;
  position: LatLng;
  planId: string | null;
  group: Group;
  symbol: AnswerSymbol | null;
  tone: AnswerLabel['tone'];
  // Null for a mark that takes no label.
  title: string | null;
  line: string | null;
  // A candidate's dishes and price under its title and time; left out, none.
  sub?: string | null;
  // A meal pick's time and walking after its title; left out, none.
  note?: string | null;
  // The number a pick or a candidate carries in its label when its dot is not drawn.
  number: number | null;
}

// Words without the name they start with, which the mark says already.
export function restOf(name: string, words: string): string {
  const lead = `${name} · `;
  return words.startsWith(lead) ? words.slice(lead.length) : words;
}

// A shuttle stop: its name as the title, and the rest of its tag, such as the shuttle's time, as the line.
export function stopDraft({ place, tag }: MapScene['places'][number]): Draft {
  const { label, latitude, longitude } = place;
  return {
    id: `answer:stop:${place.placeId}`,
    name: tag ?? label,
    position: { latitude, longitude },
    planId: null,
    group: 'stop',
    symbol: { type: 'dot', role: 'stop', number: null },
    tone: 'stop',
    title: label,
    line: tag === null || tag === label ? null : restOf(label, tag),
    number: null,
  };
}

// The destination, whose side the camera keeps when not every point fits: the pick, or for a way, which has none, its
// next item.
export function destinationOf(marks: readonly { group: Group; position: LatLng }[]): LatLng | null {
  const destination = marks.find(({ group }) => group === 'pick') ?? marks.find(({ group }) => group === 'next');
  return destination?.position ?? null;
}

// A Quest already set, at its place apart from the candidates: grey, with no number, and no press. None without a point.
export function keptDrafts(kept: KeptQuest | null | undefined): Draft[] {
  const point = kept?.point ?? null;
  if (kept === null || kept === undefined || point === null) {
    return [];
  }
  const tag = keptTagOf(kept);
  return [
    {
      id: 'answer:kept',
      name: tag,
      position: { latitude: point.latitude, longitude: point.longitude },
      planId: null,
      group: 'kept',
      symbol: { type: 'dot', role: 'kept', number: null },
      tone: 'kept',
      title: tag,
      line: null,
      number: null,
    },
  ];
}

// The titles of the marks that open something at a press end with "›": every mark of a Lookup (`true`, P04 ticket 22),
// or a Plan's pick alone, whose press opens its flag's card (`'pick'`, ticket 14, boards 10 and 12).
export function withOpenMarks(opens: boolean | 'pick', drafts: Draft[]): Draft[] {
  if (opens === false) {
    return drafts;
  }
  const marked: Draft[] = [];
  for (const draft of drafts) {
    const open = opens === true || draft.group === 'pick';
    marked.push(draft.title === null || !open ? draft : { ...draft, title: `${draft.title} ›` });
  }
  return marked;
}

// The words of a face's tag that the face does not show already: a face shows the everyday Avatar's letters, so the
// tag of a name they show whole leaves the name out, and is none when the name is all it says.
export function faceTitle(name: string, tag: string): string | null {
  if (initials(name) !== name) {
    return tag;
  }
  return tag === name ? null : restOf(name, tag);
}

// How many candidates stand at one point.
export function candidatesAt(here: readonly Draft[]): number {
  return here.filter(({ group }) => group === 'candidate').length;
}

const BADGES: Partial<Record<Standing['state'], FaceBadge>> = {
  invited: 'waiting',
  accepted: 'accepted',
  late: 'accepted',
};

type Face = Extract<AnswerSymbol, { type: 'face' }>;

export function faceOf(
  name: string,
  source: MapScene['people'][number]['source'],
  standing: Standing | undefined,
): Face {
  const badge = standing === undefined ? undefined : BADGES[standing.state];
  const face: Face = {
    type: 'face',
    name,
    dashed: source === 'timetable',
    ...(source === 'exact' ? { exact: true } : {}),
  };
  return badge === undefined ? face : { ...face, badge };
}
