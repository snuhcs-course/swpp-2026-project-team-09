import type { ReactElement } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { color, font, radius, shadow, space, text } from './tokens';

interface DialogProps {
  visible: boolean;
  // A question, such as "내 위치를 지도에 표시할까요?", or a statement the User acknowledges.
  title: string;
  // What an answer leads to, in plain words.
  body?: string;
  // The answer that goes on. It is the one fill: in the key colour, or in red for `danger`.
  confirmLabel: string;
  // `danger` for an answer that cannot be taken back, such as "로그아웃".
  tone?: 'primary' | 'danger';
  // The answer that leaves things as they are. Without it the dialog has one button.
  cancelLabel?: string;
  onConfirm?: () => void;
  // Also Android's back button.
  onCancel?: () => void;
}

// A question with two answers, or a statement with one, over the screen and a scrim. The design system has no
// dialog; this one is built from its card, its text styles and its Buttons.
export function Dialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: DialogProps): ReactElement {
  const reduceMotion = useReduceMotion();
  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.scrim}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {body === undefined ? null : <Text style={styles.body}>{body}</Text>}
          <View style={styles.actions}>
            {cancelLabel === undefined ? null : (
              <View style={styles.action}>
                <Button full onPress={onCancel} variant="secondary">
                  {cancelLabel}
                </Button>
              </View>
            )}
            <View style={styles.action}>
              <Button full onPress={onConfirm} variant={tone === 'danger' ? 'destructive' : 'primary'}>
                {confirmLabel}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const MAX_WIDTH = 360;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
    backgroundColor: color.scrim,
  },
  card: {
    alignSelf: 'stretch',
    gap: space[3],
    maxWidth: MAX_WIDTH,
    padding: space[5],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  title: { ...text.title, fontFamily: font.bold, color: color.ink },
  body: { ...text.body, color: color.inkMuted },
  actions: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  action: { flex: 1 },
});
