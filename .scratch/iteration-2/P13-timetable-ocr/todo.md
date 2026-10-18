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

## 6. Server needs (for 윤유상)

A class read from a screenshot, or entered by hand, can have a room without a building (`placeId: null`, `room: "311-1"`): the main server already accepts it (`POST /timetable/classes`). The timetable screen shows the room, but a Class Quest drops it, so Class Quests, the Quest list and 다음 강의 show no place.

- [ ] In `main-server/src/quests/class-quests.service.ts` `toClassQuestDto`, when a time has a room but no Place, answer the Sub Quest's place as a label alone: `{ placeId: null, label: room, latitude: null, longitude: null }`. A time with neither stays `place: null`; one with a Place is unchanged (`"{place.name} {room}"`).
- The app needs no change: it already shows a label-only place for Sub Quests. No migration: the schema is unchanged.

Example. The class, as stored:

```http
POST /timetable/classes
Idempotency-Key: 3f0c…

{ "courseName": "컴파일러",
  "times": [{ "weekday": "monday", "startTime": "09:00", "endTime": "10:15", "placeId": null, "room": "311-1" }] }
```

`GET /quests` (or `GET /quests/{classId}`) on Monday 2026-10-19, the Class Quest's Sub Quest:

```json
{
  "id": "<timeId>",
  "attending": false,
  "title": "컴파일러",
  "startsAt": "2026-10-19T00:00:00.000Z",
  "endsAt": "2026-10-19T01:15:00.000Z",
  "place": {
    "placeId": null,
    "label": "311-1",
    "latitude": null,
    "longitude": null
  },
  "completion": "by_time",
  "cancelled": false,
  "done": false,
  "ended": false
}
```

Today the same Sub Quest answers `"place": null`.
