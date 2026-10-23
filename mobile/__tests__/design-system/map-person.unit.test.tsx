/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { MapDot, MapPerson, presence } from '@/design-system';

// The size the marker with the test's id is laid out at.
function sizeOf(testID: string): { width: number; height: number } {
  const style: unknown = screen.getByTestId(testID).props.style;
  const { width, height } = StyleSheet.flatten<ViewStyle>(typeof style === 'object' && style !== null ? style : {});
  return { width: Number(width), height: Number(height) };
}

describe('MapPerson', () => {
  it("shows the person's letters and is read by the name", async () => {
    await render(<MapPerson name="김민준" tone="free" />);

    expect(screen.getByText('민준')).toBeVisible();
    expect(screen.getByLabelText('김민준')).toBeVisible();
  });

  it('is 24 wide while the whole campus is in view and 36 closer, and stands on its tip', async () => {
    const { rerender } = await render(<MapPerson name="김민준" small testID="person" tone="free" />);
    expect(screen.getByTestId('person')).toHaveStyle({ width: 24 });

    await rerender(<MapPerson name="김민준" testID="person" tone="free" />);
    expect(screen.getByTestId('person')).toHaveStyle({ width: 36 });
    // The tip reaches 0.207 of the side below the square.
    expect(sizeOf('person').height).toBeCloseTo(36 * 1.207, 1);
  });

  it("has the frame's tip: three round corners, and the one that the turn brings to the bottom is square", async () => {
    await render(<MapPerson name="김민준" testID="person" tone="free" />);

    const drop = screen.getByTestId('person:drop');
    expect(drop).toHaveStyle({
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 18,
      borderBottomLeftRadius: 0,
      transform: [{ rotate: '-45deg' }],
    });
    // The shorthand would round the tip on the web, whatever the corner says.
    expect(drop).not.toHaveStyle({ borderRadius: 18 });
  });

  it('is 1.18 times as large when it is selected', async () => {
    await render(<MapPerson name="김민준" selected testID="person" tone="class" />);

    expect(sizeOf('person').width).toBeCloseTo(36 * 1.18, 5);
  });

  it("has the status colours of the frame, and the Party's colour for a member", () => {
    expect(presence).toEqual({
      free: '#0B7A55',
      class: '#001A72',
      moving: '#9A5200',
      off: '#8A90A3',
      member: '#B63A07',
    });
  });
});

describe('MapDot', () => {
  it('is 4 larger when it is selected', async () => {
    const { rerender } = await render(<MapDot kind="party" />);
    expect(screen.getByLabelText('파티')).toHaveStyle({ width: 16, height: 16 });

    await rerender(<MapDot kind="party" selected />);
    expect(screen.getByLabelText('파티')).toHaveStyle({ width: 20, height: 20 });
    expect(screen.getByLabelText('파티')).toBeSelected();
  });
});
