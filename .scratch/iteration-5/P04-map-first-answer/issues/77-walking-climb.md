# 77: The walking table counts the climb, so a way up and the way down differ

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet.
Blocked by: none.

Native files: none. Releases: the main server and its seed.

## What happens now

The user's phone showed (관악사)학부 생활관 (919) → 제2공학관 (302) as 23 minutes. The walking table gives 1,333 s both ways: 1.86 km at the calibrated 1.3967 m/s, with nothing for the 114 m climb. `CLIMB_SECONDS_PER_METRE` was fitted below 0 on the 13 calibration walks and became 0 (iteration 3, P11 ticket 02). The climb decides whether the User reaches a class, and whether the shuttle wins: it lost this pair by a minute.

The user's decision (2026-11-26): "걷기 표에 경사 공식을 넣어서 양방향 값을 다 관리할 수 있도록 표를 업데이트 하자". The flat speed stays ("너무 느린 걸음에 맞출 필요는 없기는 해"). After the comparison below, the user chose Tobler's hiking function between the two ends ("토블러로 진행해줘").

## What to build

1. A walk's speed is the fitted flat speed times exp(−3.5 × (|slope + 0.05| − 0.05)): Tobler's hiking function, scaled so that the flat keeps 1.3967 m/s. Scaling is the smaller change to flat pairs: Tobler's own flat, 5.04 km/h, is 1.3994 m/s, about 1.4 s a kilometre faster. The slope is the two ends' heights over the path's length, so `placeToPlace[a][b]` differs from `[b][a]`, as do `placeToStop` and `stopToPlace`.
2. The heights are the two ends', not summed edge by edge. Per-edge gain from SRTM's 30 m cells adds a climb both ways: the flat pair 58 ↔ 83 goes from 258 s to 317 s at 6 s/m per edge. A path that rises and falls on the way counts flatter than it is.
3. Rebuild `seed/walking-table.json` with `pnpm walking:build`. Every reader uses the direction asked for.
4. The server's tests about plans, answers, ways and boards bind a frozen copy of the table from before this ticket, as the evaluation binds its frozen fixture, so that their numbers do not move with the walking model. The table's own tests read the committed one.
5. ADR 0010's model sentence and the README's seed section follow the model.

## The comparison (2026-11-26)

The flat speed is the same in every model. MAE in seconds:

| Model                                                       | 13 calibration walks | 30 test walks |
| ----------------------------------------------------------- | -------------------- | ------------- |
| 0 (before)                                                  | 22.2                 | 70.4          |
| Naismith, 6 s/m up, 0 down, ends                            | 53.7                 | 125.7         |
| Naismith per edge                                           | 56.0                 | 156.3         |
| Tobler, ends                                                | 34.5                 | 84.5          |
| Tobler per edge                                             | 40.1                 | 115.1         |
| 1 s/m up                                                    | 22.5                 | 70.3          |
| 2 s/m up                                                    | 27.9                 | 79.8          |
| Least squares on all 43 walks: +0.49 s/m up, −1.54 s/m down | 24.8                 | 60.0          |

Pairs both ways, in minutes, before / Naismith / Tobler / the walks' fit:

| Pair                               | Metres, rise     | Up                        | Down                      |
| ---------------------------------- | ---------------- | ------------------------- | ------------------------- |
| 919 ↔ 302                          | 1,862 m, 113.9 m | 22.2 / 33.6 / 27.5 / 23.1 | 22.2 / 22.2 / 19.4 / 19.3 |
| 학생회관 (63) ↔ 301                | 1,198 m, 110.3 m | 14.3 / 25.3 / 19.7 / 15.2 | 14.3 / 14.3 / 13.9 / 11.5 |
| 정문수위실 (115) ↔ 302             | 2,190 m, 163.8 m | 26.1 / 42.5 / 33.9 / 27.5 | 26.1 / 26.1 / 23.9 / 21.9 |
| 자하연식당 (109) ↔ 301             | 1,395 m, 105.8 m | 16.7 / 27.2 / 21.7 / 17.5 | 16.7 / 16.7 / 15.3 / 14.0 |
| 58 ↔ 83 (flat)                     | 360 m, 0.0 m     | 4.3 every model           | 4.3 every model           |
| 자하연식당 (109) ↔ 중앙도서관 (62) | 257 m, 1.6 m     | 3.1 / 3.2 / 3.1 / 3.1     | 3.1 / 3.1 / 3.0 / 3.0     |

Why the calibration's fit went below 0: the 13 calibration walks are 87–291 m and climb at most 21.8 m. A climb's few seconds sit inside the walker's noise: C8 walked 146 m in 45 s, and C9 214 m up 14.9 m in 91 s, both much faster than any model.

Why Tobler and not the walks' fit: all 43 walks are one walker's, on two nights between 23:00 and 02:00, with one or two long climbs. So the fit's +0.49 s/m up rests on almost nothing, and on one person's pace on empty paths. Tobler matches the measured descents (302 → 919 walked in 19.1 minutes, Tobler 19.4) and leaves room uphill, where being late to a class costs more than being early. On the 30 test walks the Tobler table scores an MAE of 84.9 s, with 24 of 30 within ±2 minutes: the evaluation's threshold under ±2 minutes is still met.

## Acceptance criteria

- [x] Tobler between the ends, scaled to the fitted flat speed, chosen with the user; the table is rebuilt with it.
- [x] Tests fail on the code before: `walking-table` pins 919 → 302 at 1,652 s and 302 → 919 at 1,164 s, and 58 ↔ 83 at 258 s within 3 s; `walking-graph` pins Tobler's function; `walking-climb` (integration) a Friend's walk through the app, 28 minutes up and 20 down.
- [x] No reader assumes the table is symmetric.
- [x] The tests about plans and ways bind the frozen table; the evaluation's frozen travel fixture is untouched.
- [x] ADR 0010 and the README describe the model.

## Comments
