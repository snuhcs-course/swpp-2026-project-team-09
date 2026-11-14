# 09: First run asks for the Timetable, interests, and one Friend (app)

Parent: [P05 spec](../spec.md) ("Part 2", "First run")
Status: ready-for-agent
Blocked by: 08 (a chosen chip is a watched interest)
Native files: no

## What to build

A User who has just finished Onboarding lands on the map and is asked three things, one card at a time, each with a way to skip: the Timetable first, then interests, then one Friend. A User who skips everything has the same app with nothing asked again.

## Behaviour

- **The Timetable card**: "시간표부터 넣어 주세요", with "수업 사이의 빈 시간에 맞춰 짜요" and "친구에게는 수업 건물과 끝나는 시각만 보여요". Its button opens the Timetable's screen; the card is answered when the User comes back with at least one Class.
- **The interests card**: chips of topics; each chosen chip is kept as a watched interest. "나중에" skips.
- **The Friend card**: "친구 한 명을 불러 보세요", whose button makes an Invite Link and opens the share sheet, as 친구 추가 does. The card says what the Friend will see first: the building the User is in.
- The phone remembers each card as answered or skipped, for the signed-in User. A card is shown only to a User who finished Onboarding on this phone after this version, has no Class (for the first), no interest (for the second), and no Friend (for the third).
- Each card is one bottom card of the main screen, drawn with the design system's parts, and gives way to an answer.
- A User with no interest sees one line over the input, "관심을 맡기면 맞는 것만 또렷하게 떠요", that opens the interests card again.

## Acceptance criteria

- [ ] Integration tests over the main screen with the fake main server: the three cards in order for a new User, each skipped and each answered; nothing shown to a User who has a Class, an interest, and a Friend; nothing shown again after a restart.
- [ ] The interests card keeps the chosen chips through the interests route.
- [ ] The Friend card makes a link and opens the share sheet.
- [ ] The whole mobile suite passes; CI's `app-fingerprint` passes without a native change.

## Comments
