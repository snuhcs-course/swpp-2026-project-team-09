/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { ANSWER_PILL, listsTop } from '../layout';
import { CloseButton } from './close-button';

// What the User asked, on one line, with its icon and ✕, which forgets the conversation.
export function AnswerPill({
  asked,
  icon,
  onClose,
}: {
  asked: string;
  icon: 'chat' | 'user';
  onClose: () => void;
}): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.pillRow, { top: listsTop(top) }]}>
      <View style={styles.pill} testID="answer-pill">
        <Icon color={color.ink} name={icon} size={20} testID={`answer-pill-${icon}`} />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.asked}>
          {asked}
        </Text>
        <CloseButton label="답 닫기" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    position: 'absolute',
    right: ANSWER_PILL.side,
    left: ANSWER_PILL.side,
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
    height: ANSWER_PILL.height,
    paddingLeft: space[4],
    paddingRight: space[1],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  asked: { ...text.label, flexShrink: 1, color: color.ink },
});
