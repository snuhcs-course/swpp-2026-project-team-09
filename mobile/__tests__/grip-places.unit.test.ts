/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type GripPlace,
  placeOfStop,
  placesOf,
  pressedPlace,
  readerActions,
  readerPlace,
  stopOfPlace,
} from '@/screens/main/answer/grip-places';
import { restingLift, topRoomOf } from '@/screens/main/answer/top-stops';

// The time card's places and the top's stops (P01 ticket 22): a card alone is tucked to its strip at the stage's top,
// shown, or open; under the bar of several requests it can also stand behind that bar with only its strip under it.
// Stop 0 is the card tucked, 1 behind, 2 shown or open.

// Partitions: a card alone; a card under the bar.
describe('the places a card has', () => {
  it('has a place behind the bar only under one', () => {
    expect(placesOf(false)).toEqual(['tucked', 'shown', 'open']);
    expect(placesOf(true)).toEqual(['tucked', 'behind', 'shown', 'open']);
  });

  it.each([
    ['tucked', 0],
    ['behind', 1],
    ['shown', 2],
    ['open', 2],
  ] as const)('stands %s at stop %d, and starts back at its place for the stop', (place, stop) => {
    expect(stopOfPlace(place)).toBe(stop);
    expect(stopOfPlace(placeOfStop(stop))).toBe(stop);
  });
});

// Partitions: each place, alone and under the bar.
describe('a press on the strip', () => {
  it.each([
    ['tucked', false, 'shown'],
    ['shown', false, 'open'],
    ['open', false, 'shown'],
    ['tucked', true, 'behind'],
    ['behind', true, 'shown'],
    ['shown', true, 'open'],
  ] as const)('from %s (under the bar: %s) opens to %s', (place, under, to) => {
    expect(pressedPlace(place, under)).toBe(to);
  });
});

function names(place: GripPlace, under: boolean): string[] {
  return readerActions(place, under).map(({ name }) => name);
}

// Partitions: tuck and untuck from each place, alone and under the bar.
describe("a screen reader's tuck and untuck", () => {
  it.each([
    ['tuck', 'shown', false, 'tucked'],
    ['untuck', 'tucked', false, 'shown'],
    ['tuck', 'shown', true, 'behind'],
    ['tuck', 'behind', true, 'tucked'],
    ['untuck', 'tucked', true, 'behind'],
    ['untuck', 'behind', true, 'shown'],
  ] as const)('%s from %s (under the bar: %s) goes to %s', (name, place, under, to) => {
    expect(readerPlace(name, place, under)).toBe(to);
  });

  it('offers both behind the bar, and one elsewhere', () => {
    expect(names('behind', true)).toEqual(['tuck', 'untuck']);
    expect(names('tucked', true)).toEqual(['untuck']);
    expect(names('shown', false)).toEqual(['tuck']);
  });
});

// Expected values: the steps card 120 high, its bottom 140 from the stage's top; the lists' top 20 from it; the folded
// time card's place 110; the strip 20.
describe('the room each stop leaves over the sheet', () => {
  it('is the strip at 0, the steps card and the strip at 1, and the folded place at 2', () => {
    const room = { stepsHeight: 120, folded: 110, lists: 20 };
    expect(topRoomOf(0, room)).toBe(0);
    expect(topRoomOf(1, room)).toBe(140);
    expect(topRoomOf(2, room)).toBe(110);
  });

  it('keeps the folded place at 1 until the steps card is laid out', () => {
    expect(topRoomOf(1, { stepsHeight: 0, folded: 110, lists: 20 })).toBe(110);
  });

  it('rests the steps card above the stage at 0, and in its place otherwise', () => {
    expect(restingLift(0, 140)).toBe(-140);
    expect(restingLift(1, 140)).toBe(0);
    expect(restingLift(2, 140)).toBe(0);
  });
});
