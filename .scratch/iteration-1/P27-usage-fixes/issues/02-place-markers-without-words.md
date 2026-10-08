# 02: Place markers without words, and Global Events at one Place as one marker

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main screen's map draws no words under the markers of Places (Global Events, Quests, Parties, dining and shuttle); only Avatars keep a name under them. What a marker stood for is read in its card, as today.

Global Events at the same position become one marker. A Place with one Global Event keeps today's marker and card. Two or more make one marker with their count on its pin; pressing it opens a list of those events at that Place, and choosing one opens that event's card, which acts as a single event's card does. The merged marker's identifier comes from the Place, so that it stays the same as events come and go, and screen readers hear the Place and the count.

## Acceptance criteria

- [ ] At the "names" level of detail, no Place marker carries words; Avatars still carry their names.
- [ ] A Place marker's screen-reader name is unchanged.
- [ ] Two Global Events at one position give one marker with the count 2; one event gives today's marker.
- [ ] Pressing the merged marker lists its events; choosing one opens that event's card with today's actions.
- [ ] The merged marker keeps its identifier when one of its events is added or removed, and becomes a single event's marker when one is left.
- [ ] Screen tests over the mock cover the words, the merging and the list; the existing map and card tests pass unchanged or change only where they asserted words under Place markers, which the PR names.

## Check on a phone

- [ ] Zoomed in, no words appear under Place markers, and two events at one Place no longer overlap.
