/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import { kindShown } from '@/features/assistant/meal-kinds';
import { mealPickWords } from '@/features/assistant/meal-pick';
import { modelWordsOf } from '@/features/assistant/model-words';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from '../chat-sheet';
import { markdownLabel } from '../chat-markdown';
import { DockLine } from './dock-chips';
import type { Raise } from './docked-answer';

// The Assistant's words in one paragraph: the pick with its dish and walking, and the nearest good alternative.
export function mealSentenceOf(words: string): string {
  return markdownLabel(words).replaceAll(/\s+/gu, ' ').trim();
}

// The dock's line: the Assistant's sentence while it is about the place on screen, its first pick of the answer it
// came with; once another place is chosen, or the answer recalculated, or without the model's words, the chosen
// place's own line ("302동식당 · 11:30 · 걸음 2분 · 순살안동식찜닭 외 2 · 5,000원부터"). Never empty, so that the card
// can always be raised.
export function mealDockLine(
  text: string,
  { answer, source, index, plan }: Pick<ShownAnswer, 'answer' | 'source' | 'index' | 'plan'>,
): string {
  const sentence = mealSentenceOf(modelWordsOf(text));
  if (sentence !== '' && answer === source && index === 0) {
    return sentence;
  }
  if (plan !== null) {
    return mealPickWords(plan, plan.place.label, kindShown(answer)).name;
  }
  return sentence === '' ? `${String(answer?.plans.length ?? 0)}곳 목록 보기` : sentence;
}

// A meal answer's dock (board E1): its line (`mealDockLine`) in at most two lines, which raises the card to the list.
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
}): ReactElement {
  const { menuFor, closeMenu } = control.answer;
  useEffect(() => {
    if (menuFor !== null) {
      closeMenu();
    }
  }, [menuFor, closeMenu]);
  const sentence = mealDockLine(bubble.text, control.answer);
  return (
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
