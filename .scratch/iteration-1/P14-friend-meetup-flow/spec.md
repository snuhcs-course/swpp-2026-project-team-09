# P14: Connect basic friend meetup flow

Status: ready-for-agent

## Problem Statement

A User who wants to meet a Friend between classes has to ask where they are and negotiate a time and place by message. The servers can hold friendships and Meetups, but a User has no screen to use them.

## Solution

Screens that let a User become Friends through a Friend Request or an Invite Link, see Friends move on the map, and propose a Meetup that turns into a Shared Quest when accepted.

## User Stories

### Friends

1. As an SNU student, I want to see my Friend ID and copy it, so that I can give it to someone in any way I like.
2. As an SNU student, I want to enter a Friend ID and see whose it is before I send a Friend Request, so that I do not ask the wrong person.
3. As an SNU student, I want a clear message when a Friend ID is unknown, my own, a Friend's or already asked, so that I understand why no request was sent.
4. As an SNU student, I want to see the Friend Requests sent to me with who sent them, and to accept or decline each after reading that accepting starts mutual Location Sharing, so that I decide knowingly.
5. As an SNU student, I want to see the Friend Requests I sent and to cancel one, so that I can change my mind.
6. As an SNU student, I want to create an Invite Link and send it through any app on my phone, so that I can invite someone the way I already talk to them.
7. As an SNU student, I want to be told that the link works once and for 24 hours, so that I know to send it to one person.
8. As an SNU student who tapped an Invite Link, I want the app to open on a screen showing who invited me, so that I know whom I am accepting.
9. As an SNU student who tapped an Invite Link, I want to read that accepting starts mutual Location Sharing, so that I consent knowingly.
10. As an SNU student who is not signed in when tapping the link, I want to sign in and then land on the same screen, so that the invitation is not lost.
11. As an SNU student, I want a clear message when the link is used, expired or my own, so that I understand why nothing happened.
12. As an SNU student, I want to accept or decline, so that I decide.
13. As an SNU student, I want my Friends in a list, so that I know whom I share with.
14. As an SNU student, I want a switch next to each Friend, so that I can stop sharing with one person.
15. As an SNU student, I want to end a friendship after confirming, so that I do not do it by accident.
16. As an SNU student, I want my Friends' Avatars to move on the map as they walk, so that I see where they are.
17. As an SNU student, I want a Friend's Avatar dimmed with the time since the last report when it is old, so that I know the position may be wrong.
18. As an SNU student, I want a mark next to a Friend I cannot see, so that I know sharing is off.
19. As an SNU student, I want to tap a Friend in the list and have the map move to their Avatar, so that I find them quickly.

### Meetup

20. As an SNU student, I want to propose a Meetup to a Friend with a title, a place, a start time and an optional end time, so that we can agree to meet.
21. As an SNU student, I want to choose the place from the list of Places or by pointing on the map, so that I do not type an address.
22. As an SNU student, I want to see the Meetups proposed to me with who proposed them, so that I can answer.
23. As an SNU student, I want to accept or decline a Meetup, so that the proposer knows.
24. As the proposer, I want to see whether my Meetup is waiting, accepted, declined or expired, so that I know where it stands.
25. As the proposer, I want to withdraw a waiting Meetup, so that I can change my mind.
26. As the proposer, I want to be told that a sent Meetup cannot be edited, so that I withdraw it and send a new one.
27. As two Friends, we want the accepted Meetup to appear as a Shared Quest in both Quest lists, so that we see the same plan.
28. As either Friend, I want to cancel that Shared Quest, so that the other knows it is off.
29. As an SNU student, I want proposals and answers to appear without my doing anything, so that the screen is current.

## Implementation Decisions

- This task builds screens and connects them to the API of P08. It adds no server behaviour.
- A Friend Request is sent from a screen that takes a Friend ID and shows its owner's name and department before sending. The User's own Friend ID is shown beside it with a control that copies it.
- Friend Requests received and sent are listed in the Friend panel, each with its answer or its cancel control.
- The Invite Link is shared through Android's share sheet.
- The Invite Link is an https address that opens the app on the accept screen. The app declares that address for Android App Links, and also opens the accept screen from its own scheme, which the server's page uses where a messenger shows the address in its own browser (P08). When the app is opened by a link while signed out, the app remembers the link, shows sign-in and continues afterwards.
- Friends' Avatars use the same map component and the same message handling as Party members in P13. A person who is both a Friend and a Party member has one Avatar.
- The app shows a Friend's Avatar only when the server sends that Friend's position. The app never decides by itself who may be seen.
- The Shared Quest from a Meetup is shown by the Quest list of P13. This task adds nothing to that list.
- The Friend list and the Meetup list open as panels over the map.
- The arrangement is provisional. P19 adapts it to the wireframes.

## Testing Decisions

- A good test drives a screen as a User would and checks what is shown.
- Screens are tested with Jest against a fake API and a fake socket, as in P13.
- Covered behaviour: copying the Friend ID; looking up a Friend ID and sending a Friend Request; each message for an ID that cannot be asked; accepting, declining and cancelling a Friend Request; creating and sharing an Invite Link; opening a link while signed in and while signed out; each message for a link that cannot be used; accepting and declining; the per-Friend switch; ending a friendship; proposing, withdrawing, accepting and declining a Meetup; the state of a sent Meetup changing as signals arrive.
- Opening the app from a link is checked by hand on a phone, from KakaoTalk and from the phone's message app, and the result is recorded in P08's Invite Link ticket.
- Prior art: the screen tests of P06 and P13.

## Out of Scope

- Blocking a User.
- Finding Users by name or email.
- Suggesting an activity, a place and a time from both timetables with AI. It is part of the product plan and comes in a later iteration; this iteration sends a fixed plan.
- Editing a proposed Meetup.
- Conversation between Friends.

## Further Notes

- The schedule names 안진영 as the worker.
- This task depends on the map of P06, on the Quest list of P13 and on the API of P08.
- The Invite Link needs a fixed https address for the server. If P05 finds that the tunnel address cannot be fixed, the link changes with every restart of the tunnel and old links stop working.
