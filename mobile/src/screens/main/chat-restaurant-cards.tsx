/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { QuestProposal, RestaurantCard, RestaurantTravel } from '@/api/assistant-types';
import type { MenuLine } from '@/api/menu-types';
import { now } from '@/clock';
import { Button, cardStyles, color, font, Icon, radius, space } from '@/design-system';
import { MEAL_NAMES, won } from '@/features/dining/adapter';
import { koreaDay } from '@/korea-time';

const LINES_SHOWN = 2;

const MODE_WORDS = { walk: '도보', shuttle: '셔틀' } as const;

const NO_WAY = '—';

// "63동 · 오늘 점심"
function whereAndWhen({ placeNumber, date, meal }: RestaurantCard['restaurant']): string {
  const when = `${koreaDay(`${date}T12:00:00+09:00`, now())} ${MEAL_NAMES[meal]}`;
  return placeNumber === null ? when : `${placeNumber}동 · ${when}`;
}

// A dish with its price, as the wireframe writes it, or the line as the page wrote it.
function lineWords({ text, name, price }: MenuLine): string {
  return name !== null && price !== null ? `${name} ${won(price)}` : text;
}

function TravelChip({ way: { name, mode, minutes, longest } }: { way: RestaurantTravel }): ReactElement {
  const ink = longest ? color.party : color.inkMuted;
  return (
    <View style={[styles.chip, longest && styles.longest]} testID={longest ? 'longest-travel' : undefined}>
      <Icon color={ink} name={mode === 'shuttle' ? 'bus' : 'route'} size={12} />
      <Text style={[styles.chipWords, { color: ink }]}>
        {mode === null ? `${name} ${NO_WAY}` : `${name} ${MODE_WORDS[mode]} ${String(minutes)}분`}
      </Text>
    </View>
  );
}

function Top({ restaurant }: { restaurant: RestaurantCard['restaurant'] }): ReactElement {
  return (
    <View style={styles.top}>
      <View style={styles.mark}>
        <Icon color={color.onPrimary} name="meal" size={16} />
      </View>
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={styles.name}>
          {restaurant.name}
        </Text>
        <Text style={styles.where}>{whereAndWhen(restaurant)}</Text>
      </View>
      <Text style={styles.eating}>{`식사 가능 시간 ${String(restaurant.eatingMinutes)}분`}</Text>
    </View>
  );
}

function Card({
  restaurant,
  onMakeParty,
}: {
  restaurant: RestaurantCard['restaurant'];
  onMakeParty: (proposal: QuestProposal) => void;
}): ReactElement {
  const { key, lines, people, proposal } = restaurant;
  const more = lines.length - LINES_SHOWN;
  return (
    <View style={[cardStyles.card, styles.card]} testID={`restaurant-${key}`}>
      <Top restaurant={restaurant} />
      <View style={styles.lines}>
        {lines.slice(0, LINES_SHOWN).map((line, index) => (
          // A meal's lines have no id, and the same text may come twice.
          // oxlint-disable-next-line no-array-index-key
          <Text key={index} style={styles.line}>
            {lineWords(line)}
          </Text>
        ))}
        {more > 0 ? <Text style={styles.more}>{`외 ${String(more)}개`}</Text> : null}
      </View>
      <View accessibilityLabel="사람별 이동 시간" style={styles.chips}>
        {people.map((way, index) => (
          // Two Friends may share a name.
          // oxlint-disable-next-line no-array-index-key
          <TravelChip key={index} way={way} />
        ))}
      </View>
      <Button
        full
        onPress={() => {
          onMakeParty(proposal);
        }}
        variant="primary"
      >
        파티 만들기
      </Button>
    </View>
  );
}

interface ChatRestaurantCardsProps {
  cards: readonly RestaurantCard[];
  // 파티 만들기: opens the party form filled with the card's Proposal.
  onMakeParty: (proposal: QuestProposal) => void;
}

// The Restaurants of an answer, as board ② of 공강에 밥 draws them.
export function ChatRestaurantCards({ cards, onMakeParty }: ChatRestaurantCardsProps): ReactElement {
  return (
    <View style={styles.cards}>
      {cards.map(({ restaurant }) => (
        <Card key={restaurant.key} onMakeParty={onMakeParty} restaurant={restaurant} />
      ))}
    </View>
  );
}

const MARK = 32;

const styles = StyleSheet.create({
  cards: { gap: space[2], marginTop: space[2] },
  card: { gap: space[2] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MARK,
    height: MARK,
    borderRadius: radius.md,
    backgroundColor: color.svcDining,
  },
  titles: { flex: 1 },
  name: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  where: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  eating: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.snuBlue },
  lines: { gap: 2 },
  line: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.ink },
  more: { fontFamily: font.regular, fontSize: 13, lineHeight: 20, color: color.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: color.blue50,
  },
  longest: { backgroundColor: color.partySoft },
  chipWords: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16 },
});
