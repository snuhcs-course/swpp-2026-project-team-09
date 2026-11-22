/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, text } from '@/design-system';
import type { Turn } from '@/features/assistant/turn';

// The words the User asked, over a turn. A turn of the app's own bubbles alone has none.
export function TurnQuestion({ turn }: { turn: Turn }): ReactElement | null {
  return turn.after[0]?.id === turn.id ? null : (
    <Text style={styles.asked} testID="turn-question">
      {turn.asked}
    </Text>
  );
}

const styles = StyleSheet.create({
  asked: { ...text.label, color: color.inkMuted },
});
