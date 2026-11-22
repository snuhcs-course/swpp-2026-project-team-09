/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ReplyOffer } from '@/api/assistant-types';
import { color, space, text } from '@/design-system';
import { ChatMarkdown } from '../chat-markdown';
import { hasMain, OfferCell, type RefusalAsk } from './refusal-reply';

interface OfferedWordsProps {
  text: string;
  offers: readonly ReplyOffer[];
  onAsk: RefusalAsk;
}

// A reply in words with buttons under it, which send their words as the User's (board q11: a Tutorial quest's facts
// with 가는 길 보기). The map stays as it is.
export function OfferedWords({ text: words, offers, onAsk }: OfferedWordsProps): ReactElement {
  // A Quest to cancel has its button beside the input (P04 ticket 24).
  const asks = offers.filter((offer) => offer.kind === 'ask');
  const main = hasMain(asks);
  return (
    <View style={styles.reply} testID="offered-words">
      <ChatMarkdown style={styles.words} text={words} />
      <View style={styles.offers}>
        {asks.map((offer, index) => (
          <OfferCell key={offer.label} main={main && index === 0} offer={offer} onAsk={onAsk} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reply: { gap: space[3] },
  words: { ...text.bodyLg, color: color.ink },
  offers: { flexDirection: 'row', gap: space[2] },
});
