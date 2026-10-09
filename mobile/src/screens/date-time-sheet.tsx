// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, font, radius, space } from '@/design-system';
import { now } from '@/clock';
import {
  koreaClock,
  koreaDay,
  koreaDayOfMonth,
  koreaDaysAfter,
  koreaHourMinute,
  koreaInstant,
  koreaWeekdayName,
} from '@/korea-time';

interface DateTimeSheetProps {
  open: boolean;
  // `언제` when left out.
  title?: string;
  // The instant shown when it opens, or null for today at 19:00.
  value: string | null;
  onClose: () => void;
  onPick: (instant: string) => void;
}

const DAYS = 21;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = [0, 10, 20, 30, 40, 50];
const EVENING = 19;

interface Choice {
  day: number;
  hour: number;
  minute: number;
}

function choiceOf(value: string | null, today: Date): Choice {
  if (value === null) {
    return { day: 0, hour: EVENING, minute: 0 };
  }
  const instant = new Date(value);
  const [hour, minute] = koreaHourMinute(instant);
  const day = Math.min(Math.max(koreaDaysAfter(today, instant), 0), DAYS - 1);
  return { day, hour, minute: Math.floor(minute / 10) * 10 };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

// "오늘 19:00", "내일 19:00", "10월 8일 (목) 19:00": what the sheet and a form's button show for an instant.
export function whenWords(instant: string): string {
  return `${koreaDay(instant, now())} ${koreaClock(instant)}`;
}

function dayTop(day: number, date: Date): string {
  if (day === 0) {
    return '오늘';
  }
  return day === 1 ? '내일' : koreaWeekdayName(date);
}

function dayInk(date: Date, selected: boolean): string {
  if (selected) {
    return color.onPrimary;
  }
  const weekday = koreaWeekdayName(date);
  if (weekday === '일') {
    return color.danger;
  }
  return weekday === '토' ? color.blue600 : color.ink;
}

interface CellProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Cell({ label, selected, onPress }: CellProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.cell, selected && styles.selected]}
    >
      <Text style={[styles.cellWords, selected && styles.selectedWords]}>{label}</Text>
    </Pressable>
  );
}

interface PartsProps {
  today: Date;
  choice: Choice;
  onChange: (part: Partial<Choice>) => void;
}

// The 21 days from today, in a row that scrolls.
function Days({ today, choice, onChange }: PartsProps): ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.days} horizontal showsHorizontalScrollIndicator={false}>
      {Array.from({ length: DAYS }, (_, day) => {
        const date = koreaInstant(today, day, 12, 0);
        const selected = day === choice.day;
        const top = dayTop(day, date);
        return (
          <Pressable
            accessibilityLabel={`${top} ${koreaDayOfMonth(date)}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={day}
            onPress={() => {
              onChange({ day });
            }}
            style={[styles.day, selected && styles.selected]}
          >
            <Text style={[styles.dayTop, { color: dayInk(date, selected) }]}>{top}</Text>
            <Text style={[styles.dayNumber, { color: dayInk(date, selected) }]}>{koreaDayOfMonth(date)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Where a list opens: its selected cell in the middle, as near as the list's ends allow.
function openingAt(index: number): { x: number; y: number } {
  return { x: 0, y: Math.max(0, index * CELL_HEIGHT - (LIST_HEIGHT - CELL_HEIGHT) / 2) };
}

// The hours and the minutes, side by side, each list opening on the choice.
function Times({ choice, onChange }: Omit<PartsProps, 'today'>): ReactElement {
  return (
    <View style={styles.lists}>
      <ScrollView accessibilityLabel="시" contentOffset={openingAt(choice.hour)} style={styles.list}>
        {HOURS.map((hour) => (
          <Cell
            key={hour}
            label={`${twoDigits(hour)}시`}
            onPress={() => {
              onChange({ hour });
            }}
            selected={hour === choice.hour}
          />
        ))}
      </ScrollView>
      <ScrollView accessibilityLabel="분" contentOffset={openingAt(MINUTES.indexOf(choice.minute))} style={styles.list}>
        {MINUTES.map((minute) => (
          <Cell
            key={minute}
            label={`${twoDigits(minute)}분`}
            onPress={() => {
              onChange({ minute });
            }}
            selected={minute === choice.minute}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// The choice, from `value` each time the sheet opens.
function useChoice(open: boolean, value: string | null, today: Date): [Choice, (part: Partial<Choice>) => void] {
  const [choice, setChoice] = useState(() => choiceOf(value, today));
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChoice(choiceOf(value, today));
    }
  }
  return [
    choice,
    (part) => {
      setChoice({ ...choice, ...part });
    },
  ];
}

// When something happens, in Korea's time: `언제` with the choice in words, 21 days from today, the hour and the
// minute by tens, and `확인`. Shared by the forms that ask for a time.
export function DateTimeSheet({ open, title = '언제', value, onClose, onPick }: DateTimeSheetProps): ReactElement {
  const today = now();
  const [choice, change] = useChoice(open, value, today);
  const picked = koreaInstant(today, choice.day, choice.hour, choice.minute).toISOString();
  return (
    <BottomSheet label="날짜·시간" onClose={onClose} open={open}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.preview}>{whenWords(picked)}</Text>
        </View>
        <Days choice={choice} onChange={change} today={today} />
        <Times choice={choice} onChange={change} />
        <Button
          full
          onPress={() => {
            onPick(picked);
            onClose();
          }}
          size="lg"
        >
          확인
        </Button>
      </View>
    </BottomSheet>
  );
}

const DAY_WIDTH = 52;
const DAY_HEIGHT = 60;
const LIST_HEIGHT = 200;
const CELL_HEIGHT = 44;

const styles = StyleSheet.create({
  body: { gap: 14, paddingHorizontal: space[4] },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
  preview: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.snuBlue },
  days: { gap: space[2] },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: DAY_WIDTH,
    height: DAY_HEIGHT,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    backgroundColor: color.surface,
  },
  dayTop: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  dayNumber: { fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
  lists: { flexDirection: 'row', gap: 10, height: LIST_HEIGHT },
  list: { flex: 1, borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CELL_HEIGHT,
    borderBottomWidth: 1,
    borderColor: '#F0F1F5',
  },
  cellWords: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: color.ink },
  selected: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  selectedWords: { fontFamily: font.bold, color: color.onPrimary },
});
