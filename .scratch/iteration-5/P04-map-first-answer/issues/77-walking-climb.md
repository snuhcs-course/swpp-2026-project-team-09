# 77: The walking table counts the climb, so a way up and the way down differ

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet.
Blocked by: none.

Native files: none. Releases: the main server and its seed.

## What happens now

The user's phone showed (관악사)학부 생활관 (919) → 제2공학관 (302) as 23 minutes. The walking table gives 1,333 s both ways: 1.86 km at the calibrated 1.3967 m/s, with nothing for the 114 m climb. `CLIMB_SECONDS_PER_METRE` was fitted below 0 on the 13 calibration walks and became 0 (iteration 3, P11 ticket 02). The climb decides whether the User reaches a class, and whether the shuttle wins: it lost this pair by a minute.

The user's decision (2026-11-26): "걷기 표에 경사 공식을 넣어서 양방향 값을 다 관리할 수 있도록 표를 업데이트 하자". The flat speed stays ("너무 느린 걸음에 맞출 필요는 없기는 해").

## What to build

1. The walk's seconds add a cost per metre the destination stands above the origin, and one per metre it stands below (`CLIMB_SECONDS_PER_METRE`, `DESCENT_SECONDS_PER_METRE`), so `placeToPlace[a][b]` differs from `[b][a]`, as do `placeToStop` and `stopToPlace`. These two constants are the one switch.
2. The heights are the two ends', the Places' and Stops' SRTM heights, not summed edge by edge: per-edge gain from SRTM's 30 m cells adds a climb both ways. The flat pair 58 ↔ 83 goes from 258 s to 317 s with 6 s/m per edge.
3. Compare, before the constant is fixed: 0 (today), Naismith's 6 s/m, Tobler's hiking function, and the walks' own fit. Use the 13 calibration walks, the 30 test walks, and named pairs both ways: 919 ↔ 302, 301 ↔ 학생회관 (63), 정문수위실 (115) ↔ 302, 자하연식당 (109) ↔ 301, and the flat pairs 58 ↔ 83 and 62 ↔ 109.
4. Rebuild `seed/walking-table.json` with `pnpm walking:build`. Every reader uses the direction asked for.
5. ADR 0010's model sentence and the README's seed section follow the model.

## Acceptance criteria

- [ ] The two constants are chosen with the user, and the table is rebuilt with them.
- [ ] A test fails on the code before: the committed table's walk up 919 → 302 takes at least a minute longer than the walk down; the flat pair 58 ↔ 83 stays at its 258 s within 3 s.
- [ ] No reader assumes the table is symmetric.
- [ ] The affected server tests pass; the evaluation's frozen travel fixture is untouched.
- [ ] ADR 0010 and the README describe the model.

## Comments
