# P13 to-do list (Iteration 2)

Updated 2026-10-18. Spec: [spec.md](spec.md). Wireframe version `1792254123-2af8`.

## 1. The work, in order (frontend: 안진영)

- [ ] 01 The native OCR module (ML Kit Korean), `expo-image-picker`, and the saved outputs of the four screenshots
- [ ] 02 The reading pipeline, the room-to-building link, and `accuracy.md`
- [ ] 03 Timetable versions on the phone and the week card's dropdown
- [ ] 04 `이미지로 불러오기`: a new version from a screenshot

01 and 03 can start at once; 02 needs 01's saved outputs; 04 needs all three.

## 2. Kept on the phone, not on the server

| What                                          | Why                                                                      | Limit                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Timetable versions other than the current one | The server keeps one timetable; the current version's classes stay there | Another phone or a reinstall sees only the current version |

No server change is needed in this task.

## 3. Device checks (함재현)

- [ ] 01: the module reads a screenshot on the shared Android phone and on iOS
- [ ] 04: from the tile to the timetable screen once on a phone

## 4. People

- [x] The owner of the four reference screenshots agreed that they be committed as test fixtures (2026-10-18)
- [ ] 함재현 reviews each PR

## 5. Left for Iteration 3

- Synthetic screenshots and a larger accuracy study
- Photos taken with the camera, and apps other than SNUTT and 에브리타임
- Keeping versions on the server
