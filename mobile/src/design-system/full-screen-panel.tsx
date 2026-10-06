import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useInsets } from './insets';
import { AppBar } from './app-bar';
import { color, space } from './tokens';

interface FullScreenPanelProps {
  title: string;
  count?: number;
  // "뒤로" for a screen pushed from the right, "닫기" for one that came up from the bottom.
  leave: { kind: 'back' | 'close'; onPress: () => void };
  actions?: ReactNode;
  // What stays under the app bar while the body scrolls, such as a row of chips.
  under?: ReactNode;
  // What stays at the bottom, such as the one 52 primary button of a form.
  footer?: ReactNode;
  // A grey ground under the app bar, for a body of cards, as 프로필 편집 and 알림 have.
  subtle?: boolean;
  children: ReactNode;
}

// A screen above the tabs, as the frames draw one: white, an app bar with a way out, a body that scrolls and an
// optional footer, inside the phone's safe area. The stack slides it in (`app/(signed-in)/_layout.tsx`).
export function FullScreenPanel({
  title,
  count,
  leave,
  actions,
  under,
  footer,
  subtle = false,
  children,
}: FullScreenPanelProps): ReactElement {
  const { bottom } = useInsets();
  return (
    <View style={styles.screen}>
      <AppBar actions={actions} count={count} leave={leave} line={false} title={title} />
      {under}
      <ScrollView
        contentContainerStyle={footer === undefined ? { paddingBottom: bottom } : undefined}
        keyboardShouldPersistTaps="handled"
        style={[styles.body, subtle && styles.subtle]}
      >
        {children}
      </ScrollView>
      {footer === undefined ? null : (
        <View style={[styles.footer, { paddingBottom: space[4] + bottom }]}>{footer}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  body: { flex: 1 },
  subtle: { backgroundColor: color.surfaceSubtle, borderTopWidth: 1, borderTopColor: color.border },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
  },
});
