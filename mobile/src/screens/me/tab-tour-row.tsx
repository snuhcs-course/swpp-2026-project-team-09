/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { cardStyles, color, Icon, ListRow, space } from '@/design-system';
import { useTabTour } from '@/features/tab-tour/use-tab-tour';

// "탭 안내 다시 보기": the tour of the bottom tabs from its first step, whether or not it was seen (HE H7).
export function TabTourRow(): ReactElement {
  const { replay } = useTabTour();
  return (
    <View style={[cardStyles.card, styles.card]}>
      <ListRow
        last
        leading={<Icon color={color.inkMuted} name="info" size={20} />}
        onPress={replay}
        title="탭 안내 다시 보기"
        trailing={<Icon color={color.inkMuted} name="chevronRight" size={16} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[1] },
});
