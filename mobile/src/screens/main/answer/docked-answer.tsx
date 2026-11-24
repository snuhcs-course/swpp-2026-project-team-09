/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PickOffer } from '@/api/pick-types';
import { now } from '@/clock';
import { color, space, text } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { setQuestOf } from '@/features/assistant/set-quest';
import { leaveOfferOf, leaveWordsOf } from '@/features/assistant/use-quest-leaving';
import { keepsShown } from '@/features/assistant/use-shown-answer';
import { koreaDateKey } from '@/korea-time';
import type { ChatSheetControl } from '../chat-sheet';
import { DockChip, DockLine, WORDS_LINES } from './dock-chips';
import { LeaveRow } from './leave-button';
import { MealDock } from './meal-dock';
import { PickTimeSheet } from './pick-time-sheet';
import { planCardRests } from './plan-card';
import { wordsLine } from './keyboard-headline';
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
// with its line, and a Proposal on the map docks.
export function restOf(control: ChatSheetControl, after: readonly ChatBubble[]): Rest | null {
  const [reply] = after;
  // A Proposal drawn on the map docks with nothing to read: its flag says what and when (P04 ticket 06).
  if (reply !== undefined && control.proposal?.bubbleId === reply.id) {
    return { kind: 'words', words: { line: null, offers: [], retry: false, note: null } };
  }
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

export type Raise = (earlier: boolean) => void;

const PICKING_PLACE = '지도에서 건물을 눌러 주세요';

// The pickers act only on the conversation's latest turn, whose question they answer, and offer no day that has
// passed (P04 ticket 26).
function livePicks({ latest }: ChatSheetControl, { picks = [] }: WordsRest): readonly PickOffer[] {
  const today = koreaDateKey(now());
  return latest ? picks.filter((offer) => offer.kind !== 'pick-time' || offer.date >= today) : [];
}

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
  // The card rests at the dock; raised, the dock lies hidden under the open content (P04 ticket 57).
  atRest: boolean;
}

// The reply's buttons as chips, which scroll sideways: its offers and 다시 시도, disabled while the next reply is on its
// way, for they act on the turn before; 그대로 두기 beside a Quest the User holds, which leaves it as it is (P04
// ticket 20); and the folded chips.
function ReplyChips({ control, rest }: Pick<DockedWordsProps, 'control' | 'rest'>): ReactElement {
  const { offers, retry } = rest;
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
      {livePicks(control, rest).map((offer) => (
        <DockChip
          disabled={waiting}
          key={offer.kind}
          onPress={() => {
            if (offer.kind === 'pick-place' && control.pick.place !== null) {
              control.pick.stop();
            } else {
              control.pick.start(offer);
            }
          }}
          words={offer.kind === 'pick-place' && control.pick.place !== null ? '그만 고르기' : offer.label}
        />
      ))}
      {retry && control.latest ? <DockChip disabled={waiting} onPress={control.chat.retry} words="다시 시도" /> : null}
    </ScrollView>
  );
}

// A reply's dock: its one line, which raises the card with the whole reply, then its buttons as chips, and the folded
// chips. Nothing when the map says it all and nothing is folded.
function DockedWords({ control, rest, onRaise, atRest }: DockedWordsProps): ReactElement | null {
  const { offers, retry, note } = rest;
  // While the map is picking a Place (P04 ticket 26), the line says what to do.
  const line = control.pick.place === null ? rest.line : wordsLine(PICKING_PLACE);
  const { time } = control.pick;
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
            // A reply of words alone shows up to five lines before it is cut (P04 ticket 45).
            lines={WORDS_LINES}
            onPress={
              // While a Place is picked, the line says what to do and raises nothing (P04 ticket 26).
              rest.still === true || control.pick.place !== null
                ? undefined
                : () => {
                    onRaise(false);
                  }
            }
          />
        )}
        <ReplyChips control={control} rest={rest} />
      </View>
      {
        // A note says a fact ("캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요"): plain words on the sheet's lines, wrapping, with
        // no box and no press (P04 ticket 55).
        note === null ? null : (
          <Text style={styles.note} testID="dock-note">
            {note}
          </Text>
        )
      }
      <LeaveRow control={control} />
      {time === null || !atRest ? null : (
        <PickTimeSheet offer={time} onClose={control.pick.stop} onPick={control.pick.chooseTime} />
      )}
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
  // The card rests at the dock; raised, the dock lies hidden under the open content (P04 ticket 57).
  atRest: boolean;
}

// The docked card's content: a reply's dock, a meal answer's sentence, or the Plan's chips' row with the folded chips.
export function DockedAnswer({
  control,
  bubble,
  rest,
  focus,
  onClose,
  onRaise,
  atRest,
}: DockedAnswerProps): ReactElement | null {
  if (rest.kind === 'words') {
    // 그대로 두기 beside a Quest the User holds stands with 바꾸기 on the main row (P04 ticket 50), not here.
    return <DockedWords atRest={atRest} control={control} onRaise={onRaise} rest={rest.words} />;
  }
  if (control.answer.answer?.input.kind === 'meal') {
    return <MealDock atRest={atRest} bubble={bubble} control={control} onRaise={onRaise} />;
  }
  const folded = <FoldedChips control={control} note={control.answer.answer?.note ?? null} onRaise={onRaise} />;
  return (
    <Words
      addRecalculated={control.chat.addRecalculated}
      bubble={bubble}
      dock={folded}
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
  // One row, as board 8 draws it: the chips keep their own width, so that a chip is always whole, and scroll sideways
  // past half the row; the line takes what is left and is cut at its two lines.
  rest: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  chipsBox: { flexGrow: 0, flexShrink: 0, maxWidth: '50%' },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // The line alone above the meal's chip row (P04 ticket 21).
  rows: { gap: space[2] },
  note: { ...text.caption, color: color.inkMuted },
});
