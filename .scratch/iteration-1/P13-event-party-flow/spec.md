# P13: Connect event-to-party demo flow

Status: ready-for-agent

## Problem Statement

The servers can match Users, keep Quests and Parties and deliver locations, but a User cannot reach any of it. This is the flow the iteration exists for: a User joins a Party for a campus event and locates its members on the map.

## Solution

Screens laid over the map that take a User from a Global Event to companions and to seeing them. The User chooses an event, asks for Matching or goes alone, sees the resulting Quest in a list at the side of the map, forms or joins a Party, and watches the members' Avatars move. Tapping a Quest shows the way to its place.

## User Stories

### From a Global Event

1. As an SNU student, I want a card for a Global Event with a button to attend, so that I get a Quest for it.
2. As an SNU student, I want a button to ask for Matching with a choice of group size, so that I can find companions.
3. As an SNU student, I want to read what Matching will do before I confirm, so that I consent knowingly.
4. As an SNU student, I want to see that my request is waiting and to withdraw it, so that I stay in control.
5. As an SNU student, I want the card to list the Parties going to this event, so that I can join one directly.
6. As an SNU student, I want the card to show whether I already hold a Quest for this event, so that I do not attend twice.

### Quest list

7. As an SNU student, I want my Quests in a list at the side of the map, so that I see my plans without leaving the map.
8. As an SNU student, I want each Quest shown with its title and its current Sub Quest beneath it, so that I see the next step at a glance.
9. As an SNU student, I want today's Class Quests in the same list, so that one list shows my day.
10. As an SNU student, I want a marker at the place of each Quest's current Sub Quest, so that I see where my day takes me.
11. As an SNU student, I want to tap a Quest and see the walking route to its place, so that I know how to get there.
12. As an SNU student, I want the map to move to the place with a message when no route is found, so that I still see where it is.

### Quest detail

13. As a Holder, I want to open a Quest and see all its Sub Quests with their times and places, so that I know the whole plan.
14. As a Holder, I want to see the other Holders of a Shared Quest, so that I know who is coming.
15. As a matched SNU student, I want to read the sentence about what we have in common, so that I have something to start with.
16. As a Holder, I want to add, edit and cancel Sub Quests, so that the plan covers what we do next.
17. As a Holder, I want to mark a Sub Quest as done, so that my list moves on.
18. As a Holder, I want to drop the Quest, so that I can change my mind.
19. As a Holder, I want to see whether a Party exists for this Quest and to join it with one tap, so that I find my companions.
20. As a Holder, I want to create the Party for this Quest when none exists, so that we can get together.

### Party

21. As an SNU student, I want to create a Party by entering a title, a capacity and a Join Policy, so that I can gather people.
22. As an SNU student, I want to browse Open and Approval Parties, so that I can find a group without an event.
23. As an SNU student, I want to be told that joining a Party shares my location with its members, so that I consent knowingly.
24. As an SNU student, I want to see that my request to an Approval Party is waiting, so that I know what is happening.
25. As an SNU student already in a Party, I want to be told that I must leave it before joining another, so that I understand the refusal.
26. As an SNU student, I want to be led to the existing Party when one already exists for my Quest, so that I join instead of creating.
27. As a member, I want the members listed at the side of the map with the Leader marked, so that I see who I am with.
28. As a member, I want a mark next to a member whose sharing is off, so that I know why I do not see them.
29. As a member, I want to tap a member and have the map move to their Avatar, so that I find them quickly.
30. As a member, I want the members' Avatars to move on the map as they walk, so that we can find each other.
31. As a member, I want an Avatar that stopped reporting to be dimmed with the time since its last report, so that I know the position is old.
32. As a member, I want a switch that stops sharing with the Party, so that I can pause without leaving.
33. As a member, I want to leave the Party, so that I can go my own way.
34. As a Leader, I want to see and answer join requests, so that I control who enters.
35. As a Leader, I want to invite my Friends, so that they can enter.
36. As an invited SNU student, I want to see the invitation and accept or decline it, so that I decide.
37. As a Leader, I want to change the title, capacity and Join Policy, so that I can adjust.
38. As a Leader, I want to hand my role to a member and to remove a member, so that I can manage the group.
39. As a member, I want the list and the map to change when someone joins or leaves, without my doing anything, so that the screen is current.

## Implementation Decisions

- This task builds screens and connects them to the API of P08. It adds no server behaviour.
- The map stays the main screen. The Quest list and the Party member list are laid over it, one on each side. Cards and detail views open over the map as panels.
- The Quest list shows stored Quests and Class Quests through one interface. The screen does not distinguish them except by an icon.
- The app keeps one open socket connection. Positions arrive on it and move Avatars directly. For every other signal the app fetches the named item again.
- The app fetches the current state when it connects, when it reconnects and when it returns to the front. It does not poll.
- Avatars move smoothly from the previous position to the new one using the map component of P06.
- Markers, routes and Avatars use the map component of P06. No screen calls the native module directly.
- Every refusal from the server is shown with its reason in Korean: Party full, already in a Party, a Party already exists for this Quest, request waiting.
- Screens read only what the server returns about visibility. The app never decides by itself who may be seen.
- The arrangement is provisional. P19 adapts it to the wireframes.

## Testing Decisions

- A good test drives a screen as a User would and checks what is shown. It does not inspect component internals.
- Screens are tested with Jest against a fake API and a fake socket placed at the app's API client and socket client.
- Covered behaviour: attending from an event card; requesting and withdrawing Matching; the Quest list showing stored Quests and Class Quests; marking a Sub Quest done; creating a Party for a Quest and being led to the existing one; joining under each Join Policy; each refusal message; an Avatar appearing, moving, dimming and disappearing as messages arrive.
- The whole flow on real phones is checked in P20.
- Prior art: the screen tests of P06.

## Out of Scope

- Conversation inside a Party.
- Notifications while the app is closed.
- The final layout.
- Friend and Meetup screens. They belong to P14.
- A chat assistant.

## Further Notes

- The schedule names 함재현 as the worker.
- This task depends on the map and sign-in of P06 and on the API of P08.
- The demo of this flow needs two Users, a published Global Event and both phones inside the Campus Boundary. Outside the campus both are hidden by design.
