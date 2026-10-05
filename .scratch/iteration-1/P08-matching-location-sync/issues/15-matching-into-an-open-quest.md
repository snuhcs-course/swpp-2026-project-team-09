# 15: Matching into an Open Quest

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them), 09 (Matching: rounds, groups and the Shared Quest)

## What to build

"같이 갈 사람 찾기" also places a requester into a Quest that is already gathering, besides grouping requesters into a new Quest. A round of ticket 09 now fills the eligible Open Quests first, the earliest request into the earliest Quest, and then groups the requests that are left as before.

A Quest is eligible for a request when it is for the request's Global Event, is Open, has a free place and has a capacity equal to the size the requester chose. The main server adds the placed User as a Holder under ticket 04's rules of joining. A placement keeps no record of its own: its request waits until the main server answers that the User entered, and a round that ends without that answer leaves it to the next round.

## Acceptance criteria

- [ ] After the main server's answer on which requests stand, a round asks the main server for the eligible Quests of the Global Events and sizes it has waiting requests for. The main server answers the Open Quests for that Global Event with a capacity equal to the size and a free place, each with its free places, its Holders and the time it was made. An Approval or a Closed Quest is never answered.
- [ ] For each Global Event and size, the round places the earliest waiting request into the earliest eligible Quest, and goes on in order of arrival until each Quest is full or no request is left. A request is never placed into a Quest its User holds.
- [ ] For each placement the match server asks the main server to place the User into the Quest. The main server adds the User as a Holder under the rules of joining: within capacity, checked inside the transaction that adds the Holder, with a Quest the User held alone for the event deleted. A User who already holds that Quest is answered as entered.
- [ ] When the User entered, the request is matched and names the Quest. `matching-changed` goes to the User, and `quests-changed` to the Holders of the Quest, the User included.
- [ ] When the main server refuses because the Quest filled, is no longer Open or no longer has a capacity equal to the size, or the User holds a Shared Quest for the event by then, the request stays waiting. The next round expires it when it no longer stands, or places or groups it.
- [ ] When the main server does not answer, the request stays waiting and the round goes on with the others.
- [ ] The requests that were not placed are grouped as in ticket 09.
- [ ] Match server tests, with the main server replaced at the fetch boundary: placement in order of arrival into the earliest Quest, a Quest filled by placements and the rest grouped, a request never placed into its User's own Quest, a refused placement leaving the request waiting, a main server that does not answer, and two match servers running a round at the same moment placing each request once.
- [ ] Main server tests at the API: the eligible Quests answered and each Quest left out, a placement adding the Holder, a Quest held alone replaced, a repeated placement answered as entered, each refusal, a placement and a User's own joining racing for the last free place, and the signals on Redis.
- [ ] The READMEs record their part: the order of a round and how a placement is decided and repeated in the match server's; the two routes for the match server and the rules of a placement in the main server's.
