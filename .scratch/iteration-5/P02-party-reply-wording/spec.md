# P02: The Assistant's reply when asked to make a 파티

Status: ready-for-agent

## Problem Statement

A tester asked the Assistant on 2026-11-21 for "내일 민수랑 학생회관에서 두시에 만나는 파티" (the Friend's name changed here). The reply began with the search the Assistant had made first: "내일(11/20) 학생회관에서 민수와 만나는 파티를 찾았지만, 그 시간에 참여할 수 있는 공개 파티는 없었어요. 대신 오후 2시 학생회관 비공개 파티를 제안해 두었어요." The tester found the opening awkward. When a 파티 to join exists, the Assistant should say so and offer joining it. When none does, it should simply propose the new one, without saying that nothing was found.

The screenshot came from an app older than the update of 2026-11-20. A benchmark run on `5.0/Main` (3b06611a) the same night gave the same kind of reply: "… 비공개 파티를 준비했어요. 근처에서 참여할 수 있는 파티는 없었어요. …".

## Solution

[01 — Nothing said of a search that found none](issues/01-no-empty-search-line.md).

## Out of Scope

- Where the answer is shown. Moving the 파티 answer from the chat card onto the map is designed separately; the card and the screen stay as they are.
- The rules of the map app's recruiting plans (`RECRUITING_RULES`, planQuests and planNewQuest).

## Comments
