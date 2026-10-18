/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, color, font, Icon, space } from '@/design-system';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { ChatBubbles, ChatEmpty } from './chat-bubbles';
import { AI_INPUT } from './layout';

interface ChatSheetProps {
  chat: Chat;
  // While the main screen is in front: Android's back button closes the sheet only then.
  inFront: boolean;
  onClose: () => void;
  // The AI input's field, which lies over the sheet's bottom.
  inputHeight: number;
}

const HEADER = 56;
const CHAT_ICON = 32;
const CLOSE = 48;
// Between the last bubble and the AI input's top.
const OVER_INPUT = 32;

interface ChatHeaderProps {
  onReset: () => void;
  onClose: () => void;
}

// The round chat icon, "SNU Now AI", 새 대화 and the close button, under the phone's status bar.
function ChatHeader({ onReset, onClose }: ChatHeaderProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.header, { height: HEADER + top, paddingTop: top }]}>
      <View style={styles.icon}>
        <Icon color={color.onPrimary} name="chat" size={18} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        SNU Now AI
      </Text>
      <Button icon="plus" onPress={onReset} variant="ghost">
        새 대화
      </Button>
      <Pressable accessibilityLabel="대화 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
        <Icon color={color.ink} name="x" size={22} />
      </Pressable>
    </View>
  );
}

// The chat with the Assistant, the `MainChat` frame: a translucent sheet from the top of the screen to the
// navigation, over the map and the lists. The AI input stays at the bottom over it as the chat's input. The
// conversation is the main screen's, so that the sheet only shows it.
export function ChatSheet({ chat, inFront, onClose, inputHeight }: ChatSheetProps): ReactElement {
  const { top } = useSafeAreaInsets();
  useBackToClose(inFront, onClose);
  const { bubbles, waiting, send, retry, reset } = chat;
  // From the sheet's bottom to the AI input's top, and the room above it.
  const under = AI_INPUT.bottom + inputHeight + 2 * space[1] + OVER_INPUT;
  return (
    <View style={[styles.sheet, { top: -top }]} testID="chat-sheet">
      <ChatHeader onClose={onClose} onReset={reset} />
      {bubbles.length === 0 && !waiting ? (
        <ChatEmpty onSend={send} under={under} />
      ) : (
        <ChatBubbles bubbles={bubbles} onRetry={retry} under={under} waiting={waiting} />
      )}
    </View>
  );
}

export interface ChatSheetControl {
  chat: Chat;
  shown: boolean;
  open: () => void;
  // The sheet while it is open, for an AI input of that height.
  sheet: (inputHeight: number) => ReactElement | null;
}

// The chat's sheet and how to open it. The conversation is kept while the sheet is closed.
export function useChatSheet(inFront: boolean): ChatSheetControl {
  const chat = useChat();
  const [shown, setShown] = useState(false);
  const open = useCallback((): void => {
    setShown(true);
  }, []);
  const close = useCallback((): void => {
    setShown(false);
  }, []);
  return {
    chat,
    shown,
    open,
    sheet: (inputHeight) =>
      shown ? <ChatSheet chat={chat} inFront={inFront} inputHeight={inputHeight} onClose={close} /> : null,
  };
}

const styles = StyleSheet.create({
  // What floats over the map starts under the status bar, so the sheet's `top` goes up by its height.
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    backgroundColor: color.surfaceGlass,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingRight: space[2], paddingLeft: space[5] },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHAT_ICON,
    height: CHAT_ICON,
    borderRadius: CHAT_ICON / 2,
    backgroundColor: color.snuBlue,
  },
  title: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  close: { alignItems: 'center', justifyContent: 'center', width: CLOSE, height: CLOSE },
});
