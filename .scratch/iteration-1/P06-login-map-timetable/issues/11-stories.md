# 11: Main screen: stories and 오늘의 발자국

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Main screen: the map, the bottom navigation and my position)

## What to build

The main screen gains its story controls, as the frames `MainCompose` and `MainReplay` show: the centre + button of the bottom navigation with the sheet for posting a story and my story, and 오늘의 발자국, which replays the day's stories on the map. The content is the frames' samples, held in the screen. No spec covers this feature, so nothing is sent to a server and no photo leaves the phone.

## Acceptance criteria

- [ ] The + button opens the sheet for posting a story, and a long press on it opens my story, as in the frame.
- [ ] The sheet follows the frame's script: its text, its photo placeholder, its place and its audience choice.
- [ ] 오늘의 발자국 starts the replay as in the frame, with each story's bubble pointing at the spot it was taken.
- [ ] The replay ends as in the frame, and nothing is kept when the app restarts.
- [ ] A light Jest test: the sheet opens and closes, and the replay starts and ends.
