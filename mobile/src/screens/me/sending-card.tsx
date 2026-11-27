/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { cardStyles, color } from '@/design-system';
import { ErrorReportsRow } from './error-reports-row';
import { UsageRow } from './usage-row';

// What the app sends about its use, in one card: "오류 보고 보내기", the phone's choice, and "사용 기록 보내기", the
// account's (P08 tickets 03 and 11), split by the cards' divider.
export function SendingCard(): ReactElement {
  return (
    <View style={[cardStyles.card, styles.card]}>
      <ErrorReportsRow />
      <View style={styles.divider} />
      <UsageRow />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0 },
  divider: { height: 1, backgroundColor: color.border },
});
