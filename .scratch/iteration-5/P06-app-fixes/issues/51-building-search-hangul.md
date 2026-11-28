# 51: The building search matches a syllable still being typed and first consonants, as every other search does

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 50 (its shared matcher), PR 763.

Native files: none. Releases: an app OTA update only.

## What happens now

After ticket 50 every list the app filters itself matches with `matchesWords`: "커" and "ㅋㅍㅌ" find 컴퓨터. The building search of the 파티 form's and the room's place sheet and of the timetable's place picker did not. `usePlaceSearch` (`mobile/src/features/places/use-place-search.ts`) asked the main server's `GET /places/search?q=` once the typing had stopped for 300 ms. The server matches the name with `includes` or the number exactly (`main-server/src/places/places.service.ts`), so "고" found nothing until 공 was done.

## What to build

1. **One rule, on the phone.** `usePlaceSearch` filters the Places list the app already holds whole (`GET /places`, `placesQuery`, kept with `staleTime: Infinity`) with `matchesPlace`: the name as `matchesWords` matches it, or the number as a User writes it (301, 301동). No wait after typing: the list narrows on each key.
2. **The app's search call goes.** `apiClient.searchPlaces`, `placeSearchQuery` and the mock's `searchPlaces` are removed. The main server's endpoint stays as it is.

## Acceptance

- [ ] "고" finds 제1공학관 and 제2공학관 in the place sheet, "ㅈ2ㄱㅎ" only 제2공학관, "301동" only 제1공학관 (integration test, failing before).
- [ ] `matchesPlace`'s cases (unit test).
- [ ] The timetable's class form still finds 302동 (integration tests).

## Comments

### Agent usage (2026-11-28)

- Agent time: about 10 minutes in the app-fixes session, measured from its transcript (an estimate). That session worked on several tickets at once, so its time and tokens are split by which ticket each step named. Pauses longer than five minutes are not counted.
- Tokens: output 20k; input 14.8M, of which 14.8M cache reads, 51k cache writes and 74 uncached. No subagents.
