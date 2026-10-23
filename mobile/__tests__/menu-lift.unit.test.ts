/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { menuLift } from '@/screens/me/menu-lift';

// The list of 시간표 versions opens under the week card's trigger, in a Modal of its own: while a version is renamed,
// it goes up so that the field stands above the keyboard.

const PHONE = { screenHeight: 844, topInset: 47 };

describe('menuLift', () => {
  it('stays put while the keyboard is down', () => {
    expect(menuLift({ ...PHONE, top: 260, row: 9, keyboard: 0 })).toBe(0);
  });

  it('stays put while the renamed row is above the keyboard', () => {
    // The first row ends at 260 + 8 + 40 = 308, far above the keyboard's top at 844 - 336 = 508.
    expect(menuLift({ ...PHONE, top: 260, row: 0, keyboard: 336 })).toBe(0);
  });

  it('goes up so that a low row stands 16 above the keyboard', () => {
    // The 10th row ends at 260 + 8 + 400 = 668: 160 below the keyboard's top, and 16 of room.
    expect(menuLift({ ...PHONE, top: 260, row: 9, keyboard: 336 })).toBe(176);
  });

  it('never goes over the status bar', () => {
    expect(menuLift({ ...PHONE, top: 120, row: 9, keyboard: 500 })).toBe(120 - PHONE.topInset);
  });
});
