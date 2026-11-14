/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
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

function withLabel(side: 'above' | 'below' | 'left' | 'right'): MarkerLook {
  return { kind: 'answer', symbol: null, label: { side, tone: 'candidate', title: '3식당', line: null, number: 4 } };
}

// Partitions: the same picture built twice; a change of each thing drawn (the symbol's type, name, ring, role, and
// number; the label's side, tone, title, line, and number; no symbol; no label). Expected values: the brief's rule
// that the name holds the words.
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
