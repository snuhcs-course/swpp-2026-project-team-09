# P15: App clean-up before release

Status: ready-for-human

Schedule row: Iteration 4, P15 "Clean up features outside the main UI", due 2026-11-19. Workers: 김태현 (`TaeHyun79`) and 안진영 (`AhnJinYoung`).

References:
- The team canvas (SNU Now 와이어프레임, https://claude.ai/code/artifact/004b1b85-ec1c-47c1-a8f9-d429b971846f): the after wireframe of each item is drawn there before its ticket is written.
- `CLAUDE.md`, "The app's native files"; ADR 0007 (test levels).

## Problem Statement

The app is about to be used by people outside the team, and small things get in their way. The same control sits on two screens, a button does nothing, a press leads nowhere, a field draws its words over its own icon. None is large, but together they make the app feel unfinished. They also keep turning up while the app is used, so the full list cannot be known before the work starts.

## Solution

P15 is an umbrella for these small items. Each item is one change a User can see, such as removing a duplicate switch, making a timetable block open its class, or keeping a field's words clear of its icon. Most touch only the app. A few may touch the main server or the database.

This spec does not decide how an item is fixed. It lists what each item is about in one line. The way to fix it, and every decision taken for it (what changes, what stays as it is), is written in the item's ticket.

## How the work runs

### Collecting and drawing

An item is found by using the released app, on a phone or an emulator, and checked against the code. Items are collected first. Each one then gets its after wireframe on the team canvas, and the drawing is approved before its ticket is written.

### Tickets

- One ticket per item, at `issues/<NN>-<slug>.md`. Items so small that they change the same file together may share one ticket.
- The ticket holds the detail: what is on screen now, what changes, what stays as it is, and the acceptance criteria.
- Its head has these lines:
  - `Parent:` this spec, and where the item came from, such as "the canvas board X" or "found using `snunow/all/26.11.17-2` on 2026-11-17".
  - `Status:` as in `docs/agents/triage-labels.md`.
  - `Owner:` the GitHub ID of the person who does it. A change of hands changes only this line.
  - `Blocked by:` other tickets, pull requests, or nothing.
- Numbers are split between the two workers so that new tickets never collide: 김태현 takes `01`–`49`, 안진영 takes `51`–`99`. Each takes the next free number in their own range.

### Items found during the work

Items keep turning up while the others are being fixed. One found during the work may be drawn, written as a ticket, and fixed in the same pull request, with the ticket's acceptance criteria checked there. Its line is added to the list below in the same pull request.

### Pull requests

- Each ticket, or each set of tickets that share a file, is one pull request into `4.0/Main`. A branch takes `4.0/Main` by merge, never by rebase.
- Two people do not change the same file at the same time. Items are split by screen where they can be.
- A ticket that adds a database migration is ordered behind any other ticket that does (`Blocked by:`), since two branches that each add one collide. It also says that its change needs a Release of the main server.
- A ticket that touches the app's native files (`CLAUDE.md`, "The app's native files") says so in its head, since its change needs a native Release.

## The items

One line per item: what it is about. The ticket holds the rest. A line gets its ticket's link once the ticket exists.

### 김태현 (`01`–`49`)

1. 위치 공유 switch on two screens: keep it on 내 정보 only, and remove the counts under it.
2. Each Friend's level (시간표만 / 지금 있는 건물 / 정확한 위치) on two screens: keep it on 위치 공유 only, and leave 친구 관리 a list of Friends.
3. The 시간표 card on 내 정보: remove "빈 시간 말하기", a pressed class block opens that class, and reading an image comes back to 내 정보.
4. The map's friend panel: remove the green "친구 N명과 위치 공유 중" banner.
5. The 학과 field (프로필 편집, Onboarding): the words cover the search icon once the field is pressed.

### 안진영 (`51`–`99`)

None yet.

## Testing Decisions

Each ticket names its own tests by ADR 0007. A ticket that only removes something checks that it is gone and that what stays still works. A ticket that changes what a press does tests the press.

## Out of Scope

- New features. An item that needs one is noted in its ticket and taken to the team.
- Changes to the agentic map's answers (P02 and its sibling Tasks).
