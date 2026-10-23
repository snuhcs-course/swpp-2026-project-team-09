---
status: accepted
---

# Matching and the match server are removed

On 2026-10-23 the team decided to remove Matching ("AI 매칭") entirely, with the match server that ran it. Matching grouped Users who asked for companions for the same Global Event into a Shared Quest, or placed one into an Open Quest of the right size, in rounds every minute. It needed a fourth server with a database of its own, a shared secret, routes on the main server that only the match server could call, a Release target, network policies and its own CI job. Users still gather for an event without it: by recruiting on a Board, by joining a recruiting Quest from the 행사 tab's 파티 찾기/모집 or the Assistant's cards, and by inviting Friends to a 비공개 파티.

## Consequences

- The system has three servers: main, socket and worker. The main server's routes `/matching-requests…` and `/matches/…` and the signal `matching-changed` are gone; an app built before the removal gets 404 for them.
- `quests.match_id` goes in a migration of its own, which the team may hold back: dropping it cannot be undone. Quests made by matches stay as ordinary Closed Quests.
- The `match` database and role, on the Dev Server and on RDS, and the Parameter Store entries `match-db-password` and `match-server-token` are dropped by hand after the release (`.scratch/iteration-2/remove-ai-matching/plan.md`).
- ADR 0004 and ADR 0005 mention the match server and AI matching as they stood then.
