# 02: The mocked parts of a Quest: photos, tags and members' faces

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A prefactor for tickets 03, 04 and 06. The wireframe gives a Quest a photo, tags, and the names and faces of its members in every summary, and the server has none of them. This ticket adds them behind the API client once, so that the three screen tickets read them and do not each add their own.

A mock adapter adds the missing parts to what the client returns about a Quest. The mock build shows all of them; the build connected to the server shows photos and tags but not invented people (see the spec's Mocks). What a User enters (a photo, tags) is kept on the phone only. The screens change in no visible way here.

## Acceptance criteria

- [x] A Quest, a recruiting summary and an invitation carry, besides what the server returns: an optional photo, a list of tags, and the names and faces of up to three members.
- [x] The User has tags of their own, which the form and the ordering of `찾기` read.
- [x] The parts come from one mock adapter per kind, merged into the client's answers for the mock client and the server client alike; replacing one by an endpoint later changes the client only.
- [x] Saving a photo or tags for a Quest the User made keeps them on the phone and returns them with that Quest afterwards.
- [x] The mock data matches the wireframe's posts, so that the screens look like the frames against the mocks.
- [x] A server Quest gets its photo and tags by a stable hash of its id from the mock's sets.
- [x] In the build connected to the server, members' names and faces are not added: a summary shows only what the server returns about people.
- [x] `todo.md` section 2 lists each part with the screens that read it.
- [x] Jest: a server answer comes back with photos and tags added and no invented people; a mock answer comes back with all parts; the same Quest id always gets the same photo and tags; a saved photo and saved tags come back with their Quest.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 1 h 30 min of active work by one subagent in its own worktree, plus about 40 min in the main session to bring the branch onto `2.0/Main` after #83 and #87 (three conflicts in the API client), run the checks and open the PR. It is an estimate: the run lasted about 2 h 45 min with a session crash in it, and most of the rest went to waiting on Jest under load.
- Tokens, from the subagent's transcript: input 15,740,101, of which 14,073,452 cache reads, 1,666,441 cache writes and 208 uncached; output 19,960. The main session's tokens are not split per ticket and are not included.
