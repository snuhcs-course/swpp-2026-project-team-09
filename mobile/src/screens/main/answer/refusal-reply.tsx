/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Href, router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import type { PickFriendOffer, Refusal, RefusalOffer, RefusalScreen } from '@/api/refusal-types';
import { ChoiceGrid, color, font, type GridChoice, radius, size, space, text } from '@/design-system';
import { profileLabel } from '@/features/friends/profile';
import { useOpenFriendProfile } from '../friend-profile';
import { offerLocation } from './location-offer';

// What cannot be answered (row 8): the server's lines in place of the model's sentence, and under them its offers as
// buttons of one width in one row, in the board's order. The Friends of the question of which Friend stand as the
// choice grid's cells instead.

// Sends words as if the User typed them, with the Friend they were said of when a cell was pressed.
export type RefusalAsk = (words: string, tapped?: { kind: 'friend'; userId: string }) => void;

export type ButtonOffer = Exclude<RefusalOffer, PickFriendOffer>;

function isPick(offer: RefusalOffer): offer is PickFriendOffer {
  return offer.kind === 'pick-friend';
}

export function isButton(offer: RefusalOffer): offer is ButtonOffer {
  return !isPick(offer);
}

const ROUTES: Record<Exclude<RefusalScreen, 'location'>, Href> = {
  'friend-add': '/me/friends/add',
  'location-sharing': '/me/location-sharing',
  timetable: '/me/timetable',
  interests: '/me/interests',
};

export function openScreen(screen: RefusalScreen): void {
  if (screen === 'location') {
    offerLocation();
  } else {
    router.push(ROUTES[screen]);
  }
}

// An `ask` sends its words as if typed; an `open` opens its screen.
export function pressOffer(offer: ButtonOffer, onAsk: (words: string) => void): void {
  if (offer.kind === 'ask') {
    onAsk(offer.text);
  } else {
    openScreen(offer.screen);
  }
}

// The first offer is the main one when it is the only one or the offers differ in kind; a choice of asks is even.
export function hasMain(offers: readonly ButtonOffer[]): boolean {
  return offers.length === 1 || new Set(offers.map(({ kind }) => kind)).size > 1;
}

interface OfferCellProps {
  offer: ButtonOffer;
  main: boolean;
  onAsk: RefusalAsk;
}

export function OfferCell({ offer, main, onAsk }: OfferCellProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={offer.label}
      accessibilityRole="button"
      onPress={() => {
        pressOffer(offer, onAsk);
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

// A Friend's cell: the full name with the department under it, and inside the answer frame the mark that opens the
// Friend's profile without picking them.
function choiceOf(
  { userId, label, aside }: PickFriendOffer,
  openProfile: ((userId: string) => void) | null,
): GridChoice {
  return {
    key: userId,
    name: label,
    sub: aside ?? undefined,
    value: '',
    faint: false,
    label: aside === null ? label : `${label}, ${aside}`,
    more:
      openProfile === null
        ? undefined
        : {
            label: profileLabel(label),
            onPress: (): void => {
              openProfile(userId);
            },
          },
  };
}

function FriendPicks({ picks, onAsk }: { picks: readonly PickFriendOffer[]; onAsk: RefusalAsk }): ReactElement {
  const openProfile = useOpenFriendProfile();
  return (
    <ChoiceGrid
      choices={picks.map((pick) => choiceOf(pick, openProfile))}
      disabled={false}
      onChoose={(userId) => {
        const picked = picks.find((pick) => pick.userId === userId);
        if (picked !== undefined) {
          onAsk(picked.text, { kind: 'friend', userId });
        }
      }}
    />
  );
}

interface RefusalReplyProps {
  refusal: Refusal;
  onAsk: RefusalAsk;
}

// The lines of a reply that is no answer, as row 8 draws them: the first in the title style, the second smaller and
// muted.
export function ReplyLines({ lines, testID }: { lines: readonly AnswerLine[]; testID?: string }): ReactElement {
  return (
    <View>
      {lines.map((line, row) => (
        // The lines have no id, and their order is their meaning.
        // oxlint-disable-next-line react/no-array-index-key
        <Text key={row} style={row === 0 ? styles.first : styles.second} testID={testID}>
          {line.map(({ text: words, strong }, part) => (
            // oxlint-disable-next-line react/no-array-index-key
            <Text key={part} style={strong ? styles.strong : undefined}>
              {words}
            </Text>
          ))}
        </Text>
      ))}
    </View>
  );
}

export function RefusalReply({ refusal, onAsk }: RefusalReplyProps): ReactElement {
  const { lines } = refusal;
  const picks = refusal.offers.filter((offer) => isPick(offer));
  const offers = refusal.offers.filter((offer) => isButton(offer));
  const main = hasMain(offers);
  return (
    <View style={styles.reply} testID="refusal-reply">
      <ReplyLines lines={lines} testID="refusal-line" />
      {picks.length === 0 ? null : <FriendPicks onAsk={onAsk} picks={picks} />}
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
