# 04: Chapter 1 ★: "@샤샤" and a meal in a 공강, made into a 비공개 파티

Status: ready-for-agent
Blocked by: 03.

Native files: none. Releases: an app OTA update only.

Spec: [../spec.md](../spec.md).

## What to build

The last step of chapter 1: the User asks the Assistant to plan a meal with 샤샤 in a 공강, by naming 샤샤 with "@".

- **Naming 샤샤.** 샤샤 says that "@" names a Friend so that the Assistant knows them at once. The User types "@" in the real input, and the real mention list shows 샤샤, the only Friend in Practice. The User picks 샤샤.
- **The rest of the request.** A chip completes it ("공강에 밥 먹자"). Only the scripted message can be sent.
- **The Plan.** The Practice client answers with a Plan for 샤샤 and the User in a shared 공강: a place, a time, a Merging Point and each one's way. It comes from the mock Assistant's parts and fits Practice's Timetables. 샤샤: "시간이랑 장소 맞춰 줬어. 보내면 파티가 돼."
- **Sending it.** It makes a 비공개 파티 with 샤샤 in Practice, which the next chapter can show.

## Acceptance criteria

- [ ] "@" opens the mention list with 샤샤 alone, and picking it puts "@샤샤" in the input.
- [ ] Only the scripted message can be sent; other typing cannot be sent.
- [ ] The Plan shows on the map with its place, time and ways.
- [ ] Sending it makes a 비공개 파티 with 샤샤, seen in 파티 → 내 파티 during Practice.
- [ ] The fake main server receives no Assistant message and no 파티.
- [ ] After the Tour, the real 내 파티 has no such 파티.
- [ ] The app-level integration test covers the step.
