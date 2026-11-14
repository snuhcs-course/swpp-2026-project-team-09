/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { createContext, type ReactElement, type ReactNode, use, useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, space, text } from '@/design-system';
import { useSession } from '@/session/session';
import { keep, readKeptAfterChanges } from '@/storage/kept';
import { askPushPermission, pushPermission } from './device';
import { pushUsable, registerPush } from './push-registration';

type AskForPush = () => void;

function askNothing(): void {
  // Outside the host there is no sheet to show.
}

const AskForPushContext = createContext<AskForPush>(askNothing);

// Asks the host to show the push sheet, after an action of the design's moments went through.
export function useAskForPush(): AskForPush {
  return use(AskForPushContext);
}

// Whether the sheet may show: the permission undetermined and the sheet never shown on this phone. Granted without a
// prompt (Android 12 and below), the phone registers at once.
async function shouldShow(): Promise<boolean> {
  const permission = await pushPermission();
  if (permission === 'granted') {
    await registerPush();
    return false;
  }
  if (permission !== 'undetermined' || (await readKeptAfterChanges()).pushAsked) {
    return false;
  }
  await keep({ pushAsked: true });
  return true;
}

function PushSheet({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const allow = (): void => {
    onClose();
    void askPushPermission().then(async (permission) => {
      if (permission === 'granted') {
        await registerPush();
      }
    });
  };
  return (
    <BottomSheet label="푸시 알림" onClose={onClose} open={open}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          나설 시각을 휴대폰으로 알려 드릴까요?
        </Text>
        <Text style={styles.words}>나설 시각, 초대, 예약, 관심만 보내요.</Text>
        <View style={styles.buttons}>
          <Button full onPress={allow} size="lg">
            알림 받기
          </Button>
          <Button full onPress={onClose} size="lg" variant="secondary">
            나중에
          </Button>
        </View>
        <Text style={styles.footer}>나중에를 고르면 알림 목록에만 남아요.</Text>
      </View>
    </BottomSheet>
  );
}

// The one place the push sheet lives, inside the overlay host, so that it stays on screen when the screen that asked
// navigates away.
export function PushAskHost({ children }: { children: ReactNode }): ReactElement {
  const [open, setOpen] = useState(false);
  const ready = useSession().status === 'ready';
  const asking = useRef(false);
  const askForPush = useCallback((): void => {
    if (!pushUsable(ready) || asking.current) {
      return;
    }
    asking.current = true;
    void shouldShow()
      .then((show) => {
        if (show) {
          setOpen(true);
        }
      })
      .catch(() => null)
      .finally(() => {
        asking.current = false;
      });
  }, [ready]);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);
  return (
    <AskForPushContext value={askForPush}>
      {children}
      <PushSheet onClose={close} open={open} />
    </AskForPushContext>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  title: { ...text.title, color: color.ink },
  words: { ...text.body, color: color.inkMuted },
  buttons: { gap: space[2], marginTop: space[1] },
  footer: { ...text.caption, color: color.inkMuted, textAlign: 'center' },
});
