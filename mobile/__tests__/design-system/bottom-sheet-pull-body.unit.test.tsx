/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { dragBody, laySheet } from '../support/sheet-swipe';

import { BottomSheet } from '@/design-system/bottom-sheet';
import { SheetScroll } from '@/design-system/sheet-scroll';
import { color } from '@/design-system/tokens';

// P06 ticket 53, the user's report on the 행사 tab's event sheet (2026-11-28): every sheet has a head closed by a thin
// rule under its handle, which drags the sheet as the handle does, and its body hands a pull down over to the sheet
// once its content's scroll is at the top, as the Assistant's answer card does. A body that does not scroll is pulled
// anywhere; a body of wheels takes no pull.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const LABEL = '행사';

async function renderSheet(onClose: () => void, pullBody?: boolean): Promise<void> {
  await render(
    <BottomSheet
      head={<Text accessibilityRole="header">기후·환경경제학 세미나</Text>}
      label={LABEL}
      onClose={onClose}
      open
      pullBody={pullBody}
    >
      <SheetScroll testID="sheet-content">
        <Text>설명</Text>
      </SheetScroll>
    </BottomSheet>,
  );
  await laySheet(LABEL, 400);
}

async function scrollTo(y: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId('sheet-content'), { nativeEvent: { contentOffset: { x: 0, y } } });
}

describe('the head', () => {
  it('stands under the handle, closed by a thin rule in the border colour', async () => {
    await renderSheet(jest.fn<void, []>());

    expect(screen.getByTestId('sheet-head')).toContainElement(
      screen.getByRole('header', { name: '기후·환경경제학 세미나' }),
    );
    expect(screen.getByTestId('sheet-rule')).toHaveStyle({
      height: StyleSheet.hairlineWidth,
      backgroundColor: color.border,
    });
  });
});

describe("the body's pull", () => {
  it('closes the sheet by a pull down while the content is at its top', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);

    await dragBody(150);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves the sheet while the content is scrolled, and takes it again once the content is back at its top', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);

    await scrollTo(200);
    await dragBody(150);
    expect(onClose).not.toHaveBeenCalled();

    await scrollTo(0);
    await dragBody(150);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open on a pull up', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);

    await dragBody(-150);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('is none on a sheet of wheels', async () => {
    await renderSheet(jest.fn<void, []>(), false);

    expect(() => getByGestureTestId('sheet-body-drag')).toThrow();
  });
});
