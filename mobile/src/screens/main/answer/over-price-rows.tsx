/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { color, font, radius, space, text } from '@/design-system';
import { dishWords, priceWords } from '@/features/assistant/meal-menus';
import { overHeading, overPriceOf } from '@/features/assistant/meal-price';

const BADGE = 22;

// The places over a meal's price ceiling, when some others are under it (P04 ticket 92, the design page's board 제안):
// apart at the list's end under the price ("5,000원 넘는 곳"), grey and unnumbered as the places closed for the meal
// are under "쉬는 곳", each with its name, its dishes, and its price, and no press.
export function OverPriceRows({ answer }: { answer: AnswerReply }): ReactElement | null {
  const over = overPriceOf(answer);
  if (over === null || over.plans.length === 0) {
    return null;
  }
  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>
        {overHeading(over.maxPrice)}
      </Text>
      {over.plans.map((plan) => {
        const dishes = plan.menu === undefined ? null : dishWords(plan.menu);
        const price = plan.menu === undefined ? null : priceWords(plan.menu);
        return (
          <View
            accessibilityLabel={[plan.place.label, dishes, price].filter((words) => words !== null).join(' · ')}
            accessible
            key={plan.id}
            style={styles.row}
            testID="meal-over-row"
          >
            <View style={styles.badge} />
            <View style={styles.middle}>
              <Text numberOfLines={1} style={styles.name}>
                {plan.place.label}
              </Text>
              {dishes === null ? null : (
                <Text numberOfLines={1} style={styles.dishes}>
                  {dishes}
                </Text>
              )}
            </View>
            {price === null ? null : <Text style={styles.price}>{price}</Text>}
          </View>
        );
      })}
    </>
  );
}

// As the list's rows closed for the meal (`meal-list.tsx`).
const styles = StyleSheet.create({
  heading: { ...text.caption, marginTop: space[2], color: color.inkMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    opacity: 0.45,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    marginTop: 2,
    borderRadius: radius.full,
    backgroundColor: color.inkSubtle,
  },
  middle: { flex: 1, gap: 2 },
  name: { ...text.body, fontFamily: font.bold, color: color.ink },
  dishes: { ...text.caption, color: color.inkMuted },
  price: { ...text.caption, color: color.inkMuted },
});
