# 08: The endpoints the server needs

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02, 03, 04, 05, 06

## What to build

A document for the server's owner, 윤유상: for each mock adapter of this task, the endpoint that would replace it, with the shape the app already reads. Once an endpoint exists, the app replaces the mock by changing the API client only.

## Acceptance criteria

- [ ] One entry per mocked part: official recruiting; photos; tags (the User's and a Quest's); hiding a post; people looking for company; members' names and faces in summaries, an invitation's companions included; an invitation's time and place; a join request's note; 파티 채팅; past Quests; and a declined activation stored on the server.
- [ ] Each entry gives the method and path proposed, the request and answer shapes as the app's adapter reads them, the screens that use it, and the signal that should announce a change.
- [ ] The two rules the wireframe draws differently are listed for decision: capacity up to 12, and switching on by the Leader only.
- [ ] `todo.md` section 2's last column points at each entry.
- [ ] The document is handed to 윤유상.
