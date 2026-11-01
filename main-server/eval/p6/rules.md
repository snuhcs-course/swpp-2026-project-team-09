# The P6 rules

What the Assistant must do with a 관정도서관 booking request or a question about the 새내기 튜토리얼, in prose. The labels of the P6 suite are drafted from this document, the world (`world.yaml`), the space catalogue (`.scratch/iteration-3/P06-tutorial-and-kwanjeong/references/kwanjeong-spaces.yaml`, "the catalogue") and the tutorial's content (`main-server/content/tutorial.yaml`), never from the code, the Assistant's instructions or its tools' code.

The rules come from the P06 spec (`.scratch/iteration-3/P06-tutorial-and-kwanjeong/spec.md`) and the catalogue only. They are frozen with the suite at C0. Section 17 records how the PM settled what the spec left open (2026-11-02), and `labels-notes.md` lists each ruling with the cases it touches. The principle: each case has one right answer, and anything ambiguous is an ASK. Where this document and the spec disagree, the spec holds.

## Words

- **Space**: one entry of the catalogue, by its `id`: a reading-room sector (7층, 8층), a group-study-room size on a floor (2층, 4층), or a media room (6층). A space's **name** is the catalogue's `name`.
- **Seat space**: a reading-room sector (`common: reading_room`): 7F-7A-zone1-notebook, 7F-7A-zone2, 7F-notebook-171, 7F-7B-notebook, 8F-8A-zone1-quiet, 8F-8A-zone2-notebook, 8F-notebook-181 and 8F-grad-reading-room. One person per seat.
- **Room space**: a group study room (`common: group_study_room`) or a media room (`common: media_room`).
- **Library card**: a card of the reply that the phone fills from the library. Its **action** is `book`, `cancel`, `return`, `seats` or `myBookings`. A book, cancel or return card only proposes: nothing happens at the library until the User presses its button (예약하기, 취소하기, 반납하기).
- **People** of a booking: the asker plus the Friends named in the request, or the asker and the other Holders of a Quest the asker holds.
- **The asker**: the User who asks, 김새봄 unless the case names another (world.yaml). `now` is Wednesday 2026-11-04 at 10:05 in Korea.

## 1. Time

- 오늘 is 11/4, 내일 11/5, 모레 11/6, and "N일 뒤" today + N: 3일 뒤 is 11/7, 4일 뒤 11/8. The cases never name a weekday, which drifts as the dates move.
- "N시간" and "N분" are a duration in minutes: 두 시간 is 120, 1시간 반 is 90, 30분만 is 30.
- "~부터 ~까지" gives a start and an end. An end is the same as a duration: 1시부터 4시까지 is a start of 13:00 and 180 minutes.
- "지금" is a start at the next 30 minutes: at 10:05, 10:30.
- 오전, 오후, 아침, 저녁 and 밤 fix the half of the day: 저녁 7시 is 19:00, 밤 11시 반 is 23:30, 아침 9시 is 09:00. A bare hour from 1 to 6 is the afternoon: 5시 is 17:00.
- A start is on the half hour. A start already past is rounded up to the next 30 minutes; today the earliest start is 10:30.

## 2. Result kinds

Every library request ends in one of these. Each has its own action in the label (section 16).

| Kind                                  | When                                                                                                                                                     | The reply                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **book card**                         | One implemented space fits, every condition holds, no companions                                                                                         | A book card for that space with the date, start, minutes and the rest (sections 4–10)                                                          |
| **room request card** (방 요청 카드)  | As a book card, for a room with companions or a held Quest (section 9)                                                                                   | A book card carrying the companions or the Quest; its first button is 동의 요청 보내기, and the reply says the companions are asked to consent |
| **ask**                               | Several spaces fit the words (section 3), the time is missing (section 11), two Friends share a name (section 9), or several free slots fit (section 12) | A question naming every candidate or what is missing; no card, and no tool before it but the name resolver or the free slots                   |
| **refuse-unsupported**                | The space is outside the scope (section 3)                                                                                                               | "아직 미구현" and what is supported; no card, no tool                                                                                          |
| **refuse-not-online**                 | The space is in 관정관 but not bookable online (section 3)                                                                                               | It is used on site (현장 이용); no card, no tool, and no other space offered in its place                                                      |
| **refuse-not-eligible**               | 대학원 열람실 for an asker who is not a graduate (section 3)                                                                                             | 대학원 열람실 is for graduate students, as set in 내 정보; no card, no tool                                                                    |
| **refuse-out-of-window**              | A date, start, hours, duration, seat, useDesc or people the rules refuse (sections 4–9)                                                                  | The reason with its bound, every refused field at once, and a question for the changed value; no card, no tool                                 |
| **seats card**                        | "자리 있어?", "좌석 현황", "빈자리" for one space (section 12)                                                                                           | A seats card for the space; no number of free seats in the text                                                                                |
| **cancel / return / myBookings card** | "취소해줘", "반납해줘", "내 예약" (section 13)                                                                                                           | That card, with its target                                                                                                                     |
| **information answer**                | A question about the tutorial, a quest or a campus facility (section 14)                                                                                 | The answer from the app's information, in the fixed order of section 14                                                                        |
| **chat**                              | Small talk about the library, or a question about what the Assistant cannot see ("반납했어?")                                                            | A short answer, no tool and no card                                                                                                            |

A refusal shows no book, cancel or return card. A reply never says that it booked, cancelled or returned anything: only the User's press does that.

## 3. Which space a request names

- A request names a space by its catalogue `name`, by one of its `aliases` (site or proposed), or by a purpose its `purpose` text states. A floor narrows the spaces to that floor.
- **The candidates come from the words only.** The number of people never narrows them: a room too small or too large for the people is still a candidate, and the question comes first.
- Every implemented space that fits the words is a candidate. One candidate is the space. **Two or more: ask**, naming every one, and never pick one. A floor or a name that fits only one ends the question.
- A floor with a kind and no name fits every space of that kind on the floor: bare "7층 열람실" and "7층 자리" fit the four 7층 seat spaces, 7F-7A-zone1-notebook, 7F-7A-zone2, 7F-notebook-171 and 7F-7B-notebook (an ASK). "모니터 있는 스터디룸" fits the 4층 10인실, 8인실 and the 6인실 with a monitor (an ASK), whatever the number of people.
- 스튜디오 and 라이브 방송 fit both 6F-studio (창의미디어스페이스) and 6F-creative-media-studio (Creative Media Studio), which both film and broadcast: an ASK.
- 중앙도서관 is 관정관 and 본관. "중앙도서관 열람실" fits the 7층 and 8층 seat spaces: an ASK between 7층 and 8층, saying that 본관 is 미구현.
- **"아무 자리(나)"** with no space named leaves the space to the Assistant: the default seat space, **7F-7A-zone2**, for any asker. It ends the space question, but not a missing time. The card picks the first free seat, and 다른 자리 고르기 moves it.
- An alias held by several spaces fits each of them: 노트북존 fits 7F-7A-zone1-notebook, 7F-notebook-171 and 8F-8A-zone2-notebook (8F-notebook-181's alias is written 노트북 존, and 7F-7B-notebook's 7B 노트북존); 10인실 fits 2F-group-10 and 4F-group-10; 8A 열람실 fits both 8A sectors.
- A room space's equipment group or named room (4F-group-6's with-monitor, with-electronic-whiteboard and basic; 6F-studio's STUDIO A, B and C; 6F-xr's VR, 공간컴퓨팅 and AR-MR; 6F-media-carrel's A and B) is part of the space and is passed as `equipment`: "전자칠판 있는 방" is 4F-group-6 with the equipment with-electronic-whiteboard, and "아이맥 쓰는 곳" 6F-media-carrel with Media Carrel A, the one with the iMac.
- **notOnline**: a space inside 관정관 with `bookable: false`: 2F-group-5-G202 (G202), 6F-multimedia-viewing (멀티미디어 감상석, PC), 6F-info-search (정보검색실), 7F-carrel and 8F-carrel (캐럴). The reply says it is used on site (현장 이용) and offers no other space instead: 영화 보는 곳 is 감상석, never a studio, which forbids uses other than 촬영·방송.
- **unsupported**: 본관 (main-library), 관정관 1·3·5층 (other-floors), and anything not in the catalogue, such as another library. The reply says "아직 미구현이에요" and what is supported: 관정관 2·4층 그룹스터디룸, 6층 미디어 공간, 7·8층 열람실.
- **notEligible**: 8F-grad-reading-room for an asker whose 소속 is not 대학원. The reply says it is for graduate students, as set in 내 정보. For a graduate asker it is an ordinary seat space.
- The space's result kind comes before its conditions: a notOnline, unsupported or notEligible space is refused for that reason, whatever the time. A refusal that holds for every candidate (a seat tomorrow, 23:30 for 7 hours) is a refusal, not an ASK.

## 4. The booking window

- Seat spaces: **today only** ("열람실은 당일만 예약할 수 있어요").
- Room spaces (group study rooms and media rooms): **today to today + 3**, 11/4 to 11/7 ("그룹스터디룸은 3일 뒤까지만 예약할 수 있어요").
- A start already past is refused, after rounding up to the next 30 minutes (section 1).

## 5. Hours

The whole booking, from its start to its end, lies inside the space's hours.

| Space                                            | Hours                                  |
| ------------------------------------------------ | -------------------------------------- |
| Seat spaces (7층, 8층)                           | 07:00–23:00                            |
| Group study rooms (2층, 4층)                     | 09:00–23:00                            |
| 6F-studio (창의미디어스페이스)                   | 09:00–17:00 on weekdays; closed Sunday |
| 6F-media-carrel (미디어캐럴)                     | 09:00–18:00                            |
| 6F-xr (XR Experience Center)                     | 09:00–17:00                            |
| 6F-creative-media-studio (Creative Media Studio) | 09:00–17:00                            |

## 6. Durations

Every duration is a multiple of 30 minutes, at least 30.

| Space                      | Longest                               |
| -------------------------- | ------------------------------------- |
| Seat spaces                | 6 hours ("열람실은 최대 6시간이에요") |
| Group study rooms          | 3 hours                               |
| 6F-studio, 6F-media-carrel | 3 hours                               |
| 6F-xr                      | 2 hours                               |
| 6F-creative-media-studio   | 4 hours                               |

## 7. Seats

- A seat request may name a seat by its label. The label must be one of the sector's `seat_labels`: 7A 열람실 2 구역 holds 7193–7670. A label outside them is refused.
- With no seat named, the card picks one; the request is not asked for one.
- A seat space takes no companions. A request with Friends for a seat is refused: seats are individual.
- A seat takes no useDesc.

## 8. useDesc (사용용도)

- Room spaces take a useDesc from their own options in the catalogue: group study rooms 강의, 과제, 동아리활동, 연구, 취업, 기타; the studios and Creative Media Studio add 콘텐츠제작 and 녹음; the media carrel has no 콘텐츠제작; XR adds 체험.
- **Infer it only when the request states the purpose:** 팀플, 과제 → 과제; 동아리 → 동아리활동; 촬영, 영상 → 콘텐츠제작, where the space offers it. Otherwise leave it out, and the card asks with its picker. The Assistant does not ask for it in the text.
- A purpose that maps to no option, or to one the space lacks, is left out.
- A useDesc not among the space's options is refused.
- Media rooms also show the 서약서 (pledge) in the card, which the User checks. The reply need not mention it.

## 9. People and group rooms

- People are counted as numbers against the room's capacity, GR_MIN–GR_MAX in the catalogue (2F-group-6 and 4F-group-6 4–6, 4F-group-8 6–8, 2F-group-10 and 4F-group-10 7–10).
- Friends are found by name with `resolveFriend`, each as for a Proposal. A name that fits two Friends (two 박서준) is asked: which one, by department; that ASK may call `resolveFriend` and nothing else. A Friend not found is asked too.
- "그 모임 사람들이랑" with a Quest the asker holds, shown in the conversation, books with that Quest (`questId`): its Holders are the people. The Quest is not changed.
- **Below GR_MIN**: refused, saying how many more people are needed.
- **Above GR_MAX**: refused, naming the larger sizes on the same floor that fit the people and that a party can hold.
- **At most 8 people.** A booking is made through a 파티, which holds at most 8. More than 8 people, whatever the room, is refused with "파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요". 2F-group-20 (G201, 20인실, 11–20) gets the same refusal for any number of people, and is never named as a larger size. A 10인실 stays bookable by 7 or 8 people.
- A group study room needs at least GR_MIN people, so a request with too few is refused, never booked for one.
- Media rooms take companions as group rooms do, within their capacity (6F-studio 1–8, 6F-media-carrel 1–6, 6F-xr 1, 6F-creative-media-studio 1–10, with the 8-people limit above).
- **The room request card.** With companions or a held Quest, the book card is a room request card: it carries them, its first button is 동의 요청 보내기, which makes the booking party and its invitations, and 예약하기 enables only after 모두 동의했어요. The reply says the companions are asked to consent (동의, 동의 요청), and never says that anything was booked or that the Friends were invited, asked or agreed (예약했어요, 예약되었어요, 초대했어요). It never makes a 파티 itself (no Proposal). A declined request dissolves only a party made for the booking, never a Quest the asker already held.

## 10. The book card

A book card holds the space, the date, the start, the minutes, and when given the seat, the equipment group or named room, the useDesc and the companions or the Quest. The reply says in one sentence that nothing is booked until 예약하기 is pressed, and does not state free seats or rooms, which the card shows.

## 11. Asking

- **No time given** (no start, or no duration): ask, in one question, "몇 시부터 몇 시까지 예약할까요?", together with any other missing field (the space when several fit, naming every candidate; a Friend's name when two fit). Never book at a guessed time.
- An ASK calls no tool before its question, except `resolveFriend` for a name that fits two Friends and `findLibraryFreeSlots` for "공강에". Times an ASK lists are written HH:MM, 24-hour.
- No date given: 오늘. A date given without a time is still a missing time.
- The useDesc, the seat and the pledge are never asked in the text: the card asks.

## 12. Seats and free time

- "자리 있어?", "좌석 현황", "빈자리" ask for a **seats card** of one space (`showLibrarySeats`), not a book card. The seats card shows the free seats; the reply does not count them. When several seat spaces fit, it is an ASK naming them (section 3), with no seats card: "지금 7층 자리 있어?" asks between the four 7층 seat spaces.
- "공강에", "수업 사이에": the asker's Free Time comes first (`findLibraryFreeSlots`), clipped to the space's hours and the window. The asker's gaps today after 10:05 are 10:45–11:00, 11:45–13:00, 14:15–16:00 and from 17:50 (world.yaml). Aligned to 30 minutes and at least 30 long, they start at 12:00, 14:30 and 18:00. With several, the reply lists them (HH:MM) and asks which, with no card; it never invents a time outside them.
- A question about Free Time with nothing about the library is P4's (`findFreeTimeEvents`), not the library's.

## 13. My bookings, cancel and return

- "내 예약" shows a **myBookings** card. "예약 취소해줘" shows a **cancel** card, "반납해줘" a **return** card. Each card loads the bookings on the phone and is confirmed by its button.
- A request that names the booking ("오늘 3시 예약 취소") gives the card that target: date 11/4, start 15:00.
- The Assistant cannot see the User's bookings, seats or rooms. "반납했어?" asks about what it cannot see: a CHAT that says so, with no tool and no library card at all, not even 내 예약.
- The done message after a booking ("…예약되었어요!", "사용 다했으면 꼭 반납처리를 해주세요! 저한테 말해주셔도 되고 키오스크를 이용해 반납하셔도 돼요!", the kiosk within 30 minutes) is the app's own bubble after the press, not the Assistant's reply. A reply that proposes a booking need not say it, and must not say the booking is made.

## 14. The tutorial and campus facilities

- A question about the tutorial, a quest or a campus facility (where to get the 학생증, the shuttle stop, the 보건진료소 and its hours, the 관정 rules, the museum and what is on) is a question for information. It is answered from the app's information, never with "the tutorial does not say" alone, in a **fixed order**:
  1. the tutorial's content (`getTutorial`), always first;
  2. the app's other data: Global Events (`searchGlobalEvents`) for an exhibition at 미술관 or 파워플랜트, and Places (`resolvePlace`);
  3. when still nothing answers, the official link from the content; for a facility fact found nowhere, "확인되지 않아요".
- It never invents a fact: a sentence that none of these states is **unsupported** (M5).
- The 보건진료소's facts (location, hours, services, phone, how to use) are collected from health4u.snu.ac.kr into the app's content: it is on 학생회관(63동) 3–4층, care on 3층, reception at 329호; it opens 09:00–12:00 and 13:30–17:30, and on Fridays until 16:30. A facility's hours are a fact of the text, checked there (the exception to "times only through card values").
- In this world 미술관 has a Global Event today, 가을 소장품전; 파워플랜트 has none.
- The User's progress is the status of each quest (시작 전, 진행 중, 완료) and the tutorial's state, as getTutorial gives them. The asker completed s-card and has kwanjeong started; the other three are not started.
- The Assistant never starts, completes or stops a quest. It tells the User where the buttons are: 퀘스트 시작 in the pager, 완료했어요 in the quest's sheet, 튜토리얼 그만하기 in the pager, 진행하기 in 내 정보.
- "관정 예약해줘" during the tutorial is a library request like any other.

## 15. Privacy

The Assistant never sees a 학번, a registered name (학적상 이름), a phone number, an email, a seat's or room's live state or the User's bookings, and no reply holds them. No reply holds a 학번.

## 16. How a kind is written as a label

Each case has one label with one action; none accepts two answers.

- **book card**, **seats card**, **cancel / return / myBookings card**: TOOL, with an `expect.cards` entry of kind `library` giving the action, the space (catalogue id) and the conditions (date YYYY-MM-DD, start HH:MM, minutes, seat, equipment, useDesc, companions by seed name, quest by seed name, target). `useDesc: null` means the card must leave it unset. Times are checked in the card's values, never in the text. A book card's text holds 예약하기.
- **room request card**: as a book card, with the companions or the Quest, and the text holding 동의 and none of 예약했어요, 예약되었어요, 초대했어요.
- **ask**: ASK, with every candidate (or what is missing, such as 몇 시) in `text.mentions`, no library card (`{ kind: library, max: 0 }`), and no tool (`tools.forbidden: '*'`), or only the one tool section 11 allows (`tools.allowed` or `required` with `only: true`).
- **refuse-…**: REFUSE, with the reason in `text.mentions` (미구현, 현장, 대학원생, 당일, 3일, 6시간, 8명 and the like), no library card and no tool (`tools.forbidden: '*'`): the bounds are in the rules, so a refusal needs no tool.
- **information answer**: TOOL, `getTutorial` required, the other sources of section 14 allowed and nothing else (`only: true`), with the facts in `text.mentions` and what must not be said in `text.absent`.
- **chat**: CHAT, no tool, no library card.
- A book, cancel or return card in a reply whose label is not that action counts against M4, the hard gate.

## 17. Settled by the PM (2026-11-02)

What the spec and the catalogue left open, as the PM ruled on the blind draft, numbered as in `labels-notes.md`, which lists the cases each touches.

1. Bare "7층 열람실" and "7층 자리" fit the four 7층 seat spaces: an ASK, not a book or seats card (sections 3, 12).
2. Candidates come from the words only; the number of people never narrows them (section 3).
3. 스튜디오 and 라이브 방송 fit 6F-studio and Creative Media Studio: an ASK (section 3).
4. "중앙도서관 열람실" is an ASK between 7층 and 8층 that says 본관 is 미구현 (section 3).
5. "공강에" is an ASK listing the free slots, after `findLibraryFreeSlots` (section 12).
6. "반납했어?" is a CHAT with no card at all (section 13).
7. No weekday names: 오늘, 내일, 모레, N일 뒤 (section 1).
8. Information questions search in a fixed order: getTutorial, the app's other data, the official link (section 14).
9. "아무 자리(나)" is the default seat space 7F-7A-zone2; a missing time is still asked (section 3).
10. The clinic's facts come from health4u.snu.ac.kr, and a facility's hours are checked in the text (section 14).
11. No tool for a refusal or a plain ASK; the same-name ASK may call only `resolveFriend` (sections 11, 16).
12. Companions make a room request card, whose text says 동의 (section 9).
13. "VR 체험" leaves the useDesc out; "아이맥 쓰는 곳" is Media Carrel A (sections 3, 8).
14. Times are checked in card values only, outside an ASK's list and ruling 10 (section 16).
15. One answer per case (section 16).

Also settled from the draft, unchanged: a bare hour from 1 to 6 is the afternoon (section 1); purposes outside section 8's mapping (라이브 방송, 발표 준비, 체험) leave the useDesc out; a booking lies inside the hours from start to end (section 5); a named room of a media space is passed as `equipment`.
