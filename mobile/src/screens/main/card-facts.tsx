/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CardFact } from '@/api/lookup-types';
import { color, font, Icon, size, space, text } from '@/design-system';

// The fact lines of the main server's card of a pressed building or face (`LookupCard.facts`), in its order, each
// with its icon, the strong one in bold. A Friend's line ends with "›" and opens that Friend's card.

interface FactsProps {
  facts: readonly CardFact[];
  // Left out, a Friend's line opens nothing, as on a Friend's own card.
  onFriend?: (userId: string) => void;
}

function Fact({ fact, onFriend }: { fact: CardFact } & Pick<FactsProps, 'onFriend'>): ReactElement {
  const { icon, text: words, strong, userId } = fact;
  const parts = (
    <>
      <Icon color={color.inkMuted} name={icon} size={16} />
      <Text style={[styles.words, strong && styles.strong]}>{words}</Text>
    </>
  );
  if (userId === null || onFriend === undefined) {
    return (
      <View accessibilityLabel={words} accessible style={styles.line} testID="card-fact">
        {parts}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={words}
      accessibilityRole="button"
      onPress={() => {
        onFriend(userId);
      }}
      style={({ pressed }) => [styles.line, styles.friend, pressed && styles.pressed]}
      testID="card-fact"
    >
      {parts}
      <Text style={styles.more}>›</Text>
    </Pressable>
  );
}

export function CardFacts({ facts, onFriend }: FactsProps): ReactElement {
  return (
    <View style={styles.facts}>
      {facts.map((fact) => (
        <Fact fact={fact} key={`${fact.icon}:${fact.text}`} onFriend={onFriend} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  friend: { minHeight: size.touchMin },
  pressed: { opacity: 0.6 },
  words: { ...text.body, flexShrink: 1, color: color.inkMuted },
  strong: { fontFamily: font.bold, color: color.ink },
  more: { ...text.body, color: color.inkMuted },
});
