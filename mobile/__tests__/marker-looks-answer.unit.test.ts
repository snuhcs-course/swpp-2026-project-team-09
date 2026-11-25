/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MarkerLook } from '@/map';
import { anchorShare, lookName, standsOnTip } from '@/map/marker-looks';

const PICK: MarkerLook = {
  kind: 'answer',
  symbol: { type: 'dot', role: 'pick', number: 1 },
  label: { side: 'below', tone: 'pick', title: '302동식당', line: '12:15 점심', number: null },
};
const FACE: MarkerLook = {
  kind: 'answer',
  symbol: { type: 'face', name: '민수', dashed: true },
  label: { side: 'right', tone: 'person', title: '민수 · 18분', line: null, number: null },
};

function tag(sub: string): MarkerLook {
  return {
    kind: 'answer',
    symbol: null,
    label: { side: 'left', tone: 'candidate', title: '301동식당', line: '12:18', number: 2, sub },
  };
}

function withLabel(side: 'above' | 'below' | 'left' | 'right'): MarkerLook {
  return { kind: 'answer', symbol: null, label: { side, tone: 'candidate', title: '3식당', line: null, number: 4 } };
}

// Partitions: the same picture built twice; a change of each thing drawn (the symbol's type, name, ring, badge, green
// dot, role, and number; the label's side, tone, title, line, and number; no symbol; no label). Expected values: the
// brief's rule that the name holds the words.
describe("an answer's look on the map", () => {
  it('has one name for two looks that draw the same picture', () => {
    const again: MarkerLook = {
      kind: 'answer',
      label: { number: null, line: '12:15 점심', title: '302동식당', tone: 'pick', side: 'below' },
      symbol: { number: 1, role: 'pick', type: 'dot' },
    };

    expect(lookName(again)).toBe(lookName(PICK));
  });

  it('has another name for each thing it draws differently', () => {
    const looks: MarkerLook[] = [
      PICK,
      FACE,
      { ...FACE, symbol: { type: 'face', name: '지은', dashed: true } },
      { ...FACE, symbol: { type: 'face', name: '민수', dashed: false } },
      { ...FACE, symbol: { type: 'face', name: '민수', dashed: true, badge: 'waiting' } },
      { ...FACE, symbol: { type: 'face', name: '민수', dashed: true, badge: 'accepted' } },
      { ...FACE, symbol: { type: 'face', name: '민수', dashed: false, exact: true } },
      { ...FACE, symbol: { type: 'face', name: '민수', dashed: false, exact: true, badge: 'accepted' } },
      { ...FACE, symbol: { type: 'me' } },
      { ...FACE, symbol: null },
      { ...FACE, label: null },
      { ...PICK, symbol: { type: 'dot', role: 'pick', number: 2 } },
      { ...PICK, symbol: { type: 'dot', role: 'candidate', number: 1 } },
      { ...PICK, symbol: { type: 'dot', role: 'pick', number: null } },
      withLabel('left'),
      withLabel('right'),
      { kind: 'answer', symbol: null, label: { side: 'left', tone: 'dropped', title: '3식당', line: null, number: 4 } },
      { kind: 'answer', symbol: null, label: { side: 'left', tone: 'candidate', title: '3식', line: null, number: 4 } },
      { kind: 'answer', symbol: null, label: { side: 'left', tone: 'candidate', title: '3식당', line: '', number: 4 } },
      {
        kind: 'answer',
        symbol: null,
        label: { side: 'left', tone: 'candidate', title: '3식당', line: null, number: 5 },
      },
    ];

    expect(new Set(looks.map((look) => lookName(look))).size).toBe(looks.length);
  });

  it('never stands on a tip', () => {
    expect(standsOnTip(PICK)).toBe(false);
  });
});

// Partitions: a face whose `exact` is false and one without it. Expected value: P02 ticket 20, two looks that draw
// one picture share a name.
describe("an answer's face without the green dot", () => {
  it('has one name whether `exact` is false or left out', () => {
    const plain: MarkerLook = { ...FACE, symbol: { type: 'face', name: '민수', dashed: false } };
    const notExact: MarkerLook = { ...FACE, symbol: { type: 'face', name: '민수', dashed: false, exact: false } };

    expect(lookName(notExact)).toBe(lookName(plain));
  });
});

function moved(shift: number): MarkerLook {
  return {
    kind: 'answer',
    symbol: null,
    label: { side: 'left', tone: 'candidate', title: '3식당', line: null, number: 4, shift },
  };
}

// Partitions: a label not moved, and moved by two lengths (ticket 08's labels sharing an edge). Expected value: the
// brief's rule that the name holds what is drawn.
describe("an answer's look with a label moved to share an edge", () => {
  it('has another name by how far its label moved', () => {
    expect(new Set([withLabel('left'), moved(2), moved(9)].map((look) => lookName(look))).size).toBe(3);
  });
});

// Partitions: a look on its middle, a look on its tip, an answer's look with a label at each of the four sides and
// without a label, and a box not laid out yet. Expected values: the brief's anchor, the centre of the 36-point
// symbol box.
describe("a look's anchor as shares of its box", () => {
  it('is the middle of a round thing and the tip of a pin, whatever the size', () => {
    expect(anchorShare({ kind: 'party', form: 'dot' }, { width: 16, height: 16 })).toEqual({ x: 0.5, y: 0.5 });
    expect(anchorShare({ kind: 'party', form: 'pin' }, { width: 40, height: 50 })).toEqual({ x: 0.5, y: 1 });
  });

  it.each([
    ['right', { x: 0.18, y: 0.5 }],
    ['left', { x: 0.82, y: 0.5 }],
  ] as const)('is the centre of the symbol box with a label at the %s', (side, share) => {
    const anchor = anchorShare(withLabel(side), { width: 100, height: 36 });

    expect(anchor.x).toBeCloseTo(share.x, 10);
    expect(anchor.y).toBe(share.y);
  });

  it.each([
    ['below', { x: 0.5, y: 0.225 }],
    ['above', { x: 0.5, y: 0.775 }],
  ] as const)('is the centre of the symbol box with a label %s', (side, share) => {
    const anchor = anchorShare(withLabel(side), { width: 120, height: 80 });

    expect(anchor.x).toBe(share.x);
    expect(anchor.y).toBeCloseTo(share.y, 10);
  });

  it('is the middle of an answer look without a label', () => {
    expect(anchorShare({ ...FACE, label: null }, { width: 36, height: 36 })).toEqual({ x: 0.5, y: 0.5 });
  });

  it('is the middle while the box has no size yet', () => {
    expect(anchorShare(FACE, { width: 0, height: 0 })).toEqual({ x: 0.5, y: 0.5 });
  });
});

// Partitions: two tags that differ in their second line only, and the same tag twice.
describe("a candidate's tag with dishes (P04 ticket 13)", () => {
  it('has another name when its second line differs, and one name for the same line', () => {
    expect(lookName(tag('부대짬뽕&군만두 외 4 · 5,000원부터'))).not.toBe(
      lookName(tag('뚝배기불고기 외 4 · 5,000원부터')),
    );
    expect(lookName(tag('뚝배기불고기 외 4'))).toBe(lookName(tag('뚝배기불고기 외 4')));
  });
});

// Partitions: a dot faded or not, at each ring stage or none, popped or not; a label faded or not, with "메뉴 ›" or
// without, with a note or without (the answer screen's redesign).
function dot(more: object): MarkerLook {
  return {
    kind: 'answer',
    symbol: { type: 'dot', role: 'pick', number: 1, ...more },
    label: null,
  };
}
function label(more: object): MarkerLook {
  return {
    kind: 'answer',
    symbol: null,
    label: { side: 'below', tone: 'pick', title: '학생회관식당', line: '목살슬라이스덮밥 외 2', number: null, ...more },
  };
}

describe("a meal answer's looks that differ only in how they are drawn", () => {
  it('have names of their own, so that a phone never draws a kept picture of another', () => {
    const looks = [
      dot({}),
      dot({ faded: true }),
      dot({ ring: 0.2 }),
      dot({ ring: 0.6 }),
      dot({ ring: 1, pop: true }),
      dot({ ring: 1 }),
      label({}),
      label({ faded: true }),
      label({ action: '메뉴 ›' }),
      label({ note: '11:00' }),
    ];
    expect(new Set(looks.map((look) => lookName(look))).size).toBe(looks.length);
  });
});
