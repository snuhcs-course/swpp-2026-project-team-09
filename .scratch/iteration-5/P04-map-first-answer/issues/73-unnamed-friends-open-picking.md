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

## Acceptance criteria

- [x] An eval case for "친구 두명이랑 저녁" and two more expects planMeal with `pickPeople` and no question for names.
- [x] The main server sets the flag only with someone left to pick, and plans with the named Friends.
- [x] The app opens picking for an answer that arrives with the flag, and not for one shown again.
- [x] Each fault's test fails on the code before.
- [x] No native file changes; lint, format, and types pass on the app and the main server.

## Comments

Built in PR #574. The server's planMeal takes `pickPeople` and flags the answer when someone is left to pick; the app opens picking for a reply that has just arrived, told by its bubble id. Screens wait for the sessions emulator.

### Agent usage (2026-11-26)

- Agent time: about 29 minutes in one session, test runs included (an estimate).
- Tokens: input 50,751,165 (cache reads 50,634,862, cache writes 116,151, uncached 152); output 66,862. No subagents.
