/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, color, font, Icon, radius, space, text } from '@/design-system';

// The room book card's choices: the room, the 사용 용도 and the nearest free starts as chips, and a media room's
// 서약서 with its "서약서 동의" box.

// The 서약서 and its "서약서 동의" box.
export function Pledge({
  words,
  agreed,
  onToggle,
}: {
  words: string;
  agreed: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <View style={styles.pledge}>
      <Text style={styles.pledgeWords}>{words}</Text>
      <Pressable
        accessibilityLabel="서약서 동의"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={onToggle}
        style={styles.agree}
      >
        <View style={[styles.check, agreed && styles.checked]}>
          {agreed ? <Icon color={color.onPrimary} name="check" size={14} /> : null}
        </View>
        <Text style={styles.agreeLabel}>서약서 동의</Text>
      </Pressable>
    </View>
  );
}

interface ChoicesProps<T extends string> {
  title: string;
  options: readonly T[];
  chosen: T | null;
  words?: (option: T) => string;
  onChoose: (option: T) => void;
}

export function Choices<T extends string>({
  title,
  options,
  chosen,
  words = String,
  onChoose,
}: ChoicesProps<T>): ReactElement {
  return (
    <View style={styles.choices}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option}
            onPress={() => {
              onChoose(option);
            }}
            selected={option === chosen}
            size="sm"
          >
            {words(option)}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const CHECK = 20;

const styles = StyleSheet.create({
  choices: { gap: space[1] },
  choiceTitle: { ...text.caption, color: color.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pledge: { gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.surface },
  pledgeWords: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: color.inkMuted },
  agree: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 36 },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHECK,
    height: CHECK,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  checked: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  agreeLabel: { ...text.label, color: color.ink },
});
