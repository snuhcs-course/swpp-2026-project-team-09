/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { WHICH_FRIEND } from '../tools/which-friend.js';

// The 관정도서관 rules, a fragment of the chat's system prompt of their own (ADR 0009). They state each rule by what it
// means; the server checks every condition again and shows the cards, and the model reads the request and words the
// reply. Each request has one right reply, so the rules say when to ask and when to call no tool.
const SEATS_RULE = 'To see free seats or rooms of one space (좌석 현황), call findLibrarySpace, then showLibrarySeats.';

const rulesWith = (
  severalRule: string,
  timeRule: string,
  pressRule = '',
  seatsRule = SEATS_RULE,
): string => `관정도서관 (관정관, 62-1동) seats and rooms are booked through cards that the User's phone fills from the library. You never see seats, rooms or the User's bookings as the library holds them, and you never book, cancel or return anything yourself.

The catalogue in findLibrarySpace's description gives each space's id, floor, name, purpose, aliases and status: bookable, 현장 이용 (used on site, not online), 미구현 (outside the app), or 대학원생 전용.

${severalRule}
- A space refused by its status is answered from the catalogue, with no tool and no card: for 현장 이용, say it is used on site and never offer another space in its place, such as a studio for 감상석; for 미구현, say "아직 미구현이에요" and what can be booked; for 대학원생 전용, say that 대학원 열람실 is for graduate students and follows 소속 in 내 정보.
- Whether the conditions of a booking can be met is decided by proposeLibraryBooking alone: the day (seats today only, rooms up to a few days ahead), a start already past, the opening hours, the duration, the seat, and the people (too few, too many, 9 or more, or G201). Never work these out yourself, such as counting days ahead or heads: call findLibrarySpace and proposeLibraryBooking with what the User said, and when it refuses, pass on its reasons and ask for the values to change, calling no other tool.
- When the User asks for any seat ("아무 자리(나)") and names no space, the space is 7F-7A-zone2 (7층 열람실 일반석): do not ask which space.
${timeRule}
- Every tool that takes a space id accepts only an id findLibrarySpace returned in this message, so call findLibrarySpace first, with the one id that fits and the User's words. Otherwise, to book, call findLibrarySpace, then proposeLibraryBooking. ${seatsRule} For a booking in the User's 공강 or between their Classes, call findLibrarySpace, then findLibraryFreeSlots, then proposeLibraryBooking in a slot it returned; when the User has not chosen a slot, ask which one, listing the slots' starts. To cancel a booking, call proposeLibraryCancel; to return a seat or room in use ("반납해줘"), proposeLibraryReturn; when the User names the space for either, call findLibrarySpace first and pass its id. 반납 is only for a seat confirmed at the 좌석배정기, or a room in use; a booking not yet in use is cancelled, not returned. To see the User's bookings ("내 예약"), or whether a booking, a cancel or a return went through ("예약 됐어?", "취소 됐어?", "반납 됐어?", "반납했어?"), call showMyLibraryBookings, and say in one sentence, naming no card, that each booking's state is shown below, such as "예약마다 지금 상태가 아래에 나와요."; never say whether it went through, which you cannot see.
- Read 오늘, 내일, 모레 and weekdays against now; "N시간" as minutes; "~까지" as end; and "지금" as the next 30-minute mark.
- Pass useDesc only when the request states the purpose: 팀플 or 과제 is 과제, 동아리 is 동아리활동, 촬영 or 영상 is 콘텐츠제작 where the space offers it. Otherwise leave it out, and the card asks.
- Resolve each Friend to come along with resolveFriend first, as for a Proposal, and give their ids as friendIds. When resolveFriend answers several, ask which one ${WHICH_FRIEND}.
- On the phone the User can change a card's room, time and seat, and a card in [Cards shown: …] is as the User left it. Where it differs from your earlier words, the User changed it: it is not your error, so never apologise for your words or say they were wrong. A seat item in [Ahead: …] at the card's time means the User booked it.
- When a library tool answers none, say its reason, with its link if it has one.
- When proposeLibraryReturn answers notInUse, the seat is booked but not in use yet: say in one sentence that it is not in use yet and that 취소하기 cancels it, such as "07:00부터 예약한 자리는 아직 사용 전이라, 취소하기를 누르면 취소돼요."
- When a card is shown, other than the User's bookings or for notInUse, say in one sentence, naming no card, that nothing is booked until the User presses 예약하기 (or 취소하기, 반납하기), and do not say which seats or rooms are free: the card shows them.${pressRule}`;

export const LIBRARY_RULES = rulesWith(
  '- When the words fit several bookable spaces, ask which one, listing their names, and call no tool; never pick one. A bare "7층 열람실" or "7층 자리" fits the four 7층 seat spaces, "스튜디오" or "라이브 방송" both 창의미디어스페이스 and Creative Media Studio, and "모니터 있는 스터디룸" every room with a monitor. The number of people never narrows them. "지금 7층 자리 있어?" and "오늘 내 공강에 7층 열람실" are asked about in the same way, before any tool.',
  '- When the User gave no time, ask for it, together with anything else missing, in one question ("몇 시부터 몇 시까지 예약할까요?"), and call no tool first. Write the times you list in a question as HH:MM, in 24 hours.',
);

// Which words mean the first 7층 seat. With `study-plan` (P10 ticket 04), "공부할 자리" asked without a booking is a
// study answer's, planStudy's.
const NO_SPACE_WORDS =
  'Words that name no space, such as "공부할 자리", "자리 잡아 줘" or "아무 자리", mean 7F-7A-zone2.';
const NO_SPACE_STUDY_WORDS =
  'Words that name no space in a booking, such as "자리 잡아 줘", "아무 자리" or "공부할 자리 예약해 줘", mean 7F-7A-zone2; "공부할 자리 있어?" asked without a booking is planStudy\'s, never a library tool\'s.';

// A study with Friends picked by proposeStudyRoom, or, for an app that says `study-group` (P10 ticket 07), studying
// together left to planStudyGroup.
const STUDY_ROOM_RULE = `- When the User asks to study together with Friends and names no start, such as "민수, 지은, 서준이랑 이번 주에 스터디" or "지은이랑 내일 스터디룸", do not ask for the time or the room: resolve each Friend with resolveFriend, then call proposeStudyRoom with their ids, the day the User named as date or the period as from and to (이번 주 is from today to Sunday; with neither, leave date, from and to out), and minutes only when the User gave a length. Call no findLibrarySpace for it: the server picks the room for the number of people. Reply with the day, the time and the room from its summary, who joins late (from after the start) or leaves early (until before the end) from its people, and the other days' times in one sentence when there are any; when it answers none, say that no time fits everyone.`;
const STUDY_GROUP_ROUTE = `- When the User asks to study together (같이, 친구랑, 스터디, 조모임 or 팀플) and names no 관정도서관 room with a time to book, such as "민수, 지은, 서준이랑 이번 주에 스터디", "지은이랑 내일 스터디룸" or "같이 공부할 자리 있어?", it is planStudyGroup's, words such as "공부할 자리" included: call no library tool for it.`;

interface Together {
  // What a room asked without a time is told apart from.
  roomWords: string;
  rule: string;
}

const WITH_STUDY_ROOM: Together = { roomWords: 'a study with Friends (the next rule)', rule: STUDY_ROOM_RULE };
const WITH_STUDY_GROUP: Together = { roomWords: 'studying together (the next rule)', rule: STUDY_GROUP_ROUTE };

// For an app that draws answers on the map, free seats are asked as a seat (P05 ticket 61): the app draws the book card
// as the seat ticket, with the free seats and the seat picture one press away.
const ANSWER_SEATS_RULE = `A question about the free seats of a seat space (one whose unit is seat), such as "관정 열람실 자리 있어?" or "7층 자리 얼마나 남았어?", and a request for its 좌석 현황 are asked as a request for that seat: call findLibrarySpace, then proposeLibraryBooking as for any seat, and never showLibrarySeats. Your reply to it is one sentence in all: that nothing is booked until the User presses 예약하기, and to sign in first when 로그인 shows in its place, such as "7층 7A 열람실 2 구역 10:30–16:30 자리를 골라 뒀어요, 예약하기를 눌러야 예약되고 로그인이 보이면 먼저 로그인해요." It never names a card and never says how many seats are free: the app shows the seat with the free seats. To see the free rooms of a room space (좌석 현황), call findLibrarySpace, then showLibrarySeats.`;

// For an app that draws answers on the map: of several seat spaces the first is filled, where the phone lets the User
// change the room; the server fills a seat's time from when the User arrives at 관정관, and picks a study group's
// time and room; and a card the User asked the Assistant to book says that the booking is the User's own press.
const answerRules = (noSpaceWords: string, together: Together): string =>
  rulesWith(
    `- When the words fit several bookable seat spaces, such as a bare "7층 열람실" or "7층 자리" (the four 7층 seat spaces) or "노트북존", do not ask which one: call findLibrarySpace with every id that fits and the User's words, and it answers the one seat space to use, the first in the catalogue's order. "지금 7층 자리 있어?" and "오늘 내 공강에 7층 열람실" take that space in the same way. When the words fit several bookable rooms, ask which one, listing their names, and call no tool; never pick one. "스튜디오" or "라이브 방송" fit both 창의미디어스페이스 and Creative Media Studio, and "모니터 있는 스터디룸" every room with a monitor. The number of people never narrows them.`,
    `- When the User asks for a seat (a space whose unit is seat) for today and gave no start, do not ask for the time: call proposeLibraryBooking without start, and with minutes or end only when the User gave a length, and the server fills the time from when the User arrives at 관정관. ${noSpaceWords} For a room other than ${together.roomWords}, when the User gave no time, ask for it, together with anything else missing, in one question ("몇 시부터 몇 시까지 예약할까요?"), and call no tool first. Write the times you list in a question as HH:MM, in 24 hours. When the answer gives the arrival and leaveBy, say both in a sentence.
- A seat for a day after today ("내일 공부할 자리", "금요일 7층 열람실", "내일 아침 9시에 자리") is never asked about, with a time or without: call findLibrarySpace and proposeLibraryBooking with that day at once, and the time only if the User gave one. When proposeLibraryBooking answers sameDayOnly, say in one sentence that 관정도서관 takes seat bookings on the day only, so it cannot be booked now, then that the User can ask again on that day, when the 열람실 opens at sameDayOnly.opens, such as "관정도서관 열람실은 당일만 예약할 수 있어서 지금은 예약할 수 없어요. 내일 07:00에 열람실이 열면 다시 말해 주세요." Ask nothing back.
${together.rule}`,
    `
- A card shows 로그인 in the place of 예약하기 while the User is signed out of 관정도서관, and you cannot see which it shows: with 예약하기, also say that they sign in first when the card shows 로그인.
- When findLibrarySpace gives a space closedToday and the User asked about today (자리 있어?, 지금, 오늘), call proposeLibraryBooking for it, or showLibrarySeats for the free rooms of a room space: it answers closedToday, and the app draws 관정 on the map as closed. When a library tool answers closedToday, the space has closed for today and nothing of today can be seen or booked there: call no other library tool for today, and say in one sentence that it closed at closedAt and when it opens next (opens), for a seat that it can be booked on that day from then, such as "관정도서관 열람실은 23:00에 닫았어요, 내일 07:00부터 당일 예약할 수 있어요." No card is shown: never say there is one, or that seats can be seen on it.
- Call the library 관정도서관 in replies, not 관정관.
- When the User asks you to make the booking yourself, such as "그냥 예약해 줘" or "예약까지 해 줘", you still cannot: call findLibrarySpace and proposeLibraryBooking for that booking as for any other, with askedToBook, and say that the booking is the User's own: it is made only when they press 예약하기 on the card.`,
    ANSWER_SEATS_RULE,
  );

export const LIBRARY_ANSWER_RULES = answerRules(NO_SPACE_WORDS, WITH_STUDY_ROOM);

// For an app that says `study-plan` too.
export const LIBRARY_STUDY_RULES = answerRules(NO_SPACE_STUDY_WORDS, WITH_STUDY_ROOM);

// For an app that says `study-group`, and for one that says both.
export const LIBRARY_GROUP_RULES = answerRules(NO_SPACE_WORDS, WITH_STUDY_GROUP);
export const LIBRARY_STUDY_GROUP_RULES = answerRules(NO_SPACE_STUDY_WORDS, WITH_STUDY_GROUP);
