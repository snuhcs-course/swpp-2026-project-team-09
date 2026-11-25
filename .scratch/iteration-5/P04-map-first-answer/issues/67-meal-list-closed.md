# 67: The meal list shows only places that can be done, closed places under "쉬는 곳", and the Assistant says why a place is missing

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Blocked by: none.

Native files: none. Releases: a main-server Release and an app OTA update.

## What happens now

- The meal answer's raised list ends with the places that cannot be done for time: the candidates the phone fades, under "시간 안에 다녀오기 어려운 곳", and the places the main server dropped with their reason, under "시간이 맞지 않는 곳" ("김태현과 시간이 맞지 않는 곳"). As Restaurants are added, nearly every Restaurant would stand in every answer.
- A Restaurant closed for the meal (ticket 65: its cell holds only a closing notice, "공대수시면접으로 인해 휴점합니다") is no candidate and appears nowhere in the answer.
- Asked "왜 302동은 없어?" or "두레미담은 왜 안 떠?", the Assistant has no way to give the real reason.

## What to build

1. The list shows the places that can be done, and nothing about the ones that cannot for time: the section of places dropped leaves the list.
2. Closed places stay in sight. A Restaurant closed for the meal is listed at the list's end under "쉬는 곳": grey, with its notice's words, not numbered, not counted in "N곳", not pressable. The answer's sentence says nothing of it (board z1, right half, without its "시간이 맞지 않는 곳" group). The main server sends these places as their own optional field of the answer, which older apps ignore. The model's tool result does not name closed places as options, and the rules tell the model not to mention them unless asked.
3. Asked why a place is not in the answer on screen, the Assistant answers in one sentence with the real reason from a tool's result, never guessed: closed, with the notice's words; or the time (only so many minutes there, or it cannot be reached and left in time); or no menu collected. The answer brings the Restaurant to the map as a Lookup does, and leaves the Plan on screen.
4. The map's quiet marks of places that cannot be done stay as they are.

## Acceptance criteria

- [ ] The raised meal list has no section of places dropped; its "N곳" counts the candidates.
- [ ] A Restaurant closed for the meal stands under "쉬는 곳" at the list's end, grey, with its notice, not numbered, not counted, not pressable; the sentence does not name it.
- [ ] The answer carries the closed places in their own optional field; an app without it reads the answer as before.
- [ ] "왜 302동은 없어?" over a meal answer gets one sentence with the reason from a tool's result, and the Plan on screen stays.
- [ ] Each reason (closed, too little time, cannot be reached and left in time, no menu) has a unit test; the question has an integration test over the fake model.

## Comments
