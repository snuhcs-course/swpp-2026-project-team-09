// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
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
}

// Nothing to show: faint words in the middle.
export function EmptyState({ words, icon }: EmptyStateProps): ReactElement {
  return (
    <View style={styles.state}>
      {icon === undefined ? null : <Icon color={color.inkFaint} name={icon} size={28} />}
      <Text style={styles.words}>{words}</Text>
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
