/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TravelBox } from '@/api/assistant-types';
import { color, font, Icon, type IconName, radius, space } from '@/design-system';

const SEPARATOR = ' · ';

const MODE_WORDS = { walk: '도보', shuttle: '셔틀' } as const;

function Row({ icon, words, muted = false }: { icon: IconName; words: string; muted?: boolean }): ReactElement {
  const ink = muted ? color.inkMuted : color.snuBlue;
  return (
    <View style={styles.row}>
      <Icon color={ink} name={icon} size={14} />
      <Text style={[styles.words, muted && styles.muted]}>{words}</Text>
    </View>
  );
}

// The way there and to what comes next, on one line.
function wayWords({ travel, next }: TravelBox): string {
  return [
    ...(travel === undefined ? [] : [`가는 길 ${MODE_WORDS[travel.mode]} ${travel.minutes}분`]),
    ...(next === undefined ? [] : [`${next.isClass ? '다음 수업' : '다음 일정'}까지 ${next.minutes}분`]),
  ].join(SEPARATOR);
}

// When to leave a candidate with no end, or a long one.
function leavingWords({ leaveBy, endUnknown }: TravelBox): string {
  return [...(endUnknown === true ? ['끝 시간이 없어요'] : []), `${leaveBy}엔 나서야 해요`].join(SEPARATOR);
}

// The 이동 시간 box of a card of a 공강 파티 answer: a part shows only when its field is there, and a card with none has
// no box.
export function ChatTravelBox({ box }: { box: TravelBox }): ReactElement | null {
  const way = wayWords(box);
  if (way === '' && box.leaveBy === undefined) {
    return null;
  }
  return (
    <View accessibilityLabel="이동 시간" style={styles.box}>
      {way === '' ? null : <Row icon={box.travel?.mode === 'shuttle' ? 'bus' : 'route'} words={way} />}
      {box.leaveBy === undefined ? null : <Row icon="clock" muted words={leavingWords(box)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 2,
    paddingVertical: space[2],
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: color.blue50,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  words: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.snuBlue },
  muted: { fontFamily: font.medium, color: color.inkMuted },
});
