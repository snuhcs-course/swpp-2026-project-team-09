import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { cardStyles } from './card';
import { Icon, type IconName } from './icon';
import { color, space, text } from './tokens';

interface ActionConfirmProps {
  // A question, such as "파티에 참여할까요?".
  title: string;
  icon?: IconName;
  // The details of what will happen.
  rows: readonly { label: string; value: string }[];
  // A consequence, such as Location Sharing starting, in plain words.
  note?: string;
  noteTone?: 'info' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// What is about to happen, waiting for the User's approval. Outlined in the key colour, so that it reads as "needs
// your decision".
export function ActionConfirm({
  title,
  icon = 'check',
  rows,
  note,
  noteTone = 'info',
  confirmLabel = '확인',
  cancelLabel = '수정',
  onConfirm,
  onCancel,
}: ActionConfirmProps): ReactElement {
  const noteColor = noteTone === 'warning' ? color.warning : color.inkMuted;
  return (
    <View accessibilityLabel={title} style={[cardStyles.card, styles.confirm]}>
      <View style={styles.head}>
        <Icon color={color.snuBlue} name={icon} size={18} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.rows}>
        {rows.map(({ label, value }) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>
      {note === undefined ? null : (
        <View style={styles.note}>
          <Icon color={noteColor} name={noteTone === 'warning' ? 'alert' : 'info'} size={14} />
          <Text style={[styles.noteText, { color: noteColor }]}>{note}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button full onPress={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
        </View>
        <View style={styles.action}>
          <Button full onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </View>
      </View>
    </View>
  );
}

const ROW_LABEL_WIDTH = 64;

const styles = StyleSheet.create({
  confirm: { gap: space[3], borderColor: color.snuBlue },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  title: { ...text.label, flexShrink: 1, color: color.snuBlue },
  rows: { gap: space[2] },
  row: { flexDirection: 'row', gap: space[3] },
  rowLabel: { ...text.caption, width: ROW_LABEL_WIDTH, lineHeight: 22, color: color.inkMuted },
  rowValue: { ...text.body, flex: 1, color: color.ink },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[1],
  },
  noteText: { ...text.caption, flex: 1 },
  actions: { flexDirection: 'row', gap: space[2] },
  action: { flex: 1 },
});
