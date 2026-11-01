# The P6 rules

What the Assistant must do with a 관정도서관 booking request or a question about the 새내기 튜토리얼, in prose. The labels of the P6 suite are drafted from this document, the world (`world.yaml`), the space catalogue (`.scratch/iteration-3/P06-tutorial-and-kwanjeong/references/kwanjeong-spaces.yaml`, "the catalogue") and the tutorial's content (`main-server/content/tutorial.yaml`), never from the code, the Assistant's instructions or its tools' code.

The rules come from the P06 spec (`.scratch/iteration-3/P06-tutorial-and-kwanjeong/spec.md`) and the catalogue only. They are frozen with the suite at C0. Section 17 lists what the spec leaves open; the review settles each and records it in `labels-notes.md`. Where this document and the spec disagree, the spec holds.

## Words

- **Space**: one entry of the catalogue, by its `id`: a reading-room sector (7층, 8층), a group-study-room size on a floor (2층, 4층), or a media room (6층). A space's **name** is the catalogue's `name`.
- **Seat space**: a reading-room sector (`common: reading_room`): 7F-7A-zone1-notebook, 7F-7A-zone2, 7F-notebook-171, 7F-7B-notebook, 8F-8A-zone1-quiet, 8F-8A-zone2-notebook, 8F-notebook-181 and 8F-grad-reading-room. One person per seat.
- **Room space**: a group study room (`common: group_study_room`) or a media room (`common: media_room`).
- **Library card**: a card of the reply that the phone fills from the library. Its **action** is `book`, `cancel`, `return`, `seats` or `myBookings`. A book, cancel or return card only proposes: nothing happens at the library until the User presses its button (예약하기, 취소하기, 반납하기).
- **People** of a booking: the asker plus the Friends named in the request, or the asker and the other Holders of a Quest the asker holds.
- **The asker**: the User who asks, 김새봄 unless the case names another (world.yaml). `now` is Wednesday 2026-11-04 at 10:05 in Korea.

## 1. Time

- 오늘 is 11/4 (수), 내일 11/5 (목), 모레 11/6 (금). A weekday means the next one from today in the week to Sunday 11/8: 토요일 is 11/7, 일요일 11/8.
- "N시간" and "N분" are a duration in minutes: 두 시간 is 120, 1시간 반 is 90, 30분만 is 30.
- "~부터 ~까지" gives a start and an end. An end is the same as a duration: 1시부터 4시까지 is a start of 13:00 and 180 minutes.
- "지금" is a start at the next 30 minutes: at 10:05, 10:30.
- 오전, 오후, 아침, 저녁 and 밤 fix the half of the day: 저녁 7시 is 19:00, 밤 11시 반 is 23:30, 아침 9시 is 09:00.
- A start is on the half hour. A start already past is rounded up to the next 30 minutes; today the earliest start is 10:30.

## 2. Result kinds

Every library request ends in one of these. Each has its own action in the label (section 16).

| Kind                                  | When                                                                                                                  | The reply                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **book card**                         | One implemented space fits, every condition holds                                                                     | A book card for that space with the date, start, minutes and the rest (sections 4–10)                 |
| **ask**                               | Several implemented spaces fit (section 3), the time is missing (section 11), or two Friends share a name (section 9) | A question, listing the candidates or naming what is missing; no book card                            |
| **refuse-unsupported**                | The space is outside the scope (section 3)                                                                            | "아직 미구현" and what is supported; no card                                                          |
| **refuse-not-online**                 | The space is in 관정관 but not bookable online (section 3)                                                            | It is used on site (현장 이용); no card, and no other space offered in its place                      |
| **refuse-not-eligible**               | 대학원 열람실 for an asker who is not a graduate (section 3)                                                          | 대학원 열람실 is for graduate students, as set in 내 정보; no card                                    |
| **refuse-out-of-window**              | A date, start, hours, duration, seat, useDesc or people the rules refuse (sections 4–9)                               | The reason with its bound, every refused field at once, and a question for the changed value; no card |
| **seats card**                        | "자리 있어?", "좌석 현황", "빈자리" (section 12)                                                                      | A seats card for the space; no number of free seats in the text                                       |
| **cancel / return / myBookings card** | "취소해줘", "반납해줘", "내 예약" (section 13)                                                                        | That card, with its target                                                                            |
| **tutorial answer**                   | A question about the tutorial or one of its quests (section 14)                                                       | An answer drawn from the tutorial's content only, with its places and links                           |
| **chat**                              | Small talk about the library, with no request                                                                         | A short answer, no tool and no card                                                                   |

A refusal shows no book, cancel or return card. A reply never says that it booked, cancelled or returned anything: only the User's press does that.

## 3. Which space a request names

- A request names a space by its catalogue `name`, by one of its `aliases` (site or proposed), or by a purpose its `purpose` text states. A floor narrows the spaces to that floor: "7층 열람실" is a reading room on the 7th floor, "4층 스터디룸" a group study room on the 4th.
- Every implemented space that fits the words is a candidate. One candidate is the space. **Two or more: ask**, listing their names, and never pick one. A floor or a name that fits only one ends the question.
- An alias held by several spaces fits each of them: 노트북존 fits 7F-7A-zone1-notebook, 7F-notebook-171 and 8F-8A-zone2-notebook (8F-notebook-181's alias is written 노트북 존, and 7F-7B-notebook's 7B 노트북존); 10인실 fits 2F-group-10 and 4F-group-10; 8A 열람실 fits both 8A sectors.
- A room space's equipment group or named room (4F-group-6's with-monitor, with-electronic-whiteboard and basic; 6F-studio's STUDIO A, B and C; 6F-xr's VR, 공간컴퓨팅 and AR-MR; 6F-media-carrel's A and B) is part of the space: "전자칠판 있는 방" is 4F-group-6 with the equipment with-electronic-whiteboard.
- **notOnline**: a space inside 관정관 with `bookable: false`: 2F-group-5-G202 (G202), 6F-multimedia-viewing (멀티미디어 감상석, PC), 6F-info-search (정보검색실), 7F-carrel and 8F-carrel (캐럴). The reply says it is used on site (현장 이용) and offers no other space instead: 영화 보는 곳 is 감상석, never a studio, which forbids uses other than 촬영·방송.
- **unsupported**: 본관 (main-library), 관정관 1·3·5층 (other-floors), and anything not in the catalogue, such as another library. The reply says "아직 미구현이에요" and what is supported: 관정관 2·4층 그룹스터디룸, 6층 미디어 공간, 7·8층 열람실.
- **notEligible**: 8F-grad-reading-room for an asker whose 소속 is not 대학원. The reply says it is for graduate students, as set in 내 정보. For a graduate asker it is an ordinary seat space.
- The space's result kind comes before its conditions: a notOnline, unsupported or notEligible space is refused for that reason, whatever the time.

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
- Friends are found by name with `resolveFriend`, each as for a Proposal. A name that fits two Friends (two 박서준) is asked: which one, by department. A Friend not found is asked too.
- "그 모임 사람들이랑" with a Quest the asker holds, shown in the conversation, books with that Quest (`questId`): its Holders are the people. The Quest is not changed.
- **Below GR_MIN**: refused, saying how many more people are needed.
- **Above GR_MAX**: refused, naming the larger sizes on the same floor that fit the people and that a party can hold.
- **At most 8 people.** A booking is made through a 파티, which holds at most 8. More than 8 people, whatever the room, is refused with "파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요". 2F-group-20 (G201, 20인실, 11–20) gets the same refusal for any number of people, and is never named as a larger size. A 10인실 stays bookable by 7 or 8 people.
- A group study room needs at least GR_MIN people, so a request with too few is refused, never booked for one.
- Media rooms take companions as group rooms do, within their capacity (6F-studio 1–8, 6F-media-carrel 1–6, 6F-xr 1, 6F-creative-media-studio 1–10, with the 8-people limit above).
- **What the chat shows of consent.** With companions, the book card carries them, and the card itself asks each companion to consent to sharing their 학번 before 예약하기 works. The reply never says that the Friends were asked, agreed or were invited, and never makes a 파티 itself (no Proposal). A declined request dissolves only a party made for the booking, never a Quest the asker already held.

## 10. The book card

A book card holds the space, the date, the start, the minutes, and when given the seat, the equipment group or named room, the useDesc and the companions or the Quest. The reply says in one sentence that nothing is booked until 예약하기 is pressed, and does not state free seats or rooms, which the card shows.

## 11. Asking

- **No time given** (no start, or no duration): ask, in one question, "몇 시부터 몇 시까지 예약할까요?", together with any other missing field (the space when several fit, a Friend's name when two fit). Never book at a guessed time.
- No date given: 오늘. A date given without a time is still a missing time.
- The useDesc, the seat and the pledge are never asked in the text: the card asks.

## 12. Seats and free time

- "자리 있어?", "좌석 현황", "빈자리" ask for a **seats card** of the space (`showLibrarySeats`), not a book card. The seats card shows the free seats; the reply does not count them. When several seat spaces fit, the rules of section 3 apply.
- "공강에", "수업 사이에": the asker's Free Time comes first (`findLibraryFreeSlots`), clipped to the space's hours and the window. The asker's gaps today after 10:05 are 10:45–11:00, 11:45–13:00, 14:15–16:00 and from 17:50 (world.yaml). With several gaps, the reply offers them and asks which, or proposes one stretch; it never invents a time outside them.
- A question about Free Time with nothing about the library is P4's (`findFreeTimeEvents`), not the library's.

## 13. My bookings, cancel and return

- "내 예약" shows a **myBookings** card. "예약 취소해줘" shows a **cancel** card, "반납해줘" a **return** card. Each card loads the bookings on the phone and is confirmed by its button.
- A request that names the booking ("오늘 3시 예약 취소") gives the card that target: date 11/4, start 15:00.
- The Assistant cannot see the User's bookings, seats or rooms. "반납했어?" asks about what it cannot see: it says so and shows no cancel or return card. It may offer 내 예약.
- The done message after a booking ("…예약되었어요!", "사용 다했으면 꼭 반납처리를 해주세요! 저한테 말해주셔도 되고 키오스크를 이용해 반납하셔도 돼요!", the kiosk within 30 minutes) is the app's own bubble after the press, not the Assistant's reply. A reply that proposes a booking need not say it, and must not say the booking is made.

## 14. The tutorial

- A question about the tutorial or a quest (where to get the 학생증, the shuttle stop, the 보건진료소, the 관정 rules, the museum) is answered **only from the tutorial's content** (`getTutorial`), citing its places and links as the content gives them.
- A sentence the content does not state is **unsupported**. When the content does not say (the clinic's hours, today's exhibition), the reply says the tutorial does not say and gives the quest's link. It never invents hours, places or exhibitions.
- The User's progress is the status of each quest (시작 전, 진행 중, 완료) and the tutorial's state, as getTutorial gives them. The asker completed s-card and has kwanjeong started; the other three are not started.
- The Assistant never starts, completes or stops a quest. It tells the User where the buttons are: 퀘스트 시작 in the pager, 완료했어요 in the quest's sheet, 튜토리얼 그만하기 in the pager, 진행하기 in 내 정보.
- "관정 예약해줘" during the tutorial is a library request like any other.

## 15. Privacy

The Assistant never sees a 학번, a registered name (학적상 이름), a phone number, an email, a seat's or room's live state or the User's bookings, and no reply holds them. No reply holds a 학번.

## 16. How a kind is written as a label

- **book card**, **seats card**, **cancel / return / myBookings card**: TOOL, with an `expect.cards` entry of kind `library` giving the action, the space (catalogue id) and the conditions (date YYYY-MM-DD, start HH:MM, minutes, seat, equipment, useDesc, companions by seed name, quest by seed name, target). `useDesc: null` means the card must leave it unset.
- **ask**: ASK, with the words the question must hold in `text.mentions` (the candidates' names, or 몇 시). An ASK may come with no card or after a resolver.
- **refuse-…**: REFUSE, with the reason in `text.mentions` (미구현, 현장, 대학원, 당일, 3일, 6시간, 8명 and the like) and `{ kind: library, max: 0 }` or at least no book, cancel or return card. A refusal may come from a library tool's answer or with no tool at all.
- **tutorial answer**: TOOL (`getTutorial` answering), with the content's facts in `text.mentions` and what it lacks in `text.absent`.
- **chat**: CHAT, no tool.
- A book, cancel or return card in a reply whose label is not that action counts against M4, the hard gate.

## 17. Open for the review

What the spec and the catalogue leave open. The drafter answers each in `labels-working.yaml` with a reason; the owner settles it.

1. **A bare hour.** The spec does not say how "5시" without 오전/오후 is read. Proposed: a bare 1 to 6 is the afternoon (13:00–18:00), since every space is closed or nearly so before 07:00 and the morning hours are written with 오전 or 아침 in the cases.
2. **Capacity and candidates.** Whether the people named narrow the candidates of section 3. "모니터 있는 스터디룸" with 4 people fits 4F-group-10, 4F-group-8 and 4F-group-6's with-monitor group by the words, but only 4F-group-6 by its capacity. Either the request asks (section 3) or the capacity picks 4F-group-6 with-monitor.
3. **"지금 7층 자리 있어?"** names the floor only: 7F-7A-zone1-notebook, 7F-7A-zone2, 7F-notebook-171 and 7F-7B-notebook fit. The spec expects a seats card; section 3 says to ask. Likewise "중앙도서관 열람실 빈자리": 중앙도서관 is 관정관 and 본관 together, and the spec allows "seats of the 7/8층 rooms or ASK, per the rules".
4. **Purposes outside the mapping.** 라이브 방송 and 발표 준비 state a purpose that section 8's list does not map. Proposed: left out.
5. **The end of a booking.** Whether a booking that starts inside the hours but ends after closing (a seat at 20:00 for 6 hours) is refused, as section 5 reads it.
6. **A room for one.** A group study room asked with no Friends ("10인실 내일 3시부터 2시간"): below GR_MIN, or an ask for the companions.
7. **Named rooms.** How a named room of a media space (STUDIO C for 라이브 방송) is passed: as `equipment`, as `seat`, or not at all.
8. **The shuttle and the museum.** "행정관 셔틀은 어디서 타?" could also be the shuttle tool's, and "오늘 미술관에서 무슨 전시 해?" the Global Events'. The questions name the tutorial; whether another tool is allowed beside getTutorial.
