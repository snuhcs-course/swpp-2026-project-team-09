# 09: Matching: rounds, groups and the Shared Quest

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 08 (Matching: asking, withdrawing and the state of a request)

## What to build

The waiting requests of ticket 08 become matches. Every minute the match server runs a round: it drops the requests that no longer stand, groups the rest by Global Event and size, and asks the main server to create one Shared Quest for each group. The matched Users are told by a signal and find the Quest in their list; a Quest one of them held alone for the event is merged into it.

Grouping is one module with one question: given the waiting requests of one Global Event and size, which groups are formed? Its rule puts together the requests that share the most interest hashtags. Grouping by AI replaces that module in a later iteration, and nothing outside it changes then.

A match is never lost between the two servers: the match server keeps asking until the main server has answered, and the main server creates the Quest of a match once.

## Acceptance criteria

- [ ] A round runs every minute. The interval is a setting of the match server, listed in the example settings file as provisional. One match server runs a round at a time, however many run.
- [ ] A round first asks the main server which of the waiting requests still stand. The main server answers the ones whose Global Event is published and has not started and whose User holds no Shared Quest for it. The match server expires the others. When the main server does not answer, the round groups nothing.
- [ ] The grouping module takes the waiting requests of one Global Event and size, each with its hashtags and the time it arrived, and returns groups of exactly that size. It forms as many groups as it can. It puts together the requests that share the most hashtags, and the earlier request first where they share the same. The requests left over wait for the next round.
- [ ] The module is called only when at least as many requests wait as one group takes. It is replaced as a whole in tests, and the match server's README names it as the place where grouping by AI lands.
- [ ] Each group is stored as a match awaiting its Quest, and its requests are matched. The match server asks the main server to create the Shared Quest and repeats the request until it is answered, also after a restart.
- [ ] The main server creates one Quest for the match's Global Event, held by the matched Users, with the Sub Quest for attending. It stores the match identifier with the Quest, unique in the database, and a repeated request returns the Quest created the first time.
- [ ] A Quest a matched User held alone for the Global Event is deleted, with its Sub Quests and the User's progress. A matched User who holds a Shared Quest for it by then keeps that one and is left out of the new one.
- [ ] When the Global Event has started or was cancelled by the time the request arrives, the main server answers so and creates nothing. The match server closes the match, expires its requests and does not ask again.
- [ ] `matching-changed` and `quests-changed` go to the Holders of the new Quest. The state of a matched request names its Quest.
- [ ] Module tests: a pool that shares hashtags, a pool that shares none grouped in order of arrival, a pool larger than one group, a remainder that waits, and requests of different sizes never grouped together.
- [ ] Match server tests, with the main server replaced at the fetch boundary: requests expired by the main server's answer, groups formed and asked for, a main server that answers only at a later attempt, a restart between the match and the answer, and a match the main server closes.
- [ ] Main server tests at the API: the answer to which requests stand, a Quest created with its Holders, the same match twice giving one Quest, a Quest held alone merged, a User with a Shared Quest left out, a started and a cancelled event refused, and the two signals on Redis.
- [ ] The READMEs record their part: the round, the module and its rule, the states of a match and the repeated request in the match server's; the two routes for the match server and the match identifier in the main server's.
