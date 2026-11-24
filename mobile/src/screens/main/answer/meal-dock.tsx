/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
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
import { withFriendsOf } from './meal-list';

// The Assistant's words in one paragraph: the pick with its dish and walking, and the nearest good alternative.
export function mealSentenceOf(words: string): string {
  return markdownLabel(words).replaceAll(/\s+/gu, ' ').trim();
}

// The dock's line: the Assistant's sentence while it is about the place on screen, its first pick of the answer it
// came with; when only one place is left of many, that it alone fits ("김태현과 시간이 맞는 곳은 302동식당뿐이에요 ·
// 11:30 · 걸음 2분"); once another place is chosen, or the answer recalculated, or without the model's words, the chosen
// place's own line ("302동식당 · 11:30 · 걸음 2분 · 순살안동식찜닭 외 2 · 5,000원부터"). Never empty.
export function mealDockLine(
  text: string,
  { answer, source, index, plan }: Pick<ShownAnswer, 'answer' | 'source' | 'index' | 'plan'>,
): string {
  const sentence = mealSentenceOf(modelWordsOf(text));
  if (sentence !== '' && answer === source && index === 0) {
    return sentence;
  }
  if (plan !== null && answer !== null && answer.plans.length === 1 && answer.dropped.length > 0) {
    const { note } = mealPickWords(plan, plan.place.label, kindShown(answer));
    const who = withFriendsOf(answer);
    const only = who === null ? '시간이 맞는 곳은' : `${who} 시간이 맞는 곳은`;
    return `${only} ${plan.place.label}뿐이에요 · ${note}`;
  }
  if (plan !== null) {
    return mealPickWords(plan, plan.place.label, kindShown(answer)).name;
  }
  return sentence === '' ? `${String(answer?.plans.length ?? 0)}곳 목록 보기` : sentence;
}

// A meal answer's dock (board E1): its line (`mealDockLine`) in at most two lines, with no "›": the caption's "올리면 N곳
// 목록" raises the card, and while the line is cut, so does a press on it ("더 보기"), to the whole words. The input and the main button, which acts on the chosen place, stand under it; the kinds are in the list. A docked
// card shows no menu: the next raise opens the list.
export function MealDock({
  control,
  bubble,
  onRaise,
  atRest,
}: {
  control: ChatSheetControl;
  bubble: ChatBubble;
  onRaise: Raise;
  // Raised, the dock lies under the open card, whose menu stays (P04 ticket 57).
  atRest: boolean;
}): ReactElement {
  const { menuFor, closeMenu } = control.answer;
  useEffect(() => {
    if (atRest && menuFor !== null) {
      closeMenu();
    }
  }, [atRest, menuFor, closeMenu]);
  const sentence = mealDockLine(bubble.text, control.answer);
  return (
    <View style={styles.row} testID="dock-row">
      <DockLine
        line={[{ text: sentence, strong: false }]}
        onMore={() => {
          onRaise(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
