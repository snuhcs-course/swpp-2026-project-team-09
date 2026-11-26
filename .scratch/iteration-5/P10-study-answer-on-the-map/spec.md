# P10: "공부할 자리 있어?" answered on the map as ranked study places

Status: ready-for-human

## Why

Today "공부할 자리 있어?" goes straight to one 관정 reading room as a booking card (`library-rules.ts`: words that name no space mean 7F-7A-zone2). Campus study places show only for "근처에 공부할 데 있어?" (`findStudyNearby`), as a Lookup with a pick and two unnumbered candidates.

The user wants the meal answer's way: numbered candidates on the map and in a list, the pick opened below, a choice by number or by name, and booking only where it exists (관정). The direction was approved on 2026-11-26. This spec covers the main server. The app side belongs to another session and is built against the reply shape below.

## Constraints

- **An installed app gets what it gets today.** The new answer goes only to an app that sends the capability `study-plan` in `clientCapabilities`, as `area` and `pick` do. Without it, the rules and tools stay as they are: the 관정 booking path, and `findStudyNearby` for an app that says `area`.
- **Opening hours are structured data, filled by hand** from `.scratch/iteration-5/notes-ko/handoff/study-space-hours-research.md` (being collected). They cover weekdays, Saturday, and Sunday and holidays, in term and in vacation. Each space keeps its display text `hours`.
  - A space whose hours for the asked time are unknown is listed after the known-open ones, with a line that its hours are not known. It is never called open.
  - A space known to be closed then is not a candidate. It is listed under "쉬는 곳", as a closed Restaurant is (P04 ticket 71).
- **Restricted spaces** follow today's rule of `findStudyNearby`. A space open only to a college, a department, or graduate students is not a candidate for a User outside it, and is drawn faded as dropped, with whom it is open to.
- **Only 관정's seats are known**, and only on the phone, through the User's library login. No other space's free seats, capacity, or the room within a building can be said.

## The answer

A tool `planStudy` (`what`: quiet | group | pc | any, as `findStudyNearby`; `date`, today by default; `from`, `until`; `near`: true when the User said 근처 or 이 주변, which limits it to the visible area) answers an `AnswerReply`:

```ts
// PlanInput gains:
interface StudyInput {
  kind: 'study';
  date: string;                       // YYYY-MM-DD in Korea
  what: 'quiet' | 'group' | 'pc' | 'any';
  people: [PlanPerson];               // the asker alone
  window: { from: string | null; until: string | null };
  area: { south: number; west: number; north: number; east: number } | null; // set for 근처
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

**Recalculation:** `POST /assistant/answers` takes a `study` input (a time card dragged, the origin changed) and reruns the ranking.

## Tickets

See `issues/`: 01 hours as data, 02 the reply shape, 03 the ranking, 04 the tool and its rules behind the capability, 05 관정's plan and the choice, 06 the hours in `findStudyNearby` for apps without the capability.

## Not in this spec

- The app's study list row and opened view. That is another session's work, against the shape above.
- 중앙도서관's booking (libNo 2, not crawled).
- Free seats anywhere but 관정.
