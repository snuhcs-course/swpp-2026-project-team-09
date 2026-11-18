/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, type IconName, radius, shadow, size, space, text } from '@/design-system';

// The asks the agentic map answers best, each tried against the main server's Assistant (P02 ticket 36): a meal's
// Plan, the day's events, and a seat. Each with an icon in its layer's colour; the events take the Party's.
const EXAMPLES: readonly { words: string; icon: IconName; tint: string }[] = [
  { words: '배고파', icon: 'meal', tint: color.svcDining },
  { words: '오늘 볼 만한 거 있어?', icon: 'calendar', tint: color.party },
  { words: '공부할 자리', icon: 'book', tint: color.svcStudy },
];

// The frame's chip height.
const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

interface AskedExamplesProps {
  // From the stage's bottom.
  bottom: number;
  onSend: (words: string) => void;
}

// Above the bar while it has the keyboard and nothing is asked: the examples as the frame's chips, and where the
// conversation goes. A press sends the example.
export function AskedExamples({ bottom, onSend }: AskedExamplesProps): ReactElement {
  return (
    <View style={[styles.above, { bottom }]} testID="asked-examples">
      <View style={styles.chips}>
        {EXAMPLES.map(({ words, icon, tint }) => (
          <Pressable
            accessibilityLabel={words}
            accessibilityRole="button"
            hitSlop={HIT_SLOP}
            key={words}
            onPress={() => {
              onSend(words);
            }}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Icon color={tint} name={icon} size={16} />
            <Text numberOfLines={1} style={styles.label}>
              {words}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.noticeBox}>
        <Text style={styles.notice}>대화 내용은 AI 제공자에게 전송돼요</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  above: { position: 'absolute', right: space[4], left: space[4], gap: space[2], pointerEvents: 'box-none' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], pointerEvents: 'box-none' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pressed: { opacity: 0.6 },
  label: { ...text.label, color: color.ink },
  // A press on it reaches the scrim under the examples, which puts the keyboard down.
  noticeBox: { alignSelf: 'flex-start', pointerEvents: 'none' },
  // On a white ground, so that the map's labels and faces under it do not run into it.
  notice: {
    ...text.caption,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    color: color.inkMuted,
  },
});
