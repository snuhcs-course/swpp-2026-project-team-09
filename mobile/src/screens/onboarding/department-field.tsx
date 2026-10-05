import { type ReactElement, useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput, View } from 'react-native';
import { color, Icon, size, space } from '@/design-system';
import { searchDepartments } from './department-search';
import type { CourseLevel, DepartmentGroup } from './departments';
import { FieldLabel } from './field-label';
import { Input } from './input';
import { NoOption, Option, OptionHeading, OptionList } from './option-list';

const LONGEST = 50;

interface DepartmentFieldProps {
  level: CourseLevel;
  // The chosen department's name, or empty.
  value: string;
  suggested: boolean;
  onChange: (department: string) => void;
}

// Where each group's heading is among the list's rows, for the headings to stay at the top. The rows are one flat
// list for this: a ScrollView counts its own children.
function headingsOf(groups: readonly DepartmentGroup[]): number[] {
  const places: number[] = [];
  let next = 0;
  for (const group of groups) {
    places.push(next);
    next += 1 + group.departments.length;
  }
  return places;
}

// The search: the list opens with the focus, what is typed narrows it, and a press chooses and closes it.
function useSearch(onChange: (department: string) => void): {
  open: boolean;
  words: string;
  input: React.RefObject<TextInput | null>;
  begin: () => void;
  type: (typed: string) => void;
  choose: (department: string) => void;
  clear: () => void;
} {
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState('');
  const input = useRef<TextInput>(null);
  const show = (typed: string): void => {
    setOpen(true);
    setWords(typed);
  };
  const choose = (department: string): void => {
    onChange(department);
    setOpen(false);
    setWords('');
    input.current?.blur();
  };
  const clear = (): void => {
    onChange('');
    show('');
  };
  return {
    open,
    words,
    input,
    begin: () => {
      show('');
    },
    type: show,
    choose,
    clear,
  };
}

function Choices({
  groups,
  value,
  onChoose,
}: {
  groups: readonly DepartmentGroup[];
  value: string;
  onChoose: (department: string) => void;
}): ReactElement {
  if (groups.length === 0) {
    return (
      <OptionList label="학과 목록">
        <NoOption>결과 없음</NoOption>
      </OptionList>
    );
  }
  return (
    <OptionList headings={headingsOf(groups)} label="학과 목록">
      {groups.flatMap((group) => [
        <OptionHeading key={group.name}>{group.name}</OptionHeading>,
        ...group.departments.map((department) => (
          <Option
            key={`${group.name}|${department}`}
            onPress={() => {
              onChoose(department);
            }}
            selected={department === value}
          >
            {department}
          </Option>
        )),
      ])}
    </OptionList>
  );
}

// The department, chosen from the course level's list by searching it. Nothing but a name from the list is taken.
export function DepartmentField({ level, value, suggested, onChange }: DepartmentFieldProps): ReactElement {
  const search = useSearch(onChange);
  const shown = search.open ? search.words : value;
  return (
    <View style={styles.field}>
      <FieldLabel required suggested={suggested}>
        학과
      </FieldLabel>
      <View>
        <Input
          label="학과"
          maxLength={LONGEST}
          onChangeText={search.type}
          onFocus={search.begin}
          placeholder="학과 검색"
          ref={search.input}
          style={styles.input}
          value={shown}
        />
        <View style={styles.icon}>
          <Icon color={color.inkMuted} name="search" size={18} />
        </View>
        {shown === '' ? null : (
          <Pressable
            accessibilityLabel="학과 지우기"
            accessibilityRole="button"
            onPress={search.clear}
            style={styles.clear}
          >
            <Icon color={color.inkMuted} name="x" size={16} />
          </Pressable>
        )}
      </View>
      {search.open ? (
        <Choices groups={searchDepartments(level, search.words)} onChoose={search.choose} value={value} />
      ) : null}
    </View>
  );
}

const SIDE = space[10];

const styles = StyleSheet.create({
  field: { gap: space[2] },
  input: { paddingLeft: SIDE, paddingRight: size.touchMin },
  icon: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clear: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: size.touchMin,
    height: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
