/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { color, font, text, WaitingDots } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { keepsShown } from '@/features/assistant/use-shown-answer';
import { markdownLabel } from '../chat-markdown';
import type { ChatSheetControl } from '../chat-sheet';
import { linesOf } from './plan-card';

// The first line of some words, without the Markdown's markers.
export function wordsLine(words: string): AnswerLine {
  const line = markdownLabel(words)
    .split('\n')
    .find((one) => one.trim() !== '');
  return [{ text: line ?? '', strong: false }];
}

// A reply's headline, as the frame's card draws the reply (`Words`): for the reply whose answer is on screen, the
// first line its Plan's card draws; for the reply whose Lookup is on screen, the Lookup's title, its first line;
// otherwise the first of the reply's lines, or of its words.
export function headlineOf(reply: ChatBubble, control: Pick<ChatSheetControl, 'answer' | 'lookup'>): AnswerLine {
  const { answer: shown, lookup: onScreen } = control;
  const { answer, refusal = null } = reply;
  const keeps = keepsShown(reply);
  const fromReply = answer !== undefined && answer !== null && answer === shown.source;
  if ((fromReply || keeps) && shown.answer !== null) {
    const over = keeps ? refusal?.lines[0] : undefined;
    // The card says nothing of a Plan at rest, but the headline over the keyboard names it, the map being covered.
    const said = linesOf(shown, shown.answer, shown.adding)[0] ?? shown.plan?.lines[0];
    return over ?? said ?? wordsLine(reply.text);
  }
  const lookup = keeps ? onScreen.lookup : (reply.lookup ?? null);
  if (lookup !== null && lookup === onScreen.lookup) {
    return (refusal?.lines ?? lookup.lines)[0] ?? wordsLine(reply.text);
  }
  const lines = refusal?.lines ?? answer?.plans[0]?.lines ?? answer?.noPlan?.lines ?? reply.lookup?.lines;
  return lines?.[0] ?? wordsLine(reply.text);
}

// While the keyboard is up the card shows one line in place of its content, so that a follow-up is written in sight of
// what it follows: the headline of the turn on screen, cut to fit, or the dots while its reply is on its way.
export function KeyboardHeadline({ control }: { control: ChatSheetControl }): ReactElement | null {
  const { bubbles, waiting } = control.chat;
  if (waiting) {
    return <WaitingDots label="보는 중" />;
  }
  const reply = turnOf(bubbles)?.after[0];
  if (reply === undefined) {
    return null;
  }
  return (
    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.line} testID="answer-headline">
      {headlineOf(reply, control).map(({ text: words, strong }, part) => (
        // The parts have no id, and their order is their meaning.
        // oxlint-disable-next-line react/no-array-index-key
        <Text key={part} style={strong ? styles.strong : undefined}>
          {words}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { ...text.title, color: color.ink },
  strong: { fontFamily: font.bold, color: color.snuBlue },
});
