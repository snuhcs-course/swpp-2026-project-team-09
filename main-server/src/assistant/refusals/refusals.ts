/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { type AnswerLine, type Lookup } from '../dto/answer.dto.js';
import { type Presented } from '../feature.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';
import { withAnd, withSubject, withTopic } from '../gathering/answer-words.js';
import { withTimetableChip } from '../lookup/friend-lookup.js';
import {
  BESIDE_LOOKUP,
  type FriendKind,
  type PlaceKind,
  type Refusal,
  type RefusalKind,
  type RefusalOffer,
} from './refusal.dto.js';

// The words of each refusal, as row 8 of the design writes them (boards n1–n9, n19, n20, n22, n22b, n4, n8b).

// A Friend as the words name them, from the Friend view: their name, and the line of what is seen of them now, which
// past-location and course-and-room say and the others leave empty.
export interface NamedFriend {
  name: string;
  seen: AnswerLine;
}

interface Words {
  // A plain line, or one with bold spans.
  lines: (string | AnswerLine)[];
  offers: RefusalOffer[];
}

const ask = (label: string, text = label): RefusalOffer => ({ kind: 'ask', label, text });

const HUNGRY = ask('배고파');
const STUDY = ask('공부할 자리');
const TODAY = ask('오늘 볼 만한 거 있어?');
const SHARING = { kind: 'open', label: '위치 공유 보기', screen: 'location-sharing' } as const satisfies RefusalOffer;
const WATCHED = '지켜봐 드리는 것은 행사와 모집뿐이에요.';

const PLAIN: Record<Exclude<RefusalKind, FriendKind | PlaceKind>, Words> = {
  'off-campus': { lines: ['캠퍼스 안의 일만 도와 드려요.'], offers: [HUNGRY, TODAY] },
  'general-work': {
    lines: ['과제는 도와 드릴 수 없어요.', '캠퍼스에서 먹을 곳, 공부할 자리, 행사, 파티, 길을 찾아 드려요.'],
    offers: [HUNGRY, STUDY, TODAY],
  },
  vague: {
    lines: ['무엇을 해 볼까요?'],
    offers: [ask('지금 비는 친구'), ask('같이 놀 파티'), ask('오늘 볼 만한 행사')],
  },
  'not-a-friend': {
    lines: ['친구로 맺은 사람만 볼 수 있어요.', '친구가 되면 서로 시간표의 건물과 끝나는 시각이 보여요.'],
    offers: [{ kind: 'open', label: '친구 추가', screen: 'friend-add' }],
  },
  'who-looked': {
    lines: ['누가 찾았는지는 기록하지 않아요.', '후보로 검토된 것은 누구에게도 알리지 않아요.'],
    offers: [SHARING],
  },
  'not-understood': { lines: ['잘 못 알아들었어요.', '이렇게 말해 보세요.'], offers: [HUNGRY, STUDY, TODAY] },
  'not-watched-shuttle': {
    lines: [WATCHED, '지금 물으면 셔틀이 언제 올지 어림해 드려요.'],
    offers: [ask('셔틀 언제 와?')],
  },
};

// 랑 after a vowel, 이랑 after a final consonant.
const withAlong = (name: string): string => (withAnd(name).endsWith('과') ? `${name}이랑` : `${name}랑`);

// "만나고 싶다" plans a meeting as the typed words would.
const meet = (name: string): RefusalOffer => ask('만나고 싶다', `${withAlong(name)} 만나고 싶어`);

const WITH_FRIEND: Record<FriendKind, (friend: NamedFriend) => Words> = {
  'past-location': ({ name, seen }) => ({
    lines: ['지난 위치는 저장하지 않아요. 지금과 시간표만 알아요.', seen],
    offers: [meet(name)],
  }),
  'course-and-room': ({ name, seen }) => ({ lines: ['과목과 강의실은 보이지 않아요', seen], offers: [meet(name)] }),
  // The second line of board n8b, when to go, is the kept card's: the request does not tell the server the party's time.
  'for-someone-else': ({ name }) => ({ lines: [`수락은 ${withSubject(name)} 직접 해요`], offers: [] }),
  'others-sharing': ({ name }) => ({
    lines: [`${withSubject(name)} 정하는 일이에요.`, `내가 ${name}에게 보일 단계는 바꿀 수 있어요.`],
    offers: [SHARING],
  }),
  'not-watched-friend': ({ name }) => ({
    lines: [WATCHED, `${withAnd(name)} 만나려면 함께 비는 때를 찾아 드려요.`],
    offers: [meet(name), { kind: 'open', label: '관심 맡겨 두기', screen: 'interests' }],
  }),
};

// The library a booking was asked of, by the Place's name (board n20).
const WITH_PLACE: Record<PlaceKind, (place: string) => Words> = {
  'other-library': (place) => ({
    lines: ['앱이 예약하는 곳은 관정뿐이에요', `${withTopic(place)} 그곳의 방식으로 예약해요`],
    offers: [ask('관정 스터디룸')],
  }),
};

function refusalOf(kind: RefusalKind, { lines, offers }: Words): Refusal {
  const answerLines = lines.map((line): AnswerLine =>
    typeof line === 'string' ? [{ text: line, strong: false }] : line,
  );
  return { kind, lines: answerLines, offers };
}

export function plainRefusal(kind: Exclude<RefusalKind, FriendKind | PlaceKind>): Refusal {
  return refusalOf(kind, PLAIN[kind]);
}

export function friendRefusal(kind: FriendKind, friend: NamedFriend): Refusal {
  return refusalOf(kind, WITH_FRIEND[kind](friend));
}

export function placeRefusal(kind: PlaceKind, place: string): Refusal {
  return refusalOf(kind, WITH_PLACE[kind](place));
}

// Whether the refusal stands beside the Lookup: only a kind that answers the part it can, beside its kind of Lookup.
export const standsBeside = (kind: RefusalKind, lookup: Lookup): boolean => BESIDE_LOOKUP[kind] === lookup.kind;

// The refusal a reply keeps: none beside an answer, and beside a Lookup only one that stands beside it, whichever
// tool came last.
export function keptRefusal({ answer, lookup, refusal }: Presented): Refusal | null {
  if (refusal === null || answer !== null) {
    return null;
  }
  return lookup === null || standsBeside(refusal.kind, lookup) ? refusal : null;
}

// The Lookup of a reply that keeps a refusal beside it: a Friend's beside the refusal of their course and room names
// the Timetable in the chip when that is all the map shows of them (board n4).
export function lookupBeside({ lookup, refusal }: Pick<Presented, 'lookup' | 'refusal'>): Lookup | null {
  return lookup !== null && refusal?.kind === 'course-and-room' ? withTimetableChip(lookup) : lookup;
}

// The reply's text: the model's, or the refusal's lines when it wrote none, for an app that does not draw the refusal.
export function textBeside(text: string, refusal: Refusal | null): string {
  return text === '' && refusal !== null
    ? refusal.lines.map((line) => line.map((part) => part.text).join('')).join('\n')
    : text;
}

// Where a Friend is now, only as the view shows them to the asker: the Place of their position or building when it
// shows one, else the Class of their Timetable, which every Friend sees.
export function friendNowLine(
  friend: FriendView,
  classes: readonly DayItem[],
  now: Date,
  placeLabel: (placeId: string) => string | null,
): string {
  const topic = withTopic(friend.name);
  const current = classes.find(({ start, end }) => start <= now && now < end) ?? null;
  const seen = friend.level === 'timetable' || friend.placeId === null ? null : placeLabel(friend.placeId);
  if (seen !== null) {
    const there = `${topic} 지금 ${seen}에 있어요`;
    return current === null ? there : `${there} · ${clockOf(current.end)}까지 수업`;
  }
  if (current !== null) {
    const place = current.placeId === null ? null : placeLabel(current.placeId);
    return `${topic} 지금 ${place === null ? '' : `${place}에서 `}수업 중이에요 · ${clockOf(current.end)}까지`;
  }
  const next = classes.filter(({ start }) => start > now).toSorted(byStart)[0];
  if (next === undefined) {
    return classes.length === 0 ? `${topic} 오늘 수업이 없어요` : `${topic} 오늘 수업이 끝났어요`;
  }
  return classes.some(({ end }) => end <= now)
    ? `${topic} 지금 공강이에요 · ${clockOf(next.start)}까지`
    : `${topic} ${clockOf(next.start)}에 첫 수업이 있어요`;
}
