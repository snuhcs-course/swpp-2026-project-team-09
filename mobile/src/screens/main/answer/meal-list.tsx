/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, MenuDish } from '@/api/assistant-types';
import { color, font, radius, size, space, text } from '@/design-system';
import { MEAL_NAMES, won } from '@/features/dining/adapter';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaClock, koreaWeekdayName } from '@/korea-time';
import { KindChips } from './kind-chips';

// 메뉴 모두 보기 (P04 ticket 15, board 23): every candidate of a meal answer with all its dishes and prices, in the
// map's order, above the dock's chips.

export interface MenuGroup {
  // As the map numbers it.
  number: number;
  planId: string;
  name: string;
  // "11:53 도착"
  arrival: string;
  // A buffet's or a self corner's own price, null for none.
  price: number | null;
  dishes: readonly MenuDish[];
}

// One group per Plan of a meal answer. None for an answer that is no meal, or with fewer than two Plans whose menus
// hold dishes: the list then compares nothing.
export function menuGroupsOf(answer: AnswerReply | null): MenuGroup[] {
  if (answer?.input.kind !== 'meal') {
    return [];
  }
  const groups = answer.plans.map((plan, index) => ({
    number: index + 1,
    planId: plan.id,
    name: plan.place.label,
    arrival: `${koreaClock(plan.startAt)} 도착`,
    price: plan.menu?.price ?? null,
    dishes: plan.menu?.dishes ?? [],
  }));
  return groups.filter(({ dishes }) => dishes.length > 0).length < 2 ? [] : groups;
}

// "메뉴 모두 보기 · 화 점심"
export function menuListTitle(answer: AnswerReply): string {
  const { input } = answer;
  if (input.kind !== 'meal') {
    return '메뉴 모두 보기';
  }
  const day = koreaWeekdayName(new Date(`${input.date}T12:00:00+09:00`));
  return `메뉴 모두 보기 · ${day} ${MEAL_NAMES[input.meal]}`;
}

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

// The row's chip that opens and folds the list.
export function MenuListChip({ open, onPress }: { open: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="메뉴 모두 보기"
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      testID="menu-list-chip"
    >
      <Text numberOfLines={1} style={styles.chipWords}>
        {open ? '메뉴 모두 보기 ▼' : '메뉴 모두 보기 ▲'}
      </Text>
    </Pressable>
  );
}

function DishRow({ name, price }: { name: string; price: number | null }): ReactElement {
  return (
    <View style={styles.dish}>
      <Text numberOfLines={1} style={styles.dishName}>
        {name}
      </Text>
      {price === null ? null : <Text style={styles.dishPrice}>{won(price)}</Text>}
    </View>
  );
}

function Group({
  group,
  picked,
  onPick,
}: {
  group: MenuGroup;
  picked: boolean;
  onPick: (planId: string) => void;
}): ReactElement {
  const { number, planId, name, arrival, price, dishes } = group;
  const said = [
    `${String(number)} ${name}`,
    arrival,
    ...(price === null ? [] : [`1인 ${won(price)}`]),
    ...(picked ? ['고른 곳'] : []),
  ].join(' · ');
  return (
    <Pressable
      accessibilityLabel={said}
      accessibilityRole="button"
      accessibilityState={{ selected: picked }}
      onPress={() => {
        onPick(planId);
      }}
      style={({ pressed }) => [styles.group, picked && styles.picked, pressed && !picked && styles.pressed]}
      testID={`menu-group-${String(number)}`}
    >
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.number}>{number}</Text>
        </View>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.arrival}>
          {price === null ? arrival : `${arrival} · 1인 ${won(price)}`}
        </Text>
        <Text style={picked ? styles.pickedWords : styles.more}>{picked ? '고른 곳' : '›'}</Text>
      </View>
      {dishes.map((dish, at) => (
        // A menu may list a dish twice; its place in the menu tells them apart.
        // oxlint-disable-next-line react/no-array-index-key
        <DishRow key={`${String(at)}:${dish.name}`} name={dish.name} price={price === null ? dish.price : null} />
      ))}
    </Pressable>
  );
}

interface MenuListProps {
  answer: AnswerReply;
  shown: Pick<ShownAnswer, 'index' | 'show'>;
  onFold: () => void;
}

// The list over the dock's chips: its title with "접기", then one group per candidate. A press on another group makes
// that place the pick, as a press on its tag does, and folds the list.
export function MenuList({ answer, shown, onFold }: MenuListProps): ReactElement | null {
  const groups = menuGroupsOf(answer);
  if (groups.length === 0) {
    return null;
  }
  return (
    <View style={styles.list} testID="menu-list">
      <View style={styles.title}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.titleWords}>
          {menuListTitle(answer)}
        </Text>
        <Pressable accessibilityRole="button" hitSlop={space[3]} onPress={onFold}>
          <Text style={styles.fold}>접기</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.groups}>
        {groups.map((group) => (
          <Group
            group={group}
            key={group.planId}
            onPick={(planId) => {
              if (group.number - 1 !== shown.index) {
                shown.show(planId);
              }
              onFold();
            }}
            picked={group.number - 1 === shown.index}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface WithMenuListProps {
  shown: Pick<ShownAnswer, 'answer' | 'index' | 'show' | 'chooseKind'>;
  // The dock's own chips ("지난 답 N개", the note), which stand before 메뉴 모두 보기.
  folded: ReactNode;
  // The Plan's dock, given its chips.
  children: (dock: ReactNode) => ReactNode;
}

// A meal answer's dock: its kinds of food first (`KindChips`), the dock's own chips, and 메뉴 모두 보기 as the row's
// last chip (board 24), with the list, while open, over the row. The list folds when another answer comes.
export function WithMenuList({ shown, folded, children }: WithMenuListProps): ReactElement {
  const { answer } = shown;
  const [openFor, setOpenFor] = useState<AnswerReply | null>(null);
  const listed = menuGroupsOf(answer).length > 0;
  const open = listed && answer !== null && openFor === answer;
  const fold = (): void => {
    setOpenFor(null);
  };
  const dock = (
    <>
      <KindChips answer={answer} onChoose={shown.chooseKind} />
      {folded}
      {listed ? (
        <MenuListChip
          onPress={() => {
            setOpenFor(open ? null : answer);
          }}
          open={open}
        />
      ) : null}
    </>
  );
  return (
    <>
      {open ? <MenuList answer={answer} onFold={fold} shown={shown} /> : null}
      {children(dock)}
    </>
  );
}

const BADGE = 20;
// The list stands over the map: at most this high, and it scrolls.
const LIST_MAX = 420;

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    justifyContent: 'center',
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.snuBlue,
    backgroundColor: color.surface,
  },
  chipWords: { ...text.label, color: color.snuBlue },
  pressed: { opacity: 0.6 },
  list: { gap: space[2], paddingBottom: space[2] },
  title: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  titleWords: { ...text.label, flexShrink: 1, fontFamily: font.bold, color: color.ink },
  fold: { ...text.label, color: color.snuBlue },
  groups: { maxHeight: LIST_MAX },
  group: { gap: space[1], paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.md },
  picked: { backgroundColor: color.blue50 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  number: { ...text.micro, color: color.onPrimary },
  name: { ...text.label, flexShrink: 1, fontFamily: font.bold, color: color.ink },
  arrival: { ...text.caption, flexGrow: 1, color: color.inkMuted },
  pickedWords: { ...text.caption, fontFamily: font.bold, color: color.snuBlue },
  more: { ...text.label, color: color.inkSubtle },
  dish: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2], paddingLeft: BADGE + space[2] },
  dishName: { ...text.body, flexShrink: 1, color: color.ink },
  dishPrice: { ...text.body, fontFamily: font.semiBold, color: color.ink },
});
