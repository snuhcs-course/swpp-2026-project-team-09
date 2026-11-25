# 02: A cut-off Tour resumes, existing Users are offered it once, and back asks first

Status: ready-for-agent
Blocked by: 01.

Native files: none. Releases: an app OTA update only.

Spec: [../spec.md](../spec.md).

## What to build

The Tour's edges, on top of 01's frame.

- **Resuming.**
  - The phone keeps the chapter reached while the Tour is in progress.
  - When the app is closed or killed during the Tour, the next start offers "이어서 둘러볼까요?" with 이어서 and 그만두기.
  - 이어서 starts that chapter from its first step, with the Practice data the chapter sets up itself.
  - 그만두기 records the Tour as declined, and the first run's cards follow.
- **Existing Users.**
  - A signed-in User with no record of the Tour on this phone is offered the start card once on the next start, wherever they are in the first run. That includes a User who saw the tour of the tabs.
  - While the card or the Tour is up, the first run's cards wait.
- **Back.** Android's back button during the Tour asks whether to stop ("그만할까요?"). Yes is 그만하기; no goes back to the step.
- **Signing out** forgets the Tour's record, as other first-run state is forgotten.

## Acceptance criteria

- [ ] A restart in the middle of a chapter offers "이어서 둘러볼까요?", and 이어서 starts that chapter from its first step.
- [ ] 그만두기 on that card ends the Tour for good, and the first run's cards follow.
- [ ] A User past Onboarding with no Tour record is offered the start card once; declining it or finishing the Tour stops the offer.
- [ ] Android's back button during the Tour asks first, and only yes stops it.
- [ ] After a sign-out and a sign-in, the Tour is offered again.
- [ ] Unit tests of the Tour's state cover resuming, the existing User's offer and signing out.
- [ ] The app-level integration test covers the restart, the existing User and the back button.
