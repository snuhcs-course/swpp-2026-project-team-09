# 05: Chapter 2, 파티, with ★ a 승인제 파티 and 관악이's request, and chapter 3, 행사

Status: ready-for-agent
Blocked by: 01.

Native files: none. Releases: an app OTA update only.

Spec: [../spec.md](../spec.md).

## What to build

Chapters 2 and 3 of the Tour, except chapter 2's last ★ step (06).

- **Chapter 2, 파티.**
  - **Join Policies.** One step explains 바로 참여, 승인 후 참여 and 비공개 ("공개는 누구나, 승인제는 네가 받아 줘야, 비공개는 초대한 친구만.").
  - **The tabs.** It points at 찾기, 내 파티 and 초대.
  - **★ Posting.** The 파티 form opens filled in by the script. The User chooses 공개 with 승인 후 참여 and posts.
  - **★ The request.** 관악이 is a Practice Person who is not the User's Friend, with a letter avatar. A moment after posting, 관악이 asks to join, as a request does. The User accepts in the 파티's room, and 관악이 becomes a member.
  - **Its own data.** At its start the chapter sets up its own Practice data, including a 비공개 파티 with 샤샤 when chapter 1's is not there. It does not wait for 04.
- **Chapter 3, 행사.**
  - Practice has a few events.
  - The chapter points at an event's way to find or recruit a 파티 for it ("행사마다 같이 갈 파티를 찾거나 만들 수 있어.").
- **Order.** The chapters sit in the Tour after chapter 1 and before 내 정보.

## Acceptance criteria

- [ ] Chapter 2's steps light their elements, with the spec's lines.
- [ ] The form opens filled in, and posting with 승인 후 참여 puts the 파티 in 내 파티 during Practice.
- [ ] 관악이's request arrives, and accepting it makes 관악이 a member.
- [ ] Chapter 3 points at an event's 파티 action.
- [ ] Each chapter works when resumed at its start, without the chapters before it.
- [ ] The fake main server receives no 파티, request or acceptance.
- [ ] After the Tour, the real 내 파티 and Boards have none of it.
- [ ] The app-level integration test covers both chapters.

## Notes

03, 05 and 02 each change the Tour's script; merge the integration branch before the pull request.
