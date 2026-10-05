import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, color, space, text } from '@/design-system';

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
          <Badge icon="check" tone="official">
            Google 계정에서 가져옴
          </Badge>
        </View>
      ) : null}
    </View>
  );
}

// The badge's height, so that the row stands still when the badge leaves.
const ROW_HEIGHT = 22;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: ROW_HEIGHT },
  label: { ...text.label, color: color.ink },
  star: { ...text.label, color: color.danger },
  badge: { marginLeft: 'auto' },
});
