# 26: A study step of several requests is read

Parent: [P10 spec](../spec.md); split from [ticket 16](16-study-group-capability.md)
Status: ready-for-agent

Native files: none. Releases: an app OTA update; it needs no server change.

## What to build

The app reads a reply's steps (P03) only of the kinds `seat`, `room`, `meal`, `meet`, `events`, `quests` and `new-quest` (`api/server/step-answers.ts`). The main server names a Plan's step by its answer's input (`main-server/src/assistant/steps/plan-steps.ts`, "공부할 곳"), so a study answer's step is `study`. One refused step drops all the steps of the reply: no numbered flags, no step bar, and the main button of one request.

- The user met it on the phone: "관정에서 공부하다가 저녁 먹을래" came back with no steps.
- It comes with a study answer, which the app gets once it says `study-group` (ticket 16) or `study-plan` (#685), and from words the server answers with a study answer already.
- **The fix:** `study` among the kinds read, so that every kind of `ReplyStep` is.

## Acceptance criteria

- [x] A step of each kind of `ReplyStep` is read, `study` included, and an unknown kind refused. (Unit test, which failed on `study` before.)
- [x] Whole lint, format and types.

## Comments
