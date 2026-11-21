/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import { turnsOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { setQuestOf } from '@/features/assistant/set-quest';
import { keepsShown } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from '../chat-sheet';
import { DockChip, DockLine } from './dock-chips';
import { planCardRests } from './plan-card';
import { pressOffer } from './refusal-reply';
import { onScreenOf, planShown, Words, wordsKindOf } from './reply-words';
import type { BandFocus } from './use-corrections';
import { lookupRestOf, setQuestRestOf, type WordsRest, wordsRestOf } from './words-rest';

// How the turn on screen rests while nothing is pressed: its Plan's card docked as its chips' row (board 10), the dock
// with a reply's one line and buttons (`WordsRest`), or null for the open card.
export type Rest = { kind: 'plan' } | { kind: 'words'; words: WordsRest };

// A reply that holds nothing but its words: no card, map button, Proposal, steps, or booking, and not the app's own.
function bare(reply: ChatBubble): boolean {
  const { cards, mapButtons, proposal, steps, done, own = false } = reply;
  return (
    cards.length === 0 &&
    mapButtons.length === 0 &&
    proposal === null &&
    steps === undefined &&
    done === undefined &&
    !own
  );
}

// The Plan's card alone with nothing to read.
function planRests(control: ChatSheetControl, reply: ChatBubble): boolean {
  const { answer: shown, chat } = control;
  const refusal = keepsShown(reply) ? (reply.refusal?.lines ?? []) : [];
  return (
    planShown(chat.bubbles, onScreenOf(control)) && shown.answer !== null && planCardRests(shown, shown.answer, refusal)
  );
}

// A Plan beside a Quest the User holds, at rest: its line says so (P04 ticket 17).
function besideSetQuest(control: ChatSheetControl): boolean {
  const { answer: shown, chat } = control;
  const { plan, adding, moving, ghost } = shown;
  return (
    setQuestOf(shown.answer) !== null &&
    plan !== null &&
    !adding &&
    moving === null &&
    ghost === null &&
    planShown(chat.bubbles, onScreenOf(control))
  );
}

// The bottom hides only what the map already says: a reply with cards, with several parts, or with nothing to draw
// keeps the open card, and so does a Plan's card with something to read. A Plan beside a Quest the User holds docks
// with its line.
export function restOf(control: ChatSheetControl, after: readonly ChatBubble[]): Rest | null {
  const [reply] = after;
  if (after.length !== 1 || reply === undefined || !bare(reply)) {
    return null;
  }
  const kind = wordsKindOf(reply, onScreenOf(control));
  if (kind === 'plan') {
    if (besideSetQuest(control)) {
      const { changed, left } = control.invitation;
      return { kind: 'words', words: setQuestRestOf(reply.text, changed ?? left) };
    }
    return planRests(control, reply) ? { kind } : null;
  }
  const { lookup } = control.lookup;
  let words: WordsRest | null = null;
  if (kind === 'lookup' && lookup !== null) {
    words = lookupRestOf(lookup, reply.refusal ?? null, reply.text);
  } else if (kind === 'own') {
    words = wordsRestOf(reply);
  }
  return words === null ? null : { kind: 'words', words };
}

type Raise = (earlier: boolean) => void;

// "지난 답 N개" while the conversation has turns before this one, and the answer's note; each raises the card with
// what it names.
function FoldedChips({
  control,
  note,
  onRaise,
}: {
  control: ChatSheetControl;
  note: string | null;
  onRaise: Raise;
}): ReactElement {
  const earlier = turnsOf(control.chat.bubbles).length - 1;
  return (
    <>
      {earlier > 0 ? (
        <DockChip
          onPress={() => {
            onRaise(true);
          }}
          words={`지난 답 ${String(earlier)}개`}
        />
      ) : null}
      {note === null ? null : (
        <DockChip
          onPress={() => {
            onRaise(false);
          }}
          words={note}
        />
      )}
    </>
  );
}

interface DockedWordsProps {
  control: ChatSheetControl;
  rest: WordsRest;
  onRaise: Raise;
}

// The reply's buttons as chips, which scroll sideways: its offers and 다시 시도, disabled while the next reply is on its
// way, for they act on the turn before; 근거 ›, which raises the card; 그대로 두기 beside a Quest the User holds, which
// leaves it as it is (P04 ticket 20); and the folded chips.
function ReplyChips({ control, rest, onRaise }: DockedWordsProps): ReactElement {
  const { offers, retry, note, basis, keep = false } = rest;
  const { send, waiting } = control.chat;
  return (
    <ScrollView
      contentContainerStyle={styles.chips}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.chipsBox}
    >
      {offers.map((offer) => (
        <DockChip
          disabled={waiting}
          key={offer.label}
          onPress={() => {
            pressOffer(offer, send);
          }}
          words={offer.label}
        />
      ))}
      {basis ? (
        <DockChip
          onPress={() => {
            onRaise(false);
          }}
          words="근거 ›"
        />
      ) : null}
      {retry ? <DockChip disabled={waiting} onPress={control.chat.retry} words="다시 시도" /> : null}
      {keep ? <DockChip onPress={control.invitation.leave} words="그대로 두기" /> : null}
      <FoldedChips control={control} note={note} onRaise={onRaise} />
    </ScrollView>
  );
}

// A reply's dock: its one line, which raises the card with the whole reply, then its buttons as chips, and the folded
// chips. Nothing when the map says it all and nothing is folded.
function DockedWords({ control, rest, onRaise }: DockedWordsProps): ReactElement | null {
  const { line, offers, retry, note, basis } = rest;
  const empty = line === null && offers.length === 0 && !retry && note === null && !basis;
  if (empty && turnsOf(control.chat.bubbles).length < 2) {
    return null;
  }
  return (
    <View style={styles.row} testID="dock-row">
      {line === null ? null : (
        <DockLine
          line={line}
          onPress={() => {
            onRaise(false);
          }}
        />
      )}
      <ReplyChips control={control} onRaise={onRaise} rest={rest} />
    </View>
  );
}

interface DockedAnswerProps {
  control: ChatSheetControl;
  bubble: ChatBubble;
  rest: Rest;
  focus: BandFocus;
  onClose: () => void;
  // Raises the card, with the earlier turns open when `earlier` is true.
  onRaise: Raise;
}

// The docked card's content: a reply's dock, or the Plan's chips' row, which ends with the folded chips.
export function DockedAnswer({
  control,
  bubble,
  rest,
  focus,
  onClose,
  onRaise,
}: DockedAnswerProps): ReactElement | null {
  if (rest.kind === 'words') {
    return <DockedWords control={control} onRaise={onRaise} rest={rest.words} />;
  }
  return (
    <Words
      addRecalculated={control.chat.addRecalculated}
      bubble={bubble}
      dock={<FoldedChips control={control} note={control.answer.answer?.note ?? null} onRaise={onRaise} />}
      focus={focus}
      howAbout={control.howAbout}
      invitation={control.invitation}
      lookup={control.lookup}
      onAsk={control.chat.send}
      onClose={onClose}
      room={null}
      shown={control.answer}
    />
  );
}

const styles = StyleSheet.create({
  // One row, as board 8 draws it: the line keeps at least half and is cut, and the chips scroll sideways.
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  chipsBox: { flexGrow: 0, flexShrink: 1 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
