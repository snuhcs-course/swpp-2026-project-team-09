# The walking evaluation, frozen at 11-01

Ticket: [01: Travel Times](../issues/01-travel-times.md). Everything here is committed before any walk. The seconds are `seed/walking-table.json` as of this file's commit, with speed and climb not calibrated. Nothing here changes after the freeze: the walked times go to the ticket's `## Comments`.

## The walking method

- Walk each test pair below with a stopwatch, at your usual pace, by the way you would really take.
- Start at the origin Place's entrance on the side you leave by and stop at the destination Place's entrance on the side you arrive by. A Place's pin is a point in or beside the building, and the walk ends at the building.
- Record only the time, the walker, the date and the time of day.
- A pair more than 2 minutes off the table gets one line on the route taken.
- Shuttle legs are not walked.

## The metric

Per pair, |table − walked|, summarised as the MAE and the share within ±2 minutes.

## The baseline

(straight-line distance × 1.2 + 60 m) at 1.1 m/s, on the same pairs.

## The threshold

At least 70% of the pairs within ±2 minutes, and the table's MAE below the baseline's.

## The 30 test pairs

All 30 form two chains, each pair's destination the next pair's origin, so that a walker can go on from one pair to the next. Together they are about 3 h 50 min on foot by the table, and can be walked over several sessions.

- **Chain A** starts at 학생회관, goes through the engineering college up the hill to 301동 and 302동, down again by the loop road to 교수회관, across to 관악사, back through the north of the campus and home to 학생회관.
- **Chain B** starts where A ends, and holds the three longer pairs (22, 23, 24), then the gate, 경영대 and the west of the campus.
- 27 pairs are 15 minutes or less by the table. Pairs 6 and 7 walk one road both ways, so that the climb's asymmetry shows.
- The Places are ones Users go to (classrooms, restaurants, dormitories), chosen by where they lie on the campus, before any walk.

| Pair | Chain | From | To | Straight line (m) | Table (s) | Baseline (s) |
|---|---|---|---|---:|---:|---:|
| 1 | A | 63동 학생회관 | 56동 자연과학관10 | 194 | 278 | 266 |
| 2 | A | 56동 자연과학관10 | 43-1동 이공계멀티미디어강의동 | 115 | 120 | 180 |
| 3 | A | 43-1동 이공계멀티미디어강의동 | 38동 글로벌공학교육센터 | 210 | 260 | 284 |
| 4 | A | 38동 글로벌공학교육센터 | 131동 신소재공동연구소 | 147 | 304 | 215 |
| 5 | A | 131동 신소재공동연구소 | 301동 제1공학관 | 411 | 734 | 503 |
| 6 | A | 301동 제1공학관 | 302동 제2공학관 | 144 | 279 | 211 |
| 7 | A | 302동 제2공학관 | 301동 제1공학관 | 144 | 204 | 211 |
| 8 | A | 301동 제1공학관 | 104동 반도체공동연구소 | 514 | 588 | 615 |
| 9 | A | 104동 반도체공동연구소 | 105동 유전공학연구소 | 75 | 141 | 136 |
| 10 | A | 105동 유전공학연구소 | 65동 교수회관 | 389 | 479 | 478 |
| 11 | A | 65동 교수회관 | 76동 제4식당(서당골) | 363 | 849 | 450 |
| 12 | A | 76동 제4식당(서당골) | 902동 (관악사)대학원 생활관 | 168 | 215 | 238 |
| 13 | A | 902동 (관악사)대학원 생활관 | 919동 (관악사)학부 생활관 | 209 | 242 | 283 |
| 14 | A | 919동 (관악사)학부 생활관 | 920동 관악사후생관 | 102 | 119 | 166 |
| 15 | A | 920동 관악사후생관 | 140동 국제대학원 | 371 | 815 | 459 |
| 16 | A | 140동 국제대학원 | 222동 생활과학대학 | 150 | 209 | 218 |
| 17 | A | 222동 생활과학대학 | 70동 박물관 | 76 | 133 | 137 |
| 18 | A | 70동 박물관 | 83동 인문사회계멀티미디어강의동 | 136 | 288 | 203 |
| 19 | A | 83동 인문사회계멀티미디어강의동 | 15동 법학관1 | 124 | 166 | 189 |
| 20 | A | 15동 법학관1 | 3동 인문관3 | 241 | 450 | 317 |
| 21 | A | 3동 인문관3 | 63동 학생회관 | 304 | 327 | 387 |
| 22 | B | 63동 학생회관 | 302동 제2공학관 | 1176 | 1652 | 1338 |
| 23 | B | 302동 제2공학관 | 919동 (관악사)학부 생활관 | 1666 | 1693 | 1872 |
| 24 | B | 919동 (관악사)학부 생활관 | 서울대 정문 | 977 | 1294 | 1120 |
| 25 | B | 서울대 정문 | 58동 SK경영관 | 325 | 419 | 410 |
| 26 | B | 58동 SK경영관 | 59동 LG경영관(경영연구관및산학협동관) | 114 | 298 | 179 |
| 27 | B | 59동 LG경영관(경영연구관및산학협동관) | 16동 사회과학관 | 240 | 566 | 316 |
| 28 | B | 16동 사회과학관 | 73동 문화관 | 216 | 235 | 290 |
| 29 | B | 73동 문화관 | 60동 행정관 | 176 | 226 | 247 |
| 30 | B | 60동 행정관 | 63동 학생회관 | 100 | 110 | 164 |

## The calibration pairs, for later

Chosen apart from the test pairs: no Place here is one of a test pair. Speed and climb stay uncalibrated before 11-01, and these pairs are not scored. C10 and C11, and C12 and C13, walk one road in both directions, for the climb.

| Pair | From | To | Straight line (m) | Table (s) | Baseline (s) |
|---|---|---|---:|---:|---:|
| C1 | 7동 인문관6 | 12동 사범교육협력센터 | 77 | 99 | 138 |
| C2 | 24동 자연과학관6 | 200동 농업생명과학대학 | 220 | 252 | 295 |
| C3 | 75동 복지관 | 32동 공학관3 | 98 | 124 | 162 |
| C4 | 30-2동 공대간이식당 | 44-1동 신양학술정보관 | 256 | 321 | 334 |
| C5 | 139동 공동기기원 | 142동 약학관5 | 134 | 174 | 201 |
| C6 | 100동 버들골 풍산마당 | 111동 사범대학 간이식당 | 83 | 96 | 145 |
| C7 | 82동 환경대학원 | 74동 예술복합연구동 | 99 | 93 | 162 |
| C8 | 903동 (관악사)대학원 생활관 | 905동 (관악사)대학원 생활관 | 83 | 136 | 145 |
| C9 | 153동 우정원 글로벌사회공헌센터 | 57동 행정대학원 | 126 | 239 | 192 |
| C10 | 313동 정밀기계공동연구소 | 300동 유회진 학술정보관 | 72 | 237 | 133 |
| C11 | 300동 유회진 학술정보관 | 313동 정밀기계공동연구소 | 72 | 191 | 133 |
| C12 | 22동 자연과학관4 | 20동 약학관3 | 191 | 293 | 263 |
| C13 | 20동 약학관3 | 22동 자연과학관4 | 191 | 228 | 263 |

## The fragile Places at the freeze

From `pnpm walking:build --sensitivity`: every pin moved, 10 runs each, compared over all the table's pairs. Of the Places below, only 15동 (pairs 19, 20) and 140동 (pairs 15, 16), both on the 20 m list, are in test pairs. They were kept, since dropping Places by this list would flatter the table.

| Pin moved | Mean change | Pairs within ±2 minutes |
|---:|---:|---:|
| 10 m | 30.7 s | 95.8% |
| 20 m | 48.9 s | 93.0% |

The Places that move most, with the mean change of the pairs they are in:

| 10 m | 20 m |
|---|---|
| 404.2 s 68-2 영선공장 | 603.5 s 68-2 영선공장 |
| 396.1 s 506 자연대 생명과학부 시약보관창고 | 529.3 s 506 자연대 생명과학부 시약보관창고 |
| 142.5 s 42 선형수조실험동 | 171.9 s 42 선형수조실험동 |
| 96.0 s 104-1 반도체교육관 | 131.8 s 104-3 반도체연구소수소창고 |
| 89.6 s 104-3 반도체연구소수소창고 | 113.7 s 104-2 반도체연구소화공약품창고 |
| 86.5 s 104-2 반도체연구소화공약품창고 | 95.5 s 143 약대신약개발연구센터 |
| 68.6 s 901 | 88.3 s 104-1 반도체교육관 |
| 68.1 s 143 약대신약개발연구센터 | 78.9 s 15 법학관1 |
| 67.0 s 배터리공동연구센터 | 76.1 s 140 국제대학원 |
| 66.8 s 40 풍동실험동1 | 74.9 s 152-1 롯데국제교육관 |
| 64.5 s 86 치의학대학원 첨단교육연구복합단지 | 73.9 s 종합운동장 |
| 62.4 s 45 천문대(신) | 71.9 s 300 유회진 학술정보관 |
| 58.3 s 140-1 국제대학원2 | 71.9 s 66 학군단 |
| 54.2 s 종합운동장 | 71.8 s 45 천문대(신) |
| 50.5 s 900 (관악사)대학원 생활관 | 70.7 s 57 행정대학원 |
