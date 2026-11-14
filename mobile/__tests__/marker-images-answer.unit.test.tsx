/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { MarkerImageStage, type MarkerLook, useMarkerImages } from '@/map';

jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => true,
}));

jest.mock('react-native-view-shot', (): { captureRef: jest.Mock<Promise<string>, []> } => ({
  captureRef: jest.fn<Promise<string>, []>(),
}));

// A screen that asks for one look and says where its picture stands on the position.
function Sample({ look }: { look: MarkerLook }): ReactElement {
  const [image] = useMarkerImages([look]);
  return (
    <>
      <Text>{`기준: ${image.anchor.x.toFixed(4)} ${image.anchor.y.toFixed(4)}`}</Text>
      <MarkerImageStage />
    </>
  );
}

function me(side: 'left' | 'right' | 'below'): MarkerLook {
  return {
    kind: 'answer',
    symbol: { type: 'me' },
    label: { side, tone: 'person', title: '나 · 15분', line: null, number: null },
  };
}

async function madeAt(width: number, height: number): Promise<void> {
  const views = screen.getAllByLabelText('내 위치', { includeHiddenElements: true });
  const view = views.at(-1) ?? screen.getByLabelText('내 위치');
  await fireEvent(view, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(100);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(captureRef).mockReset().mockResolvedValue('file:///tmp/answer.png');
});

afterEach(() => {
  jest.useRealTimers();
});

// Partitions: a label at the right, at the left, and below. The picture has 12 of clear room around the look, so the
// anchor is the symbol box's centre, 12 + 18 from the picture's edge. Expected values: the brief's anchor.
describe("the anchor of an answer's picture", () => {
  it('stands on the centre of the symbol box with a label at the right', async () => {
    await render(<Sample look={me('right')} />);

    await madeAt(160, 60);

    expect(screen.getByText('기준: 0.1875 0.5000')).toBeVisible();
  });

  it('stands on the centre of the symbol box with a label at the left', async () => {
    await render(<Sample look={me('left')} />);

    await madeAt(160, 60);

    expect(screen.getByText('기준: 0.8125 0.5000')).toBeVisible();
  });

  it('stands on the centre of the symbol box with a label below', async () => {
    await render(<Sample look={me('below')} />);

    await madeAt(120, 100);

    expect(screen.getByText('기준: 0.5000 0.3000')).toBeVisible();
  });
});
