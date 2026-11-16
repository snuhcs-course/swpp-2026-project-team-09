/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { color, MapDot, MapPerson, presence } from '@/design-system';

function styleOf(found: ReturnType<typeof screen.getByTestId>): ViewStyle {
  const style: unknown = found.props.style;
  return StyleSheet.flatten<ViewStyle>(typeof style === 'object' && style !== null ? style : {});
}

// The size the marker with the test's id is laid out at.
function sizeOf(testID: string): { width: number; height: number } {
  const { width, height } = styleOf(screen.getByTestId(testID));
  return { width: Number(width), height: Number(height) };
}

interface Point {
  x: number;
  y: number;
}

interface Parts {
  // The box's far corner: its width and its height.
  box: Point;
  tip: Point;
  centre: Point;
  radius: number;
  badge: { from: Point; to: Point } | null;
}

// Where the parts of the marker `person` stand in its box, from the styles they are given: the drop by its margins,
// a square of its side turned by 45° about its centre with its square corner at the bottom, so that its tip lies
// side / √2 below the centre; the Avatar a circle about that centre; and the badge by its distances from the top
// and the right.
function partsOf(): Parts {
  const { width, height } = sizeOf('person');
  const drop = styleOf(screen.getByTestId('person:drop'));
  const side = Number(drop.width);
  const centre = { x: Number(drop.marginLeft ?? 0) + side / 2, y: Number(drop.marginTop ?? 0) + side / 2 };
  const found = screen.queryByTestId('person:badge');
  const badge = found === null ? null : styleOf(found);
  const from = badge === null ? null : { x: width - Number(badge.right) - Number(badge.width), y: Number(badge.top) };
  return {
    box: { x: width, y: height },
    tip: { x: centre.x, y: centre.y + side / Math.SQRT2 },
    centre,
    radius: Number(styleOf(screen.getByLabelText('김민준')).width) / 2,
    badge:
      badge === null || from === null
        ? null
        : { from, to: { x: from.x + Number(badge.width), y: from.y + Number(badge.height) } },
  };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
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
      on: '#0B7A55',
      off: '#8A90A3',
      member: '#B63A07',
    });
  });
});

// Partitions: a face without the "+", and one with it. Expected values: P02 ticket 09, a small round at the face's
// upper right in the size of the answer's "?" and "✓", navy with a white "+" as the wireframe kit draws it.
describe('MapPerson: the "+" of a Friend who can be added', () => {
  it('draws no badge on a face without it', async () => {
    await render(<MapPerson name="김민준" testID="person" tone="free" />);

    expect(screen.queryByTestId('person:badge')).toBeNull();
    expect(screen.queryByText('+')).toBeNull();
  });

  it('draws a navy round of 14 with a white "+" at the upper right of the face', async () => {
    await render(<MapPerson addable name="김민준" testID="person" tone="free" />);

    expect(screen.getByTestId('person:badge')).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      width: 14,
      height: 14,
      backgroundColor: color.snuBlue,
    });
    expect(within(screen.getByTestId('person:badge')).getByText('+')).toHaveStyle({ color: color.onPrimary });
  });
});

// Partitions: a face without the "+" and one with it. The rule: the "+" lies outside the Avatar, whose letters it
// would cover, and whole inside the box the map's picture is made from; the tip stays at the box's bottom centre,
// the point that stands on the person's position.
describe('MapPerson: where the "+" stands', () => {
  it.each([
    ['without', false],
    ['with', true],
  ])('stands on its tip at the bottom centre of its box %s the "+"', async (_, addable) => {
    await render(<MapPerson addable={addable} name="김민준" testID="person" tone="free" />);

    const { box, tip } = partsOf();
    expect(tip.x).toBeCloseTo(box.x / 2, 6);
    expect(tip.y).toBeCloseTo(box.y, 6);
    expect(sizeOf('person:drop')).toEqual({ width: 36, height: 36 });
  });

  it("keeps the badge's box clear of the Avatar's circle, at its upper right, and whole inside the box", async () => {
    await render(<MapPerson addable name="김민준" testID="person" tone="free" />);

    const { box, centre, radius, badge } = partsOf();
    if (badge === null) {
      throw new Error('The face with the "+" has no badge');
    }
    const nearest = { x: clamp(centre.x, badge.from.x, badge.to.x), y: clamp(centre.y, badge.from.y, badge.to.y) };
    expect(radius).toBe(14);
    expect(Math.hypot(nearest.x - centre.x, nearest.y - centre.y)).toBeGreaterThan(radius);
    expect(badge.from.x).toBeGreaterThan(centre.x);
    expect(badge.to.y).toBeLessThan(centre.y);
    expect(badge.from.x).toBeGreaterThanOrEqual(0);
    expect(badge.from.y).toBeGreaterThanOrEqual(0);
    expect(badge.to.x).toBeLessThanOrEqual(box.x);
    expect(badge.to.y).toBeLessThanOrEqual(box.y);
  });
});

// The box of the green dot of the marker `person`, by its distances from the left and the top, or null.
function dotOf(): { from: Point; to: Point } | null {
  const found = screen.queryByTestId('person:exact');
  if (found === null) {
    return null;
  }
  const { left, top, width, height } = styleOf(found);
  const from = { x: Number(left), y: Number(top) };
  return { from, to: { x: from.x + Number(width), y: from.y + Number(height) } };
}

// Partitions: a face without the dot and one with it. Expected values: P02 ticket 20 and board a13, a small green
// round at the face, as the wireframe kit draws it: 11 across in the live colour with a white ring of 2.
describe('MapPerson: the green dot of a Friend at the exact level', () => {
  it('draws no dot on a face without it', async () => {
    await render(<MapPerson name="김민준" testID="person" tone="free" />);

    expect(screen.queryByTestId('person:exact')).toBeNull();
  });

  it('draws a round of 11 in the live colour with a white ring of 2', async () => {
    await render(<MapPerson exact name="김민준" testID="person" tone="class" />);

    const dot = screen.getByTestId('person:exact');
    expect(dot).toHaveStyle({
      position: 'absolute',
      width: 11,
      height: 11,
      borderWidth: 2,
      borderColor: color.surface,
      backgroundColor: color.live,
    });
    // Round: its corners are rounded by half its side or more.
    expect(Number(styleOf(dot).borderRadius)).toBeGreaterThanOrEqual(11 / 2);
  });
});

// Partitions: the small, the full, and the selected face; a face with the dot alone and one with the dot and the "+".
// The rule: ticket 18's for the "+", the dot lies outside the Avatar, whose letters it would cover, on the drop's rim,
// and whole inside the box the map's picture is made from; the tip stays at the box's bottom centre. The Avatar is 28
// across, drawn at 0.68 of it in the small face and at 1.18 in the selected one (`MapPerson`'s sizes).
describe('MapPerson: where the green dot stands', () => {
  it.each([
    ['small', { small: true }, 0.68],
    ['full', {}, 1],
    ['selected', { selected: true }, 1.18],
  ])(
    'on the %s face lies at the lower right, outside the Avatar, on the rim, inside the box',
    async (_, size, scale) => {
      await render(<MapPerson exact name="김민준" testID="person" tone="free" {...size} />);

      const { box, tip, centre, radius: face } = partsOf();
      const dot = dotOf();
      if (dot === null) {
        throw new Error('The face at the exact level has no dot');
      }
      const middle = { x: (dot.from.x + dot.to.x) / 2, y: (dot.from.y + dot.to.y) / 2 };
      const nearest = Math.hypot(middle.x - centre.x, middle.y - centre.y) - (dot.to.x - dot.from.x) / 2;
      expect(middle.x).toBeGreaterThan(centre.x);
      expect(middle.y).toBeGreaterThan(centre.y);
      expect(nearest).toBeGreaterThan(face * scale);
      expect(nearest).toBeLessThan(Number(styleOf(screen.getByTestId('person:drop')).width) / 2);
      expect(dot.from.x).toBeGreaterThanOrEqual(0);
      expect(dot.to.x).toBeLessThanOrEqual(box.x);
      expect(dot.to.y).toBeLessThanOrEqual(box.y);
      expect(tip.x).toBeCloseTo(box.x / 2, 6);
      expect(tip.y).toBeCloseTo(box.y, 6);
    },
  );

  it('keeps the dot and the "+" apart on a face that carries both', async () => {
    await render(<MapPerson addable exact name="김민준" testID="person" tone="free" />);

    const { badge } = partsOf();
    const dot = dotOf();
    if (badge === null || dot === null) {
      throw new Error('The face lacks the dot or the "+"');
    }
    const apart = dot.from.y >= badge.to.y || dot.to.x <= badge.from.x;
    expect(apart).toBe(true);
    expect(sizeOf('person:drop')).toEqual({ width: 36, height: 36 });
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
