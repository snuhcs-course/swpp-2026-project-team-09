# 52: A Restaurant's menu asked with no meal opens the meal nearest in time

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26): "내일 예술계 메뉴" was answered in text, "내일(11/27) 예술계식당 메뉴예요. 2026-11-26 10:00에 수집된 정보예요." and both meals as lists by corner, with nothing opened on the map
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server. The reply is the menu answer the installed app already opens (P04 ticket 72), and the request is unchanged.

## What happened

- `findMenu` took only `lunch` or `dinner`, and its rule said "when they name none, the one being served now or the next one". That reads as today's clock, and fits another day poorly.
- With a day and no meal, the model answered with `getMenus` instead. `getMenus` gives every meal of the day with when it was collected.
- The chat's base rule "Say when the data was collected, from its collectedAt" (`chat/chat-assistant.ts`) then gave the sentence with the raw stamp. The model wrote the lists. This is read from the reply's shape and the rules. There is no Production log, and none was read.

## What changes

- `findMenu`'s `meal` is optional. Left out, the server opens the meal nearest in time, as `planMeal` takes it (`mealByClock`):
  - today: the meal being served now or the next one, so dinner after lunch has ended and after dinner too, which then answers that dinner is over as before;
  - on another day: lunch.

  The other meal is one press away on the app's tabs.
- The rule: the meal is given only when the User names one. `getMenus` is not called for a named Restaurant's menu, even with no meal named or a whole day asked.

## Where the collected sentence comes from

- It comes from the chat's base rule above, applied to `getMenus`, whose restaurants carry `collectedAt`. `MENU_RULES` already say it only when asked, for `findMenu` (P05 ticket 12), so it leaves this path with this ticket.
- It still shows on every `getMenus` answer:
  - an app that does not draw answers;
  - breakfast, which planMeal does not plan;
  - a Restaurant `findMenu` cannot find on the map.

  Not changed here.

## Acceptance criteria

- [x] With no meal: another day opens lunch; today at 10:00 and 14:00 lunch, at 15:00 and 21:00 dinner. A meal named is kept. (Unit test, failing before the change: `findMenu` refused an input with no meal.)
- [x] Eval cases `menu-without-meal-another-day` ("내일 예술계 메뉴") and `menu-without-meal-today` ("두레미담 메뉴 알려줘"): findMenu, no getMenus, no words. Not run: no model key on this machine.
- [x] README; whole lint, format and types of the main server.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 10 minutes of one session. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens: input about 11.2 million, of which 11.2 million were cache reads, 32,000 cache writes and 42 uncached; output about 14,000. No subagents. Measured from the session's transcript before the pull request.
