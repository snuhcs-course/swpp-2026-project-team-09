# 07: Assistant library and tutorial tools

Parent: [P06 spec](../spec.md) ("The space catalogue", "Assistant: the library and tutorial tools", "Cards and the API contract")
Status: ready-for-agent
Blocked by: 01, 02, 06 (06 for merge order only; 01 and 02 for what the tools read)

## What to build

The Assistant understands 관정도서관 requests and tutorial questions. "7층 열람실 5시부터 두 시간 잡아줘" gets a booking card, "지금 8층 자리 있어?" a seats card, "반납해줘" a return card, "내 예약 보여줘" a myBookings card. A space named several ways is resolved from the catalogue, an ambiguous one is asked about, and requests outside the window, the hours, the capacity, the online spaces or the scope are refused with the reason. "학생증 어디서 받아?" is answered from the tutorial's text only. The server decides; the model passes ids and the User's words, and never sees seats, bookings, 학번, registered names or the session. Cards carry no live data and book nothing; the phone does that (ticket 08).

**Merge order.** This ticket can be built now in parallel, but its chat changes land only after ticket 06 is merged with its C0 tag, R0 and the P19 baseline, and it is rebased onto that. It also reads `affiliation` (ticket 01) for `notEligible` and the tutorial content and progress (ticket 02) for `getTutorial`. These two edges are added to the suggested ones because the tools cannot run without those columns and that module; both are wave-1 tickets, so this ticket can be written against them in parallel and rebased.

The `library` card DTO, its `key` grammar and `clientCapabilities` are fixed in the spec, so ticket 08 builds against them with mocks now.

## Acceptance criteria

- [ ] **The catalogue.** `references/kwanjeong-spaces.yaml` moves to `main-server/src/assistant/library/kwanjeong-spaces.yaml` with `mapImage`, `booking_ahead_days` and `step_minutes`; it is loaded and checked with zod at start. Each space resolves to `implemented | notOnline | unsupported | notEligible` as the spec defines.
- [ ] **The tools,** in `src/assistant/library/` and `src/assistant/tutorial/`: `findLibrarySpace` (with `several` and `FoundKind` `librarySpace`), `findLibraryFreeSlots` (through a `FreeTimePort` over P04's `freeTimeOf`), `proposeLibraryBooking` (every refusal of the spec listed at once, each with its reason and bound; people against GR_MIN/GR_MAX as numbers; more than 8 people, or any request for G201 (GR_MIN 11), refused with "파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요", since a party holds at most 8 (`quests_capacity_check`); a larger size is named only when its GR_MIN ≤ 8, so 10인실 stays bookable by 7–8 people; reading rooms refuse companions), `proposeLibraryCancel`, `proposeLibraryReturn`, `showLibrarySeats`, `showMyLibraryBookings`, and `getTutorial`.
- [ ] **The rules.** `LIBRARY_RULES` and `TUTORIAL_RULES` appended after `FREE_TIME_RULES`, stated by meaning as the spec lists them. The chat prompt's study-spaces line is removed; no other chat rule changes. No new Feature.
- [ ] **Cards.** A new `CardKind` `library` with the spec's fields, filled from the catalogue and the checked input. `key` is at most 120 characters and is checked against its grammar in the request DTO history (`{ kind: 'library', id: key }`), not looked up.
- [ ] **`clientCapabilities`.** Library cards are attached only when the request carries `clientCapabilities: ['library']`; otherwise the library tools answer `{ result: 'none', reason: '이 앱 버전에서는 도서관 예약을 할 수 없어요. 앱을 업데이트해 주세요.' }`.
- [ ] **Privacy:** no tool result, card, prompt or log line holds a 학번, a registered name, `affiliation`, a seat's live state, a booking, BSEQNO or a session. A scripted run over a world that has 학번 and registered names checks every prompt the scripted model received.
- [ ] Tests, named by ADR 0007:
  - unit: the catalogue loads and every `id`, `roomNo` and `sectorNo` is unique; the window, hours, duration and capacity rules over a table of cases (including "10" > "8", 8 people accepted for a 10인실, 9 refused, and G201 refused for any number); the key grammar;
  - integration, over HTTP with the model scripted (prior art: the `assistant-*` tests and `test/scripted-model.ts`): each tool's result kinds, `several`, the refusals and reasons, the card's key and fields, `findLibraryFreeSlots` against a seeded Timetable, `getTutorial`'s content and status, and the refusal without `clientCapabilities`.
- [ ] **The feature flag** `LIBRARY_BOOKING_ENABLED` (spec, Further Notes): off, the library tools answer `none` with the official link and no card, the room request endpoints answer 404, and `GET /tutorial` serves the 관정 quest as a button quest; an integration test covers off.
- [ ] **Merge point with P05.** P05's R1/R2 each measure one change and its G1 uses the fixed P19 set (`FIXED_SET`), where `out-of-scope-library-seats` may show as a regression. This ticket's chat change merges only at a point agreed with the P05 owner (between two P05 runs), and a fresh P19 baseline (3 runs) is run and recorded on `3.0/Main` just before that merge; R1's regression compares against it.
- [ ] **R1** of the P6 suite and the P19 regression (3 runs after, compared with the fresh baseline above, or ticket 06's when nothing changed the chat since): no P19 case newly fails, and new-tool calls in the regression cases are reported with tokens and cost per turn. The P4 and P5 suites run once as a report. Results are recorded against the frozen thresholds.
