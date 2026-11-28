/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactElement, useState } from 'react';

import { Overlay, OverlayHost } from '@/design-system/overlay';
import { TextEntry } from '@/design-system/text-entry';

// The friend panel's search typed Hangul as loose letters, 'ㅋㅓㅁ' (reported on 2026-11-28), while 행사's and 파티's
// did not: the panel is drawn in the `OverlayHost`, which gets the owner's new `value` one commit late. React Native's
// TextInput re-renders in between with the old value and sends it to the native field, which drops the keyboard's
// composing. Jest's preset mocks TextInput, so this file runs React Native's own TextInput and watches the commands it
// sends to the native field.

jest.unmock('react-native/Libraries/Components/TextInput/TextInput');

interface Commands {
  setTextAndSelection: (...args: unknown[]) => void;
}
const { Commands: NATIVE } = jest.requireActual<{ Commands: Commands }>(
  'react-native/Libraries/Components/TextInput/RCTSingelineTextInputNativeComponent',
);

let sent: unknown[][] = [];

beforeEach(() => {
  sent = [];
  jest.spyOn(NATIVE, 'setTextAndSelection').mockImplementation((...args: unknown[]) => {
    sent.push(args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// The text the native field was told to show, each time.
function textsSent(): unknown[] {
  return sent.map((args) => args[2]);
}

// A search whose words are held outside the overlay, as the friend panel holds them.
function Owner({ most }: { most?: number }): ReactElement {
  const [words, setWords] = useState('');
  return (
    <Overlay>
      <TextEntry accessibilityLabel="친구 검색" most={most} onChangeText={setWords} value={words} />
    </Overlay>
  );
}

async function type(text: string, eventCount: number): Promise<void> {
  await fireEvent(screen.getByLabelText('친구 검색'), 'change', { nativeEvent: { text, eventCount, target: 1 } });
}

describe('TextEntry in an overlay', () => {
  it('never sends the native field the words from before a keystroke, so the keyboard keeps composing', async () => {
    await render(
      <OverlayHost>
        <Owner />
      </OverlayHost>,
    );

    await type('ㅋ', 1);
    await type('커', 2);
    await type('컴', 3);

    expect(textsSent()).toEqual([]);
    expect(screen.getByLabelText('친구 검색').props.value).toBe('컴');
  });

  it('drops what goes beyond `most`, in the field as in what its owner gets', async () => {
    await render(
      <OverlayHost>
        <Owner most={2} />
      </OverlayHost>,
    );

    await type('가나', 1);
    await type('가나다', 2);

    expect(screen.getByLabelText('친구 검색').props.value).toBe('가나');
    expect(textsSent()).toEqual(['가나']);
  });
});
