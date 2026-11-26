/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RelaxOffer } from '@/api/relax-types';
import { Button, space } from '@/design-system';

interface RelaxButtonsProps {
  relax: readonly RelaxOffer[];
  busy: boolean;
  onRelax: (offer: RelaxOffer) => void;
  // "되돌리기" of an answer with no Plan that a drag brought, null for none.
  undo: (() => void) | null;
}

// The buttons of an answer that nothing fits 지금 (board n11), each easing one condition, in cells of equal width. After
// a drag that brought no Plan, "되돌리기" comes first in the row: no band is left to drag back (P04 ticket 86).
export function RelaxButtons({ relax, busy, onRelax, undo }: RelaxButtonsProps): ReactElement | null {
  if (relax.length === 0 && undo === null) {
    return null;
  }
  return (
    <View style={styles.row} testID="relax-buttons">
      {undo === null ? null : (
        <View style={styles.cell}>
          <Button disabled={busy} full onPress={undo} variant="secondary">
            되돌리기
          </Button>
        </View>
      )}
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
