# P10: "공부할 자리 있어?" answered on the map as ranked study places

Status: ready-for-human

## Why

Today "공부할 자리 있어?" goes straight to one 관정 reading room as a booking card (`library-rules.ts`: words that name no space mean 7F-7A-zone2). Campus study places show only for "근처에 공부할 데 있어?" (`findStudyNearby`), as a Lookup with a pick and two unnumbered candidates.

The user wants the meal answer's way: numbered candidates on the map and in a list, the pick opened below, a choice by number or by name, and booking only where it exists (관정). The direction was approved on 2026-11-26. On 2026-11-27 the user added that it is the meal answer's common frame, the time card's "+ 같이" included: with Friends, the answer becomes a 관정 group study room (see With Friends). This spec covers the main server. The app side belongs to another session and is built against the reply shape below.

## Constraints

- **An installed app gets what it gets today.** The new answer goes only to an app that sends the capability `study-plan` in `clientCapabilities`, as `area` and `pick` do. Without it, the rules and tools stay as they are: the 관정 booking path, and `findStudyNearby` for an app that says `area`.
- **Opening hours are structured data, filled by hand** from `.scratch/iteration-5/notes-ko/handoff/study-space-hours-research.md` (being collected). They cover weekdays, Saturday, and Sunday and holidays, in term and in vacation. Each space keeps its display text `hours`.
  - A space whose hours for the asked time are unknown is listed after the known-open ones, with a line that its hours are not known. It is never called open.
  - A space known to be closed then is not a candidate. It is listed under "쉬는 곳", as a closed Restaurant is (P04 ticket 71).
- **Restricted spaces** follow today's rule of `findStudyNearby`. A space open only to a college, a department, or graduate students is not a candidate for a User outside it, and is drawn faded as dropped, with whom it is open to.
- **Only 관정's seats and rooms are known**, and only on the phone, through the User's library login. No other space's free seats, capacity, or the room within a building can be said. Which 관정 group rooms are free is read by the phone too; the server never knows it.
- **An app without `study-plan` keeps today's group study path**, `proposeStudyRoom`, its rule and its card, byte for byte.

## The answer

A tool `planStudy` answers an `AnswerReply`. It takes:
- `what`: quiet | group | pc | any, as `findStudyNearby`;
- `date`, today by default; `from`, `until`;
- `near`: true when the User said 근처 or 이 주변, which limits it to the visible area;
- with Friends, `friendIds`, `minutes`, and a period as `firstDay`/`lastDay`.

The input and the answer alone:

```ts
// PlanInput gains:
interface StudyInput {
  kind: 'study';
  date: string;                       // YYYY-MM-DD in Korea
  what: 'quiet' | 'group' | 'pc' | 'any';
  people: PlanPerson[];               // the asker first, then the Friends added; 1 to 8 (PARTY_MAX)
  window: { from: string | null; until: string | null };
  area: { south: number; west: number; north: number; east: number } | null; // set for 근처, alone only
  minutes: number | null;             // with Friends, the length asked ("2시간"), else from–until, else 180
  // What the User chose on the answer, kept across adding and removing Friends: the 관정 seat space alone, the room
  // kind with Friends. Null until chosen.
  chosen: { seatSpaceId: string | null; roomSpaceId: string | null };
}

// AnswerReply for it:
{
  input: StudyInput,
  chips: ConditionChip[],             // origin ("301동에서"), until ("15:00 302동 수업까지"), what ("조용한 곳"), area ("보는 범위") when near
  plans: Plan[],                      // one per building, in order: known-open first, then hours unknown
  dropped: DroppedPlace[],            // restricted spaces: reason "경영대학 학생만 쓸 수 있어요"
  closed?: ClosedPlace[],             // spaces closed then: notices ["오늘 23:00에 닫았어요"]
  noPlan: { reason: 'no-fit', lines: AnswerLine[] } | null,
  choosable: true,                    // planIds and choosePlan work as for meals (P05 ticket 51)
}

// Each Plan, as a meal Plan, with:
{
  id: '관정관',                        // the building's name, unique within the answer
  title: '관정관에서 공부',
  place: PlacePoint,                  // the building's Place
  startAt: string,                    // arrival (ready time plus the walk)
  endAt: string,                      // leave by, for the next item; else the space's closing; else startAt + 3 h
  togetherMinutes: number,            // the stay
  meeting: null,
  parts: [PlanPart],                  // the asker: origin, walkMinutes, leaveBy, next
  subQuests: [],
  lines: AnswerLine[],                // ≤ 3: "3층 자유열람실 · 23:00까지", "15:00 수업 전 2시간 10분", "여는 시간을 몰라요" when unknown
  basis: string[],                    // the hours' display text, the source, the confidence
  scene: MapScene,                    // pick (the first plan), candidates numbered, dropped faded, the way, the next item
  band: TimeBand,                     // the stay on the time card
  study: {                            // NEW, optional: present on a study Plan only
    spaces: {                         // the usable spaces of the building that fit `what`, best first
      key: string; name: string; kind: 'library' | 'reading' | 'lounge' | 'pc' | 'group';
      hours: string | null;           // display text
      open: 'open' | 'unknown';       // never 'closed' here: closed ones are in `closed`
      closesAt: string | null;        // HH:MM when known
    }[];
    book: { spaceId: string } | null; // 관정관's: the catalogue space to book (7F-7A-zone2 by default, or the one `what` fits); null elsewhere
    liveSeats: 'kwanjeong' | null;    // the phone reads free seats for 관정관 only
  };
}
```

**Order:** the plans that are known open at the arrival come first, by the existing `byStay` (the longest stay before the next item, then the shorter walk; with nothing following, the shorter walk). Then come the plans whose hours are unknown, in the same order. A plan's arrival or stay that falls after the space's closing ends at the closing.

**The reply's words:** one sentence about the first plan, why it comes first, as for meals (P05 tickets 45 and 48), such as "15:00 수업 전까지 가장 오래 있을 수 있는 공대 신양학술정보관을 추천해요.". Nothing about seats except "빈 자리는 관정만 알 수 있어요" when asked.

**관정:** its plan carries `study.book`, and the app's opened view offers 예약하기. The booking is today's path: the app asks for the book card of that space (`proposeLibraryBooking`, as "관정 7층 열람실 예약해 줘" does). The server adds nothing new for it. After closing, it is in `closed`, and P05 ticket 57's refusal stays for a direct booking question.

**Follow-ups:**
- "2번으로", "신양으로" → `choosePlan`, unchanged; it reads `planIds` once the answer says `choosable`.
- "근처로" → `planStudy` with `near`.
- "조용한 데로" → `what: quiet`.
- "관정 예약해 줘" → the library tools.

**Recalculation:** `POST /assistant/answers` takes a `study` input (a time card dragged, the origin changed, a Friend added or removed) and reruns the answer.

## With Friends

**One answer, alone or with Friends.** The time card's "+ 같이" adds or removes Friends and recalculates through `POST /assistant/answers`, as a meal does. `band.others` lists the asker's other Friends with their busy times and walks, for the picker.
- **Alone (one person):** the seat plans above.
- **With Friends (2 to 8):** one plan, `관정관`, a 관정 group study room. The time comes from everyone's free time. The main action is "동의 요청 보내기", today's room request, unchanged on the server.
- **All Friends removed:** the alone answer again. The 열람실 and the time the User chose while alone are kept in the input (`chosen`, `window`) and come back.

`people` takes the same `PlanPerson` and constraints as a meal's input (from, notBefore, leaveBy, set by the asker), with the same checks: the asker first, no one twice, only the asker's Friends, a known Place. `area` is ignored with Friends.

**The time** is today's `pickStudyTime`, read as `proposeStudyRoom` reads it (`studyFacts`):
- everyone's items of the day;
- the room kind's hours;
- 30-minute steps;
- the walks to and from 62-1;
- `window` as the bounds, and `minutes` as the length.

The pick leaves nobody out, and makes the shortest stay as long as possible. `arrivalsOf` gives each person's arrival.

**The room kind** is today's `studyRoomFor` by default: the smallest size whose minimum and maximum hold the head count, the 4th floor before the 2nd. `chosen.roomSpaceId` overrides it while it fits.

**The plan** is a meal plan's shape, with:
- `startAt`/`endAt`: the booking;
- `parts`: one per person, with their arrival;
- `band.lanes`: everyone's busy time;
- and `study.group`:

```ts
group: {
  room: { spaceId: string; floor: number; name: string; capacity: { min: number; max: number } }, // the kind picked
  rooms: { spaceId: string; floor: number; name: string; capacity: { min: number; max: number };
           fits: boolean; reason: string | null }[],        // every kind, for the ticket's left cell; reason "6명부터"
  people: number,
  moreNeeded: number,                 // > 0 below the smallest room's minimum (4): no request can be sent
  key: string | null,                 // today's book key, "book:4F-group-6:2026-11-28:1500:120[:wait]"; null when moreNeeded > 0
  useDescOptions: string[],           // 사용 용도, the catalogue's options for the kind
  opens: string | null,               // a day past the booking window: when it opens, "11월 29일 09:00"
  request: RoomRequestState | null,   // set when the answer is rebuilt from a sent request
}

interface RoomRequestState {
  id: string;
  status: 'gathering' | 'ready' | 'booked' | 'cancelled' | 'dissolved' | 'expired';
  consented: number;                  // of the companions still in
  asked: number;
  waiting: string[];                  // names still to answer: "동의 1/3 · 박민수, 이서연 님을 기다려요"
  moreNeeded: number;                 // as GET /library/room-requests/:id gives it
}
```

- **The specific room (G412)** is the phone's, as on today's book card. The phone reads the rooms free for the whole time and takes the first by default. A room request stores the kind, date, start and minutes, not the room number, so a switch within the kind needs no server change.
- **2 or 3 people:** the plan is drawn with `moreNeeded` and no `key`. Its sentence is "그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요.", and its action is "+ 같이". There is no fallback to seats for now.
- **No plan:**
  - nobody can be together for 30 minutes: `noPlan.reason: 'no-shared-time'`, with today's words;
  - more than 8, or no room for the head count: `'no-fit'`, with today's refusal reason.
- **A day after the booking window** (up to 14 days): the plan carries `opens`, and `key` ends in `:wait`, as today's waiting card. The sentence says when it opens ("12월 2일 방은 11월 29일 09:00부터 예약할 수 있어요").
- **The words:** one sentence, such as "네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요." The wordless net makes it from the plan.

**"동의 요청 보내기" and after.**
- The app posts today's `POST /library/room-requests` with `{ key: group.key, friendIds, useDesc }`, plus a new optional `input`: the study input. The server checks and makes the booking party as today: the Closed Quest, the invitations, `room_consents`, `room-window`, the pushes.
- The `input` is kept on the request. This is one migration, additive only: `room_requests.study_input jsonb null`, with no backfill and no default. Only an app that got a study answer sends `input`, and only a server with the field gives one. A request from today's chat card has none.
- After sending, the room, the time and the people are locked on the card. Changing them means cancelling the request, today's way: the requester deletes the booking party, which dissolves it.
- **Rebuilding the card** (the push `room-agreed`, or a booking party opened from the map or the Quest list): new `GET /library/room-requests/:id/answer`, the requester's only. It answers the study answer at the request's room, time and people, rebuilt from the kept `input` (or from the request alone when it has none), with `group.request` set.
- **From a Quest:** `GET /quests` and `GET /quests/:questId` give a booking party `roomRequest: { id, status, consented, asked } | null`, null for every other Quest. It feeds the map's Quest tag ("동의 1/3 · 기다리는 중", "모두 동의 · 예약하기") and `/main?card=party:<questId>`.
- **Booked:** `group.request.status === 'booked'`. The app draws the same ticket on a light sky ground with ✓ and "예약됨"; the server sends only the status.

**`proposeStudyRoom` for a `study-plan` app** is folded into `planStudy`. "민수, 지은이랑 스터디" means: resolve each Friend with `resolveFriend`, then call `planStudy` with `friendIds`, the day or a period (`firstDay`/`lastDay`), and `minutes` when said.
- For a period, the best day for everyone is picked, and the model is told the other days' best times, as today.
- The same functions run inside it: `pickStudyTime`, `arrivalsOf`, `studyRoomFor`, `checkBooking`, `windowOpening`.
- `proposeStudyRoom` and its rule are not offered to that app, as `findStudyNearby` is not. Without `study-plan` they stay as they are.

**Not known:** which rooms of a kind are free, and how many ("빈 방 11"), and whether the phone can read that per kind ahead of the ticket's left cell. Only the phone reads it, as for seats. The server's `rooms[].fits` is the head count only.

## Tickets

See `issues/`:
- 01 hours as data;
- 02 the reply shape;
- 03 the ranking;
- 04 the tool and its rules behind the capability;
- 05 관정's plan and the choice;
- 06 the hours in `findStudyNearby` for apps without the capability;
- 07 the answer with Friends;
- 08 a room request kept with its input, the answer rebuilt from it, and the Quest's consent count.

## Decisions (2026-11-26 night)

- "근처 공부할 곳" from an app that says both `area` and `study-plan` takes the new answer, through `near`.
- The default stay when nothing follows today is until the space's closing, else three hours.

## Decisions (2026-11-27)

- Alone → seat plans (열람실). Friends added by "+ 같이" → recalculated: everyone's free time, the plans are 관정 group study rooms only (a room kind and a specific room, the first free one by default), main action "동의 요청 보내기". All Friends removed → the alone answer, with what the User chose while alone.
- 2 or 3 people: "한 명 더" only, no seats each for now.
- After the request is sent, the room, time and people are locked; changing them means cancelling it.
- The public holidays come from the official rules (관공서의 공휴일에 관한 규정, KASI's 음양력 변환), each with its citation. A day not listed reads as a regular day. 설·추석 stay unknown for a space whose source does not state them.
- The 7 spaces with no hours stay in the seed as unknown, listed last, never called open. Nothing is removed for now.

## Not in this spec

- The app's study list row and opened view. That is another session's work, against the shape above.
- 중앙도서관's booking (libNo 2, not crawled).
- Free seats anywhere but 관정.
- The seed's other group spaces as plans with Friends (사회과학도서관 그룹스터디룸, 신양 4층 그룹스터디실, 유회진 스터디룸, 기계 해동스터디홀).
- Seats each for 2 or 3 people.
- Asking again for the nearest free time when no room is free then.
