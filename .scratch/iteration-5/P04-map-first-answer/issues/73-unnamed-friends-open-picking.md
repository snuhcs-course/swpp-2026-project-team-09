# 73: A meal asked with Friends the User does not name comes with picking open

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #574
Blocked by: none.

Native files: none. Releases: the main server, and an app OTA update.

## What happens now

On the user's phone (2026-11-26), "친구 두명이랑 저녁" was answered only in words: "친구 두 명의 이름을 알려 주세요. 이름을 알려 주시면 저녁 식사 자리를 잡아 드릴게요." The map stayed empty, with no plan. planMeal takes people by name, and no rule covers company the User does not name, so the model asks.

The user's idea: "저녁 화면에서 같이 버튼이 눌린 상태로 제시되면 멋질것 같지 않아?"

## What to build

1. A meal wish with company that names nobody, or not everyone (친구랑 저녁, 친구 두 명이랑 점심, 누구랑 같이 먹을까 내일 저녁, 태현이랑 친구 한 명 더), is never answered by asking for names. The model calls planMeal at once with a new flag, `pickPeople`, and only the Friends named. The reply is the usual one sentence about the first plan. This needs a prompt rule, the tool's schema, and the answer.
2. The answer carries `pickPeople: true` when its plan has someone left to pick. A User without Friends gets the plain plan alone.
3. The app shows that answer with the time card's picking open, as if "＋ 같이" were pressed as it arrived: the rows of Friends, 취소 and 완료, nobody checked but the Friends named. 완료 recalculates for the picked as before; 취소 leaves the plan as it came. A count the User said ("두 명") is neither enforced nor shown.
4. Picking stays as tickets 64, 67, and 68 made it.
5. Only the arrival of a new answer opens it. An answer restored, shown again by 이어서, or taken up again as an earlier turn opens nothing by itself.
6. Named Friends work as before, with no picking.
7. The mock answers such a wish the same way.
8. A fault found on the user's phone the same day, fixed in the same PR: "저녁" alone was answered "예술계식당이 가장 가까워서 17:00에 먹어요. 83동에서 도보 3분이에요.", although the meal rules ask for one sentence with nobody's minutes on the way. The walk is on the map, in one place only. The rule now names that reply as what never to write. The main server also drops a later sentence that gives a walk in minutes from a reply that draws a Plan (`withoutWalkSentences`), keeping the sentences the rules allow.

## Acceptance criteria

- [x] An eval case for "친구 두명이랑 저녁" and two more expects planMeal with `pickPeople` and no question for names.
- [x] The main server sets the flag only with someone left to pick, and plans with the named Friends.
- [x] The app opens picking for an answer that arrives with the flag, and not for one shown again.
- [x] Each fault's test fails on the code before.
- [x] A meal reply with a walk in a second sentence reaches the app as its first sentence alone.
- [x] No native file changes; lint, format, and types pass on the app and the main server.

## Comments

Built in PR #574. The server's planMeal takes `pickPeople` and flags the answer when someone is left to pick; the app opens picking for a reply that has just arrived, told by its bubble id. Its screens are in the PR, from the sessions emulator on the mock. The one-sentence fault is fixed in its own commit.

### Agent usage (2026-11-26)

- Agent time: about 45 minutes in one session, test runs, the emulator pictures, and the one-sentence fault included (an estimate).
- Tokens: input 83,715,549 (cache reads 83,552,080, cache writes 163,227, uncached 242); output 99,094. No subagents.
