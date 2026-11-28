/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import {
  interestsHintBottom,
  listRows,
  madeLineBottom,
  mapInset,
  type Room,
  tutorialStartBottom,
} from '@/screens/main/layout';

// Where the main screen puts the map's credit and Kakao's logo, and what stands at the left above the AI input (P15
// ticket 07). Heights are counted from the navigation's top. The AI input's top is 62 while it holds one line; the
// row of buttons, drawn only in a Party, takes 78 to 126. The map draws the credit and the logo 8 above the inset's
// bottom.

const NO_PARTY: Room = {
  stage: null,
  cardHeight: null,
  answerHeight: null,
  tutorialStart: false,
  interestsHint: false,
};
const IN_PARTY: Room = { ...NO_PARTY, buttonRow: true };

type Left = Pick<Room, 'tutorialStart' | 'interestsHint' | 'madeLine'>;
const START: Left = { tutorialStart: true, interestsHint: false, madeLine: false };
const HINT: Left = { tutorialStart: false, interestsHint: true, madeLine: false };
const MADE: Left = { tutorialStart: false, interestsHint: false, madeLine: true };

// Partitions: in no Party, nothing at the left, each of the three alone, and two or three of them.
describe('what stands at the left above the AI input in no Party', () => {
  it('leaves the credit and the logo 8 above the AI input with nothing there', () => {
    expect(mapInset(NO_PARTY)).toEqual({ bottom: 62, left: 8, right: 62 });
  });

  it.each([
    ['the start button', START, tutorialStartBottom],
    ['the line that asks for interests', HINT, interestsHintBottom],
    ['the line of a made Quest', MADE, madeLineBottom],
  ] as const)("stands %s alone in the row's place, 16 above the AI input, under the credit", (_shown, left, bottom) => {
    const room = { ...NO_PARTY, ...left };

    expect(bottom(room)).toBe(78);
    // Its 34 and the map's own 8 put the credit 8 above it.
    expect(mapInset(room).bottom).toBe(112);
  });

  it.each([
    ['the start button and the line that asks for interests', { ...START, interestsHint: true }, [78, 120, null], 154],
    ['the start button and the line of a made Quest', { ...START, madeLine: true }, [78, null, 120], 154],
    ['both lines', { ...HINT, madeLine: true }, [null, 78, 120], 154],
    ['all three', { tutorialStart: true, interestsHint: true, madeLine: true }, [78, 120, 162], 196],
  ] as const)('stacks %s in that order, 8 apart from the lowest up', (_shown, left, [start, hint, made], top) => {
    const room = { ...NO_PARTY, ...left };

    expect([
      room.tutorialStart ? tutorialStartBottom(room) : null,
      room.interestsHint ? interestsHintBottom(room) : null,
      room.madeLine === true ? madeLineBottom(room) : null,
    ]).toEqual([start, hint, made]);
    expect(mapInset(room).bottom).toBe(top);
  });
});

// Partitions: in a Party, nothing over the row, one thing over it, and all three.
describe('what stands at the left above the AI input in a Party', () => {
  it('puts the credit and the logo over the row of buttons', () => {
    expect(mapInset(IN_PARTY)).toEqual({ bottom: 126, left: 8, right: 62 });
  });

  it('stands the start button 8 above the row, and the credit over it', () => {
    const room = { ...IN_PARTY, ...START };

    expect(tutorialStartBottom(room)).toBe(134);
    expect(mapInset(room).bottom).toBe(168);
  });

  it('stacks all three over the row, 8 apart', () => {
    const room = { ...IN_PARTY, tutorialStart: true, interestsHint: true, madeLine: true };

    expect([tutorialStartBottom(room), interestsHintBottom(room), madeLineBottom(room)]).toEqual([134, 176, 218]);
    expect(mapInset(room).bottom).toBe(252);
  });
});

// Partitions: a taller input above nothing, under what stands at the left, above it, in a Party, and back at one line.
describe('the credit and the logo over a taller AI input', () => {
  it.each([
    ['above nothing in no Party', NO_PARTY, 90, 102],
    ['lower than the start button', { ...NO_PARTY, ...START }, 90, 112],
    ['higher than the start button', { ...NO_PARTY, ...START }, 130, 142],
    ['lower than the row of buttons', IN_PARTY, 90, 126],
    ['higher than the row of buttons', IN_PARTY, 130, 142],
    ['back at one line', NO_PARTY, 50, 62],
  ] as const)('stand 8 above whichever is higher: an input %s', (_case, room, inputHeight, bottom) => {
    expect(mapInset({ ...room, inputHeight }).bottom).toBe(bottom);
  });

  it('leaves the start button where it is under a taller input', () => {
    expect(tutorialStartBottom({ ...NO_PARTY, ...START, inputHeight: 130 })).toBe(78);
  });
});

// Partitions: a card at the bottom and the answer frame's card, each in no Party and in a Party.
describe('the credit and the logo while a card is shown', () => {
  it.each([
    ['in no Party', NO_PARTY],
    ['in a Party', IN_PARTY],
  ] as const)('sit on an open card %s, its bottom 72 above the navigation', (_case, room) => {
    expect(mapInset({ ...room, ...START, cardHeight: 180, inputHeight: 130 })).toEqual({
      bottom: 252,
      left: 8,
      right: 8,
    });
  });

  it.each([
    ['in no Party', NO_PARTY],
    ['in a Party', IN_PARTY],
  ] as const)("sit on the answer frame's card %s", (_case, room) => {
    expect(mapInset({ ...room, answerHeight: 300 })).toEqual({ bottom: 300, left: 8, right: 8 });
  });
});

// A window's top is 100 under the stage's with no status bar: 52, the header's 40 and 8. Three rows take 172, and the
// window ends 8 above the credit's line of 14 and its margin of 8.
// Partitions: each case above on the least stage that fits three rows, and one less.
describe("the friend list's window on a low screen", () => {
  it.each([
    ['in no Party with nothing at the left', NO_PARTY, 364],
    ['in no Party with the start button', { ...NO_PARTY, ...START }, 414],
    ['in no Party with all three', { ...NO_PARTY, tutorialStart: true, interestsHint: true, madeLine: true }, 498],
    ['in a Party', IN_PARTY, 428],
    ['over a taller input', { ...NO_PARTY, inputHeight: 130 }, 444],
    ['over an open card', { ...NO_PARTY, cardHeight: 180 }, 554],
  ] as const)('ends 8 above the credit %s', (_case, room, height) => {
    expect(listRows({ ...room, stage: { width: 360, height } }, 0).friends).toBe(3);
    expect(listRows({ ...room, stage: { width: 360, height: height - 1 } }, 0).friends).toBe(2);
  });
});
