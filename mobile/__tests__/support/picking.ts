/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { screen } from './app';

// People picked in the time card (P04 ticket 64): "＋ 같이" opens the card with a row and a check for each Friend, no
// bars and no row for 나, and its head reads "취소" and "완료".

type Found = ReturnType<typeof screen.getByRole>;

// What a screen reader says for each Friend's row, in order: the name, then the walk or "위치 모름".
export function pickRows(): string[] {
  return within(screen.getByTestId('time-card-rows'))
    .queryAllByRole('checkbox')
    .map((row): unknown => row.props.accessibilityLabel)
    .filter((name): name is string => typeof name === 'string');
}

// The checked ones of `pickRows`.
export function checkedRows(): string[] {
  return within(screen.getByTestId('time-card-rows'))
    .queryAllByRole('checkbox', { checked: true })
    .map((row): unknown => row.props.accessibilityLabel)
    .filter((name): name is string => typeof name === 'string');
}

// The row of the Friend named `name`, whatever its state says.
export function pickRow(name: string): Found {
  return within(screen.getByTestId('time-card-rows')).getByRole('checkbox', { name: new RegExp(`^${name} · `, 'u') });
}

// The head's button that ends picking: "완료", "완료 · 2명", or "닫기".
export function pickDone(): Found {
  return screen.getByTestId('time-card-pick-done');
}

export function pickCancel(): Found {
  return screen.getByTestId('time-card-pick-cancel');
}
