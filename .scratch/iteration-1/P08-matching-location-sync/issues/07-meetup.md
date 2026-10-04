# 07: Meetup

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path), 04 (Quests for Global Events and their Sub Quests)

## What to build

A User proposes a Meetup to a Friend: a title, a place, a start time and an optional end time. The Friend sees it and accepts or declines. An accepted Meetup becomes a Shared Quest that both hold, with one Sub Quest built from the Meetup, and from then on it follows the Quest rules. The proposer can withdraw a Meetup that was not answered, and one that nobody answered expires at its start time.

This is the first Quest with two Holders, so the ticket also tests what ticket 04 could not: progress that is each Holder's alone.

## Acceptance criteria

- [ ] Proposing a Meetup to a Friend takes a title, a place, a start in the future and an optional end after the start. The place is a Place from the list, or a latitude, a longitude and a label. Proposing requires the key described in P04. A User who is not a Friend cannot be proposed to.
- [ ] A User lists the Meetups proposed to them, each with its proposer, and the ones they proposed, each with its state: proposed, accepted, declined, withdrawn or expired.
- [ ] A proposed Meetup whose start has passed is expired. This is computed when read and nothing is written. An expired Meetup can be neither accepted nor declined.
- [ ] Accepting creates one Quest held by both Friends, with the Meetup's title and one Sub Quest with the Meetup's title, time and place. No Party is created. Two accepts of one Meetup leave one Quest.
- [ ] The receiver declines. The proposer withdraws a Meetup while it is proposed. No route edits a Meetup.
- [ ] Ending a friendship withdraws the Meetups still proposed between the two. The Quests of accepted Meetups stay.
- [ ] `meetups-changed` goes to both Friends when a Meetup is proposed, accepted, declined or withdrawn, and `quests-changed` goes to both when one is accepted.
- [ ] With two Holders: one marks the Sub Quest as done and the other's state is unchanged; an end time passes and both see it ended; either adds a Sub Quest and both see it; one drops the Quest, the other stays its Holder and receives `quests-changed`.
- [ ] Main server tests at the API: each state reached, a repeated key that leaves one Meetup and answers the same twice, each refusal, the friendship ended under a proposed and under an accepted Meetup, and the four cases with two Holders.
- [ ] The main server's README records the Meetup routes, the states and how expiry is computed, and what accepting creates.
