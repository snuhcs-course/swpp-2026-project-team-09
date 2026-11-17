/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { axisHours, blockTimes, clock, dayOf, LETTERS, minutesOf, tidy } from './labels.js';
import { type ListedBlock, type ModelAnswer, type TextAnswer } from './reading-model.js';

// P15-52: the answers of the model on the blocks the phone sent, and the second look: blocks whose names are near
// misses of each other are read once more, on their own, so that one class is never split in two by a misread
// character nor two classes merged by a guess.

// How much later than where its colour ends a fading block may end: the hour and a half a bar can hide.
const FADE_MINUTES = 90;

// The end of a fading block: the model's, when it is no earlier than where the block's colour ends (less five
// minutes for rounding) and no later than FADE_MINUTES after it; else null, and the block is left out as cut.
function minutesOfClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/u.exec(text.trim());
  return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

export function fadingEnd(visible: string, read: string | null | undefined): string | null {
  const seen = minutesOfClock(visible);
  const end = read === null || read === undefined ? null : minutesOfClock(read);
  if (seen === null || end === null || end < seen - 5 || end > seen + FADE_MINUTES) {
    return null;
  }
  return clock(Math.round(end / 5) * 5);
}

// The model's text of the listed blocks, on the blocks' own days and times (a 24-hour axis), as an answer of the
// whole picture's shape, so that the same checks read it. A listed block the model gave no text for has no name and
// is left out; a fading block takes the end the model read when it passes `fadingEnd`, and is left out as cut when not.
export function blocksAnswer(blocks: readonly ListedBlock[], text: TextAnswer): ModelAnswer {
  return {
    title: text.title,
    axis: Array.from({ length: 25 }, (_, hour) => String(hour)),
    blocks: blocks.map((block, index) => {
      const read = text.blocks.find(({ number }) => number === index + 1);
      const end = block.fades === true ? fadingEnd(block.end, read?.end) : block.end;
      return {
        day: block.day,
        start: block.start,
        end: end ?? block.end,
        nameLines: read?.nameLines ?? [],
        name: read?.name ?? '',
        room: read?.room ?? null,
        cut: end === null,
      };
    }),
  };
}

export function editDistance(one: string, other: string): number {
  const a = Array.from(one);
  const b = Array.from(other);
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const replace = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, replace));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

// How far two block colours may be apart (RGB distance) and still be one colour: compression and blending, not a
// second colour, which apps choose far apart.
const SAME_COLOUR = 24;

// Whether two names read on two blocks are probably one name misread: as long as each other, apart by one character
// in four, at most two (생물학 and 통계학 are not; 컴퓨터프로그래밍 and 컴퓨터프로그레밍 are), with the same digits and
// Latin letters in the same order (수학 1 and 수학 2, or 물리학 1 and 물리학실험 1, are different classes), and, when
// both blocks' colours are known, of one colour. Only a second look decides: nothing is merged on this alone.
// The digits and Latin letters of a name, in order: what tells 수학 1 from 수학 2.
function marks(text: string): string {
  return text.replaceAll(/[^0-9A-Za-z]/gu, '');
}

export function nearMiss(
  one: { name: string; colour?: readonly number[] | null },
  other: { name: string; colour?: readonly number[] | null },
): boolean {
  const [a, b] = [tidy(one.name), tidy(other.name)];
  const distance = editDistance(a, b);
  const colours = (one.colour ?? null) !== null && (other.colour ?? null) !== null;
  const sameColour =
    !colours ||
    Math.hypot(
      (one.colour?.[0] ?? 0) - (other.colour?.[0] ?? 0),
      (one.colour?.[1] ?? 0) - (other.colour?.[1] ?? 0),
      (one.colour?.[2] ?? 0) - (other.colour?.[2] ?? 0),
    ) <= SAME_COLOUR;
  return (
    a !== b &&
    Array.from(a).length === Array.from(b).length &&
    distance <= Math.min(2, Math.max(1, Math.floor(Array.from(a).length / 4))) &&
    marks(a) === marks(b) &&
    sameColour
  );
}

// The blocks whose names are near misses of another block's: each group is read once more, on its own, so that the
// model, not the code, decides whether they are one name. Groups by index into `blocks`.
export function nearMissGroups(blocks: readonly { name: string; colour?: readonly number[] | null }[]): number[][] {
  const groups: number[][] = [];
  const placed = new Set<number>();
  blocks.forEach((block, index) => {
    if (placed.has(index)) {
      return;
    }
    const group = [index];
    blocks.forEach((other, otherIndex) => {
      if (
        otherIndex !== index &&
        !placed.has(otherIndex) &&
        group.some((member) => nearMiss(blocks[member] ?? block, other))
      ) {
        group.push(otherIndex);
      }
    });
    if (group.length > 1) {
      // Every block of either name joins: a third block that reads like one of them is read again too.
      const names = new Set(group.map((member) => tidy(blocks[member]?.name ?? '')));
      blocks.forEach((other, otherIndex) => {
        if (!group.includes(otherIndex) && names.has(tidy(other.name))) {
          group.push(otherIndex);
        }
      });
      for (const member of group) {
        placed.add(member);
      }
      groups.push(group.toSorted((x, y) => x - y));
    }
  });
  return groups;
}

// Each block of the answer as it would be listed for a second look: its day's letter and its 24-hour times, or null
// for a block whose day or times do not read.
export function listedBlocks(answer: ModelAnswer): (ListedBlock | null)[] {
  const hours = axisHours(answer.axis);
  return answer.blocks.map((block) => {
    const weekday = dayOf(block.day);
    const times =
      hours === null
        ? null
        : blockTimes(minutesOf(block.start, answer.axis, hours), minutesOf(block.end, answer.axis, hours));
    return weekday === null || times === null
      ? null
      : { day: LETTERS[weekday], start: clock(times[0]), end: clock(times[1]) };
  });
}

// The answer with the blocks at `indexes` given the text a second look read, in the same order.
export function withSecondLook(answer: ModelAnswer, indexes: readonly number[], text: TextAnswer): ModelAnswer {
  return {
    ...answer,
    blocks: answer.blocks.map((block, index) => {
      const place = indexes.indexOf(index);
      const read = place === -1 ? undefined : text.blocks.find(({ number }) => number === place + 1);
      return read === undefined ? block : { ...block, nameLines: read.nameLines, name: read.name, room: read.room };
    }),
  };
}
