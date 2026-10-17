/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { ChatInput, color, Icon, IconButton, radius, shadow, space, text } from '@/design-system';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { ChatBubbles, ChatEmpty } from './chat-bubbles';
import { LISTS } from './layout';

interface ChatSheetProps {
  chat: Chat;
  // While the main screen is in front: Android's back button closes the sheet only then.
  inFront: boolean;
  onClose: () => void;
}

const CHAT_ICON = 36;

// The round chat icon, "SNU Now AI" and the close button.
function ChatHeader({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <View style={styles.header}>
      <View style={styles.icon}>
        <Icon color={color.onPrimary} name="chat" size={20} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        SNU Now AI
      </Text>
      <IconButton icon="x" label="닫기" onPress={onClose} />
    </View>
  );
}

// The chat with the Assistant, the `MainChat` frame: a translucent sheet over the map and what floats over it, which
// leaves the bottom tabs in view. The conversation is the main screen's, so that the sheet only shows it.
export function ChatSheet({ chat, inFront, onClose }: ChatSheetProps): ReactElement {
  useBackToClose(inFront, onClose);
  const { bubbles, waiting, send } = chat;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.sheet}
      testID="chat-sheet"
    >
      <ChatHeader onClose={onClose} />
      {bubbles.length === 0 && !waiting ? (
        <ChatEmpty onSend={send} />
      ) : (
        <ChatBubbles bubbles={bubbles} waiting={waiting} />
      )}
      <View style={styles.composer}>
        <ChatInput autoFocus disabled={waiting} onSend={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

// The chat's sheet, while it is open, and how to open it. The conversation is kept while the sheet is closed.
export function useChatSheet(inFront: boolean): { open: () => void; sheet: ReactElement | null } {
  const chat = useChat();
  const [shown, setShown] = useState(false);
  const open = useCallback((): void => {
    setShown(true);
  }, []);
  const close = useCallback((): void => {
    setShown(false);
  }, []);
  return { open, sheet: shown ? <ChatSheet chat={chat} inFront={inFront} onClose={close} /> : null };
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    // Under the phone's status bar: what floats over the map starts there.
    top: LISTS.clear,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surfaceGlass,
    boxShadow: shadow.float,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[2],
    paddingRight: space[2],
    paddingLeft: space[4],
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHAT_ICON,
    height: CHAT_ICON,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  title: { ...text.title, flex: 1, color: color.ink },
  composer: { padding: space[3] },
});
