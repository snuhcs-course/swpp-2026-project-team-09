/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type AnswerOffer, type AnswerReply, type LocationMissing } from '../dto/answer.dto.js';
import { itemBefore, type MealAnswerArgs, type Naming, withSubject } from './answer-words.js';
import { type GatheringFit } from './gathering.js';

// What a meal's answer says when the app could not give an input: where the asker was taken to set out from without
// a location (board n13), the Plans nearest first without a Timetable (board n15), and the screens that would give it.

// Why the asker's location is missing, and whether the asker has no Class at all.
export interface MissingInputs {
  locationMissing: LocationMissing;
  noClasses: boolean;
}

export const NEAREST_BASIS = '시간표가 없어 가까운 순서로 넘겨 봐요';
const TIMETABLE_NOTE = '시간표를 넣으면 나설 시각까지 알려 드려요';
const TURN_LOCATION_ON: AnswerOffer = { kind: 'open', label: '위치 켜기', screen: 'location' };
const ADD_TIMETABLE: AnswerOffer = { kind: 'open', label: '시간표 넣기', screen: 'timetable' };

const askerWalk = ({ parts }: GatheringFit): number => parts[0]?.walkMinutes ?? 0;

// The asker alone without a Timetable, setting out from a known Place, is free until the meal's end, so the longest
// meal is the nearest; the Plans are put nearest first all the same, for a start fixed later gives every Plan the same
// minutes. Null when they keep the gathering's order, as with a Place the User fixed, where nearest was not asked.
export function nearestFirst({ missing, people, gathering, input }: MealAnswerArgs): GatheringFit[] | null {
  const origin = gathering.sides[0]?.origin ?? null;
  if (missing?.noClasses !== true || people.length > 1 || input.placeId !== null || origin === null) {
    return null;
  }
  return gathering.fits.toSorted((a, b) => askerWalk(a) - askerWalk(b));
}

// The first Plan's lines: where the asker was taken to set out from without a location, or that the first Restaurant
// is the nearest without a Timetable. Null when neither holds.
export function missingLines({ key, parts }: GatheringFit, naming: Naming, nearest: boolean): AnswerLine[] | null {
  const [mine] = parts;
  const origin = mine?.origin ?? null;
  if (mine !== undefined && origin?.assumed === true) {
    const before = itemBefore(naming.asker.items, mine.readyAt);
    return [
      [{ text: `위치를 몰라 직전 ${(before?.isClass ?? true) ? '수업' : '일정'}의`, strong: false }],
      [
        { text: naming.placeLabel(origin.placeId), strong: true },
        { text: '에서 출발로 잡았어요', strong: false },
      ],
    ];
  }
  if (!nearest) {
    return null;
  }
  return [
    [
      { text: key, strong: true },
      { text: `${withSubject(key).slice(key.length)} 가장 가까워요`, strong: false },
    ],
  ];
}

// The answer's offers and note: "위치 켜기" without the permission, and "시간표 넣기" with a note without a Class.
export function missingParts(missing: MissingInputs | undefined): Pick<AnswerReply, 'offers' | 'note'> {
  if (missing === undefined) {
    return {};
  }
  const offers = [
    ...(missing.locationMissing === 'permission' ? [TURN_LOCATION_ON] : []),
    ...(missing.noClasses ? [ADD_TIMETABLE] : []),
  ];
  return { ...(offers.length > 0 ? { offers } : {}), ...(missing.noClasses ? { note: TIMETABLE_NOTE } : {}) };
}
