/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, render, screen, userEvent } from '@testing-library/react-native';
import { ScrollView, StyleSheet, Text, type ViewStyle } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { dragHandle, holdHandleDrag, laySheet } from '../support/sheet-swipe';

import { BottomSheet } from '@/design-system/bottom-sheet';
import { Button } from '@/design-system/button';
import { MOVING, PAN_STARTS } from '@/design-system/sheet-pull';

// A drag down on a sheet's handle bar closes it (P06 ticket 35), by the way the finger moves as it lets go: moving down
// it closes, moving up it springs back, and at rest it closes past a quarter of its height but never asks for more than
// 120 points. The sheet's body takes no drag (the user's decision after the phone check, 2026-11-28).

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const LABEL = '파티 찾기';

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderSheet(onClose: () => void, onJoin: () => void = jest.fn<void, []>()): Promise<void> {
  await render(
    <BottomSheet label={LABEL} onClose={onClose} open>
      <Text>인원</Text>
      <ScrollView>
        <Text>같이 갈 파티</Text>
      </ScrollView>
      <Button onPress={onJoin}>참여하기</Button>
    </BottomSheet>,
  );
}

// How far the sheet stands below its place, from its pull's animated style.
function sheetDown(): number {
  const style: unknown = getAnimatedStyle(screen.getByLabelText(LABEL));
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : Number.NaN;
}

// A few of the UI thread's frames, which run on real timers in the tests: the sheet drawn where its pull put it.
async function frames(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  });
}

// Partitions: a sheet 400 tall, where a quarter, 100, is the most a let-go at rest asks, and one 800 tall, where 120
// is; short of it and past it; a let-go still or trembling under `MOVING`.
describe('a let-go at rest', () => {
  it('closes a sheet 400 tall past a quarter of it, and not short of it', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await dragHandle(90);
    expect(onClose).not.toHaveBeenCalled();

    await dragHandle(120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes a sheet 800 tall past 120 points, short of its quarter', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 800);

    await dragHandle(100);
    expect(onClose).not.toHaveBeenCalled();

    await dragHandle(140);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('counts a tremble of the finger as rest, down or up', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await dragHandle(60, MOVING / 2);
    expect(onClose).not.toHaveBeenCalled();

    await dragHandle(200, -MOVING / 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// Partitions: moving down or up as the finger lets go; a short swipe and one that went far down on the way; the finger
// still down.
describe('a let-go that moves', () => {
  it('closes the sheet moving down, however short the drag', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 800);

    await dragHandle(30, MOVING * 2);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open moving up, however far down the finger went, and never closes it while it is down', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    const held = await holdHandleDrag();
    await held.move(390);
    await held.move(300);
    expect(onClose).not.toHaveBeenCalled();
    await held.letGo(300, -MOVING * 2);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('never closes it by a drag up', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await dragHandle(-200, -MOVING * 5);

    expect(onClose).not.toHaveBeenCalled();
  });
});

// Partitions: the finger down on the handle bar, and a press on a button in the body.
describe('the handle bar and the body', () => {
  it('pulls the sheet down with the finger on the handle bar, never up past its place', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    const held = await holdHandleDrag();
    await held.move(150 + PAN_STARTS);
    await frames();
    expect(sheetDown()).toBe(150);
    await held.move(-100);
    await frames();
    expect(sheetDown()).toBe(0);
    await held.letGo(-100);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('leaves a press on a button inside a press', async () => {
    const onClose = jest.fn<void, []>();
    const onJoin = jest.fn<void, []>();
    await renderSheet(onClose, onJoin);

    await userEvent.press(screen.getByRole('button', { name: '참여하기' }));

    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
