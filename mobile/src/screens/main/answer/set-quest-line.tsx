/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';
import { restOf } from './answer-rest';
import { mealCard } from './meal-list';

// A Plan beside a Quest the User holds (P04 tickets 17 and 20): its line first in the sheet, the reply's words or how
// 바꾸기 or 그대로 두기 went, as the dock said before P04 ticket 61 took the dock away. A meal's card says the reply's
// words itself (`MealWords`), so for a meal only how it went stands here.
export function SetQuestLine({ control }: { control: ChatSheetControl }): ReactElement | null {
  const rest = restOf(control, turnOf(control.chat.bubbles)?.after ?? []);
  if (rest?.kind !== 'words' || rest.words.keep === undefined || rest.words.line === null) {
    return null;
  }
  const { answer } = control.answer;
  if (rest.words.keep && answer !== null && mealCard(answer)) {
    return null;
  }
  return (
    <Text style={styles.line} testID="set-quest-line">
      {rest.words.line.map(({ text: words }) => words).join('')}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { ...text.bodyLg, color: color.ink },
});
