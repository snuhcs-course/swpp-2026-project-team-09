/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnswerOffer } from '@/api/refusal-types';
import { Button, space } from '@/design-system';
import { openScreen } from './refusal-reply';
import { EdgeView } from './row-edges';

// The answer's offers as buttons of equal width, each opening its screen: under an answer without a Plan, and under a
// Plan that is no meal's. A meal's Plan says them as hint lines instead (P04 ticket 86).
export function OfferButtons({ offers }: { offers: readonly AnswerOffer[] }): ReactElement | null {
  if (offers.length === 0) {
    return null;
  }
  return (
    <EdgeView style={styles.row} testID="offer-buttons">
      {offers.map(({ label, screen }) => (
        <View key={label} style={styles.cell}>
          <Button
            full
            onPress={() => {
              openScreen(screen);
            }}
            variant="secondary"
          >
            {label}
          </Button>
        </View>
      ))}
    </EdgeView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  cell: { flex: 1 },
});
