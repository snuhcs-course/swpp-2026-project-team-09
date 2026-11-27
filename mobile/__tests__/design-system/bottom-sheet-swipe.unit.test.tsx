/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { holdSwipe, layList, laySheet, scrollList, swipe } from '../support/sheet-swipe';

import { BottomSheet } from '@/design-system/bottom-sheet';
import { Button } from '@/design-system/button';
import { MOVING, PAN_STARTS } from '@/design-system/sheet-pull';
import { type SheetScrollEvent, SheetScrollView } from '@/design-system/sheet-scroll-view';

// A swipe down from anywhere on a sheet closes it (P06 ticket 35), by the way the finger moves as it lets go: moving
// down it closes, moving up it springs back, and at rest it closes past a quarter of its height but never asks for more
// than 120 points (the user's phone check, 2026-11-28). A swipe that starts in a list closes only when the list was at
// its top where the finger landed, decided for the whole swipe; any other swipe there scrolls the list.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const LABEL = '파티 찾기';
const LIST = 'sheet-list';
const ROW = 44;

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderSheet(onClose: () => void, onJoin: () => void = jest.fn<void, []>()): Promise<void> {
  await render(
    <BottomSheet label={LABEL} onClose={onClose} open>
      <Text>인원</Text>
      <SheetScrollView testID={LIST}>
        <Text>같이 갈 파티</Text>
      </SheetScrollView>
      <Button onPress={onJoin}>참여하기</Button>
    </BottomSheet>,
  );
}

// Partitions: a sheet 400 tall, where a quarter, 100, is the most a let-go at rest asks, and one 800 tall, where 120
// is; short of it and past it; a let-go still or trembling under `MOVING`.
describe('a let-go at rest', () => {
  it('closes a sheet 400 tall past a quarter of it, and not short of it', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await swipe('sheet-drag', 90);
    expect(onClose).not.toHaveBeenCalled();

    await swipe('sheet-drag', 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes a sheet 800 tall past 120 points, short of its quarter', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 800);

    await swipe('sheet-drag', 100);
    expect(onClose).not.toHaveBeenCalled();

    await swipe('sheet-drag', 140);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('counts a tremble of the finger as rest, down or up', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await swipe('sheet-drag', 60, MOVING / 2);
    expect(onClose).not.toHaveBeenCalled();

    await swipe('sheet-drag', 200, -MOVING / 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// Partitions: moving down or up as the finger lets go; a short swipe and one that went far down on the way; the finger
// still down.
describe('a let-go that moves', () => {
  it('closes the sheet moving down, however short the swipe', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 800);

    await swipe('sheet-drag', 30, MOVING * 2);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open moving up, however far down the finger went, and never closes it while it is down', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    const held = await holdSwipe('sheet-drag');
    await held.move(390);
    await held.move(300);
    expect(onClose).not.toHaveBeenCalled();
    await held.letGo(300, -MOVING * 2);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('never closes it by a swipe up', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await swipe('sheet-drag', -200, -MOVING * 5);

    expect(onClose).not.toHaveBeenCalled();
  });
});

// Partitions: the list at its top and scrolled where the finger lands; the swipe going down first or up first; the list
// reaching its top during the swipe.
describe('a swipe that starts in a list', () => {
  it('closes the sheet when the list was at its top', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await swipe('sheet-list-drag', 200);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('only scrolls a list that was scrolled, even once it reaches its top, and the next swipe from the top closes', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);
    await scrollList(LIST, 150);

    const held = await holdSwipe('sheet-list-drag');
    await held.move(150);
    await scrollList(LIST, 0);
    await held.move(300);
    await held.letGo(300, MOVING * 5);
    expect(onClose).not.toHaveBeenCalled();

    await swipe('sheet-list-drag', 200);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('scrolls the list at its top when the swipe goes up first, though it then comes down', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    const held = await holdSwipe('sheet-list-drag', -PAN_STARTS);
    await held.move(200);
    await held.letGo(200, MOVING * 5);

    expect(onClose).not.toHaveBeenCalled();
  });
});

// What the phone needs (2026-11-28): on Android a native scroll view that takes the touch makes the gesture handler
// cancel every gesture, the sheet's swipe too, and the tests' gesture events never go through Android's touch
// dispatch. So a list in a sheet must take no touch of its own; its swipe scrolls it, and tells what a native scroll
// tells, for the time wheel's rows.
describe('a list in a sheet', () => {
  it('takes no touch of its own scroll view', async () => {
    await renderSheet(jest.fn<void, []>());

    expect(screen.getByTestId(LIST)).toHaveProp('scrollEnabled', false);
  });

  it('is scrolled by a swipe up, which runs on to the row its speed points to and tells each moment', async () => {
    const told = {
      begin: jest.fn<void, [SheetScrollEvent]>(),
      end: jest.fn<void, [SheetScrollEvent]>(),
      momentum: jest.fn<void, [SheetScrollEvent]>(),
    };
    await render(
      <BottomSheet label={LABEL} onClose={jest.fn<void, []>()} open>
        <SheetScrollView
          decelerationRate="fast"
          onMomentumScrollEnd={told.momentum}
          onScrollBeginDrag={told.begin}
          onScrollEndDrag={told.end}
          snapToInterval={ROW}
          testID={LIST}
        >
          <Text>09:00</Text>
        </SheetScrollView>
      </BottomSheet>,
    );
    await layList(LIST, ROW * 5, ROW * 40);

    const held = await holdSwipe('sheet-list-drag', -PAN_STARTS);
    await held.move(-100);
    await held.letGo(-100, -1000);

    // Moved 92 past where the swipe took it; a second at 1000 a second carries 100 more, to the row at 176.
    expect(told.begin).toHaveBeenCalledWith({
      nativeEvent: { contentOffset: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    });
    expect(told.end).toHaveBeenCalledWith({
      nativeEvent: { contentOffset: { x: 0, y: 92 }, velocity: { x: 0, y: 1 } },
    });
    await waitFor(() => {
      expect(told.momentum).toHaveBeenCalledWith({
        nativeEvent: { contentOffset: { x: 0, y: ROW * 4 }, velocity: { x: 0, y: 0 } },
      });
    });
  });
});

// Partitions: a press on a button inside, and a swipe outside a scrolled list.
describe('the rest of the sheet', () => {
  it('leaves a press on a button inside a press', async () => {
    const onClose = jest.fn<void, []>();
    const onJoin = jest.fn<void, []>();
    await renderSheet(onClose, onJoin);

    await userEvent.press(screen.getByRole('button', { name: '참여하기' }));

    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('leaves a swipe on the sheet outside the list free to close it, though the list is scrolled', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);
    await scrollList(LIST, 150);

    await swipe('sheet-drag', 200);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
