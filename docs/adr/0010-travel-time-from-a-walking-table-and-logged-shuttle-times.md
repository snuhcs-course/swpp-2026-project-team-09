---
status: accepted
---

# Travel Time comes from an offline walking table and shuttle times derived from a few days of Dev logging

Travel Time is the time from one Place to another, on foot or by the circular shuttle. An offline command computes every directed pair of Places, and of Places and Shuttle Stops, on OpenStreetMap's pedestrian ways and writes a seed file of seconds. The server loads that file at start and only looks values up. The shuttle's times come from `shuttle-timing.json`, derived from a few days of vehicle positions logged on the Dev Server, and until a value exists the notice's values stand in for it.

**The graph.** Its ways are every highway a pedestrian can use (footway, path, steps, pedestrian, living_street, service, residential, unclassified, tertiary, secondary, track), without `foot=no`, and without `access=private` unless `foot=yes`. The extract is a pinned Overpass export with its timestamp, committed so that the table can be rebuilt.

**The join.** Each Place point and Shuttle Stop joins its nearest path and every other path within that distance + 20 m, only in the graph's main connected component and never on a way tagged `sac_scale`. The walk from the point to the path costs its straight-line length.

**Time.** The speed is 1.1 m/s. Climbing adds 0.5 minutes per 10 m, only when the destination is higher, and steps are not modelled apart. Each Place and Shuttle Stop has one elevation, read once from SRTM 30 m. Speed and climb are not calibrated before the walks of the evaluation.

**The shuttle.** Shuttle positions are logged only on the Dev Server: its Redis already holds them, a collector needs nothing from Production, and a few days answer the question. A Production table would change the Production schema and keep positions nobody needs for this, to answer what two or three days of logs answer. The times are a wait per stop and band, Σh² / (2Σh) over the observed headways, and a median ride per pair of stops and band. The shuttle is chosen only when it is at least 3 minutes faster than walking.

## Considered Options

- **Kakao's walking route for every pair.** Its results may not be stored, and a live call for each candidate would cost a request per pair at every question. Kakao stays only for drawing routes: it never feeds the table, and nothing is compared with it.
- **Straight-line distance with a detour factor.** It needs no data, but it says a building behind a hill is 2 minutes away. It stays as the baseline of the walking evaluation.
- **A grid instead of Place × Place.** Compared with the Place table, 25 m cells give an MAE of 46 s and 50 m cells 85 s, short trips come out long, and the table is 8 to 100 times larger.
- **Joining every path within 40 m.** It stranded BK국제관, left 458 pairs unreachable, and said 24 minutes for 영선공장 → 우석경제관, 44 m apart. Nearest + 20 m leaves no pair unreachable, gives that pair 1.6 minutes and moves less when a pin moves.
- **Half the headway as the wait.** Irregular buses make the average wait longer than that, which is the waiting-time paradox.
- **A database log of positions on Production.** It remains possible later as separate work, with real-time arrival prediction.

## Consequences

- The table is rebuilt by hand with `pnpm walking:build` when the Places, the Shuttle Stops or the extract change. A Place missing from the table is an error, and a test checks that the committed table covers every seeded Place and Shuttle Stop.
- The table's file carries the ODbL notice, as the other OpenStreetMap seed files do, because it is a database derived from OpenStreetMap. The app's and the README's attributions name 도보 시간 and SRTM.
- `pnpm walking:build --sensitivity` moves every pin and shows the Places whose Travel Times move most, so that the table's fragile Places are known.
- The walking table is measured against stopwatch walks and a baseline, and the shuttle times against held-out days. Their thresholds were frozen before any walk or collection.
- Days map to weekdays only, so the shuttle treats holidays and vacations as weekdays.
