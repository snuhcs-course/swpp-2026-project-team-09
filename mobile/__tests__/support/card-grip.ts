/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen } from '@testing-library/react-native';

// The answer card's grip (P04 ticket 52). Nothing on the card is pressed to raise or lower it: a finger drags its
// header, and a screen reader steps it up and down through the grip's actions, which these take.

type Found = ReturnType<typeof screen.getByTestId>;

export function grip(): Found {
  return screen.getByTestId('answer-card-handle');
}

// The small label under the grip, what a drag up brings, or null when there is none. Screen readers hear it as part of
// the grip's name, so it is hidden from them on its own.
export const HIDDEN = { includeHiddenElements: true } as const;

export function gripLabel(): string | null {
  const label = screen.queryByTestId('answer-grip-label', HIDDEN);
  return label === null ? null : labelWords(label);
}

function labelWords(label: Found): string {
  const words: string[] = [];
  const walk = (node: Found | string): void => {
    if (typeof node === 'string') {
      words.push(node);
      return;
    }
    node.children.forEach(walk);
  };
  walk(label);
  return words.join('');
}

async function step(actionName: 'increment' | 'decrement' | 'close'): Promise<void> {
  await fireEvent(grip(), 'accessibilityAction', { nativeEvent: { actionName } });
}

// One step up: lowered to raised, raised to full.
export async function raiseCard(): Promise<void> {
  await step('increment');
}

// One step down as back takes it: full to raised, a layer, then lowered.
export async function lowerCard(): Promise<void> {
  await step('decrement');
}
