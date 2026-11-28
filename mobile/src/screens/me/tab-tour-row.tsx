/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { color, Icon, ListRow, RowCard } from '@/design-system';
import { useTabTour } from '@/features/tab-tour/use-tab-tour';

// "탭 안내 다시 보기": the tour of the bottom tabs from its first step, whether or not it was seen (HE H7).
export function TabTourRow(): ReactElement {
  const { replay } = useTabTour();
  return (
    <RowCard>
      <ListRow
        leading={<Icon color={color.inkMuted} name="info" size={20} />}
        onPress={replay}
        title="탭 안내 다시 보기"
        trailing={<Icon color={color.inkMuted} name="chevronRight" size={16} />}
      />
    </RowCard>
  );
}
