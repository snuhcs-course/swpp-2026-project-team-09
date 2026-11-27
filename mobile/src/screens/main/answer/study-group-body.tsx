/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { RoomRequest } from '@/api/room-requests';
import type { StudyGroup } from '@/api/study-plan-types';
import { color, space, text } from '@/design-system';
import { withChosenRoom } from '@/features/assistant/plan-input';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaClock } from '@/korea-time';
import type { Slot } from '@/library/cards/payloads';
import { useLibrarySession } from '@/library/library-session';
import { keepRequestAnswer } from '@/library/room-bookings';
import type { TellAct } from '../library/act-stage';
import { FailureNote } from '../library/library-parts';
import { OneMorePicker } from '../library/room-ask-more';
import { RoomTicket } from '../library/room-ticket';
import { keepUse, keptUse } from '../library/use-chooser';
import type { LibraryCardActions } from '../library/use-library-call';
import { usePartyRequest } from '../library/room-party';
import { mainOf, useGroupAct } from './study-group-act';
import { BookingFailure, Choosers, type Open, RequestLine, UseLine } from './study-group-parts';
import { useGroupBooking } from './use-group-booking';
import { consentWords, groupOfRequest, isBooked, isOut, outWords, partyCardOf } from './study-group-request';
import { ChatMarkdown } from '../chat-markdown';
import { LOW_LINES } from './card-caps';

// The study answer together in the meal's frame (P10 ticket 11; design group-study-design ② ③ 가): the Assistant's one
// sentence, or how many more people the room needs; the room ticket (ticket 10) with the kind's first room free for the
// whole time, read from the library; the use of the room under it; and the chooser of the cell or the line opened. Its
// main button stands beside the input, told as a booking ticket's is: "+ 같이" while people are missing, 로그인 while
// logged out of the library, and else "동의 요청 보내기" (`study-group-act.ts`). Once sent (ticket 12) the request runs as
// a room card's does (`usePartyRequest`): the ticket is held, the consents are said with "요청 취소 ›" at the line's end,
// and a Friend out is said, with one more Friend asked from the main button.

const COUNTS = ['', '한 명만', '두 명', '세 명'];

// "그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요."
export function shortWords(moreNeeded: number): string {
  const more = COUNTS[moreNeeded] ?? `${String(moreNeeded)}명`;
  return `그룹스터디룸은 네 명부터예요. ${more} 더 부르면 돼요.`;
}

export function slotOf(answer: AnswerReply, plan: Plan): Slot {
  return {
    date: answer.input.kind === 'study' ? answer.input.date : '',
    start: koreaClock(plan.startAt),
    minutes: plan.togetherMinutes,
  };
}

interface GroupBodyProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  plan: Plan;
  group: StudyGroup;
  said: string;
  busy: boolean;
  // Opens the Friends to pick in the time card, as its "＋ 같이" does.
  onAdd: () => void;
  act?: TellAct;
  bubbleId?: number;
  library?: LibraryCardActions;
}

// The sentence, the Friend out once the request is sent, or how many more people the room needs. Written as an
// answer's words, it takes the lines the card shows at its lowest step whole, so that the ticket under it never shows
// cut there (#655's pictures).
function GroupWords({ group, said, out }: { group: StudyGroup; said: string; out: string | null }): ReactElement {
  const { fontScale } = useWindowDimensions();
  const words = out ?? (group.moreNeeded > 0 ? shortWords(group.moreNeeded) : null);
  return (
    <View style={{ minHeight: LOW_LINES * text.bodyLg.lineHeight * fontScale }} testID="study-group-words">
      {words === null ? <ChatMarkdown style={styles.words} text={said} /> : <Text style={styles.words}>{words}</Text>}
    </View>
  );
}

// The seat answer's line under the ticket, said only where the main button is 로그인.
function LogInNote({ shown }: { shown: boolean }): ReactElement | null {
  return shown ? <FailureNote failure="noSession" onLogIn={null} /> : null;
}

// What the card holds: the cell or the line opened, the room chosen, and the use, which starts as the one kept.
function useGroupChoices(
  group: StudyGroup,
  shown: ShownAnswer,
): {
  open: Open;
  chosen: string | null;
  use: string | null;
  toggle: (cell: Exclude<Open, null>) => () => void;
  onKind: (spaceId: string) => void;
  onRoom: (name: string) => void;
  onUse: (use: string) => void;
} {
  const [open, setOpen] = useState<Open>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [use, setUse] = useState<string | null>(null);
  useEffect(() => {
    void keptUse(group.useDescOptions).then(setUse);
  }, [group.useDescOptions]);
  return {
    open,
    chosen,
    use,
    toggle: (cell) => (): void => {
      setOpen((last) => (last === cell ? null : cell));
    },
    onKind: (spaceId) => {
      setOpen(null);
      setChosen(null);
      shown.change((input) => withChosenRoom(input, spaceId));
    },
    onRoom: (name) => {
      setChosen(name);
      setOpen(null);
    },
    onUse: (next) => {
      setUse(next);
      setOpen(null);
      void keepUse(next);
    },
  };
}

// The request out, the card's lock on the answer while it is, and the picker of one more Friend.
function useGroupRequest(
  props: GroupBodyProps,
  use: string | null,
  // The room on the ticket, read when the request is made: the room it was sent with.
  room: { readonly current: string | null },
): {
  party: ReturnType<typeof usePartyRequest>;
  out: RoomRequest | null;
  // Booked: sent and no longer out; the card stays as it was, its ticket locked.
  booked: boolean;
  asking: boolean;
  setAsking: (asking: boolean) => void;
  sent: string | null;
} {
  const { shown, answer, plan, group, bubbleId } = props;
  const [sent, setSent] = useState<string | null>(null);
  const party = usePartyRequest(
    partyCardOf(answer, plan, group),
    `study-group:${String(bubbleId ?? 0)}`,
    use,
    (made) => {
      setSent(room.current);
      if (made.madeForBooking) {
        void keepRequestAnswer(made.questId, { requestId: made.id, answer });
      }
    },
  );
  const out = isOut(party.request) ? party.request : null;
  const booked = isBooked(party.request);
  const [asking, setAsking] = useState(false);
  const held = out !== null || booked;
  const { lock } = shown;
  // Let go when the card goes, as when the User asks anything else after sending (#656's review).
  useEffect(() => {
    lock(held);
    return (): void => {
      lock(false);
    };
  }, [lock, held]);
  return { party, out, booked, asking, setAsking, sent };
}

// What the card holds and reads: its choices, the request out, and the room and its booking.
function useGroupBody(props: GroupBodyProps): {
  loggedIn: boolean;
  slot: Slot;
  choices: ReturnType<typeof useGroupChoices>;
  request: ReturnType<typeof useGroupRequest>;
  booking: ReturnType<typeof useGroupBooking>;
  onScreen: StudyGroup;
} {
  const { answer, plan, group, shown } = props;
  const { loggedIn } = useLibrarySession();
  const slot = slotOf(answer, plan);
  const choices = useGroupChoices(group, shown);
  const roomShown = useRef<string | null>(null);
  const request = useGroupRequest(props, choices.use, roomShown);
  const { party, out, sent, setAsking } = request;
  const { chosen, use } = choices;
  const booking = useGroupBooking({
    group,
    slot,
    loggedIn,
    shown,
    party,
    out,
    sent,
    chosen,
    use,
    library: props.library,
  });
  const { room } = booking;
  useEffect(() => {
    roomShown.current = room;
  });
  const onScreen = groupOfRequest(group, out);
  const onAsk = (): void => {
    setAsking(true);
  };
  // A request is sent with its use, as a room card's 예약하기 waits for one: no send before a use is chosen (#657).
  const sendable = use === null ? { ...party, send: null } : party;
  useGroupAct({ ...props, ...booking, group: onScreen, loggedIn, party: sendable, onAsk });
  return { loggedIn, slot, choices, request, booking, onScreen };
}

// Under the ticket: the login line; a cell's chooser; the use line, and the use's chooser under it (design
// group-study-design ④ ⑤).
export function StudyGroupBody(props: GroupBodyProps): ReactElement {
  const { loggedIn, slot, choices, request, booking, onScreen } = useGroupBody(props);
  const { party, out, booked, asking, setAsking } = request;
  const { open, use, toggle } = choices;
  const { room } = booking;
  const held = out !== null || booked;
  const ready = out?.status === 'ready';
  const chooser = (at: Open): ReactElement => (
    <Choosers {...choices} group={props.group} open={at} room={room} rooms={booking.free} slot={slot} />
  );
  return (
    <View style={styles.body} testID="study-group-body">
      <GroupWords group={onScreen} out={(out === null ? null : outWords(out)) ?? booking.sentence} said={props.said} />
      <RoomTicket
        group={onScreen}
        kindHeld={ready}
        locked={held && !ready}
        loggedIn={loggedIn}
        onKind={toggle('kind')}
        onRoom={toggle('room')}
        open={(!held || ready) && (open === 'kind' || open === 'room') ? open : null}
        room={room}
      />
      <LogInNote shown={mainOf(onScreen, loggedIn, party).main === 'logIn' && open !== 'kind' && open !== 'room'} />
      {held && !ready ? null : chooser(open === 'use' ? null : open)}
      {/* Booked, the done message under the card says it: no line of its own, and nothing to choose or take back. */}
      {booked ? null : out === null ? (
        <UseLine failed={party.failed} onPress={toggle('use')} use={use} />
      ) : (
        <RequestLine onCancel={party.cancel} words={booking.line ?? consentWords(out)} />
      )}
      <BookingFailure failure={booking.failure} onLogIn={booking.logIn} />
      {out !== null && asking ? (
        <OneMorePicker
          onAsked={party.update}
          onClose={() => {
            setAsking(false);
          }}
          request={out}
        />
      ) : null}
      {!held && open === 'use' ? chooser('use') : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3] },
  words: { ...text.bodyLg, color: color.ink },
});
