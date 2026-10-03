# 25: Server: the profile's course level and gender

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The profile gains two optional fields that the wireframes' Onboarding and profile editing screens ask for, so that the app stops keeping them on the phone (tickets 13 and 16). 윤유상 builds it. The final names are the server's to decide, and ticket 27 adapts the app.

## Acceptance criteria

- [ ] The profile holds a course level, undergraduate or graduate, which may be missing.
- [ ] The profile holds a gender, which is female, male or a text of the User's own with a limit, and may be missing.
- [ ] Reading the profile answers both. The profile's change and Onboarding accept both, and neither is required.
- [ ] The Lobby's profile carries both, as the profile's route does.
- [ ] The change is recorded as a migration.
- [ ] Tests at the API level: both fields stored, changed and cleared, and a value outside the choices refused.
- [ ] The main server's README records the fields and their limits.
