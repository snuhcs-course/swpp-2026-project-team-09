// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import { type ReactElement, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, Icon, radius, size, space, text } from '@/design-system';
import { FieldLabel } from './field-label';
import { admissionYears, type YearChoice, yearLabel } from './form';
import { Option, OptionList } from './option-list';
import { useRevealed } from './reveal';

const NO_CHOICE = '학번 선택';
const OTHER = '그 외';

function labelOf(choice: YearChoice): string {
  if (choice === null) {
    return NO_CHOICE;
  }
  return choice === 'other' ? OTHER : yearLabel(choice);
}

// The admission year: this year and the eleven before it, "그 외" for any other, and "학번 선택" for none. The list
// opens under the field, as the department's does; React Native has no list of the phone's own for it.
export function YearField({
  value,
  onChange,
}: {
  value: YearChoice;
  onChange: (year: YearChoice) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const { block, onLayout } = useRevealed(open);
  const choices: YearChoice[] = [null, ...admissionYears(), 'other'];
  return (
    <View onLayout={onLayout} ref={block} style={styles.field}>
      <FieldLabel>학번</FieldLabel>
      <Pressable
        accessibilityLabel="학번"
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        accessibilityValue={{ text: labelOf(value) }}
        onPress={() => {
          setOpen(!open);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.box, pressed && styles.pressed]}
      >
        <Text style={styles.words}>{labelOf(value)}</Text>
        <Icon color={color.inkMuted} name="chevronDown" size={18} />
      </Pressable>
      {open ? (
        <OptionList label="학번 목록">
          {choices.map((choice) => (
            <Option
              key={String(choice)}
              onPress={() => {
                onChange(choice);
                setOpen(false);
              }}
              selected={choice === value}
            >
              {labelOf(choice)}
            </Option>
          ))}
        </OptionList>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: size.touchMin,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  words: { ...text.bodyLg, color: color.ink },
});
