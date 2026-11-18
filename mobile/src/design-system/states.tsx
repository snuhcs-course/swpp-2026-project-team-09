/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { color, font, space } from './tokens';

// The states of a list or a screen whose data is not there: the same everywhere.

interface EmptyStateProps {
  // The caller's words: "결과 없음", "퀘스트가 없어요", "준비 중이에요".
  words: string;
  icon?: IconName;
  // One first thing to do, under the words, for an empty screen that says what it is for (HE H7).
  action?: { label: string; onPress: () => void };
}

// Nothing to show: faint words in the middle, and the first thing to do under them when the caller gives one.
export function EmptyState({ words, icon, action }: EmptyStateProps): ReactElement {
  return (
    <View style={styles.state}>
      {icon === undefined ? null : <Icon color={color.inkFaint} name={icon} size={28} />}
      <Text style={styles.words}>{words}</Text>
      {action === undefined ? null : (
        <Button onPress={action.onPress} variant="secondary">
          {action.label}
        </Button>
      )}
    </View>
  );
}

// The data is on its way.
export function LoadingState(): ReactElement {
  return (
    <View style={styles.state}>
      <ActivityIndicator accessibilityLabel="불러오는 중" color={color.snuBlue} />
    </View>
  );
}

// The data did not come: the loading screen's words, and a way to ask again.
export function ErrorState({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <View style={styles.state}>
      <Text style={styles.failed}>불러오지 못했어요</Text>
      <Button onPress={onRetry} variant="secondary">
        다시 시도
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', justifyContent: 'center', gap: space[3], paddingVertical: space[10] },
  words: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, textAlign: 'center', color: color.inkFaint },
  failed: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, textAlign: 'center', color: color.inkMuted },
});
