/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { holdSwipe, laySheet, scrollList, swipe } from '../support/sheet-swipe';

import { BottomSheet } from '@/design-system/bottom-sheet';
import { Button } from '@/design-system/button';
import { FLICK, PAN_STARTS } from '@/design-system/sheet-pull';
import { SheetScrollView } from '@/design-system/sheet-scroll-view';

// A swipe down from anywhere on a sheet closes it (P06 ticket 35): past a quarter of its height but never more than
// 120 points, or on a flick; a shorter one springs back. A swipe that starts in a list closes only when the list was at
// its top where the finger landed, decided for the whole swipe.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const LABEL = '파티 찾기';
const LIST = 'sheet-list';

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

// Partitions: a sheet 400 tall, where a quarter, 100, is the most a let-go asks, and one 800 tall, where 120 is; a
// slow let-go short of it, past it, and a flick short of it.
describe('a swipe down on the sheet', () => {
  it('closes it once past a quarter of a sheet 400 tall, and not short of it', async () => {
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

  it('closes it on a flick down, however short', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 800);

    await swipe('sheet-drag', 30, FLICK * 2);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('never closes it by a swipe up, flicked or not', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);
    await laySheet(LABEL, 400);

    await swipe('sheet-drag', -200, -FLICK * 2);

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
    await held.letGo(300, FLICK * 2);
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
    await held.letGo(200, FLICK * 2);

    expect(onClose).not.toHaveBeenCalled();
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
