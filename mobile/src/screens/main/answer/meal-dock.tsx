/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { ChatSheetControl } from '../chat-sheet';
import { markdownLabel } from '../chat-markdown';
import { DockLine } from './dock-chips';
import type { Raise } from './docked-answer';

// The Assistant's words in one paragraph: the pick with its dish and walking, and the nearest good alternative.
export function mealSentenceOf(words: string): string {
  return markdownLabel(words).replaceAll(/\s+/gu, ' ').trim();
}

// A meal answer's dock (board E1): the Assistant's sentence in at most two lines, which raises the card to the list.
// The input and the main button, which acts on the chosen place, stand under it; the kinds are in the list. A docked
// card shows no menu: the next raise opens the list.
export function MealDock({
  control,
  bubble,
  onRaise,
}: {
  control: ChatSheetControl;
  bubble: ChatBubble;
  onRaise: Raise;
}): ReactElement | null {
  const { menuFor, closeMenu } = control.answer;
  useEffect(() => {
    if (menuFor !== null) {
      closeMenu();
    }
  }, [menuFor, closeMenu]);
  const sentence = mealSentenceOf(bubble.text);
  return sentence === '' ? null : (
    <View style={styles.row} testID="dock-row">
      <DockLine
        line={[{ text: sentence, strong: false }]}
        onPress={() => {
          onRaise(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
