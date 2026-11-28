/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChipRow, color } from '@/design-system';
import { BOARDS } from '@/features/party/boards';
import type { BoardFilter } from '@/features/party/finding';

const FILTERS: readonly { key: BoardFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  ...BOARDS.map(({ key, name }) => ({ key, label: name })),
];

// The chips fade into the tab's grey ground at the row's end, and scroll under the fade.
function EndFade(): ReactElement {
  // Unique on the page, and only letters, digits, `_` and `-`, as an SVG `url(#…)` needs.
  const id = `find-fade${useId().replaceAll(/[^\w-]/gu, '')}`;
  return (
    <Svg height="100%" pointerEvents="none" style={styles.fade} testID="find-filters-fade" width={FADE_WIDTH}>
      <Defs>
        <LinearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={color.surfaceSubtle} stopOpacity={0} />
          <Stop offset="1" stopColor={color.surfaceSubtle} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${id})`} height="100%" width={FADE_WIDTH} />
    </Svg>
  );
}

interface FindBarProps {
  board: BoardFilter;
  onBoard: (board: BoardFilter) => void;
}

// 찾기's row under the tabs, which stays put while the cards scroll: the board filters, drawn as 내 파티's without
// counts, fading at their end. The search is the app bar's (P06 ticket 52).
export function FindBar({ board, onBoard }: FindBarProps): ReactElement {
  return (
    <View>
      <ChipRow chips={FILTERS} onSelect={onBoard} selected={board} />
      <EndFade />
    </View>
  );
}

const FADE_WIDTH = 28;

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, right: 0, bottom: 0 },
});
