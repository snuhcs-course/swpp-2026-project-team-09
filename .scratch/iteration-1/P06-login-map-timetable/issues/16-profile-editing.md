# 16: Profile editing

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 15 (내 정보 screen)

## What to build

A User changes their name, department, admission year, interests, course level and gender on the frame `ProfileEdit`, and 내 정보 shows the change. The first four are saved through P04's profile API. The course level and the gender are fake fields of a real feature until ticket 25: the profile's adapter merges the server's fields with what the phone stored.

## Acceptance criteria

- [ ] The form opens from "프로필 편집" with the stored profile and returns to 내 정보 on save and on back.
- [ ] The fields, their choices and their limits are the frame's and the server's, as on the Onboarding screen. The department list and the interest rules are shared with that screen, not copied.
- [ ] A stored department that is not in the list, or an admission year older than the list, is shown as it is and kept unless the User changes it.
- [ ] Saving sends only what the server stores to the server and keeps the course level and the gender in the phone's storage. 내 정보 shows the new profile without a restart.
- [ ] A refused save shows the server's reason at the field it names.
- [ ] "사진 변경" shows the "준비 중이에요" toast.
- [ ] Jest tests: the form filled from the profile, a save, a refused save, a department outside the list kept, the fake fields surviving a restart of the screen, and the photo's toast.
