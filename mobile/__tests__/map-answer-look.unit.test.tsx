/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { Map, type MapMarker, type MarkerLook, unmadeImage } from '@/map';
import { EMPTY, GATE } from './support/map';

// A round of 36 sits on its middle: 18 left of and 18 above its position. Placed beside it at the same position, an
// answer's look must have its symbol box exactly where the round is.
const ROUND: MapMarker = {
  id: 'round',
  name: '둥근 것',
  position: GATE,
  image: unmadeImage({ kind: 'party', form: 'dot' }),
};

function answerAt(side: 'left' | 'right' | 'above' | 'below'): MapMarker {
  const look: MarkerLook = {
    kind: 'answer',
    symbol: { type: 'me' },
    label: { side, tone: 'person', title: '나 · 15분', line: null, number: null },
  };
  return { id: 'answer', name: '나 · 15분', position: GATE, image: unmadeImage(look) };
}

async function layOut(label: string, width: number, height: number): Promise<void> {
  const view = screen.getByLabelText(label, { includeHiddenElements: true });
  await fireEvent(view, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

function placeOf(name: string): { left: number; top: number } {
  const holder = screen.getByRole('button', { name }).parent;
  const style: unknown = holder?.props.style;
  const { left, top } = StyleSheet.flatten<ViewStyle>(typeof style === 'object' && style !== null ? style : {});
  return { left: Number(left), top: Number(top) };
}

// Partitions: a label at each of the four sides. Expected values: the brief's anchor, the centre of the symbol box,
// 18 from the look's edge on the label's other side.
describe("an answer's look on the plain ground", () => {
  it.each([
    ['right', 100, 36, 0, 0],
    ['left', 100, 36, -64, 0],
    ['below', 120, 80, -42, 0],
    ['above', 120, 80, -42, -44],
  ] as const)('stands on the centre of its symbol box with a label %s', async (side, width, height, dx, dy) => {
    await render(<Map {...EMPTY} markers={[ROUND, answerAt(side)]} />);

    await layOut('파티', 36, 36);
    await layOut('내 위치', width, height);

    const round = placeOf('둥근 것');
    expect(placeOf('나 · 15분')).toEqual({ left: round.left + dx, top: round.top + dy });
  });
});
