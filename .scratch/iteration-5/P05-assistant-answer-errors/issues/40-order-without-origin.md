# 40: A meal without a starting place is not ordered by name, and the reply never calls it near

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: the main server only.

## What happens now

- A meal's plans come least walking first (`main-server/src/assistant/gathering/plan-order.ts`). When the asker's starting place is not known (`originOf` in `gathering.ts` gives none: a later day with no item before the meal, a weekend, no location), their walk there counts as none. Every plan then ties on walking and falls to the start and the key, which is usually the name: "301동식당" comes first because digits sort first.
- `PLAN_RULES` (`gathering/plan-tools.ts`) still tells the model to say why the first plan comes first ("가장 가까워요"). So the User is told the alphabetically first Restaurant is the nearest.

## Cases

| Asker's starting place | Next item after the meal | Order of the plans | `planned.order` | Reply |
|---|---|---|---|---|
| Known (Class before, or location now) | any | Least walking (there and on), largest walk, start, key: unchanged | absent | Why first, as now ("가장 가까워서 …") |
| Not known | A Class with a Place | Least walking on to that Place first (as before), then earliest start, longest time to eat, key | "Not by nearness: … the least walking on to the User's next item at 〈Place〉." | Never "가까워요"; e.g. "어디서 출발하는지 몰라서 …", may ask "어디서 출발해요?" |
| Not known | None, or one with no Place | Earliest start, then longest time to eat, then key | "Not by nearness: … the earliest start, then the longest time to eat." | As above |
| Not known, with a Friend whose way is known | any | The Friend's known walking first, then as above | as above | As above |
| A Plan with under 30 minutes for someone | any | After those with 30, as now, ordered within by the rows above | as above | As above |

Chosen: the earliest start, then the longest time to eat (the span until the Restaurant closes or the asker's next item), then the key. The walk on to the next fixed thing was already counted without an origin, so a day with a Class after lunch keeps that order.

## What to build

- `plan-order.ts`: without the asker's origin, after the hurried group and the known walking, order by `byStartAndSpan`. Add `orderWords(plans)`, which gives the model the `order` line above when the first plan's asker part has no origin.
- `plan-tools.ts`: `plannedWords` spreads `orderWords`. One clause in `PLAN_RULES`'s "Your reply is one sentence…" rule: with `order`, never call the first plan near or quick to reach, say the true reason, and optionally ask where they will be.
- README (`planMeal`): how the plans are ordered, and `order`.
- Not in this ticket: falling back to the location for a later stretch (`originOf`), and the app's words (below).

## What the app shows in this case (report only, not changed)

- The map's candidate tags show the start time ("11:00") instead of minutes, and the raised list's rows say "11:53 도착" (`mobile/src/features/assistant/answer-candidates.ts:66-69`, `answer-walks.ts:100-104`): true.
- The raised card's caption still says "걸음이 적은 순" (`mobile/src/screens/main/answer/answer-caption.tsx`, `listWordsOf`), which claims an order by walking that does not hold here. A follow-up for the app: say "일찍 여는 순" when the asker part has no origin.

## Tests

- `main-server/test/gathering-order.unit.test.ts`: without an origin, the earliest start, then the longest time to eat, never the name (fails on the old order); the walk on to a next item still counts; `orderWords` for nothing after, a next item, an origin known, and no plan.
- `main-server/eval/cases/meal-wishes.yaml` `meal-wish-origin-not-known` (Thursday in the P4 world, whose Class before lunch has no Place): planMeal on 2026-11-05 and no "가까" claim. Written, not run.

## Comments
