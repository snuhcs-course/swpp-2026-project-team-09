/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, space, text } from '@/design-system';

// A question the room asks before a step: its words, "취소", and the step's button, red for one that stops something.
export interface Ask {
  title: string;
  body: string;
  confirm: string;
  danger: boolean;
  onConfirm: () => void;
}

interface ConfirmSheetProps {
  ask: Ask | null;
  // The sheet's name: its scrim is read as "{label} 닫기".
  label: string;
  onClose: () => void;
}

// The frames' confirm sheets of the room: `활성화 확인` and `파티 나가기 확인`.
export function ConfirmSheet({ ask, label, onClose }: ConfirmSheetProps): ReactElement {
  return (
    <BottomSheet
      head={
        ask === null ? undefined : (
          <Text accessibilityRole="header" style={[styles.title, styles.head]}>
            {ask.title}
          </Text>
        )
      }
      label={label}
      onClose={onClose}
      open={ask !== null}
    >
      {ask === null ? null : (
        <View style={styles.body}>
          <Text style={styles.words}>{ask.body}</Text>
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button full onPress={onClose} size="lg" variant="secondary">
                취소
              </Button>
            </View>
            <View style={styles.button}>
              <Button
                full
                onPress={() => {
                  onClose();
                  ask.onConfirm();
                }}
                size="lg"
                variant={ask.danger ? 'destructive' : 'primary'}
              >
                {ask.confirm}
              </Button>
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space[5] },
  body: { gap: space[3], paddingHorizontal: space[5] },
  title: { ...text.title, color: color.ink },
  words: { ...text.body, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  button: { flex: 1 },
});
