/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ArmedAct } from '@/api/library-card-types';
import { now } from '@/clock';
import { Button, cardStyles, color, SectionHeader, space, text } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import { bookingDeadline, canCancel, canReturn, shownBookings, ticketOfBooking } from '@/library/cards/bookings';
import { confirmWords } from '@/library/cards/done';
import { dayAfter, siteDate } from '@/library/cards/times';
import { library } from '@/library/library';
import type { LibraryBooking } from '@/library/replies';
import { seatStays } from '@/library/seat-stays';
import { BookedTicket, TicketLine, TicketWithLine, ticketWords } from '../main/library/booked-ticket';
import { type Loaded, needsLogin, useLibraryLoad, useLogInReload } from '../main/library/use-library-call';
import { ACT_WORDS } from '../main/library/use-confirming';
import { bookingsAddress } from '../main/use-asked-bookings';
import { useAiRaised } from '../shell/ai-raised';

// 오늘's 예약 (A04 ticket 11): the User's 관정도서관 bookings of today to three days on that are booked or in use, read
// once each time 오늘 comes to the front, never polled.

// How far 예약 reads: today to three days on.
const DAYS_ON = 3;

export interface TodayBookings {
  loaded: Loaded<LibraryBooking[]>;
  reload: () => void;
  // The Quests of the stays (P05-14) of the seats listed here, which leave 오늘 일정 so that no booking reads twice.
  // None while the bookings are not read, and none for a booking not listed: such a stay stays in 오늘 일정.
  hiddenStays: ReadonlySet<string>;
}

const NONE: ReadonlySet<string> = new Set();

// The stays' Quests of the listed bookings, by their BSEQNO.
function useHiddenStays(listed: readonly LibraryBooking[] | null): ReadonlySet<string> {
  const [stays, setStays] = useState<Readonly<Record<string, string>>>({});
  const read = listed !== null && listed.length > 0;
  useEffect(() => {
    let current = true;
    if (read) {
      void seatStays().then((map) => {
        if (current) {
          setStays(map);
        }
      });
    }
    return (): void => {
      current = false;
    };
  }, [read]);
  if (!read) {
    return NONE;
  }
  return new Set(listed.flatMap(({ BSEQNO }) => stays[String(BSEQNO)] ?? []));
}

// The bookings, read as the page mounts, which it does each time 오늘 comes to the front.
export function useTodayBookings(): TodayBookings {
  const today = koreaDateKey(now());
  const start = siteDate(today);
  const end = siteDate(dayAfter(today, DAYS_ON));
  // Booked or in use, soonest first, as 내 예약 shows them.
  const { loaded, reload } = useLibraryLoad(
    async () => shownBookings(await library.myBookings(start, end), { until: null }, today),
    `${start}-${end}`,
  );
  const hiddenStays = useHiddenStays(loaded.state === 'ready' ? loaded.value : null);
  return { loaded, reload, hiddenStays };
}

function actOf(booking: LibraryBooking): ArmedAct['act'] | null {
  if (canCancel(booking)) {
    return 'cancel';
  }
  return canReturn(booking) ? 'return' : null;
}

// As 내 예약's links read.
const LINK_WORDS: Record<ArmedAct['act'], string> = { cancel: ACT_WORDS.cancel.confirm, return: '반납' };

// To the map with the AI raised and the AI's 내 예약, its act armed for a link: the red button beside the input acts,
// and nothing is sent from here.
function useOpenBookings(): (armed: Omit<ArmedAct, 'asked'> | null) => void {
  const { setRaised } = useAiRaised();
  return (armed) => {
    setRaised(true);
    router.navigate(bookingsAddress(armed));
  };
}

function Booking({
  booking,
  open,
}: {
  booking: LibraryBooking;
  open: (armed: Omit<ArmedAct, 'asked'> | null) => void;
}): ReactElement {
  const ticket = ticketOfBooking(booking, now());
  const act = actOf(booking);
  const deadline = bookingDeadline(booking);
  return (
    <TicketWithLine>
      <Pressable
        accessibilityLabel={ticketWords(ticket)}
        accessibilityRole="button"
        onPress={() => {
          open(null);
        }}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <BookedTicket ticket={ticket} />
      </Pressable>
      <TicketLine
        link={
          act === null
            ? null
            : {
                words: LINK_WORDS[act],
                onPress: () => {
                  open({ bseqno: booking.BSEQNO, act });
                },
              }
        }
        words={deadline === null ? null : confirmWords(deadline, null, now())}
      />
    </TicketWithLine>
  );
}

// One line in place of the tickets, with its button.
function Line({ words, button, onPress }: { words: string; button: string; onPress: () => void }): ReactElement {
  return (
    <View style={[cardStyles.card, styles.line]}>
      <Text style={styles.lineWords}>{words}</Text>
      <Button onPress={onPress} size="md" variant="secondary">
        {button}
      </Button>
    </View>
  );
}

// 예약, between 오늘 일정 and 지난 알림: the tickets as 내 예약 draws them, each with its confirm time and "예약 취소 ›" or
// "반납 ›". Hidden while it is read and when there is none, but right after its own 로그인, when it says so. Logged out,
// or the session ended, one line with 로그인, which reads again after; a read that failed, one line with 다시 시도.
export function Bookings({ bookings }: { bookings: TodayBookings }): ReactElement | null {
  const { loaded, reload } = bookings;
  const logIn = useLogInReload(reload);
  // Its 로그인 was pressed on this visit: a login that finds no booking then says so, once, rather than the section
  // going silently (decided 2026-11-29). The next visit hides it.
  const [loggedInHere, setLoggedInHere] = useState(false);
  const open = useOpenBookings();
  const none = loaded.state === 'ready' && loaded.value.length === 0;
  if (loaded.state === 'loading' || (none && !loggedInHere)) {
    return null;
  }
  return (
    <View style={styles.section} testID="today-bookings">
      <SectionHeader>예약</SectionHeader>
      {loaded.state === 'failed' && needsLogin(loaded.failure) ? (
        <Line
          button="로그인"
          onPress={() => {
            setLoggedInHere(true);
            logIn();
          }}
          words="관정도서관에 로그인하면 예약이 보여요"
        />
      ) : null}
      {loaded.state === 'failed' && !needsLogin(loaded.failure) ? (
        <Line button="다시 시도" onPress={reload} words="예약을 불러오지 못했어요" />
      ) : null}
      {none ? (
        <View style={cardStyles.card}>
          <Text style={styles.lineWords}>예정된 관정도서관 예약이 없어요</Text>
        </View>
      ) : null}
      {loaded.state === 'ready' && !none ? (
        <View style={styles.tickets}>
          {loaded.value.map((booking) => (
            <Booking booking={booking} key={booking.BSEQNO} open={open} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[2] },
  tickets: { gap: space[3] },
  pressed: { opacity: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  lineWords: { ...text.label, flex: 1, color: color.ink },
});
