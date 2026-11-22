/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { Meal, MenuLine, RestaurantMenus } from '@/api/menu-types';
import { menusQuery } from '@/api/queries';
import { now } from '@/clock';
import { color, font, radius, size, space, text } from '@/design-system';
import { cornersOf, hoursOf, type MenuCorner, planCorner } from '@/features/assistant/meal-menus';
import { addedWalk } from '@/features/assistant/answer-walks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { MEAL_NAMES, won } from '@/features/dining/adapter';
import { koreaClock, koreaDayWord } from '@/korea-time';

// A restaurant's menu in the raised card (board E4): back to the list, the place, the meals of its day, and the menu in
// corners. It scrolls with the card.

// The day's menus of the Plan's restaurant: by its name, else by its Place when that holds one restaurant alone.
export function restaurantOf(menus: readonly RestaurantMenus[], plan: Plan): RestaurantMenus | null {
  const named = menus.find(({ name }) => name === plan.place.label);
  if (named !== undefined) {
    return named;
  }
  const there = menus.filter(({ placeId }) => placeId === plan.place.placeId);
  return there.length === 1 ? (there[0] ?? null) : null;
}

export interface MealTab {
  meal: Meal;
  // "점심 11:30–13:30", or "점심" without hours.
  words: string;
  lines: MenuLine[];
}

// The meals of the restaurant's day that have lines, each with its hours when a note gives them.
export function mealTabsOf(restaurant: RestaurantMenus | null): MealTab[] {
  return (restaurant?.meals ?? [])
    .filter(({ lines }) => lines.length > 0)
    .map(({ meal, lines }) => {
      const hours = hoursOf(lines);
      return { meal, words: hours === null ? MEAL_NAMES[meal] : `${MEAL_NAMES[meal]} ${hours}`, lines };
    });
}

// "내일(월) 점심", or "오늘 점심".
export function dayAndMeal(answer: AnswerReply): string {
  if (answer.input.kind !== 'meal') {
    return '';
  }
  const noon = `${answer.input.date}T12:00:00+09:00`;
  const day = koreaDayWord(noon, now());
  return `${day === '' ? '오늘' : day} ${MEAL_NAMES[answer.input.meal]}`;
}

function MealTabs({
  tabs,
  meal,
  onChoose,
}: {
  tabs: readonly MealTab[];
  meal: Meal;
  onChoose: (meal: Meal) => void;
}): ReactElement | null {
  if (tabs.length < 2) {
    return null;
  }
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const on = tab.meal === meal;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            hitSlop={(size.touchMin - TAB_HEIGHT) / 2}
            key={tab.meal}
            onPress={() => {
              onChoose(tab.meal);
            }}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={[styles.tabWords, on && styles.tabWordsOn]}>{tab.words}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Corner({ corner }: { corner: MenuCorner }): ReactElement {
  const { title, price, served, ordered } = corner;
  const head = [title, price === null ? null : won(price)].filter((words) => words !== null).join(' · ');
  return (
    <View style={styles.corner}>
      {head === '' ? null : <Text style={styles.cornerTitle}>{head}</Text>}
      {served.length === 0 ? null : <Text style={styles.served}>{served.join(' · ')}</Text>}
      {ordered.map(({ name, price: one }, at) => (
        // A menu may list a dish twice; its place tells them apart.
        // oxlint-disable-next-line react/no-array-index-key
        <View key={`${String(at)}:${name}`} style={styles.ordered}>
          <Text numberOfLines={1} style={styles.orderedName}>
            {name}
          </Text>
          <Text style={styles.orderedPrice}>{won(one)}</Text>
        </View>
      ))}
    </View>
  );
}

// "12:18 도착 · 걸음 16분", or the arrival alone when the walking is not known.
function whenOf(plan: Plan): string {
  const walk = addedWalk(plan);
  const there = `${koreaClock(plan.startAt)} 도착`;
  return walk === null ? there : `${there} · 걸음 ${String(walk)}분`;
}

interface MealMenuProps {
  answer: AnswerReply;
  plan: Plan;
  shown: Pick<ShownAnswer, 'index' | 'closeMenu'>;
}

// The Plan's restaurant: "‹ N곳 목록" with the day and meal, its number, name and time, the meals of its day, and the
// chosen meal's menu in corners. Without the day's menus, the Plan's own menu.
export function MealMenu({ answer, plan, shown }: MealMenuProps): ReactElement {
  const date = answer.input.kind === 'meal' ? answer.input.date : '';
  const asked: Meal = answer.input.kind === 'meal' ? answer.input.meal : 'lunch';
  const menus = useQuery(menusQuery(date)).data;
  const tabs = mealTabsOf(menus === undefined ? null : restaurantOf(menus, plan));
  const [meal, setMeal] = useState<Meal>(asked);
  const tab = tabs.find((one) => one.meal === meal) ?? tabs.find((one) => one.meal === asked);
  const corners = tab === undefined ? (plan.menu === undefined ? [] : [planCorner(plan.menu)]) : cornersOf(tab.lines);
  return (
    <View style={styles.menu} testID="meal-menu">
      <View style={styles.top}>
        <Pressable accessibilityRole="button" hitSlop={space[3]} onPress={shown.closeMenu} testID="meal-menu-back">
          <Text style={styles.back}>{`‹ ${String(answer.plans.length)}곳 목록`}</Text>
        </Pressable>
        <Text style={styles.day}>{dayAndMeal(answer)}</Text>
      </View>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.number}>{shown.index + 1}</Text>
        </View>
        <View style={styles.names}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
            {plan.place.label}
          </Text>
          <Text style={styles.when}>{whenOf(plan)}</Text>
        </View>
      </View>
      <MealTabs meal={tab?.meal ?? asked} onChoose={setMeal} tabs={tabs} />
      {corners.length === 0 ? (
        <Text style={styles.served}>이날 메뉴를 아직 몰라요</Text>
      ) : (
        corners.map((corner, at) => (
          // Corners have no id; their order is the menu's.
          // oxlint-disable-next-line react/no-array-index-key
          <Corner corner={corner} key={`${String(at)}:${corner.title ?? ''}`} />
        ))
      )}
    </View>
  );
}

const BADGE = 26;
const TAB_HEIGHT = 32;

const styles = StyleSheet.create({
  menu: { gap: space[3] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { ...text.label, color: color.inkMuted },
  day: { ...text.caption, color: color.inkMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: color.quest,
  },
  number: { ...text.label, fontFamily: font.bold, color: color.onPrimary },
  names: { flex: 1, gap: 2 },
  name: { ...text.title, color: color.ink },
  when: { ...text.caption, fontFamily: font.semiBold, color: color.quest },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  tab: {
    justifyContent: 'center',
    height: TAB_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.border,
  },
  tabOn: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  tabWords: { ...text.label, color: color.ink },
  tabWordsOn: { color: color.onPrimary },
  corner: { gap: space[1] },
  cornerTitle: { ...text.label, fontFamily: font.bold, color: color.quest },
  served: { ...text.body, color: color.ink },
  ordered: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  orderedName: { ...text.body, flexShrink: 1, color: color.ink },
  orderedPrice: { ...text.body, color: color.ink },
});
