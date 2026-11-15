/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Href, router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Refusal, RefusalOffer, RefusalScreen } from '@/api/refusal-types';
import { color, font, radius, size, space, text } from '@/design-system';
import { offerLocation } from './location-offer';

// What cannot be answered (row 8): the server's lines in place of the model's sentence, and under them its offers as
// buttons of one width in one row, in the board's order.

const ROUTES: Record<Exclude<RefusalScreen, 'location'>, Href> = {
  'friend-add': '/me/friends/add',
  'location-sharing': '/me/location-sharing',
  timetable: '/me/timetable',
  interests: '/me/interests',
};

function opened(screen: RefusalScreen): void {
  if (screen === 'location') {
    offerLocation();
  } else {
    router.push(ROUTES[screen]);
  }
}

// The first offer is the main one when it is the only one or the offers differ in kind; a choice of asks is even.
function hasMain(offers: readonly RefusalOffer[]): boolean {
  return offers.length === 1 || new Set(offers.map(({ kind }) => kind)).size > 1;
}

interface OfferCellProps {
  offer: RefusalOffer;
  main: boolean;
  onAsk: (words: string) => void;
}

function OfferCell({ offer, main, onAsk }: OfferCellProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={offer.label}
      accessibilityRole="button"
      onPress={() => {
        if (offer.kind === 'ask') {
          onAsk(offer.text);
        } else {
          opened(offer.screen);
        }
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.cell,
        main ? styles.main : styles.other,
        pressed && (main ? styles.mainPressed : styles.otherPressed),
      ]}
      testID="refusal-offer"
    >
      <Text numberOfLines={2} style={[styles.label, main && styles.mainLabel]}>
        {offer.label}
      </Text>
    </Pressable>
  );
}

interface RefusalReplyProps {
  refusal: Refusal;
  // Sends words as if the User typed them.
  onAsk: (words: string) => void;
}

export function RefusalReply({ refusal, onAsk }: RefusalReplyProps): ReactElement {
  const { lines, offers } = refusal;
  const main = hasMain(offers);
  return (
    <View style={styles.reply} testID="refusal-reply">
      <View>
        {lines.map((line, row) => (
          // The lines have no id, and their order is their meaning.
          // oxlint-disable-next-line react/no-array-index-key
          <Text key={row} style={row === 0 ? styles.first : styles.second} testID="refusal-line">
            {line.map(({ text: words, strong }, part) => (
              // oxlint-disable-next-line react/no-array-index-key
              <Text key={part} style={strong ? styles.strong : undefined}>
                {words}
              </Text>
            ))}
          </Text>
        ))}
      </View>
      {offers.length === 0 ? null : (
        <View style={styles.offers} testID="refusal-offers">
          {offers.map((offer, index) => (
            <OfferCell key={offer.label} main={main && index === 0} offer={offer} onAsk={onAsk} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reply: { gap: space[3] },
  first: { ...text.title, color: color.ink },
  second: { ...text.body, color: color.inkMuted },
  strong: { fontFamily: font.bold, color: color.snuBlue },
  offers: { flexDirection: 'row', gap: space[2] },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: size.touchMin,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  main: { backgroundColor: color.snuBlue, borderColor: color.snuBlue },
  other: { backgroundColor: color.surface, borderColor: color.borderStrong },
  mainPressed: { backgroundColor: color.snuBluePressed, borderColor: color.snuBluePressed },
  otherPressed: { backgroundColor: color.blue50 },
  label: { ...text.label, color: color.snuBlue, textAlign: 'center' },
  mainLabel: { color: color.onPrimary },
});
