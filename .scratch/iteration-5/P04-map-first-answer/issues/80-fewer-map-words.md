# 80: Fewer words on a meal answer's map

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

The user's capture ("다음주 월요일 점심", 동원관식당 chosen, by the shuttle both ways) shows ten labels on the map:

- Each shuttle stop has a label: "301동 승차" and "302동 하차".
- A shuttle leg's minutes pill reads "셔틀 14분".
- The start's label ("10:45 301동") and the next Class's label differ in shape and in format. The next Class's label is "15:30 302동 수업" as a dark pill. When the next Class is none of the Plan's fixed things after the meal, it is "15:30 수업 · 302동" in white, its tag's words.

## What to build

The user's decisions (2026-11-26):

1. The stops' labels go. Their dots stay, where the line turns purple and back. A screen reader still says "301동 승차".
2. A shuttle leg's pill loses the word: "14분", "18분", in its leg's colours (P04 ticket 76: dark for the way there, pale for the way on). A screen reader still says "셔틀 14분".
3. The other candidates' tags keep their minutes ("5 32분"): "다른 것의 시간을 바로 알 수 없는 단점이 있어 유지".
4. The start's label and the next Class's label are the same dark pill in one format, time then place: "10:45 301동", "15:30 302동", with no "수업 ·" and no other words. The blue dot and the square mark tell which is which ("둘 다 검은 알약으로 진행해줘"). Without a time for the start (the User's position, no Class before), the start's label is as today.

## Acceptance criteria

- [ ] A shuttle leg's stops are dots without labels, named "301동 승차" and "기숙사삼거리 하차".
- [ ] A shuttle leg's pill reads "13분", named "셔틀 13분".
- [ ] The next Class's label is the dark "15:30 302동", also when it is known only by its place's tag.
- [ ] Other answers (a meeting, a study place) keep their labels.

## Comments

### Built (2026-11-26)

- The next Class's time is the Plan's next fixed thing's. When the Plan holds none after the meal, the time is the one its place's tag begins with. Its place is the scene place's own name, not the tag or the busy item's label ("302동 수업").
- A leg's mark id carries its words ("answer:leg:0:13분"), so a leg whose words change is a new mark, as before.
- With the stops' labels gone, a stop's dot is the same picture in every answer, so P04 ticket 81 can make it ahead on the everyday map.

### Agent usage (2026-11-26)

- Agent time: about 20 minutes on this ticket in the p04-58 session (an estimate), and about 5 minutes of an emulator run for its picture. No subagents.
- Tokens: counted with P04 ticket 81's, in its ticket's Agent usage; the session's tokens over that stretch are not split by ticket.

