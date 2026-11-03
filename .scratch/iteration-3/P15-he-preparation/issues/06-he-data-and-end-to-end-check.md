# 06: The HE data on swpp-a, checked end to end

Parent: [P15 spec](../spec.md) ("The HE seed", "Testing Decisions": the manual end to end)
Status: ready-for-agent
Blocked by: 03, 04, 05

## What to build

swpp-a holds the HE data, and the HE APK is checked against it on the emulator, as an evaluator would use it. The Mac doing this must be on the SNU network.

## Steps that wait for the PM's word

1. **Push:** pushing the commits with the seed. The deploy timer redeploys once CI passes.
2. **Seed:** running `he-seed` on swpp-a.

## Acceptance criteria

- [ ] **Seed on swpp-a:** swpp-a runs a commit that holds 03. `he-seed` reports what it created, and a second run creates nothing.
- [ ] **First run:** with the HE APK on the emulator against swpp-a, a round account signs in, passes consent and Onboarding with its persona suggested, and reaches the map.
- [ ] **Friend Request:** one is sent between the two accounts of a round, with the other side played through the API with its key. It is accepted and shows in both friend lists.
- [ ] **Joining:** an Open recruiting Quest is joined from the 파티 tab.
- [ ] **Assistant:**
  - Asked through the API with the account's token, it answers who can have dinner on Wednesday 11-04 with the Friends the spec expects. The API is used because adb types no Korean.
  - In the app, an example request of the empty chat is answered with its cards.
- [ ] **Socket:** the socket connection stays up for over five minutes.
- [ ] **Campus data:** menus, events and the shuttle show in the app.
- [ ] **Record:** the ticket's Comments record each check's result and anything not checked.
