/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pictureSize, zoomedOffset, zoomStepped, zoomWithin } from '@/library/cards/seat-zoom';

// The seat picture's zoom (P01 ticket 01): its steps and limits, and where the view lands after a zoom. The picture is
// 7A 열람실 2 구역's, 2529×1198 pixels, in a view 320×298 points.

const IMAGE = { width: 2529, height: 1198 };
const VIEW = { width: 320, height: 298 };

describe('the zoom steps', () => {
  it('steps through 1, 1.5, 2, 3 and 4, and stops at the ends', () => {
    expect(zoomStepped(1, 1)).toBe(1.5);
    expect(zoomStepped(1.5, 1)).toBe(2);
    expect(zoomStepped(3, 1)).toBe(4);
    expect(zoomStepped(4, 1)).toBe(4);
    expect(zoomStepped(2, -1)).toBe(1.5);
    expect(zoomStepped(1, -1)).toBe(1);
    // A pinch leaves the zoom between steps; a button goes to the next step.
    expect(zoomStepped(2.4, 1)).toBe(3);
    expect(zoomStepped(2.4, -1)).toBe(2);
  });

  it('keeps a pinch between 1 and 4', () => {
    expect(zoomWithin(0.5)).toBe(1);
    expect(zoomWithin(2.2)).toBe(2.2);
    expect(zoomWithin(9)).toBe(4);
  });

  it('draws the picture 300 points high at zoom 1, its width as the image has it', () => {
    expect(pictureSize(IMAGE, 1)).toEqual({ width: (300 * 2529) / 1198, height: 300 });
    expect(pictureSize(IMAGE, 2).height).toBe(600);
  });
});

describe('where the view lands after a zoom', () => {
  it('keeps the middle of the view in the middle', () => {
    const offset = { x: 100, y: 0 };
    const middle = { x: VIEW.width / 2, y: VIEW.height / 2 };
    const landed = zoomedOffset({
      point: { x: offset.x + middle.x, y: offset.y + middle.y },
      at: middle,
      from: 1,
      to: 1.5,
      picture: pictureSize(IMAGE, 1.5),
      view: VIEW,
    });

    expect(landed.x).toBeCloseTo(260 * 1.5 - 160);
    expect(landed.y).toBeCloseTo(149 * 1.5 - 149);
  });

  it('brings a pressed seat to the middle', () => {
    const seat = { x: 400, y: 200 };
    const landed = zoomedOffset({
      point: seat,
      at: { x: VIEW.width / 2, y: VIEW.height / 2 },
      from: 2,
      to: 3,
      picture: pictureSize(IMAGE, 3),
      view: VIEW,
    });

    expect(landed.x).toBeCloseTo(600 - 160);
    expect(landed.y).toBeCloseTo(300 - 149);
  });
});

describe('where the view lands after a pinch, and at the picture’s edges', () => {
  it('keeps the point between the fingers where it is, as a pinch does', () => {
    const offset = { x: 250, y: 120 };
    const focal = { x: 40, y: 60 };
    const from = 2;
    const to = 2.6;
    const landed = zoomedOffset({
      point: { x: offset.x + focal.x, y: offset.y + focal.y },
      at: focal,
      from,
      to,
      picture: pictureSize(IMAGE, to),
      view: VIEW,
    });

    // The picture's point under the fingers, at the new zoom, is still under them.
    expect(((landed.x + focal.x) * from) / to).toBeCloseTo(offset.x + focal.x);
    expect(((landed.y + focal.y) * from) / to).toBeCloseTo(offset.y + focal.y);
  });

  it('never passes the picture’s edges', () => {
    const picture = pictureSize(IMAGE, 4);
    const corner = zoomedOffset({ point: { x: 0, y: 0 }, at: { x: 160, y: 149 }, from: 3, to: 4, picture, view: VIEW });
    expect(corner).toEqual({ x: 0, y: 0 });

    const far = zoomedOffset({
      point: { x: 5000, y: 5000 },
      at: { x: 0, y: 0 },
      from: 3,
      to: 4,
      picture,
      view: VIEW,
    });
    expect(far.x).toBeCloseTo(picture.width - VIEW.width);
    expect(far.y).toBeCloseTo(picture.height - VIEW.height);
  });

  it('leaves a picture smaller than the view at 0', () => {
    const landed = zoomedOffset({
      point: { x: 300, y: 200 },
      at: { x: 160, y: 149 },
      from: 1,
      to: 1,
      picture: { width: 200, height: 100 },
      view: VIEW,
    });

    expect(landed).toEqual({ x: 0, y: 0 });
  });
});
