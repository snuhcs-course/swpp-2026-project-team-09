/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { setQuestOf } from '@/features/assistant/set-quest';
import { leaveOfferOf, leaveWordsOf } from '@/features/assistant/use-quest-leaving';
import { keepsShown } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from '../chat-sheet';
import { DockChip, DockLine } from './dock-chips';
import { LeaveRow } from './leave-button';
import { WithMenuList } from './meal-list';
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
      const { changed, refused, left } = control.invitation;
      const leftAlone = changed === null && refused === null && left !== null;
      return { kind: 'words', words: setQuestRestOf(reply.text, changed ?? refused ?? left, leftAlone) };
    }
    return planRests(control, reply) ? { kind } : null;
  }
  const { lookup } = control.lookup;
  let words: WordsRest | null = null;
  if (kind === 'lookup' && lookup !== null) {
    words = lookupRestOf(lookup, reply.refusal ?? null, reply.text);
  } else if (kind === 'own') {
    const leave = leaveOfferOf(reply);
    words = wordsRestOf(
      reply,
      leave === null ? null : leaveWordsOf(leave, control.leave.stateOf(reply.id, leave.questId)),
    );
  }
  return words === null ? null : { kind: 'words', words };
}

type Raise = (earlier: boolean) => void;

// The answer's note, which raises the card with what it names. Earlier questions are in the pill's list (P04 ticket
// 10).
function FoldedChips({
  note,
  onRaise,
}: {
  control: ChatSheetControl;
  note: string | null;
  onRaise: Raise;
}): ReactElement {
  return (
    <>
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

// 그대로 두기 waits while 바꾸기 or a recalculation is on its way (PR 444's review): the answer it would leave is about to
// change.
function choosing({ invitation, answer }: ChatSheetControl): boolean {
  return invitation.sending || invitation.changing || answer.recalculating;
}

// The reply's buttons as chips, which scroll sideways: its offers and 다시 시도, disabled while the next reply is on its
// way, for they act on the turn before; 그대로 두기 beside a Quest the User holds, which leaves it as it is (P04
// ticket 20); and the folded chips.
function ReplyChips({ control, rest, onRaise }: DockedWordsProps): ReactElement {
  const { offers, retry, note, keep = false } = rest;
  const { send, waiting } = control.chat;
  return (
    <ScrollView
      contentContainerStyle={styles.chips}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.chipsBox}
      testID="dock-chips"
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
      {retry && control.latest ? <DockChip disabled={waiting} onPress={control.chat.retry} words="다시 시도" /> : null}
      {keep ? <DockChip disabled={choosing(control)} onPress={control.invitation.leave} words="그대로 두기" /> : null}
      <FoldedChips control={control} note={note} onRaise={onRaise} />
    </ScrollView>
  );
}

// A reply's dock: its one line, which raises the card with the whole reply, then its buttons as chips, and the folded
// chips. Nothing when the map says it all and nothing is folded.
function DockedWords({ control, rest, onRaise }: DockedWordsProps): ReactElement | null {
  const { line, offers, retry, note } = rest;
  const empty = line === null && offers.length === 0 && !retry && note === null;
  if (empty) {
    return null;
  }
  return (
    <View style={styles.rest}>
      <View style={styles.row} testID="dock-row">
        {line === null ? null : (
          <DockLine
            line={line}
            onPress={
              rest.still === true
                ? undefined
                : () => {
                    onRaise(false);
                  }
            }
          />
        )}
        <ReplyChips control={control} onRaise={onRaise} rest={rest} />
      </View>
      <LeaveRow control={control} />
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

// The docked card's content: a reply's dock, or the Plan's chips' row with the folded chips, and in a meal answer
// 메뉴 모두 보기 and its list (`WithMenuList`).
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
  const folded = <FoldedChips control={control} note={control.answer.answer?.note ?? null} onRaise={onRaise} />;
  return (
    <WithMenuList
      folded={folded}
      sent={control.invitation.sending || control.invitation.made !== null}
      shown={control.answer}
    >
      {(dock) => (
        <Words
          addRecalculated={control.chat.addRecalculated}
          bubble={bubble}
          dock={dock}
          focus={focus}
          howAbout={control.howAbout}
          invitation={control.invitation}
          lookup={control.lookup}
          onAsk={control.chat.send}
          onClose={onClose}
          room={null}
          shown={control.answer}
        />
      )}
    </WithMenuList>
  );
}

const styles = StyleSheet.create({
  // One row, as board 8 draws it: the chips keep their own width, so that a chip is always whole, and scroll sideways
  // past half the row; the line takes what is left and is cut at its two lines.
  rest: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  chipsBox: { flexGrow: 0, flexShrink: 0, maxWidth: '50%' },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
