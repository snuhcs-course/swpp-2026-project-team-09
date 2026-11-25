---
status: accepted
---

# Travel Time comes from an offline walking table and shuttle times derived from a few days of Dev logging

Travel Time is the time from one Place to another, on foot or by the circular shuttle. An offline command computes every directed pair of Places, and of Places and Shuttle Stops, on OpenStreetMap's pedestrian ways and writes a seed file of seconds. The server loads that file at start and only looks values up. The shuttle's times come from `shuttle-timing.json`, derived from a few days of vehicle positions logged on the Dev Server, and until a value exists the notice's values stand in for it.

**The graph.** Its ways are every highway a pedestrian can use (footway, path, steps, pedestrian, living_street, service, residential, unclassified, tertiary, secondary, track), without `foot=no`, and without `access=private` unless `foot=yes`. The extract is a pinned Overpass export with its timestamp, committed so that the table can be rebuilt.

**The join.** Each Place point and Shuttle Stop joins its nearest path and every other path within that distance + 20 m, only in the graph's main connected component and never on a way tagged `sac_scale`. The walk from the point to the path costs its straight-line length.

**Time.** The speed on the flat is 1.3967 m/s, fitted to the 13 calibration walks. The slope changes it by Tobler's hiking function, scaled so that the flat keeps that speed: 1.3967 × exp(−3.5 × (\|slope + 0.05\| − 0.05)) m/s, fastest going down 5% and slower the steeper it climbs or drops. Tobler's own flat speed, 5.04 km/h (1.3994 m/s), would be about 1.4 seconds a kilometre faster. The slope is the two ends' heights over the path's length, each Place and Shuttle Stop having one elevation, read once from SRTM 30 m, so the table is directed: a way up takes longer than the way down. This is a known simplification: a path that rises and falls on the way counts flatter than it is. The climb is not summed edge by edge, because the raster's 30 m cells put bumps in every path, and summing them adds a climb both ways, a flat pair included. Steps are not modelled apart.

**The shuttle.** Shuttle positions are logged only on the Dev Server: its Redis already holds them, a collector needs nothing from Production, and a few days answer the question. A Production table would change the Production schema and keep positions nobody needs for this, to answer what two or three days of logs answer. The times are a wait per stop and band, Σh² / (2Σh) over the observed headways, and a median ride per pair of stops and band. The shuttle is chosen only when it is at least 3 minutes faster than walking.

## Considered Options

- **Kakao's walking route for every pair.** Its results may not be stored, and a live call for each candidate would cost a request per pair at every question. Kakao stays only for drawing routes: it never feeds the table, and nothing is compared with it.
- **Straight-line distance with a detour factor.** It needs no data, but it says a building behind a hill is 2 minutes away. It stays as the baseline of the walking evaluation.
- **A grid instead of Place × Place.** Compared with the Place table, 25 m cells give an MAE of 46 s and 50 m cells 85 s, short trips come out long, and the table is 8 to 100 times larger.
- **No climb at all.** The calibration's fit of a climb value went below 0 on walks 87–291 m long that climb at most 21.8 m, and became 0: a way up then took as long as the way down, and (관악사)학부 생활관 (919) → 제2공학관 (302), 114 m up, read 22 minutes both ways.
- **Naismith's rule**, 6 seconds per metre climbed and nothing going down. It doubled the error on the 30 test walks, from an MAE of 70.4 s to 125.7 s; the walk up 919 → 302 would take 34 minutes.
- **A climb and a descent value fitted to the walks**, +0.49 s per metre up and −1.54 s per metre down, which gave the lowest error (60.0 s). The 43 walks are one walker's, on two nights between 23:00 and 02:00, with one or two long climbs. So the up value rests on almost nothing, and on one person's pace on empty paths. Tobler matches the measured descents and leaves room uphill, where being late to a class costs more than being early. Its MAE on the 30 test walks is 84.9 s, still within the evaluation's threshold.
- **Joining every path within 40 m.** It stranded BK국제관, left 458 pairs unreachable, and said 24 minutes for 영선공장 → 우석경제관, 44 m apart. Nearest + 20 m leaves no pair unreachable, gives that pair 1.6 minutes and moves less when a pin moves.
- **Half the headway as the wait.** Irregular buses make the average wait longer than that, which is the waiting-time paradox.
- **A database log of positions on Production.** It remains possible later as separate work, with real-time arrival prediction.

## Consequences

- The table is rebuilt by hand with `pnpm walking:build` when the Places, the Shuttle Stops or the extract change. A Place missing from the table is an error, and a test checks that the committed table covers every seeded Place and Shuttle Stop.
- The table's file carries the ODbL notice, as the other OpenStreetMap seed files do, because it is a database derived from OpenStreetMap. The app's and the README's attributions name 도보 시간 and SRTM.
- `pnpm walking:build --sensitivity` moves every pin and shows the Places whose Travel Times move most, so that the table's fragile Places are known.
- The walking table is measured against stopwatch walks and a baseline, and the shuttle times against held-out days. Their thresholds were frozen before any walk or collection.
- The server's tests about plans, answers, ways and boards bind a frozen copy of the table from before the slope (`test/fixtures/walking/`), so that their numbers stay when the walking model changes. The table's own tests read the committed one.
- Days map to weekdays only, so the shuttle treats holidays and vacations as weekdays.
- A leave-by time's out-travel departs at the next item's start − 1 minute − the walking time, so `TravelProvider` answers the way on foot alone as well as the chosen one.
