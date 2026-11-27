/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { RoomRequest } from '@/api/room-requests';
import type { StudyGroup } from '@/api/study-plan-types';
import { color, font, space, text } from '@/design-system';
import { withChosenRoom } from '@/features/assistant/plan-input';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaClock } from '@/korea-time';
import type { Slot } from '@/library/cards/payloads';
import { freeRooms } from '@/library/cards/rooms';
import { useLibrarySession } from '@/library/library-session';
import type { TellAct } from '../library/act-stage';
import { FailureNote } from '../library/library-parts';
import { TicketLine } from '../library/booked-ticket';
import { OneMorePicker } from '../library/room-ask-more';
import { RoomKindChooser } from '../library/room-kind-chooser';
import { useRoomKindCounts } from '../library/room-kind-counts';
import { RoomNumberChooser } from '../library/room-number-chooser';
import { RoomTicket } from '../library/room-ticket';
import { roomTimesFor } from '../library/room-times';
import { useRooms } from '../library/use-room-counts';
import { keepUse, keptUse, UseChooser } from '../library/use-chooser';
import { useLibraryLoad } from '../library/use-library-call';
import { SEND_FAILED, usePartyRequest } from '../library/room-party';
import { mainOf, useGroupAct } from './study-group-act';
import { consentWords, groupOfRequest, isOut, outWords, partyCardOf } from './study-group-request';
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

type Open = 'kind' | 'room' | 'use' | null;

// The kind's rooms free for the whole time, read while logged in; the room on the ticket is the one chosen, else the
// first of them.
function useRoomsFree(group: StudyGroup, slot: Slot, loggedIn: boolean): ReturnType<typeof freeRooms> | null {
  const kind = group.room.space;
  const { loaded } = useLibraryLoad(
    () => (loggedIn ? roomTimesFor(kind, slot.date) : Promise.resolve([])),
    `${kind.id} ${slot.date} ${slot.start} ${String(slot.minutes)} ${String(loggedIn)}`,
  );
  return loaded.state === 'ready' && loggedIn ? freeRooms(loaded.value, kind.seatNos, slot) : null;
}

// The use of the room, and under it the room card's words when the requests could not be sent.
function UseLine({ use, failed, onPress }: { use: string | null; failed: boolean; onPress: () => void }): ReactElement {
  return (
    <>
      <Pressable
        accessibilityLabel={`사용 용도: ${use ?? '고르기'}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.useLine}
        testID="room-use-line"
      >
        <Text style={styles.hint}>사용 용도</Text>
        <Text style={styles.link}>{`${use ?? '고르기'} ›`}</Text>
      </Pressable>
      {failed ? <FailureNote failure={null} message={SEND_FAILED} onLogIn={null} /> : null}
    </>
  );
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
}

function Choosers(props: {
  open: Open;
  group: StudyGroup;
  slot: Slot;
  rooms: ReturnType<typeof freeRooms> | null;
  room: string | null;
  use: string | null;
  onKind: (spaceId: string) => void;
  onRoom: (name: string) => void;
  onUse: (use: string) => void;
}): ReactElement | null {
  const { open, group, slot, rooms, room, use } = props;
  const counting = useRoomKindCounts(
    group.rooms.filter(({ fits }) => fits).map((kind) => kind.space),
    slot,
  );
  const counted = useRooms(counting);
  useEffect(() => {
    if (open === 'kind') {
      void counting.read();
    }
  }, [open, counting]);
  if (open === 'kind') {
    const counts = counted.state === 'listed' ? counted.counts : null;
    return <RoomKindChooser counts={counts} group={group} onChoose={props.onKind} slot={slot} />;
  }
  if (open === 'room') {
    return <RoomNumberChooser chosen={room} onChoose={props.onRoom} rooms={rooms ?? []} slot={slot} />;
  }
  return open === 'use' ? <UseChooser chosen={use} onChoose={props.onUse} options={group.useDescOptions} /> : null;
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

// The request's line: the consents, and "요청 취소 ›" at its end, as a booked ticket's "예약 취소 ›".
function RequestLine({ words, onCancel }: { words: string; onCancel: (() => void) | null }): ReactElement {
  return (
    <View testID="study-group-line">
      <TicketLine link={onCancel === null ? null : { words: '요청 취소', onPress: onCancel }} words={words} />
    </View>
  );
}

// The request out, the card's lock on the answer while it is, and the picker of one more Friend.
function useGroupRequest(
  props: GroupBodyProps,
  use: string | null,
): {
  party: ReturnType<typeof usePartyRequest>;
  out: RoomRequest | null;
  asking: boolean;
  setAsking: (asking: boolean) => void;
} {
  const { shown, answer, plan, group, bubbleId } = props;
  const party = usePartyRequest(partyCardOf(answer, plan, group), `study-group:${String(bubbleId ?? 0)}`, use);
  const out = isOut(party.request) ? party.request : null;
  const [asking, setAsking] = useState(false);
  const held = out !== null;
  const { lock } = shown;
  // Let go when the card goes, as when the User asks anything else after sending (#656's review).
  useEffect(() => {
    lock(held);
    return (): void => {
      lock(false);
    };
  }, [lock, held]);
  return { party, out, asking, setAsking };
}

// The seat answer's line under the ticket, said only where the main button is 로그인.
function LogInNote({ shown }: { shown: boolean }): ReactElement | null {
  return shown ? <FailureNote failure="noSession" onLogIn={null} /> : null;
}

// Under the ticket: the login line; a cell's chooser; the use line, and the use's chooser under it (design
// group-study-design ④ ⑤).
export function StudyGroupBody(props: GroupBodyProps): ReactElement {
  const { answer, plan, group, said } = props;
  const { loggedIn } = useLibrarySession();
  const slot = slotOf(answer, plan);
  const rooms = useRoomsFree(group, slot, loggedIn);
  const choices = useGroupChoices(group, props.shown);
  const { party, out, asking, setAsking } = useGroupRequest(props, choices.use);
  const onScreen = groupOfRequest(group, out);
  const onAsk = (): void => {
    setAsking(true);
  };
  useGroupAct({ ...props, group: onScreen, loggedIn, party, onAsk });
  const room = choices.chosen ?? rooms?.[0]?.NAME ?? null;
  const { open, use, toggle } = choices;
  const chooser = (at: Open): ReactElement => (
    <Choosers {...choices} group={group} open={at} room={room} rooms={rooms} slot={slot} />
  );
  const held = out !== null;
  return (
    <View style={styles.body} testID="study-group-body">
      <GroupWords group={onScreen} out={out === null ? null : outWords(out)} said={said} />
      <RoomTicket
        group={onScreen}
        locked={held}
        loggedIn={loggedIn}
        onKind={toggle('kind')}
        onRoom={toggle('room')}
        open={!held && (open === 'kind' || open === 'room') ? open : null}
        room={room}
      />
      <LogInNote shown={mainOf(onScreen, loggedIn, party).main === 'logIn' && open !== 'kind' && open !== 'room'} />
      {held ? null : chooser(open === 'use' ? null : open)}
      {out === null ? (
        <UseLine failed={party.failed} onPress={toggle('use')} use={use} />
      ) : (
        <RequestLine onCancel={party.cancel} words={consentWords(out)} />
      )}
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
  useLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { ...text.caption, color: color.inkMuted },
  link: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
});
