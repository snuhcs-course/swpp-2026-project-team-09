# 40: The crowded mock's words read as the main server's

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([36](36-faded-and-dropped-places.md) is merged).

Native files: none. Releases: an app OTA update only (the mock build only).

## What happens now

From the pictures of ticket 36:

- With a Friend added, the crowded mock's reasons alternate 은 and 는 by position, so "강도윤는 10분밖에 못 있어요" stands beside "강도윤은 …". The main server picks the particle by the name's last syllable (`withTopic`).
- The mock's reply names 학생회관식당 (걸음 32분) beside its pick, 302동식당. Since the answers rank by walking, the alternative it names is the nearest one.

## What to build

- The mock's reasons take the topic particle by the name's last syllable: 은 after a final consonant, else 는.
- The mock's reply names the nearest alternative: "302동식당 순살안동식찜닭이 좋아요. 걸음 2분이고 11:30에 열어요. 가까운 301동식당은 들기름막국수이고 걸음 2분이에요."

## Acceptance criteria

- [ ] With 강도윤 added, no reason reads "강도윤는". (Unit test.)
- [ ] No native file changes; lint, format, and types pass on the app.
