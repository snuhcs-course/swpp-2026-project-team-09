/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RelaxOffer } from '@/api/relax-types';
import { Button, space } from '@/design-system';

interface RelaxButtonsProps {
  relax: readonly RelaxOffer[];
  busy: boolean;
  onRelax: (offer: RelaxOffer) => void;
}

// The buttons of an answer that nothing fits 지금 (board n11), each easing one condition, in cells of equal width.
export function RelaxButtons({ relax, busy, onRelax }: RelaxButtonsProps): ReactElement | null {
  if (relax.length === 0) {
    return null;
  }
  return (
    <View style={styles.row} testID="relax-buttons">
      {relax.map((offer) => (
        <View key={offer.label} style={styles.cell}>
          <Button
            disabled={busy}
            full
            onPress={() => {
              onRelax(offer);
            }}
            variant="secondary"
          >
            {offer.label}
          </Button>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2] },
  cell: { flex: 1 },
});
