/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
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
import { clockOf, shownClock } from '../free-time/free-time.js';
import { clockWithDay, koreaTime } from '../korea-time.js';
import { type GatheringArgs, GatheringNaming } from './answer-words.js';
import { endedByItem, type GatheringFit, minutesSaid } from './gathering.js';
import { basisOf, meetingOf, originChip, personChips, subQuestsOf, untilChip } from './meal-answer.js';
import { skippedBand } from '../free-time/left-out-classes.js';
import { bandRange, windowHolds } from '../free-time/band-range.js';
import { busyLabel, lanesOf, othersOf, sceneOf } from './meal-scene.js';
import { meetHours, meetWindow } from './meet-gathering.js';
import { meetNoPlanBand, withBand } from './no-plan-band.js';
import { droppedOf, partOf, unfitLines } from './plan-parts.js';

// The words of a calculated meet, drawn as a meal's are. Nothing here is sent to the model.

export type MeetAnswerArgs = GatheringArgs<MeetInput>;

type MeetNaming = GatheringNaming<MeetAnswerArgs>;

const MEETING_WORD = '만남';

const plain = (text: string): AnswerLine => [{ text, strong: false }];

// Where the asker sets out, the start the User fixed or else until when, and each Friend. With a fixed start, the end
// shows only when the User fixed it too.
function chipsOf(naming: MeetNaming): ConditionChip[] {
  const { input, gathering } = naming.args;
  const [mine] = gathering.sides;
  const { from, until } = input.window;
  const fromChip: ConditionChip | null =
    from === null ? null : { kind: 'from', text: `${shownClock(from)}부터`, userId: null };
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

// Until when they are together: its minutes when someone's next item ends it soon, its end when later, and nothing of
// the day's 22:00 limit, which no one has to leave for.
function togetherWords(fit: GatheringFit): string {
  if (minutesSaid(fit)) {
    return `${clockOf(fit.end)}까지 함께 ${fit.togetherMinutes}분이에요`;
  }
  return endedByItem(fit) ? `${clockOf(fit.end)}까지 함께할 수 있어요` : '그 뒤로는 일정이 없어요';
}

function linesOf(fit: GatheringFit, now: Date): AnswerLine[] {
  return [
    [
      { text: `${clockWithDay(fit.start, now)} ${fit.key}`, strong: true },
      { text: '에서 만나요', strong: false },
    ],
    plain(togetherWords(fit)),
  ];
}

// Over the day's hours of a meeting (P01 ticket 43): the stretch of the day the band can be dragged over.
function bandOf(fit: GatheringFit, naming: MeetNaming): TimeBand {
  const { start, end, togetherMinutes } = fit;
  const { now, input } = naming.args;
  const { skipped } = naming.asker;
  const hours = meetHours(input.date);
  const { from, until } = bandRange({
    now,
    date: input.date,
    span: { start, end },
    bounds: { opens: hours.start, closes: hours.end },
    holds: windowHolds(input.date, input.window),
  });
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: lanesOf(naming, from, until),
    ...othersOf(naming, fit, from, until),
    ...skippedBand(skipped, (item) => busyLabel(item, (placeId) => naming.placeLabel(placeId))),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${clockOf(start)}–${clockOf(end)}${minutesSaid(fit) ? ` · 함께 ${togetherMinutes}분` : ''}`,
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
    lines: linesOf(fit, naming.args.now),
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
    noPlan: plans.length > 0 ? null : withBand(noPlanOf(naming), () => meetNoPlanBand(naming)),
  };
}
