# 09: Main screen: the 편의기능 button and its layers

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Main screen: the map, the bottom navigation and my position)

## What to build

The main screen gains the 편의기능 button and the three layers it turns on, 식당, 셔틀버스 and 공부공간, as the frames `MainLayers` and `MapDining` show. Their markers are fake. P15 connects the dining and shuttle layers; no spec covers study space seats.

## Acceptance criteria

- [ ] The button opens and closes its three toggles as in the frame.
- [ ] Each layer shows and hides its markers on the map, with the detail by zoom that the frames show.
- [ ] A tap on a layer's marker opens the frame's information sheet with its placeholder actions.
- [ ] The dining and shuttle layers are on the fake list; the study space layer holds the frame's sample content.
- [ ] A light Jest test: the toggles open, a layer's markers appear and disappear, and the sheet opens and closes.
