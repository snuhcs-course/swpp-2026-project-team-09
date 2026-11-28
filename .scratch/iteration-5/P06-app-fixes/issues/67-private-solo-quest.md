# 67: 비공개 with nobody invited makes a Quest taken alone, and a solo Quest's room offers 수정

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None (the main server's P05 tickets 87, 88 and 89 are on Main).

Native files: none. Releases: an app OTA update; the main server's Release with P05 tickets 87–89 for the phone.

## What happens now

The user on 2026-11-28: "왜 비공개로 하면 반드시 친구를 추가해야해? 비공개 솔로 퀘스트를 만들고 싶을 수도 있잖아." Then: "비공개 파티는 솔로는 안되네? 되도록 해야 할듯? 결국 퀘스트인데 혼자 하는 todo처럼 쓸 수도 있으니".

- **The form.** Under 비공개, 친구 초대 is required (`missingOf`), so a Quest for oneself cannot be made.
- **The room.** A Quest taken alone offers no 수정, so it can never invite later. Since P05 ticket 88 every Quest taken alone gathers on an invitation, except a seat's stay.

## What to build

- Under 비공개 친구 초대 is optional (spec story 16). With nobody invited and no event, the form makes a Quest taken alone (`POST /quests/own` with `takenAlone: true`, Closed, for one):
  - 인원 is hidden;
  - the button reads 퀘스트 만들기;
  - the toast reads 퀘스트를 만들었어요;
  - the Quest list then shows in place of the form.
- With a Friend chosen, everything is as before.
- A Quest taken alone offers 수정 in its room unless it is a seat's stay (`seatStay`, P05 ticket 89). Its edit is 퀘스트 수정; it opens at a 파티's 인원, shown once a Friend is chosen; and it keeps its 인원 of one while nobody is chosen.
- The Assistant's Proposal card follows the same rule.

## Checked

| Place                                                | Was                                       | Now                                                                 |
| ---------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| 파티 만들기, 비공개, nobody, no event                | 친구 초대 \*, "초대할 친구를 골라 주세요" | no \*, no 인원, 퀘스트 만들기 → a Quest taken alone, the Quest list |
| 파티 만들기, 비공개, a Friend chosen                 | 비공개 파티, 인원, 파티 만들기            | unchanged                                                           |
| 파티 만들기, 비공개, nobody, an event chosen         | 친구 초대 required                        | a 비공개 파티 of one for the event (attending makes no solo Quest)  |
| 파티 만들기, 공개                                    | 파티 올리기                               | unchanged                                                           |
| The app bar's title of a new form                    | 파티 만들기                               | unchanged                                                           |
| A Proposal card, 비공개, no invitee                  | "빠진 내용이 있어요"                      | a Quest taken alone, the Quest list                                 |
| Room of a Quest taken alone (Plan-made, form-made)   | no 수정                                   | 수정 (퀘스트 수정)                                                  |
| Room of a seat's stay                                | no 수정                                   | unchanged                                                           |
| The answer card of a gathered Plan Quest (`gathers`) | reads `takenAlone === false`              | unchanged: shared once gathered                                     |

## Acceptance

- [ ] 비공개 with nobody: no 인원, button 퀘스트 만들기, `takenAlone: true` sent, toast, the Quest list (integration test, failing before).
- [ ] A Quest taken alone's room offers 수정; a seat's stay's does not (integration test, failing before).
- [ ] On the phone, after the main server's Release: a 비공개 Quest with nobody shows in 내 퀘스트, not 내 파티.

## Comments
