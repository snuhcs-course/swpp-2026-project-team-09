/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, screen } from '@testing-library/react-native';
import { DeviceEventEmitter, Keyboard } from 'react-native';

// The phone's keyboard in the tests. Their phone is an iOS one, which tells of the keyboard before it moves and
// counts its height from the bottom of the screen, and has no bar of its own: the navigation is 64 and 16 under it.
export const KEYBOARD = 336;
// How much higher the AI input stands over that keyboard: its height less the navigation's 80.
export const LIFT = KEYBOARD - 80;

const SCREEN_HEIGHT = 844;

function tell(event: 'keyboardWillShow' | 'keyboardWillHide', height: number): void {
  DeviceEventEmitter.emit(event, {
    duration: 250,
    easing: 'keyboard',
    endCoordinates: { screenX: 0, screenY: SCREEN_HEIGHT - height, width: 390, height },
  });
}

export async function showKeyboard(height: number): Promise<void> {
  await act(() => {
    tell('keyboardWillShow', height);
  });
}

export async function hideKeyboard(): Promise<void> {
  await act(() => {
    tell('keyboardWillHide', 0);
  });
}

// `Keyboard.dismiss`, watched: the tests' phone has no keyboard to put down.
export function quietDismiss(): jest.SpyInstance {
  return jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {
    // Nothing is up.
  });
}

// That the chat's content ends `under` from the sheet's bottom: the room it keeps clear of the AI input.
export function expectContentUnder(testID: 'chat-empty' | 'chat-bubbles', under: number): void {
  expect(screen.getByTestId(testID).props.contentContainerStyle).toEqual(
    expect.arrayContaining([{ paddingBottom: under }]),
  );
}
