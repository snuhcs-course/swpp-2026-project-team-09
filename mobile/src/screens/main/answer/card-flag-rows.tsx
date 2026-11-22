/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, space, text } from '@/design-system';
import type { MarkedCard } from '@/features/assistant/cards-scene';

function won(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

// The card of a restaurant's or an event's flag (P04 ticket 08, board 14): what was asked, read in full. A restaurant's
// meal with its hours, then each dish with its price; an event's name, its own start and end with its day, and where.
// Their buttons (파티 만들기, 같이 갈 파티) stay on the cards in the answer's card.
export function CardFlagRows({ card: { card, title, line } }: { card: MarkedCard }): ReactElement {
  if (card.kind === 'restaurant') {
    const dishes = card.restaurant.lines.filter(({ kind }) => kind !== 'heading' && kind !== 'note');
    return (
      <View style={styles.rows} testID="card-flag-rows">
        <Text accessibilityRole="header" style={styles.head}>
          {`${title} · ${line ?? ''}`}
        </Text>
        {dishes.map(({ name, text: words, price }) => (
          <View key={words} style={styles.row}>
            <Text style={styles.name}>{name ?? words}</Text>
            {price === null ? null : <Text style={styles.value}>{won(price)}</Text>}
          </View>
        ))}
      </View>
    );
  }
  const { place } = card.globalEvent;
  return (
    <View style={styles.rows} testID="card-flag-rows">
      <Text accessibilityRole="header" style={styles.head}>
        {title}
      </Text>
      {line === null ? null : <Text style={styles.name}>{line}</Text>}
      {place === null ? null : <Text style={styles.name}>{place}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space[2] },
  head: { ...text.label, fontFamily: font.semiBold, color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  name: { ...text.label, flexShrink: 1, color: color.ink },
  value: { ...text.label, color: color.ink },
});
