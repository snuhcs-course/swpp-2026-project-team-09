// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, space, text } from '@/design-system';

interface FieldLabelProps {
  children: string;
  // Marks a field that has to be filled in before saving.
  required?: boolean;
  // The field still holds what the sign-in suggested.
  suggested?: boolean;
}

// The words above a field. A screen reader reads the field's own label, which says the same.
export function FieldLabel({ children, required = false, suggested = false }: FieldLabelProps): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {required ? (
        <Text accessibilityElementsHidden aria-hidden importantForAccessibility="no" style={styles.star}>
          *
        </Text>
      ) : null}
      {suggested ? (
        <View style={styles.badge}>
          <Icon color={color.blue600} name="check" size={11} />
          <Text style={styles.badgeWords}>Google 계정에서 가져옴</Text>
        </View>
      ) : null}
    </View>
  );
}

// The badge's height, so that the row stands still when the badge leaves.
const ROW_HEIGHT = 20;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: ROW_HEIGHT },
  label: { ...text.label, color: color.ink },
  star: { ...text.label, color: color.danger },
  // The frame's badge: pale blue and round, where the design system's Badge is navy on a square ground.
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: ROW_HEIGHT,
    marginLeft: 'auto',
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    backgroundColor: color.blue50,
  },
  badgeWords: { ...text.micro, color: color.blue600 },
});
