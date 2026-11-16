/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, TimeBand } from '@/api/assistant-types';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { absentNames, bandMoved, bandStepped, clashesAt, movingWords } from '@/features/assistant/band-move';
import type { Stretch } from '@/features/assistant/time-band';

// The band of the first Plan of the stored reply to 민수's meet (board a5): the range 12:00 to 18:30, the band 12:15 to
// 12:43, 나 busy 13:00–13:50 ("24동 수업") and 17:00–18:15 ("58동 수업"), 민수 12:00–12:15 and 15:30–16:45 ("302동
// 수업"). Board a12 drags the band to 15:20–15:48. The expected times are worked by hand from the rule: the width
// kept, the distance dragged rounded to whole steps of five minutes, inside the range.

type Lanes = TimeBand['lanes'];

function storedBand(): TimeBand {
  const [plan] = MEET_ANSWER.plans;
  if (plan === undefined) {
    throw new Error('The stored answer has no Plan');
  }
  return plan.band;
}

const band = storedBand();
const { lanes } = band;
// The stored reply's ids of the User and of 민수.
const ME = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const stretch = (from: string, until: string): Stretch => ({ startAt: at(from), endAt: at(until) });
// A drag of `minutes` as the screen passes it: a share of the range's 390 minutes.
const dragged = (minutes: number): number => minutes / 390;

const MINSU_CLASS = { startAt: at('15:30'), endAt: at('16:45'), label: '302동 수업' };

function withMinsu(change: (lane: Lanes[number]) => Lanes[number]): Lanes {
  return lanes.map((lane) => (lane.userId === MINSU ? change(lane) : lane));
}

function words(text: string, name: string, reason: string): { text: string; lines: AnswerLine[] } {
  return {
    text,
    lines: [
      [
        { text: name, strong: true },
        { text: reason, strong: false },
      ],
      [{ text: '이때는 만날 수 없어요', strong: false }],
    ],
  };
}

describe('bandMoved', () => {
  // Partitions: a drag inside the range (board a12); exactly one step each way; less than half a step each way and
  // just over it; to the range's start exactly and past it; just short of the range's end and past it.
  it.each([
    ['board a12', 185, '15:20', '15:48'],
    ['one step later', 5, '12:20', '12:48'],
    ['one step earlier', -5, '12:10', '12:38'],
    ['less than half a step later', 2, '12:15', '12:43'],
    ['less than half a step earlier', -2, '12:15', '12:43'],
    ['just over half a step', 3, '12:20', '12:48'],
    ["to the range's start exactly", -15, '12:00', '12:28'],
    ["past the range's start", -20, '12:00', '12:28'],
    ["a step short of the range's end", 345, '18:00', '18:28'],
    ["past the range's end", 350, '18:02', '18:30'],
  ])('moves the band whole for a drag %s (%d minutes) to %s–%s', (_, minutes, from, until) => {
    expect(bandMoved(band, dragged(minutes))).toEqual(stretch(from, until));
  });
});

describe('bandStepped', () => {
  // Partitions: one step each way inside the range; a step past the range's start and past its end.
  it('moves the band one step later', () => {
    expect(bandStepped(band, 1)).toEqual(stretch('12:20', '12:48'));
  });

  it('moves the band one step earlier', () => {
    expect(bandStepped(band, -1)).toEqual(stretch('12:10', '12:38'));
  });

  it("keeps a band at the range's start where it is for a step earlier", () => {
    // The band moved to the range's start, as a drag past it leaves it.
    const atStart = { ...band, ...stretch('12:00', '12:28') };

    expect(bandStepped(atStart, -1)).toEqual(stretch('12:00', '12:28'));
  });

  it("keeps a band at the range's end where it is for a step later", () => {
    // The band moved to the range's end, as a drag past it leaves it.
    const atEnd = { ...band, ...stretch('18:02', '18:30') };

    expect(bandStepped(atEnd, 1)).toEqual(stretch('18:02', '18:30'));
  });
});

describe("clashesAt over a Friend's lane", () => {
  // Partitions: a band overlapping one Friend's stretch (board a12); overlapping nobody, touching the end of a stretch
  // (board a5) and the start of one; an overlap of one minute.
  it("gives 민수's class cut to the band, and his name, for board a12", () => {
    const clashes = clashesAt(lanes, stretch('15:20', '15:48'));

    expect(clashes).toEqual([
      { userId: MINSU, name: '민수', startAt: at('15:30'), endAt: at('15:48'), busy: MINSU_CLASS },
    ]);
    expect(absentNames(clashes)).toEqual(['민수']);
  });

  it("gives nothing for board a5's band, which touches the end of 민수's class at 12:15", () => {
    expect(clashesAt(lanes, stretch('12:15', '12:43'))).toEqual([]);
  });

  it("gives nothing for a band that ends as 민수's class starts", () => {
    expect(clashesAt(lanes, stretch('15:02', '15:30'))).toEqual([]);
  });

  it('counts an overlap of one minute', () => {
    expect(clashesAt(lanes, stretch('15:03', '15:31'))).toEqual([
      { userId: MINSU, name: '민수', startAt: at('15:30'), endAt: at('15:31'), busy: MINSU_CLASS },
    ]);
  });
});

describe("clashesAt over the User's lane", () => {
  // Partitions: the User's own lane alone; the User's and a Friend's lanes, in lane order before time.
  it("counts the User's own lane", () => {
    const clashes = clashesAt(lanes, stretch('13:20', '13:48'));

    expect(clashes).toEqual([
      {
        userId: ME,
        name: '나',
        startAt: at('13:20'),
        endAt: at('13:48'),
        busy: { startAt: at('13:00'), endAt: at('13:50'), label: '24동 수업' },
      },
    ]);
    expect(absentNames(clashes)).toEqual(['나']);
  });

  it("gives the User's class before 민수's earlier one, and both names in lane order", () => {
    const clashes = clashesAt(lanes, stretch('16:40', '17:08'));

    expect(clashes.map(({ name, startAt, endAt }) => [name, startAt, endAt])).toEqual([
      ['나', at('17:00'), at('17:08')],
      ['민수', at('16:40'), at('16:45')],
    ]);
    expect(absentNames(clashes)).toEqual(['나', '민수']);
  });
});

describe('movingWords of one name', () => {
  // Partitions: one Friend whose name ends without a final consonant (board a12) and one whose name ends with one;
  // the User alone, in a band that starts inside the class.
  it("says who cannot come and why for board a12's band", () => {
    expect(movingWords(lanes, stretch('15:20', '15:48'))).toEqual(
      words('15:20–15:48 · 민수가 안 돼요', '민수', '는 15:30부터 302동 수업이라'),
    );
  });

  it('takes 이 and 은 after a name that ends with a final consonant', () => {
    // 민수 renamed 지은, whose last syllable ends with a final consonant.
    const renamed = withMinsu((lane) => ({ ...lane, name: '지은' }));

    expect(movingWords(renamed, stretch('15:20', '15:48'))).toEqual(
      words('15:20–15:48 · 지은이 안 돼요', '지은', '은 15:30부터 302동 수업이라'),
    );
  });

  it("says 내가 for the User alone, and the class's own start", () => {
    expect(movingWords(lanes, stretch('13:20', '13:48'))).toEqual(
      words('13:20–13:48 · 내가 안 돼요', '나', '는 13:00부터 24동 수업이라'),
    );
  });
});

describe('movingWords of two names, of none, and without a label', () => {
  // Partitions: two names; a stretch without its label; a band that overlaps nobody.
  it('joins two names, and says why from the first lane', () => {
    expect(movingWords(lanes, stretch('16:40', '17:08'))).toEqual(
      words('16:40–17:08 · 나, 민수가 안 돼요', '나', '는 17:00부터 58동 수업이라'),
    );
  });

  it('calls a stretch without its label 일정', () => {
    // 민수's stretches without their labels, as the stored meal answer's bands give them.
    const unlabelled = withMinsu((lane) => ({
      ...lane,
      busy: lane.busy.map(({ startAt, endAt }) => ({ startAt, endAt })),
    }));

    expect(movingWords(unlabelled, stretch('15:20', '15:48'))).toEqual(
      words('15:20–15:48 · 민수가 안 돼요', '민수', '는 15:30부터 일정이라'),
    );
  });

  it('gives no words for a band that overlaps nobody', () => {
    expect(movingWords(lanes, stretch('12:15', '12:43'))).toBeNull();
  });
});
