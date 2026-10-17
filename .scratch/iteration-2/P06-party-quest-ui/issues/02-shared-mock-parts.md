# 02: The mocked parts of a Quest: photos, tags and members' faces

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A prefactor for tickets 03, 04 and 06. The wireframe gives a Quest a photo, tags, and the names and faces of its members in every summary, and the server has none of them. This ticket adds them behind the API client once, so that the three screen tickets read them and do not each add their own.

A mock adapter adds the missing parts to what the client returns about a Quest, in every build, the one connected to the server included. What a User enters (a photo, tags) is kept on the phone only. The screens change in no visible way here.

## Acceptance criteria

- [ ] A Quest, a recruiting summary and an invitation carry, besides what the server returns: an optional photo, a list of tags, and the names and faces of up to three members.
- [ ] The User has tags of their own, which the form and the ordering of `찾기` read.
- [ ] The parts come from one mock adapter per kind, merged into the client's answers for the mock client and the server client alike; replacing one by an endpoint later changes the client only.
- [ ] Saving a photo or tags for a Quest the User made keeps them on the phone and returns them with that Quest afterwards.
- [ ] The mock data matches the wireframe's posts, so that the screens look like the frames against the mocks.
- [ ] `todo.md` section 2 lists each part with the screens that read it.
- [ ] Jest: a server answer comes back with the mocked parts added; a saved photo and saved tags come back with their Quest.
