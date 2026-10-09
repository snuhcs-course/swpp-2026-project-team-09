// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { type ReactElement, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, font, Icon, radius, size, space, text } from '@/design-system';
import { DAY_NAMES, hourOf, minuteOf, withHour, withMinute } from '@/features/timetable/class-form';
import { Option, OptionList } from '../onboarding/option-list';

const SATURDAY = 5;
const SUNDAY = 6;
const HOURS = ['', ...Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))];
const MINUTES = ['', ...Array.from({ length: 12 }, (_, step) => String(step * 5).padStart(2, '0'))];
// The frame's outline of the warning box, between the Quest colour's ground and its ink.
const WARNING_LINE = '#E8C877';
const WARNING_INK = '#5C3B00';

function FieldName({ children }: { children: string }): ReactElement {
  return <Text style={styles.fieldName}>{children}</Text>;
}

// `월` … `일`, Saturday in blue and Sunday in red while off.
export function DayToggles({
  days,
  onChange,
}: {
  days: readonly number[];
  onChange: (days: number[]) => void;
}): ReactElement {
  return (
    <View style={styles.field}>
      <FieldName>요일</FieldName>
      <View style={styles.days}>
        {DAY_NAMES.map((name, day) => {
          const on = days.includes(day);
          let ink: string = color.ink;
          if (day === SATURDAY) {
            ink = color.blue600;
          } else if (day === SUNDAY) {
            ink = color.danger;
          }
          return (
            <Pressable
              accessibilityLabel={name}
              accessibilityRole="togglebutton"
              accessibilityState={{ checked: on }}
              key={name}
              onPress={() => {
                onChange(on ? days.filter((other) => other !== day) : [...days, day]);
              }}
              style={[styles.day, on && styles.dayOn]}
            >
              <Text style={[styles.dayName, { color: on ? color.onPrimary : ink }, on && styles.dayNameOn]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface Select {
  label: string;
  value: string;
  choices: readonly string[];
  pick: (choice: string) => void;
}

interface TimeRowProps {
  start: string;
  end: string;
  // The end is outlined in red.
  endWrong: boolean;
  onStart: (time: string) => void;
  onEnd: (time: string) => void;
}

function shown(value: string): string {
  return value === '' ? '--' : value;
}

function selectsOf(name: string, time: string, change: (time: string) => void): Select[] {
  return [
    {
      label: `${name} · 시`,
      value: hourOf(time),
      choices: HOURS,
      pick: (hour): void => {
        change(withHour(time, hour));
      },
    },
    {
      label: `${name} · 분`,
      value: minuteOf(time),
      choices: MINUTES,
      pick: (minute): void => {
        change(withMinute(time, minute));
      },
    },
  ];
}

interface TimeBoxProps {
  name: string;
  selects: readonly Select[];
  wrong: boolean;
  open: string | null;
  onToggle: (label: string) => void;
}

function TimeBox({ name, selects, wrong, open, onToggle }: TimeBoxProps): ReactElement {
  return (
    <View style={styles.time}>
      <FieldName>{name}</FieldName>
      <View style={[styles.timeBox, wrong && styles.wrong]}>
        {selects.map(({ label, value }, index) => (
          <View key={label} style={styles.part}>
            {index === 1 ? <Text style={styles.colon}>:</Text> : null}
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="combobox"
              accessibilityState={{ expanded: open === label }}
              accessibilityValue={{ text: shown(value) }}
              onPress={() => {
                onToggle(label);
              }}
              style={styles.select}
            >
              <Text style={styles.selectWords}>{shown(value)}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

// `시작 시각` and `종료 시각`, each an hour and a minute. The choices of the select pressed open under the row.
export function TimeRow({ start, end, endWrong, onStart, onEnd }: TimeRowProps): ReactElement {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (label: string): void => {
    setOpen(open === label ? null : label);
  };
  const starts = selectsOf('시작 시각', start, onStart);
  const ends = selectsOf('종료 시각', end, onEnd);
  const opened = [...starts, ...ends].find(({ label }) => label === open);
  return (
    <View style={styles.field}>
      <View style={styles.times}>
        <TimeBox name="시작 시각" onToggle={toggle} open={open} selects={starts} wrong={false} />
        <TimeBox name="종료 시각" onToggle={toggle} open={open} selects={ends} wrong={endWrong} />
      </View>
      {opened === undefined ? null : (
        <OptionList label={`${opened.label} 목록`}>
          {opened.choices.map((choice) => (
            <Option
              key={choice}
              onPress={() => {
                opened.pick(choice);
                setOpen(null);
              }}
              selected={choice === opened.value}
            >
              {shown(choice)}
            </Option>
          ))}
        </OptionList>
      )}
    </View>
  );
}

// Each class the chosen days and hours cross; saving is still allowed.
export function CrossingWarning({ lines }: { lines: readonly string[] }): ReactElement {
  return (
    <View accessibilityRole="summary" style={styles.warning}>
      <Icon color={color.quest} name="alert" size={18} />
      <View style={styles.warningWords}>
        {lines.map((line) => (
          <Text key={line} style={styles.warningLine}>
            {line}
          </Text>
        ))}
        <Text style={styles.warningHint}>그대로 저장할 수 있어요</Text>
      </View>
    </View>
  );
}

// `장소`: a button reading `장소 선택` or the chosen Place, which opens the Place picker.
export function PlaceButton({ chosen, onPress }: { chosen: string | null; onPress: () => void }): ReactElement {
  return (
    <View style={styles.field}>
      <FieldName>장소</FieldName>
      <Pressable
        accessibilityLabel="장소 선택"
        accessibilityRole="button"
        accessibilityValue={chosen === null ? undefined : { text: chosen }}
        onPress={onPress}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.place, pressed && styles.pressed]}
      >
        <Icon color={chosen === null ? color.inkSubtle : color.ink} name="pin" size={18} />
        <Text numberOfLines={1} style={[styles.placeWords, chosen === null && styles.placeNone]}>
          {chosen ?? '장소 선택'}
        </Text>
        <Icon color={color.inkFaint} name="chevronRight" size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  fieldName: { ...text.label, color: color.ink },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    minWidth: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  dayOn: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  dayName: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  dayNameOn: { fontFamily: font.bold },
  times: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  time: { flex: 1, minWidth: 0, gap: space[2] },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.touchMin,
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  wrong: { borderColor: color.danger },
  part: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  colon: { ...text.bodyLg, color: color.inkFaint },
  select: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  selectWords: { ...text.bodyLg, fontVariant: ['tabular-nums'], color: color.ink },
  warning: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: WARNING_LINE,
    backgroundColor: color.questSoft,
  },
  warningWords: { flex: 1, gap: 2 },
  warningLine: { ...text.label, color: WARNING_INK },
  warningHint: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.quest },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: size.touchMin,
    paddingLeft: 14,
    paddingRight: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  placeWords: { flex: 1, ...text.bodyLg, color: color.ink },
  placeNone: { color: color.inkSubtle },
});
