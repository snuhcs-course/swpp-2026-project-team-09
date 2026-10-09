/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import { type ReactElement, type RefObject, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Meal } from '@/api/menu-types';
import { now } from '@/clock';
import {
  cardStyles,
  color,
  DayTile,
  EmptyState,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  SegmentedTabs,
  space,
  text,
} from '@/design-system';
import {
  MEAL_NAMES,
  MEALS,
  type MenuDayTile,
  type MenuLineView,
  menuDays,
  nextMeal,
  type RestaurantView,
} from '@/features/dining/adapter';
import { useMenuDay } from '@/features/dining/use-dining';

function isMeal(value: string | undefined): value is Meal {
  return MEALS.some((meal) => meal === value);
}

function Line({ line }: { line: MenuLineView }): ReactElement {
  if (line.type === 'priced') {
    return (
      <View style={styles.priced}>
        <Text style={styles.dish}>{line.name}</Text>
        <Text style={styles.price}>{line.price}</Text>
      </View>
    );
  }
  return <Text style={styles[line.type]}>{line.text}</Text>;
}

interface RestaurantProps {
  restaurant: RestaurantView;
  meal: Meal;
  onLayout?: (y: number) => void;
}

function Restaurant({ restaurant, meal, onLayout }: RestaurantProps): ReactElement {
  const lines = restaurant.meals[meal];
  return (
    <View
      onLayout={
        onLayout === undefined
          ? undefined
          : ({ nativeEvent }) => {
              onLayout(nativeEvent.layout.y);
            }
      }
      style={[cardStyles.card, styles.restaurant]}
      testID="menu-restaurant"
    >
      <Text accessibilityRole="header" style={styles.name}>
        {restaurant.name}
        {restaurant.place === null ? null : <Text style={styles.place}>{`  ${restaurant.place}`}</Text>}
      </Text>
      {lines.length === 0 ? <Text style={styles.closed}>운영하지 않아요</Text> : null}
      {lines.map((line, index) => (
        // A meal's lines have no id, and the same text may come twice.
        // oxlint-disable-next-line no-array-index-key
        <Line key={index} line={line} />
      ))}
    </View>
  );
}

interface DayAndMealProps {
  days: readonly MenuDayTile[];
  date: string;
  onDate: (date: string) => void;
  meal: Meal;
  onMeal: (meal: Meal) => void;
  collected: string;
}

// What stays under the app bar: the 7 days, the meals, and when the day's menus were collected.
function DayAndMeal({ days, date, onDate, meal, onMeal, collected }: DayAndMealProps): ReactElement {
  return (
    <View>
      <ScrollView contentContainerStyle={styles.days} horizontal showsHorizontalScrollIndicator={false}>
        {days.map((tile) => (
          <DayTile
            date={tile.date}
            key={tile.key}
            label={tile.label}
            onPress={() => {
              onDate(tile.key);
            }}
            selected={tile.key === date}
            top={tile.top}
            weekday={tile.weekday}
          />
        ))}
      </ScrollView>
      <SegmentedTabs
        onSelect={onMeal}
        segments={MEALS.map((key) => ({ key, label: MEAL_NAMES[key] }))}
        selected={meal}
      />
      {collected === '' ? null : <Text style={styles.collected}>{collected}</Text>}
    </View>
  );
}

// Scrolls the panel's body once, so that a section laid out at `y` is at its top.
function useScrollOnce(): { scroll: RefObject<ScrollView | null>; scrollTo: (y: number) => void } {
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  return {
    scroll,
    scrollTo: (y) => {
      if (!scrolled.current) {
        scrolled.current = true;
        scroll.current?.scrollTo({ y: y - LIST_PADDING, animated: false });
      }
    },
  };
}

// The menus of 7 days from today, by meal and restaurant: no frame draws it. It opens on the meal served next, or at
// the day, the meal and the restaurant its address names (`/menus?date=2026-10-06&meal=lunch&restaurant=…`), with
// that restaurant's section at the top.
export function MenusScreen(): ReactElement {
  const params = useLocalSearchParams<{ date?: string; meal?: string; restaurant?: string }>();
  const [days] = useState(() => menuDays(now()));
  const [date, setDate] = useState(() => {
    const asked = days.find(({ key }) => key === params.date);
    return asked?.key ?? nextMeal(now()).date;
  });
  const [meal, setMeal] = useState<Meal>(() => (isMeal(params.meal) ? params.meal : nextMeal(now()).meal));
  const day = useMenuDay(date);
  const { scroll, scrollTo } = useScrollOnce();
  return (
    <FullScreenPanel
      leave={{ kind: 'close', onPress: router.back }}
      scrollRef={scroll}
      title="메뉴"
      under={
        <DayAndMeal
          collected={day.data?.collected ?? ''}
          date={date}
          days={days}
          meal={meal}
          onDate={setDate}
          onMeal={setMeal}
        />
      }
    >
      {day.data === undefined && day.isPending ? <LoadingState /> : null}
      {day.data === undefined && !day.isPending ? <ErrorState onRetry={day.refetch} /> : null}
      {day.data?.restaurants.length === 0 ? <EmptyState words="이날 올라온 메뉴가 없어요" /> : null}
      {day.data === undefined || day.data.restaurants.length === 0 ? null : (
        <View style={styles.list}>
          {day.data.restaurants.map((restaurant) => (
            <Restaurant
              key={restaurant.name}
              meal={meal}
              onLayout={restaurant.name === params.restaurant ? scrollTo : undefined}
              restaurant={restaurant}
            />
          ))}
        </View>
      )}
    </FullScreenPanel>
  );
}

const LIST_PADDING = space[4];

const styles = StyleSheet.create({
  days: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[2] },
  collected: { ...text.caption, paddingHorizontal: space[4], paddingTop: space[2], color: color.inkMuted },
  list: { gap: space[3], padding: LIST_PADDING },
  restaurant: { gap: space[2] },
  name: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 24, color: color.ink },
  place: { fontFamily: font.regular, fontSize: 13, color: color.inkMuted },
  closed: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  priced: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  dish: { ...text.body, flexShrink: 1, color: color.ink },
  price: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  heading: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: color.ink },
  note: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  plain: { ...text.body, color: color.ink },
});
