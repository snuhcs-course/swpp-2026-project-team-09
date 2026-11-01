/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibraryCardData } from '@/api/assistant-types';
import { now } from '@/clock';
import { Badge, color, font, Icon, radius, space as spacing } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import {
  bookingWords,
  canCancel,
  canReturn,
  cancelPeriod,
  matchingBookings,
  myBookingsPeriod,
} from '@/library/cards/bookings';
import { library } from '@/library/library';
import type { LibraryBooking } from '@/library/replies';
import { CardBox, FailureNote, Pill, Pills, Said } from './library-parts';
import type { CardOutcome } from '@/features/assistant/use-chat';
import { type Act, ACT_WORDS, type Ended, useConfirming } from './use-confirming';
import { type LibraryCardActions, useLibraryLoad, useLogInReload, type Write } from './use-library-call';

// The cards that act on the User's own bookings: a cancel or a return card finds the booking its target names, and
// 내 예약 lists the bookings of the period with 취소 or 반납 on those that allow it. Each sends setCancelBooking only on
// its confirm button.

function BookingRow({
  booking,
  chosen,
  onChoose,
}: {
  booking: LibraryBooking;
  chosen: boolean;
  onChoose: (() => void) | null;
}): ReactElement {
  const words = bookingWords(booking, now());
  if (onChoose === null) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowWords}>{words}</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={words}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      onPress={onChoose}
      style={[styles.row, chosen && styles.chosen]}
    >
      <Icon color={chosen ? color.snuBlue : color.inkSubtle} name={chosen ? 'check' : 'chevronRight'} size={16} />
      <Text style={styles.rowWords}>{words}</Text>
    </Pressable>
  );
}

// The confirm button of a cancel or a return and 그만두기.
function ConfirmButtons({
  act,
  booking,
  write,
  onStop,
}: {
  act: Act;
  booking: LibraryBooking | undefined;
  write: Write<LibraryBooking>;
  onStop: () => void;
}): ReactElement {
  return (
    <Pills>
      <Pill
        disabled={booking === undefined}
        label={ACT_WORDS[act].confirm}
        onPress={() => {
          if (booking !== undefined) {
            write.run(booking);
          }
        }}
        primary
      />
      <Pill label="그만두기" onPress={onStop} />
    </Pills>
  );
}

interface FoundProps {
  act: Act;
  found: readonly LibraryBooking[];
  confirming: ReturnType<typeof useConfirming>;
}

// The bookings found: one row, or a list to choose from, with the confirm.
function Found({ act, found, confirming }: FoundProps): ReactElement {
  const [chosen, setChosen] = useState<number | null>(null);
  const { outcome, setOutcome, write } = confirming;
  const booking = found.length === 1 ? found[0] : found.find(({ BSEQNO }) => BSEQNO === chosen);
  const choosing = found.length > 1 && outcome === 'idle' && !write.busy;
  return (
    <>
      {found.map((each) => (
        <BookingRow
          booking={each}
          chosen={each === booking}
          key={each.BSEQNO}
          onChoose={
            choosing
              ? () => {
                  setChosen(each.BSEQNO);
                }
              : null
          }
        />
      ))}
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
      {outcome === 'idle' && !write.busy ? (
        <ConfirmButtons
          act={act}
          booking={booking}
          onStop={() => {
            setOutcome('stopped');
          }}
          write={write}
        />
      ) : null}
      {outcome === 'stopped' ? <Said>그만뒀어요</Said> : null}
    </>
  );
}

// A cancel or a return card: the bookings of yesterday to three days on that match its target.
// How a cancel or a return card ended, as the chat keeps it.
function endOf(act: Act, ended: Ended): CardOutcome {
  if (ended === 'stopped') {
    return { kind: 'stopped', words: '그만뒀어요' };
  }
  return { kind: act === 'cancel' ? 'cancelled' : 'returned', words: ACT_WORDS[act].done };
}

export function CancelReturnCard({
  card,
  place,
  actions,
}: {
  card: LibraryCardData;
  place: string;
  actions: LibraryCardActions;
}): ReactElement {
  const act: Act = card.action === 'return' ? 'return' : 'cancel';
  const { start, end } = cancelPeriod(koreaDateKey(now()));
  const { loaded, reload } = useLibraryLoad(() => library.myBookings(start, end), `${start}-${end}`);
  const confirming = useConfirming(act, reload, {
    onEnd: (ended) => {
      actions.finish(place, endOf(act, ended));
    },
  });
  const logIn = useLogInReload(reload);
  const found = loaded.state === 'ready' ? matchingBookings(loaded.value, card) : [];
  const done = confirming.outcome === 'done';
  return (
    <CardBox testID={`library-${card.action}-${card.key}`}>
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'loading' ? <Said>예약을 찾고 있어요</Said> : null}
      {loaded.state === 'ready' && found.length === 0 && !done ? <Said>{ACT_WORDS[act].none}</Said> : null}
      {done || found.length === 0 ? null : <Found act={act} confirming={confirming} found={found} />}
      {done ? <Said>{ACT_WORDS[act].done}</Said> : null}
    </CardBox>
  );
}

function actOf(booking: LibraryBooking): Act | null {
  if (canCancel(booking)) {
    return 'cancel';
  }
  return canReturn(booking) ? 'return' : null;
}

const ACT_LABEL: Record<Act, string> = { cancel: '취소', return: '반납' };

function MyBookingRow({ booking, onAct }: { booking: LibraryBooking; onAct: (act: Act) => void }): ReactElement {
  const act = actOf(booking);
  const words = bookingWords(booking, now());
  return (
    <View accessibilityLabel={`${words} ${booking.STATUS_NAME}`} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowWords}>{words}</Text>
        <Badge icon={false} tone={act === null ? 'neutral' : 'official'}>
          {booking.STATUS_NAME}
        </Badge>
      </View>
      {act === null ? null : (
        <Pill
          label={ACT_LABEL[act]}
          name={`${words} ${ACT_LABEL[act]}`}
          onPress={() => {
            onAct(act);
          }}
        />
      )}
    </View>
  );
}

function MyBookingConfirm({
  booking,
  act,
  reload,
  onClose,
}: {
  booking: LibraryBooking;
  act: Act;
  reload: () => void;
  onClose: () => void;
}): ReactElement {
  const { outcome, write } = useConfirming(act, reload, { reloadAfter: true });
  return (
    <View style={styles.confirm}>
      <Said>{bookingWords(booking, now())}</Said>
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
      {outcome === 'idle' && !write.busy ? (
        <ConfirmButtons act={act} booking={booking} onStop={onClose} write={write} />
      ) : null}
      {outcome === 'done' ? <Said>{ACT_WORDS[act].done}</Said> : null}
    </View>
  );
}

// 내 예약: the bookings of today − 7 to today + 3, latest first as the site lists them, each with 취소 or 반납 where
// it allows one, which opens the confirm.
export function MyBookingsCard({ card }: { card: LibraryCardData }): ReactElement {
  const { start, end } = myBookingsPeriod(koreaDateKey(now()), card);
  const { loaded, reload } = useLibraryLoad(() => library.myBookings(start, end), `${start}-${end}`);
  const logIn = useLogInReload(reload);
  const [acting, setActing] = useState<{ booking: LibraryBooking; act: Act } | null>(null);
  const bookings = loaded.state === 'ready' ? loaded.value : [];
  return (
    <CardBox testID={`library-myBookings-${card.key}`}>
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'loading' ? <Said>예약을 읽고 있어요</Said> : null}
      {loaded.state === 'ready' && bookings.length === 0 ? <Said>예약 내역이 없어요</Said> : null}
      {bookings.map((booking) => (
        <MyBookingRow
          booking={booking}
          key={booking.BSEQNO}
          onAct={(act) => {
            setActing({ booking, act });
          }}
        />
      ))}
      {acting === null ? null : (
        <MyBookingConfirm
          act={acting.act}
          booking={acting.booking}
          key={acting.booking.BSEQNO}
          onClose={() => {
            setActing(null);
          }}
          reload={reload}
        />
      )}
    </CardBox>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: 10,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  chosen: { borderWidth: 1, borderColor: color.snuBlue },
  rowMain: { flex: 1, minWidth: 0, gap: spacing[1] },
  rowWords: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  confirm: { gap: spacing[2], padding: spacing[3], borderRadius: radius.md, backgroundColor: color.surface },
});
