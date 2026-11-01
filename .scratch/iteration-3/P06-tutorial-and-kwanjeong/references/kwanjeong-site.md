# 관정관 booking site: findings (read-only, 2026-11-01)

Raw material lives next to this file: `json/` (redacted responses), `html/`, `js/`, `img/` and `img/maps/`, `out/` (request logs without cookies) and `scripts/`. The crawl attempted no write request, and the safety route aborted nothing.

## Spaces (libNo 1)

Every space books in 30-minute steps.

| Target | roomNo | sectorNo | Name | Unit | GR min–max | Duration | Hours | Book ahead |
|---|---|---|---|---|---|---|---|---|
| 2층 그룹스터디룸 | 121 | 12101 | 20인실 G201 | room | 11–20 | 0:30–3:00 | 09–23 | today + 3 days |
| | 121 | 12102 | 10인실 G203/G207/G208 | room | 7–10 | 0:30–3:00 | 09–23 | today + 3 |
| | 121 | 12103 | 6인실 G204/G205/G206/G211 | room | 4–6 | 0:30–3:00 | 09–23 | today + 3 |
| 4층 그룹스터디룸 | 141 | 14101 | 10인실 G402/G403/G423/G425 | room | 7–10 | 0:30–3:00 | 09–23 | today + 3 |
| | 141 | 14102 | 8인실 G401 | room | 6–8 | 0:30–3:00 | 09–23 | today + 3 |
| | 141 | 14103 | 6인실 G404–G430 (24 rooms) | room | 4–6 | 0:30–3:00 | 09–23 | today + 3 |
| 6층 미디어플렉스 | 162 | 16201 | 창의미디어스페이스 STUDIO A/B/C | room | 1–8 | 0:30–3:00 | 09–17 weekdays, closed Sunday | today + 3 |
| | 164 | 16401 | 미디어캐럴 A/B | room | 1–6 | 0:30–3:00 | 09–18 | today + 3 |
| | 165 | 16501 | XR Experience Center (VR, 공간컴퓨팅, AR-MR ×2) | room | 1–1 | 0:30–2:00 | 09–17 | today + 3 |
| | 166 | 16601 | Creative Media Studio | room | 1–10 | 0:30–4:00 | 09–17 | today + 3 |
| 7층 열람실 | 172 | 17201 / 17202 | 7A 1구역 (노트북존, 192) / 7A 2구역 (478) | seat | – | 0:30–6:00 | 07–23 | today only |
| 8층 열람실 | 182 | 18201 / 18202 | 8A 1구역 (QUIET, 168) / 8A 2구역 (노트북존, 560) | seat | – | 0:30–6:00 | 07–23 | today only |
| Same kind as the 열람실 | 171 / 173 / 181 / 183 | 17101 / 17301 / 18101 / 18301 | 노트북존 / 7B 노트북존 / 노트북 존 / 대학원 열람실 | seat | – | 0:30–6:00 | 07–23 | today only |

- **Room hours** come from getRoomList's OPENTIME/CLOSETIME for the date ("0000" means closed). Seats are open 07–23.
- **Group rooms:** at most 3 h with no extension. A booking not entered within 1 h is cancelled, and 3 no-shows in 7 days bring a 3-day ban.
- **Reading rooms:** at most 6 h, and an extension is possible. The seat must be confirmed at the kiosk within 30 min or it is auto-returned, and 5 no-shows or unreturned seats in a month bring a 10-day ban.
- **Not bookable online:**
  - G202 (12104), booked offline;
  - 161 멀티미디어 (16101–16107) and 163 정보검색실, on site only;
  - the 캐럴 174/17401 and 184/18401 (TYPENO 22);
  - 본관 (libNo 2), which was not mapped.
- G209, G210 and G414 are missing from getRoomList.

## Endpoints

All are `POST /NEW_SNU_BOOKING/json/<name>`, form-encoded, with headers `X-Requested-With: XMLHttpRequest` and `OS_KIND: WEB`. HTTP 999 means login is required.

| Endpoint | R/W | Body | Returns |
|---|---|---|---|
| getSectorList | R | `libno=1&floorno=12` | SectorList: SECTORNO, NAME, TYPENO, ROOMNO, ROOM_NAME, BOOKING_YN, SECTOR_IMAGE, MAPPOINT, … |
| getRoomList | R | `searchDate&roomNo&sectorNo&seatNo=&TIME_START=&TIME_END=&ABLETIME=&NAME=&sectorName&roomName&tab_on=tabBooking&libNo=1` | BookingTimeList: SEATNO, NAME, OPENTIME, CLOSETIME, ABLETIME (comma list of free 30-min slot starts) |
| getSeatBookingList | R | `roomNo&sectorNo&useTime&bookDate&bookTime=HHMM-HHMM&seatNo=&sMemberJsInfo=` | SeatList: SEATNO, NAME, VNAME, STATUS, USECNT, POSX, POSY, POSW, POSH, ICONTYPE, GR_MIN, GR_MAX, XFULL |
| getSeatInfo | R | `seatNo` | NAME, COMMENT, DEVICE_COMMENT, SEAT_IMAGE, MONITOR/LAN/STAND/POWER_YN |
| getSeatInfoFromList | R | `sectorNo` | the first seat of the sector, with GR_MIN and GR_MAX |
| getUserCheck | R (lookup; not called during the crawl) | `pRoomNo&pUserName&pSchoolNo` | useCheckInfo.NAME and .SCHOOLNO, or `msg` |
| getMyBookingList | R | `start=YYYYMMDD&end=YYYYMMDD` | bookingList or null |
| setRoomBooking | **W** | see below | bookingResultInfo or bookingFailInfo |
| setCancelBooking | **W** | `bseqno` | cancels (STATUS 1/2) or returns (STATUS 3) |
| setSeatReturn | **W** | `bseqno` | defined, but no button uses it |

## Booking payloads

- **Reading room:** `roomNo, sectorNo, useTime (minutes), bookDate, bookTime, seatNo, sMemberJsInfo=''`.
- **Room:** `roomNo, sectorNo, seatNo, bookTime, bookDate, useDesc, phoneNum, eMail, sMemberJsInfo`, with no useTime.
  - `useDesc` is required: 강의/과제/동아리활동/연구/취업/기타. Media rooms add 콘텐츠제작/녹음, and XR adds 체험.
  - Phone and email are required and prefilled from the library profile.
  - Media rooms also need the 서약서 agreement, checked in the browser only.
- **sMemberJsInfo:** `이름1,학번1,이름2,학번2,…`, with the applicant first.
  - Each companion is checked with getUserCheck(roomNo, name, 학번). Hyphens are stripped from the 학번, and the name and 학번 the server returns are the ones stored.
  - Adding stops at GR_MAX, and a booking needs at least GR_MIN people including the applicant. The site compares these as strings, so the app must compare numbers.

## Seat maps

- **Background:** `https://k-rsv.snu.ac.kr:444/MAP/WEB/area_<sectorNo>.png?version=20261022`, which loads **without cookies**. Sizes:
  - 17202: 2529×1198
  - 18202: 2467×1198
  - 17101 and 18101: 1987×1198
  - 17201, 17301, 18201 and 18301: 1190×1198
- **Seats:** each one is a 33×28 box at left=POSX, top=POSY in image pixels, labelled with VNAME.
- **Colours:**
  - free (STATUS 1 and USECNT 0): orange #FDA827→#F89200;
  - taken: #F3F0E6 with text #D1CAB7;
  - STATUS 9: an accessible seat (#E0E0D2 with a wheelchair icon), not bookable.
- **Floor overview:** `:444/MAP/WEB/floor_<floorno>000.png`, with MAPPOINT polygons on it.
- **Room photos:** `:444/MAP/POP/pop_<seatNo>.png|jpg`. Room sectors have no `area_` image.

## My bookings

- **Row fields:** BSEQNO, SEATNO, REGTIME, USESTART, USEEXPIRE, RETURNTIME, STATUS, STATUS_NAME, FLOOR_NAME, ROOM_NAME, SECTOR_NAME, SEAT_NAME, SEAT_VNAME, SECTORNO, ROOMNO, LIB_NAME, EXTEND_YN, RETURN_YN. No identity fields.
- **STATUS:**
  - 1: awaiting approval
  - 2: booked
  - 3: checked in
  - 4: finished
  - 5: returned
  - 6: no-show
  - 7: cancelled

## Open questions

- What getUserCheck answers for an ineligible companion.
- Whether the server enforces GR_MIN and the duration limits.
- Whether a room booking's duration comes from bookTime alone.
- What XFULL means.
- Why G209, G210 and G414 are missing.
- Saturday hours for the media rooms.
