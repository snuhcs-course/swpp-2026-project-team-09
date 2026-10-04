# 12: The Place at a position

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User picks a point on the map as the place of a Meetup, a Sub Quest or a Private Event, and the app names the point: the Place it is in, "near" a Place, or a point without a name. The main server holds the outlines that tell in from near, and P07 built the lookup. This ticket serves that lookup to the app.

## Acceptance criteria

- [ ] A User's route takes a latitude and a longitude and returns the Place at that position, with its identifier, number and name, and whether the position is in it or near it. A position at no Place is answered as none.
- [ ] The answer is the lookup's of P07, with its distances and its order where two Places hold the position. The route reads no database.
- [ ] The route needs a User's access token. Coordinates that are not a latitude and a longitude get 400 with the field named.
- [ ] Main server tests at the API: a position in a Place, one near a Place, one at none, invalid coordinates, and a request without a token.
- [ ] The main server's README records the route and its three answers.
