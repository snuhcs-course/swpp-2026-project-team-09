/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { crowdedWithFriend } from '@/api/mock/data/crowded-meal';
import { FRIENDS } from '@/api/mock/data/friends';
import { drawingOf } from '@/features/assistant/answer-marks';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import { droppedId, quietWords } from '@/features/assistant/quiet-places';
import { seen } from '../support/answer-marks';
import { FIRST_CAMERA, viewAt } from '../support/answer-view';

// The places a meal answer cannot do, on its map (P04 ticket 70): quiet dots without words, and the one pressed with
// its name and the reason the list gives. The stored crowded answer once a Friend is added: 302동식당 alone fits, and
// the ten others are dropped, each with its reason.

const FRIEND = FRIENDS[0]?.id ?? 'f1';
const ANSWER = crowdedWithFriend('2026-11-27', '2026-11-26T09:00:00+09:00', FRIEND);
const [FIRST_DROPPED] = ANSWER.dropped;
if (FIRST_DROPPED === undefined) {
  throw new Error('The stored answer drops no place');
}
const FIRST_ID = droppedId(FIRST_DROPPED.place.label);
// A view whose labels' area is one point: only a label never left out has a side there.
const TIGHT = viewAt(FIRST_CAMERA, { top: 0, right: 1, bottom: 1, left: 0 });

// Partitions: no place pressed; one pressed, in metres and where no label fits; the words the list gives. Expected
// values: the answer's `dropped`, as the list shows it.
describe("a meal answer's places that cannot be done", () => {
  it('are dots without words while none is pressed', () => {
    const drawing = drawingOf(ANSWER, 0);

    for (const { place } of ANSWER.dropped) {
      expect(seen(drawing, droppedId(place.label)).label).toBeNull();
    }
  });

  it("show the pressed one's name and the reason the list gives, with its dot unchanged", () => {
    const quiet = seen(drawingOf(ANSWER, 0), FIRST_ID);
    const pressed = seen(drawingOf(ANSWER, 0, NO_STANDINGS, null, undefined, FIRST_ID), FIRST_ID);

    expect(pressed.label).toMatchObject({
      tone: 'dropped',
      title: `${FIRST_DROPPED.place.label} · ${FIRST_DROPPED.reason}`,
    });
    expect(pressed.symbol).toEqual(quiet.symbol);
    expect(pressed.planId).toBeNull();
  });

  it("keep the pressed one's words where no label fits", () => {
    const drawing = drawingOf(ANSWER, 0, NO_STANDINGS, TIGHT, undefined, FIRST_ID);

    expect(seen(drawing, FIRST_ID).label).not.toBeNull();
    const others = ANSWER.dropped.slice(1).map(({ place }) => seen(drawing, droppedId(place.label)).label);
    expect(others.every((one) => one === null)).toBe(true);
  });

  it('take their words from the list, one entry for each place dropped', () => {
    expect([...quietWords(ANSWER).values()]).toEqual(
      ANSWER.dropped.map(({ place, reason }) => `${place.label} · ${reason}`),
    );
  });
});
