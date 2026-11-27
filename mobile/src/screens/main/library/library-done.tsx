/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import { color, font, radius, space, text } from '@/design-system';
import type { Deadline, TicketView } from '@/library/cards/bookings';
import { confirmWords, type LibraryDone, RETURN_SENTENCE } from '@/library/cards/done';
import { useRowFourActions } from '../answer/row-four-actions';
import { type ActTold, useTellAct } from './act-stage';
import { BookedTicket, TicketLine, TicketWithLine } from './booked-ticket';
import { FailureNote, Pill, Pills, Said } from './library-parts';
import { ACT_WORDS, type Acted, BACK_WORDS, ENDED_WORDS, useConfirming } from './use-confirming';
import type { LibraryCardActions, Write } from './use-library-call';
import { NOTE } from '../answer/line-types';

// The done message of a booking (the MainChatLibReserved frame). A seat's is its ticket, booked, with one faint line:
// the time to confirm it at the 좌석배정기 and "예약 취소 ›". Its main button, beside the input, is 가는 길 while the
// booking is on the map and the route guidance can start, or 예약 취소, in red, once that link was pressed; once
// cancelled the ticket greys, one sentence says so, and the map's mark goes (P01 ticket 15). A room's keeps its rows
// and 좌석 현황 보기.

interface DoneProps {
  done: LibraryDone;
  bubbleId: number;
  actions: LibraryCardActions;
  onSeats: () => void;
}

function ignore(): void {
  // The done message reads nothing again after a cancel.
}

type Walk = ReturnType<NonNullable<LibraryCardActions['bookingWalk']>>;

// The main button the done message tells, if any. Armed by "예약 취소 ›", it stands with the ✕ that steps back without
// cancelling (P01 ticket 21), until the cancel is on its way.
function useDoneAct(
  cancelling: boolean,
  write: Write<Acted>,
  bseqno: string,
  walk: Walk,
  back: () => void,
): ActTold | null {
  const { guide, cannotGuide } = useRowFourActions();
  if (cancelling) {
    return {
      words: write.busy ? '취소하는 중' : ACT_WORDS.cancel.confirm,
      onPress: () => {
        write.run({ BSEQNO: Number(bseqno) });
      },
      disabled: write.busy,
      danger: true,
      ...(write.busy ? {} : { back: { label: BACK_WORDS.cancel, onPress: back } }),
    };
  }
  if (walk === null || cannotGuide !== null) {
    return null;
  }
  return {
    words: '가는 길',
    onPress: () => {
      guide(walk.to);
    },
    disabled: false,
    danger: false,
  };
}

function BookedDone({
  done,
  bubbleId,
  actions,
  ticket,
  deadline,
}: DoneProps & { ticket: TicketView; deadline: Deadline }): ReactElement {
  const { place } = done;
  const [cancelling, setCancelling] = useState(false);
  const { outcome, write } = useConfirming('cancel', ignore, {
    onEnd: (ended) => {
      if (ended === 'done' && place !== undefined) {
        actions.finish(place, { kind: 'cancelled', words: ACT_WORDS.cancel.done });
      }
    },
  });
  const gone = outcome === 'done' || (place !== undefined && actions.outcomeOf(place)?.kind === 'cancelled');
  const walk = actions.bookingWalk?.() ?? null;
  const told = useDoneAct(cancelling, write, done.bseqno, walk, () => {
    setCancelling(false);
  });
  useTellAct(actions.act ?? null, bubbleId, gone ? null : told);
  if (gone) {
    return (
      <View style={styles.done} testID="library-done">
        <Said byButton>{ACT_WORDS.cancel.done}</Said>
        <BookedTicket ticket={{ ...ticket, state: 'ended', word: ENDED_WORDS.cancel }} />
      </View>
    );
  }
  const cancel = {
    words: ACT_WORDS.cancel.confirm,
    onPress: (): void => {
      setCancelling(true);
    },
  };
  return (
    <View style={styles.done} testID="library-done">
      <TicketWithLine>
        <BookedTicket ticket={ticket} />
        {done.moved === undefined ? null : <TicketLine link={null} words={`도서관이 정한 시작: ${done.moved}`} />}
        <TicketLine link={cancelling ? null : cancel} words={confirmWords(deadline, walk?.minutes ?? null, now())} />
      </TicketWithLine>
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
    </View>
  );
}

function RoomDone({ done, onSeats }: Pick<DoneProps, 'done' | 'onSeats'>): ReactElement {
  return (
    <View style={styles.done} testID="library-done">
      <View style={styles.rows}>
        {done.rows.map(({ label, value }, index) => (
          <View
            accessibilityLabel={`${label} ${value}`}
            accessible
            key={label}
            style={[styles.row, index === done.rows.length - 1 && styles.last]}
          >
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>{RETURN_SENTENCE}</Text>
      <Pills>
        <Pill label="좌석 현황 보기" onPress={onSeats} />
      </Pills>
    </View>
  );
}

export function LibraryDoneRows(props: DoneProps): ReactElement {
  const { ticket, deadline } = props.done;
  return ticket === undefined || deadline === undefined ? (
    <RoomDone done={props.done} onSeats={props.onSeats} />
  ) : (
    <BookedDone {...props} deadline={deadline} ticket={ticket} />
  );
}

const styles = StyleSheet.create({
  done: { gap: space[2] },
  rows: { paddingVertical: space[1], paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  last: { borderBottomWidth: 0 },
  label: { width: 56, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  value: { flex: 1, minWidth: 0, textAlign: 'right', ...text.label, color: color.ink },
  // A room's return sentence is a note under the done message's words (P01 ticket 19).
  note: NOTE,
});
