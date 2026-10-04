# 12: The Place at a position

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User picks a point on the map as the place of a Meetup, a Sub Quest or a Private Event, and the app names the point: the Place it is in, "near" a Place, or a point without a name. The main server holds the outlines that tell in from near, and P07 built the lookup. This ticket serves that lookup to the app.

## Acceptance criteria

- [x] A User's route takes a latitude and a longitude and returns the Place at that position, with its identifier, number and name, and whether the position is in it or near it. A position at no Place is answered as none.
- [x] The answer is the lookup's of P07, with its distances and its order where two Places hold the position. The route reads no database.
- [x] The route needs a User's access token. Coordinates that are not a latitude and a longitude get 400 with the field named.
- [x] Main server tests at the API: a position in a Place, one near a Place, one at none, invalid coordinates, and a request without a token.
- [x] The main server's README records the route and its three answers.

## Comments

### Decisions (2026-10-04)

- Route: `GET /places/at?latitude=…&longitude=…`, a User's route like the other `/places` routes (access token and
  completed onboarding). It answers 200 with `{ place, relation }`: `place` in the form of `GET /places`
  (`id`, `number`, `name`, `latitude`, `longitude`) and `relation` `inside` or `near`, or
  `{ "place": null, "relation": "none" }` at no Place. The type is `PlaceAtDto` in `src/places/dto/place-at.dto.ts`.
- It answers with `PlaceLookup.at()` as P07 built it, so its distances and order are P07's, and reads no database.
- Coordinates are read as the walking route reads them: text written as a decimal number, a latitude from -90 to 90
  and a longitude from -180 to 180, or 400 with a message that starts with the field. Both routes take the query schemas from
  `src/common/degrees-query.ts` (`latitudeQuerySchema`, `longitudeQuerySchema`).
