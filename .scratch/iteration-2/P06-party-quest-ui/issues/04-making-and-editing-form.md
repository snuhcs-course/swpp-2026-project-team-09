# 04: The form for making and editing a 파티

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (The mocked parts of a Quest)

## What to build

The form follows `PartyCreate` and `PartyAppt`. A User adds a photo and tags, picks a related event under its tabs and has the post filled from it, sets the capacity for a private Quest too, and changes the time, place and event when editing.

Photos and tags are saved through ticket 02's mock and stay on the phone. Capacity stays within the server's 1 to 8; its lower bound is the current Holders plus the Friends invited in the form.

Photos need `expo-image-picker`, a native module: it is added as a dependency, the camera and photo-library permission texts go into the app config, and a new development build and APK are needed before the device check.

## Acceptance criteria

- [x] `사진`: 카메라 and 앨범, a preview and remove. Camera and album permissions are asked when used.
- [x] `관련 행사`: the picker has the tabs 진로, 이벤트 and 축제 with search; picking an event fills the title `{event} 같이 가요`, its place and time, and its tags.
- [x] `태그`: the User's tags as chips and `직접 입력` with `#`.
- [x] `인원` is shown for 공개 and 비공개 alike, up to 8, and cannot go below the current Holders plus the Friends invited; a form opened from a Friend's card can always be sent.
- [x] Editing shows and saves `언제`, `어디서` and `관련 행사`.
- [x] The board sheet has a search and `모집글 {n}` per board.
- [x] The toast after posting a public one with invitations is `파티를 올렸어요 · {n}명에게 초대 요청`.
- [x] Jest covers each field and the toasts.
- [ ] A device check of the camera and the album by 함재현.
- [ ] Screenshots of 공개, 비공개 and editing beside their frames, under Test Results.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 1 h 20 min of active work by one subagent in its own worktree over two rounds (the build, then the self-review's fixes after a machine restart), plus about 25 min of a review subagent and the main session. The runs lasted about 2 h in all; the rest went to waiting on Jest under load from other agents. It is an estimate.
- Tokens, from the implementing subagent's transcript: input 35,619,065, of which 34,344,720 cache reads, 1,273,995 cache writes and 350 uncached; output 31,549. The review subagent's transcript was lost in the restart and the main session's tokens are not split per ticket; neither is included.
- Departures: the main server's Global Event has no kind and no tags, so the picker reads both from the event's title and description (`mobile/src/features/party/event-kinds.ts`); the main server cannot change a Quest's Global Event, so editing shows a Quest's own event locked (no `행사 빼기`), and for a Quest without one, picking an event only fills the time, the place and the tags and is not saved as its event. Both are in `todo.md` section 2, and ticket 08 should list an endpoint to change a Quest's event. Editing the time or place changes the first step still to come that is not the event itself; a Quest whose only step is its event gets `모이기` before it, as making one does. A picked event's title `{event} 같이 가요` replaces only an empty title or one an event gave, as the frame does. The album opens the system's photo picker, which needs no permission; only the camera asks. A picked photo is copied into the app's documents.
