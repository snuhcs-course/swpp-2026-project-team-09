# 71: The meal list shows only places that can be done, closed places under "쉬는 곳", and the Assistant says why a place is missing

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: a main-server Release and an app OTA update.

## What happens now

- The meal answer's raised list ends with the places that cannot be done for time: the candidates the phone fades, under "시간 안에 다녀오기 어려운 곳", and the places the main server dropped with their reason, under "시간이 맞지 않는 곳" ("김태현과 시간이 맞지 않는 곳"). As Restaurants are added, nearly every Restaurant would stand in every answer.
- A Restaurant closed for the meal (ticket 65: its cell holds only a closing notice, "공대수시면접으로 인해 휴점합니다") is no candidate and appears nowhere in the answer.
- Asked "왜 302동은 없어?" or "두레미담은 왜 안 떠?", the Assistant has no way to give the real reason.

## What to build

1. The list shows the places that can be done, and nothing about the ones that cannot for time. Two groups leave the list, and neither is counted in "N곳": the places dropped, and the candidates the phone fades. The chosen one stays listed. The phone fades by the main server's numbers: at least 15 minutes to eat (`SHORTEST_MEAL_SECONDS`), as the server keeps a candidate, where the phone took 20.
2. Closed places stay in sight when they would otherwise have been possible. A Restaurant closed for the meal is listed at the list's end under "쉬는 곳" only if it would have been a candidate had it been open. That is planned as for a candidate, with its usual hours for the meal on that kind of day. It shows grey, with its notice's words, not numbered, not counted in "N곳", not pressable. The answer's sentence says nothing of it (board z1, right half, without its "시간이 맞지 않는 곳" group). The main server sends these places as their own optional field of the answer, which older apps ignore. The model's tool result does not name closed places as options, and the rules tell the model not to mention them unless asked.
3. Asked why a place is not in the answer on screen, the Assistant answers in one sentence with the real reason from a tool's result, never guessed: closed, with the notice's words; or the time (only so many minutes there, or it cannot be reached and left in time); or no menu collected. The answer is words alone: it shows nothing of its own, and the meal answer on screen stays exactly as it was, its plans, its chosen place, its time card, and its picking, while the card says the sentence.
4. The map shows the places that can be done only: the numbered Plans, 1 to n, as the list numbers them. A place the main server dropped for the time, a Plan the phone fades, and a Restaurant closed for the meal draw nothing on the map, and the camera does not fit to them. The Assistant's first pick stays, numbered 1, though it cannot be done.

## Acceptance criteria

- [ ] The raised meal list has no section of places dropped and none of faded candidates; its "N곳" counts the candidates that can be done.
- [ ] The phone fades a candidate by the main server's 15 minutes.
- [ ] A Restaurant closed for the meal that would have fit stands under "쉬는 곳" at the list's end, grey, with its notice, not numbered, not counted, not pressable. The sentence does not name it.
- [ ] One that would not have fit is not named at all.
- [ ] The map draws only the numbered Plans, 1 to n as in the list; a dropped place, a faded Plan, and a closed place draw nothing.
- [ ] The answer carries the closed places in their own optional field; an app without it reads the answer as before.
- [ ] "왜 302동은 없어?" over a meal answer gets one sentence with the reason from a tool's result, and the meal answer on screen stays as it was.
- [ ] Each reason (closed, too little time, cannot be reached and left in time, no menu) has a unit test; the question has an integration test over the fake model.

## Comments

### Built (2026-11-26, PR 569)

- The user's decisions (2026-11-26): the faded candidates leave the list too ("빼줘"). A closed Restaurant is named only when it would otherwise have been possible ("만약에 휴점인 곳을 어차피 시간 안에 못가면 빼줘"). There is no middle tier for places just out of reach.
- The thresholds today, on both sides after this ticket:
  - The main server keeps a candidate when everyone has at least 15 minutes there (`SHORTEST_MEAL_SECONDS`) and is there at least 10 minutes before the last serving (`SERVING_CUTOFF_SECONDS`), in `gathering.ts` `fitsTogether` and `servedBy`.
  - "식사 N분" runs from the start to the earliest of each person's next item less their walk to it, the end the User set, and an hour after the start.
  - At 30 minutes or more a plan only comes first in the order (`UNHURRIED_MEAL_SECONDS`).
  - The phone faded under 20 minutes (`fitsBand`) and now under 15.
- The map follows the list (the user's word, "B로 진행해줘"). The app takes a meal answer as it offers it (`offeredAnswer`): the Plans that can be done, and the first. Their maps no longer hold the places dropped or the Plans left out, so the list and the map number the same Plans 1 to n, and the camera fits only to them. Meet and study answers draw their dropped places as before: they share the drawing, not this rule.
- Whether a closed Restaurant would have fit uses its usual hours for that meal on that kind of day (`RestaurantHours.hoursOf`), known even when the day's menu closes it, or the meal's window without any.

### Agent usage (2026-11-26)

- Agent time: about 1 hour 45 minutes in this session (an estimate), and 4 minutes of one subagent that read the server's meal path.
- Tokens: this session, input 310 uncached, cache reads 98,369,454 and cache writes 218,385; output 121,996. Its subagent used 182,010 tokens in all, not split by kind. These are counted up to this entry.
