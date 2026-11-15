# 15: A café on the way

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: needs-info
Blocked by: data: the campus cafés with their Places

## What to build

"가는 길에 카페" shows the cafés on the User's way to their next item, each with the extra minutes of the detour. The one with the least extra time is picked, and the arrows browse the others (wireframe row 7, board q9; design section 5, question 15).

## Why it waits

The server has no list of cafés. The seed's Places, the restaurant seed, and the OpenStreetMap export hold none, and the board's café names are example values. A person decides the source: a hand-made list of the campus cafés with their buildings, or an OpenStreetMap `amenity=cafe` export like the existing one. Once there is one, the calculation is ticket 06's way with one stop between, which needs no new screen piece.

## Comments
