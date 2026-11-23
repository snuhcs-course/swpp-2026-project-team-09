# 43: An hours answer's label speaks of the meal asked

Parent: [P05 spec](../spec.md), after [36](36-restaurant-hours-answered.md), [37](37-hours-on-the-map-and-by-corner.md), and [38](38-menus-not-posted.md); the user's phone on 2026-11-23 about 12:40, the debug build against Production
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- He asked a Restaurant's hours, and the map labelled it "지금 영업 중 · 14:00까지". He then asked "저녁은?". The words answered about dinner, but the map kept "지금 영업 중 · 14:00까지".
- The label is the server's: the scene's `place` flag, which the app writes beside the Restaurant. `restaurantHours` took no meal, so its label was always the Restaurant's state now, and at 12:40 that is lunch's. A second call for dinner drew the same label, and a reply in words alone leaves the first one standing under the answer (PR 499). Either way the map said lunch while the words said dinner.

## What changes

- `restaurantHours` takes an optional `meal`. With it, the label and the card's second line are about that meal: "저녁 17:00–19:00", "저녁 · 지금 영업 중 · 19:00까지" while it is served, "저녁은 안 해요" when it is not, or "평소 저녁 17:00–19:00" on a day not posted. Without it, the label is the state now, as before.
- `HOURS_RULES` gives the meal when the User asks about one. A follow-up about another meal or day of the same Restaurant (저녁은?, 내일은?) calls the tool again, never words alone. So the map is drawn again for what was asked.
- **Why this way**: the tool naming the meal makes the label match the words whenever it runs, and the rule makes it run. Dropping a stale label under a reply in words alone would be an app change, in files other sessions hold.

## Acceptance criteria

- [x] At 12:40, "학생회관 언제까지 해?" labels "학생회관식당 · 지금 영업 중 · 14:00까지", and the follow-up with dinner labels "학생회관식당 · 저녁 17:00–19:00". (Unit test, two turns.)
- [x] The label of the meal asked while served, outside its hours, not served on a posted day, and on a day not posted. (Unit tests.)
- [x] The rules tell the model to call again for another meal. (Unit test.)
- [x] README; lint, format, and types of the main server.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 20 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 13 million, almost all cache reads; output about 12,000. No subagents. Measured roughly from the session's transcript at the time of the pull request.
