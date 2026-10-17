# 05: Finding recruiting Quests, shown as the Boards' cards

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04; P06-03 (`.scratch/iteration-2/P06-party-quest-ui/issues/03-find-boards-and-posts.md`, #81)

## What to build

A User asks "오늘 저녁 같이 운동할 파티 찾아줘" and gets the recruiting Quests that match, listed as the same cards the Boards show. Pressing a card opens its post. Its join button works as on the Board, through the same confirmation.

The example button 파티 찾기 sends "파티 찾기" with no condition. The Assistant answers with a few recruiting Quests that start soon and invites the User to narrow down ("운동, 식사처럼 원하는 걸 말해 주시면 좁혀 드릴게요").

Like ticket 04's search, this is a refining tool. The model passes structured conditions, and the tool returns only Quests the User could see on the Boards, as compact candidates the model then picks from. This ticket reuses ticket 04's presenter guard, card filling and delimiters.

P06-03 changes the Board's post card (photo, faces, 관심 없음). This ticket waits for it and draws the card as P06-03 leaves it.

## Acceptance criteria

- [ ] **`searchRecruitingQuests`.**
  - It takes optionally a Board, a period and a Global Event.
  - It returns only Quests the User would see on the Boards, Open and Approval only, as compact candidates (id, title, Board, next Sub Quest's time and place, how many places are left, description excerpt). Closed Quests are never returned.
  - With nothing matching it returns "none".
- [ ] A Quest's title and description reach the model inside ticket 04's delimiters.
- [ ] **`showQuests`.**
  - It takes ids and adds those Quests as cards to the reply, in the shape the Boards' recruiting list uses, filled by the server.
  - It is behind the same guard as `showGlobalEvents`.
- [ ] The system prompt tells the Assistant to answer a request with no condition with a few recruiting Quests that start soonest and one line inviting the User to narrow down.
- [ ] **The cards in the app.**
  - They are drawn with the Board's post card as P06-03 leaves it.
  - Its join button opens the existing join confirmation.
  - Pressing the card closes the sheet and opens the post.
- [ ] **End-to-end tests with the scripted fake and seeded Quests:**
  - a Board filter returns only that Board
  - a period returns only Quests in it
  - a Closed Quest is never returned
  - no match returns "none"
  - a Quest description reaches the fake inside the delimiters
  - `showQuests` with returned ids puts filled cards in the reply
  - an id that no tool returned is refused
- [ ] **Screen tests:**
  - a reply with Quest cards shows them
  - pressing one opens the post
  - join opens the confirmation
