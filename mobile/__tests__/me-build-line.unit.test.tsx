/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { forgetAnswerSwitch, useAnswerSwitch } from '@/features/assistant/answer-switch';
import { ToastProvider } from '@/design-system/toast';
import { BuildLine } from '@/screens/me/build-line';
import { type Kept, keep, readKept } from '@/storage/kept';

// The long press on 내 정보's build line (P02 ticket 01, "The switch"), over a stand-in of what the phone keeps.

jest.mock('@/storage/kept', () => ({ readKept: jest.fn(), keep: jest.fn() }));

const unhandled = jest.fn();

// Another reader of the switch, as the main screen is.
function Reader(): ReactElement {
  return <Text testID="reader">{useAnswerSwitch() ? 'on' : 'off'}</Text>;
}

beforeEach(() => {
  forgetAnswerSwitch();
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the switch reads only this field of what is kept
  jest.mocked(readKept).mockResolvedValue({ answerOnMap: false } as Kept);
  jest.mocked(keep).mockRejectedValue(new Error('the phone could not be written'));
  process.on('unhandledRejection', unhandled);
});

afterEach(() => {
  process.off('unhandledRejection', unhandled);
  unhandled.mockReset();
});

// Partitions: a phone that cannot be written.
describe('the build line, when the phone cannot keep the switch', () => {
  it('still turns the switch on for this run of the app, and nothing is left unhandled', async () => {
    await render(
      <ToastProvider>
        <BuildLine />
        <Reader />
      </ToastProvider>,
    );

    await fireEvent(screen.getByText(/^앱 /u), 'longPress');
    await act(async () => {
      await new Promise<void>((settled) => {
        setImmediate(settled);
      });
    });

    expect(keep).toHaveBeenCalledWith({ answerOnMap: true });
    expect(screen.getByTestId('reader')).toHaveTextContent('on');
    expect(unhandled).not.toHaveBeenCalled();
  });
});
