/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import { GRADUATE_SECTOR, KWANJEONG_SECTORS } from '@/api/mock/data/study-spaces';
import {
  basisOf,
  cellOf,
  roomGrid,
  roomOf,
  type RoomCount,
  shortName,
  spacesOf,
  swapFor,
} from '@/library/cards/seat-rooms';

// The rooms of the seat card's chip and list: the label of a floor and kind, the seat space a cell fills, and the
// space a full one is swapped for. The counts are the design's example for 14:00–20:00.

function sector(id: string): LibrarySpace {
  const found = [...KWANJEONG_SECTORS, GRADUATE_SECTOR].find((each) => each.id === id);
  if (found === undefined) {
    throw new Error(`No sector ${id}`);
  }
  return found;
}

const EXAMPLE: ReadonlyMap<string, RoomCount> = new Map([
  ['7F-7A-zone2', 42],
  ['7F-7A-zone1-notebook', 31],
  ['7F-notebook-171', 12],
  ['7F-7B-notebook', 25],
  ['8F-8A-zone1-quiet', 23],
  ['8F-8A-zone2-notebook', 17],
  ['8F-notebook-181', 0],
]);

function counts(changes: Record<string, RoomCount>): ReadonlyMap<string, RoomCount> {
  return new Map([...EXAMPLE, ...Object.entries(changes)]);
}

// The labels of the list's rooms, row by row.
function labels(sectors: LibrarySpace[]): (string | null)[][] {
  return roomGrid(sectors).rows.map(({ cells }) => cells.map((room) => room?.label ?? null));
}

// The cell of the room of that floor and kind.
function cell(floor: number, kind: string, given: ReadonlyMap<string, RoomCount> | null): ReturnType<typeof cellOf> {
  return cellOf(
    KWANJEONG_SECTORS.filter((each) => each.floor === floor && each.kind === kind),
    given,
  );
}

describe('the label of a floor and kind', () => {
  it.each([
    ['7F-7A-zone2', '7층 열람실', '열람실', '7층 열람실'],
    ['7F-7A-zone1-notebook', '7층 노트북존', '노트북존', '7A 노트북존'],
    ['7F-notebook-171', '7층 노트북존', '노트북존', '171호 노트북존'],
    ['7F-7B-notebook', '7층 노트북존', '노트북존', '7B 노트북존'],
    ['8F-8A-zone1-quiet', '8층 정숙 열람실', '정숙 열람실', '8층 정숙 열람실'],
    ['8F-8A-zone2-notebook', '8층 노트북존', '노트북존', '8A 노트북존'],
    ['8F-notebook-181', '8층 노트북존', '노트북존', '181호 노트북존'],
    ['8F-grad-reading-room', '대학원 열람실', '대학원 열람실', '대학원 열람실'],
  ])('names %s "%s" on the chip, "%s" in its cell and "%s" on the card', (id, label, inCell, short) => {
    const space = sector(id);

    expect(roomOf(space)).toMatchObject({ label, cell: inCell });
    expect(shortName(space)).toBe(short);
  });

  it('names no room for a space without a kind, or one that is not a seat space of 7층 or 8층', () => {
    const { kind: _kind, ...withoutKind } = sector('7F-7A-zone2');

    expect(roomOf(withoutKind)).toBeNull();
    expect(roomOf({ id: '4F-group-6', floor: 4, kind: 'group-study-room' })).toBeNull();
  });

  it('lays the rooms out in a column per floor and a row per kind, with 대학원 열람실 for a graduate student only', () => {
    expect(roomGrid(KWANJEONG_SECTORS).floors).toEqual([7, 8]);
    expect(labels(KWANJEONG_SECTORS)).toEqual([
      ['7층 열람실', '8층 정숙 열람실'],
      ['7층 노트북존', '8층 노트북존'],
    ]);
    expect(labels([...KWANJEONG_SECTORS, GRADUATE_SECTOR]).at(-1)).toEqual([null, '대학원 열람실']);
  });
});

describe("the pick of a cell's space", () => {
  it('is the space of that kind on that floor with the most free seats, whose count the cell shows', () => {
    expect(cell(7, 'notebook-zone', EXAMPLE)).toEqual({
      count: { kind: 'free', free: 31 },
      pick: sector('7F-7A-zone1-notebook'),
    });
    expect(cell(8, 'notebook-zone', EXAMPLE)).toEqual({
      count: { kind: 'free', free: 17 },
      pick: sector('8F-8A-zone2-notebook'),
    });
  });

  it('is none for a kind with no free seat on that floor, which shows 만석', () => {
    const full = counts({ '8F-8A-zone2-notebook': 0 });

    expect(cell(8, 'notebook-zone', full)).toEqual({ count: { kind: 'full' }, pick: null });
  });

  it('is the largest space of that kind without counts, and while they are read', () => {
    expect(cell(7, 'notebook-zone', null)).toEqual({ count: { kind: 'none' }, pick: sector('7F-7B-notebook') });
    expect(cell(8, 'notebook-zone', null)).toEqual({ count: { kind: 'none' }, pick: sector('8F-8A-zone2-notebook') });
    expect(cell(7, 'notebook-zone', counts({ '7F-7B-notebook': 'pending' }))).toEqual({
      count: { kind: 'pending' },
      pick: sector('7F-7A-zone1-notebook'),
    });
  });

  it('shows "—" when a read failed and the others are full, and fills the largest of those not read', () => {
    const failed = counts({ '7F-7A-zone1-notebook': 0, '7F-7B-notebook': 'failed', '7F-notebook-171': 0 });

    expect(cell(7, 'notebook-zone', failed)).toEqual({ count: { kind: 'failed' }, pick: sector('7F-7B-notebook') });
  });

  it('gives the basis of a pick among several spaces, most free seats first', () => {
    expect(basisOf(sector('7F-7A-zone1-notebook'), KWANJEONG_SECTORS, EXAMPLE)).toEqual({
      why: '7층 노트북존 가운데 빈 자리가 가장 많은 곳이에요',
      counts: '7A 31석 · 7B 25석 · 171호 12석',
    });
    expect(basisOf(sector('7F-7B-notebook'), KWANJEONG_SECTORS, EXAMPLE)).toBeNull();
    expect(basisOf(sector('7F-7A-zone2'), KWANJEONG_SECTORS, EXAMPLE)).toBeNull();
    expect(basisOf(sector('7F-7A-zone1-notebook'), KWANJEONG_SECTORS, null)).toBeNull();
  });
});

describe('the full-room swap', () => {
  it('fills the space of the same kind with the most free seats', () => {
    const full = counts({ '7F-7A-zone2': 0 });

    expect(swapFor(sector('7F-7A-zone2'), KWANJEONG_SECTORS, full)).toEqual(sector('8F-8A-zone1-quiet'));
    expect(swapFor(sector('7F-7A-zone1-notebook'), KWANJEONG_SECTORS, counts({ '7F-7A-zone1-notebook': 0 }))).toEqual(
      sector('7F-7B-notebook'),
    );
  });

  it('else the space with the most free seats', () => {
    const readingFull = counts({ '7F-7A-zone2': 0, '8F-8A-zone1-quiet': 0 });

    expect(swapFor(sector('7F-7A-zone2'), KWANJEONG_SECTORS, readingFull)).toEqual(sector('7F-7A-zone1-notebook'));
  });

  it('gives none when every space is full, or nothing was read', () => {
    const allFull = new Map(KWANJEONG_SECTORS.map(({ id }): [string, RoomCount] => [id, 0]));

    expect(swapFor(sector('7F-7A-zone2'), KWANJEONG_SECTORS, allFull)).toBeNull();
    expect(swapFor(sector('7F-7A-zone2'), KWANJEONG_SECTORS, null)).toBeNull();
  });
});

describe("a room's spaces", () => {
  it('keeps the spaces of a room in their order', () => {
    const room = roomOf(sector('7F-7B-notebook'));

    expect(room === null ? [] : spacesOf(room, KWANJEONG_SECTORS).map(({ id }) => id)).toEqual([
      '7F-7A-zone1-notebook',
      '7F-notebook-171',
      '7F-7B-notebook',
    ]);
  });
});
