/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, type ReactNode, type Ref, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useRevealFocused } from '@/hooks/use-reveal-focused';
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
  // The footer gives its place to the body while the keyboard is up, for a footer nobody needs while typing, as the
  // room's 나가기 under its chat. Otherwise it stands right above the keyboard, as a form's button does.
  footerHidesForKeyboard?: boolean;
  // A grey ground under the app bar, for a body of cards, as 프로필 편집 and 알림 have.
  subtle?: boolean;
  // The body, for a screen that scrolls it to a part.
  scrollRef?: Ref<ScrollView>;
  children: ReactNode;
}

// The panel's own hold on its body, and the screen's, if it gave one.
function useBothRefs(given: Ref<ScrollView> | undefined): {
  own: { current: ScrollView | null };
  set: (node: ScrollView | null) => void;
} {
  const own = useRef<ScrollView>(null);
  const set = (node: ScrollView | null): void => {
    own.current = node;
    if (typeof given === 'function') {
      given(node);
    } else if (given !== undefined && given !== null) {
      given.current = node;
    }
  };
  return { own, set };
}

// A screen above the tabs, as the frames draw one: white, an app bar with a way out, a body that scrolls and an
// optional footer, inside the phone's safe area. The stack slides it in (`app/(signed-in)/_layout.tsx`). While the
// phone's keyboard is up the panel ends at its top, so that the footer stands right above it and the body, shorter,
// scrolls the field being typed in into view; Android draws the app under the keyboard and moves nothing itself.
export function FullScreenPanel({
  title,
  count,
  leave,
  actions,
  under,
  footer,
  footerHidesForKeyboard = false,
  subtle = false,
  scrollRef,
  children,
}: FullScreenPanelProps): ReactElement {
  const insets = useInsets();
  const keyboard = useKeyboardHeight(insets.bottom);
  const scroll = useBothRefs(scrollRef);
  const reveal = useRevealFocused(scroll.own, keyboard > 0);
  // The keyboard covers the phone's own bar.
  const bottom = keyboard > 0 ? 0 : insets.bottom;
  const shown = footer !== undefined && !(footerHidesForKeyboard && keyboard > 0);
  return (
    <View style={[styles.screen, { paddingBottom: keyboard }]} testID="full-screen-panel">
      <AppBar actions={actions} count={count} leave={leave} line={false} title={title} />
      {under}
      <ScrollView
        contentContainerStyle={shown ? undefined : { paddingBottom: bottom }}
        ref={scroll.set}
        {...reveal.scrollProps}
        style={[styles.body, subtle && styles.subtle]}
      >
        <View ref={reveal.content}>{children}</View>
      </ScrollView>
      {shown ? <View style={[styles.footer, { paddingBottom: space[4] + bottom }]}>{footer}</View> : null}
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
