/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import {
  type AnswerLine,
  type AnswerReply,
  type ConditionChip,
  type MeetInput,
  type Plan,
  type TimeBand,
} from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { koreaTime } from '../korea-time.js';
import { type GatheringArgs, GatheringNaming } from './answer-words.js';
import { type GatheringFit, MINUTE_MS } from './gathering.js';
import { basisOf, meetingOf, originChip, personChips, subQuestsOf, untilChip } from './meal-answer.js';
import { halfHoursAround, lanesOf, sceneOf } from './meal-scene.js';
import { meetHours, meetWindow } from './meet-gathering.js';
import { droppedOf, partOf, unfitLines } from './plan-parts.js';

// The words of a calculated meet, drawn as a meal's are. Nothing here is sent to the model.

export type MeetAnswerArgs = GatheringArgs<MeetInput>;

type MeetNaming = GatheringNaming<MeetAnswerArgs>;

const MEETING_WORD = '만남';

// The band reaches this far past a plan's end.
const BAND_AFTER_MS = 30 * MINUTE_MS;

const plain = (text: string): AnswerLine => [{ text, strong: false }];

// Where the asker sets out, the start the User fixed or else until when, and each Friend. With a fixed start, the end
// shows only when the User fixed it too.
function chipsOf(naming: MeetNaming): ConditionChip[] {
  const { input, gathering } = naming.args;
  const [mine] = gathering.sides;
  const { from, until } = input.window;
  const fromChip: ConditionChip | null = from === null ? null : { kind: 'from', text: `${from}부터`, userId: null };
  const shownEnd = from === null || until !== null ? untilChip(naming, mine, meetHours(input.date).end) : null;
  const chips = [originChip(naming, mine), fromChip, shownEnd].filter((chip) => chip !== null);
  return [...chips, ...personChips(naming)];
}

// A fixed Place that does not fit says who stays there shortest, and why.
function noPlanOf(naming: MeetNaming): AnswerReply['noPlan'] {
  const { input, gathering } = naming.args;
  if (gathering.shared === null) {
    return { reason: 'no-shared-time', lines: [plain('같이 비는 시간이 없어요')] };
  }
  const unfit = unfitLines(naming, meetWindow(input), { word: MEETING_WORD, stay: '있을 수 있어요' });
  return {
    reason: 'no-fit',
    lines: unfit ?? [plain(`함께 ${SHORTEST_MEAL_SECONDS / 60}분 이상 있을 수 있는 곳이 없어요`)],
  };
}

function linesOf({ key, start, end, togetherMinutes }: GatheringFit): AnswerLine[] {
  return [
    [
      { text: `${clockOf(start)} ${key}`, strong: true },
      { text: '에서 만나요', strong: false },
    ],
    plain(`${clockOf(end)}까지 함께 ${togetherMinutes}분이에요`),
  ];
}

// From the half hour at or before the later of now and the day's hours, to the half hour at or after the later of half
// an hour past the plan's end and the end of the last item in anyone's day within those hours: the stretch of the day
// the band can be dragged over.
function bandOf({ start, end, togetherMinutes }: GatheringFit, naming: MeetNaming): TimeBand {
  const { now, people, input } = naming.args;
  const hours = meetHours(input.date);
  const ends = people
    .flatMap(({ items }) => items)
    .filter((item) => item.start < hours.end)
    .map((item) => Math.min(item.end.getTime(), hours.end.getTime()));
  const { from, until } = halfHoursAround(
    Math.max(now.getTime(), hours.start.getTime()),
    Math.max(end.getTime() + BAND_AFTER_MS, ...ends),
  );
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: lanesOf(naming, from, until),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${clockOf(start)}–${clockOf(end)} · 함께 ${togetherMinutes}분`,
  };
}

function planOf(fit: GatheringFit, naming: MeetNaming): Plan {
  const { key, placeId, start, end, togetherMinutes } = fit;
  const title = `${key}에서 만나기`;
  return {
    id: key,
    title,
    place: naming.labelledPoint(placeId, key),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    togetherMinutes,
    meeting: meetingOf(fit, naming),
    parts: fit.parts.map((part) => partOf(part, naming)),
    subQuests: subQuestsOf(fit, naming, title),
    lines: linesOf(fit),
    basis: basisOf(fit, naming),
    scene: sceneOf(fit, naming, MEETING_WORD),
    band: bandOf(fit, naming),
  };
}

export function meetAnswer(args: MeetAnswerArgs): AnswerReply {
  const naming = new GatheringNaming(args);
  const plans = args.gathering.fits.map((fit) => planOf(fit, naming));
  return {
    input: args.input,
    chips: chipsOf(naming),
    plans,
    dropped: droppedOf(naming),
    noPlan: plans.length > 0 ? null : noPlanOf(naming),
  };
}
