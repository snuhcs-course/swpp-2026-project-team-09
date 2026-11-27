/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
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
import { RoomKindChooser } from '../library/room-kind-chooser';
import { useRoomKindCounts } from '../library/room-kind-counts';
import { RoomNumberChooser } from '../library/room-number-chooser';
import { RoomTicket } from '../library/room-ticket';
import { roomTimesFor } from '../library/room-times';
import { useRooms } from '../library/use-room-counts';
import { keepUse, keptUse, UseChooser } from '../library/use-chooser';
import { useLibraryLoad } from '../library/use-library-call';
import { ChatMarkdown } from '../chat-markdown';
import { SENTENCE } from './line-types';

// The study answer together in the meal's frame (P10 ticket 11; design group-study-design ② ③ 가): the Assistant's one
// sentence, or how many more people the room needs; the room ticket (ticket 10) with the kind's first room free for the
// whole time, read from the library; the use of the room under it; and the chooser of the cell or the line opened. Its
// main button stands beside the input, told as a booking ticket's is: "+ 같이" while people are missing, 로그인 while
// logged out of the library, and else "동의 요청 보내기", which ticket 12 sends.

const TELLER = 'study-group';

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

type Main = 'add' | 'logIn' | 'send';

function mainOf(group: StudyGroup, loggedIn: boolean): { main: Main; words: string } {
  if (group.moreNeeded > 0) {
    return { main: 'add', words: group.moreNeeded === 1 ? '+ 같이 한 명 더' : '+ 같이' };
  }
  return loggedIn ? { main: 'send', words: '동의 요청 보내기' } : { main: 'logIn', words: '로그인' };
}

// The main button the card tells the screen beside the input. Its words are told when they change, and its press
// reads the card's latest functions, so that telling it costs no render.
function useGroupAct(group: StudyGroup, loggedIn: boolean, props: GroupBodyProps): void {
  const { act, bubbleId, busy } = props;
  const { logIn } = useLibrarySession();
  const latest = useRef({ onAdd: props.onAdd, logIn });
  useEffect(() => {
    latest.current = { onAdd: props.onAdd, logIn };
  });
  const { main, words } = mainOf(group, loggedIn);
  // "동의 요청 보내기" sends nothing yet: P10 ticket 12 sends it.
  const disabled = busy || main === 'send';
  useEffect(() => {
    if (act === undefined || bubbleId === undefined) {
      return;
    }
    const onPress = (): void => {
      if (main === 'add') {
        latest.current.onAdd();
      } else if (main === 'logIn') {
        void latest.current.logIn().catch(() => null);
      }
    };
    act(TELLER, bubbleId, { words, onPress, disabled, danger: false });
  }, [act, bubbleId, main, words, disabled]);
  useEffect(
    () => (): void => {
      if (act !== undefined && bubbleId !== undefined) {
        act(TELLER, bubbleId, null);
      }
    },
    [act, bubbleId],
  );
}

function UseLine({ use, onPress }: { use: string | null; onPress: () => void }): ReactElement {
  return (
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

// The sentence, or how many more people the room needs.
function GroupWords({ group, said }: { group: StudyGroup; said: string }): ReactElement {
  return group.moreNeeded > 0 ? (
    <Text style={styles.words}>{shortWords(group.moreNeeded)}</Text>
  ) : (
    <ChatMarkdown style={styles.words} text={said} />
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

export function StudyGroupBody(props: GroupBodyProps): ReactElement {
  const { shown, answer, plan, group, said } = props;
  const { loggedIn } = useLibrarySession();
  const slot = slotOf(answer, plan);
  const rooms = useRoomsFree(group, slot, loggedIn);
  const choices = useGroupChoices(group, shown);
  useGroupAct(group, loggedIn, props);
  const room = choices.chosen ?? rooms?.[0]?.NAME ?? null;
  const { open, use, toggle } = choices;
  return (
    <View style={styles.body} testID="study-group-body">
      <GroupWords group={group} said={said} />
      <RoomTicket
        group={group}
        locked={false}
        loggedIn={loggedIn}
        onKind={toggle('kind')}
        onRoom={toggle('room')}
        open={open === 'kind' || open === 'room' ? open : null}
        room={room}
      />
      {/* The seat answer's line under the ticket, said only where its main button is 로그인. */}
      {mainOf(group, loggedIn).main !== 'logIn' || open === 'kind' || open === 'room' ? null : (
        <FailureNote failure="noSession" onLogIn={null} />
      )}
      {/* A cell's chooser opens right under the ticket, the use's under its line (design group-study-design ④ ⑤). */}
      <Choosers {...choices} group={group} open={open === 'use' ? null : open} room={room} rooms={rooms} slot={slot} />
      <UseLine onPress={toggle('use')} use={use} />
      {open === 'use' ? <Choosers {...choices} group={group} open="use" room={room} rooms={rooms} slot={slot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3] },
  words: SENTENCE,
  useLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { ...text.caption, color: color.inkMuted },
  link: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
});
