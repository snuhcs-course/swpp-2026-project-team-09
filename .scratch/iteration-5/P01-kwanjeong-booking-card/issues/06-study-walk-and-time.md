# 06: The study answer's walk tied to its time

Parent: [P01 spec](../spec.md); the study answer, where the map and the card were still apart
Status: ready-for-agent
Blocked by: 04

Native files: none. Releases: an app OTA update only.

## What happens now

The map draws the walk from the User to 관정관, and from 04 the label says "· 걸음 N분". The card never ties the walk to the time:

- **Before booking.** The server fills a seat's start for today from the User's arrival at 관정관 (`seat-arrival.ts`), but the sentence does not say why that start.
- **After booking.** The kiosk deadline stands alone ("14:07까지 좌석배정기에서 확인해 주세요."). There is no way to start the route guidance from the booked card, which a meal's booked card has.

What the reply carries: the card's `start`, `minutes`, and `notes`. When the server filled the start from the arrival, one note says so in words ("14:05 도착에 맞춰 최대 시간으로 채웠어요", "지금부터 …", "07:00 열 때부터 …"). The structured arrival (`at`, `from`, `walkMinutes`) and `leaveBy` go only to the model, as the tool's result, and not into the card. For the app to say it without inferring, the server would add `arrival` and `leaveBy` to the card. This ticket builds only on what the app knows itself: the walk it draws.

## What changes

- The map side tells the seat card the minutes of the walk it draws, while the User's position is known.
- **Before booking.** When the start is the first step the User reaches walking from now, the sentence says why: "걸음 9분이라 관정 7층 열람실에 14:00부터 1시간, 빈 자리 470석이에요."
- **After booking,** the kiosk line joins the deadline and the walk:
  - In time: "걸음 9분 · 13:58까지 출발하면 14:07 전에 좌석배정기에서 확인할 수 있어요."
  - Less than five minutes to spare: "걸음 N분 · 지금 출발하면 14:07 전에 …".
  - Too late: "걸음 40분이라 14:07까지 좌석배정기에 닿기 어려워요. 그때까지 확인하지 않으면 자동으로 반납돼요."
  - Without the walk, the kiosk sentence stands alone as before.
- "길 안내" stands beside "좌석 현황 보기" in a booking's done card on the map, doing what a meal's booked card does. While the guidance cannot start, it is disabled with the reason under it.

## Acceptance criteria

- [x] The kiosk line's four cases (in time, tight, too late, the walk not known) and the start the walk reaches. (Unit test.)
- [x] On the map a booked seat's done card says the walk with the deadline and offers 길 안내 beside 좌석 현황 보기. (Integration test.)
- [x] No native file changes; oxlint, Prettier, and tsc pass on the app.

## Comments

### Hands-on findings and the server's arrival (2026-11-23)

From the first hands-on use of the study answer on the emulator:
- **A new time or room no longer empties the card.** The card keeps the seat it last read, its row saying "· 다시 확인하는 중", until the new read returns. 예약하기 stays disabled meanwhile.
- **The room list's counts come one by one.** Each count shows as it arrives, and one that does not come within the 8 s wait shows as failed ("—"). Before, all four counts waited for the last.
- **Raised while the seats are first read,** the card shows the room chip and the site's notes, not only the sentence.

The 8 s wait counts from the moment the read starts, with a JavaScript timer. On an emulator whose JavaScript was starved for a minute, it fired late too. Nothing in the code stops it from firing; no test held the read.

With P05's PR 496 the seat card carries `arrival` (`at`, `walkMinutes`, `from`) and `leaveBy` when the server filled the start from the arrival. The app keeps both when well formed, and the sentence then says "301동에서 걸음 9분이라 …". Without them it falls back to the walk the map draws.

Tonight the integration tests that mount the answer frame time out at 60 s on this Mac, `5.0/Main`'s own code included: the load average was 35 to 50, and with #495 merged. Unit tests and checks pass. These integration tests ran green before #495, at a lighter load.

### Agent usage (2026-11-23)

- Agent time: about 75 minutes in one session, from 00:20 to 01:40 (an estimate).
- Tokens: see P01 ticket 04's session; this part is within the same session's totals for 2026-11-23.
