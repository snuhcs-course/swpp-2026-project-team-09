# The walking diagnostics and the real shuttle rides, declared before the first walk

Ticket: [06: What the evaluation shows beyond its thresholds](../issues/06-evaluation-diagnostics.md). Everything here is committed before any walk or ride, and nothing here changes after the first one.

This adds to [the walking evaluation](01-walking-evaluation.md) and changes nothing in it: the method, the metric, the baseline and the threshold stay as frozen at `d0cb28d`. Nothing here has a pass threshold. The results are reported beside the threshold and do not decide it.

## Who walks

TaeHyun79 walks all 30 test pairs, so that k reads one person's pace.

## The walking diagnostics

All three read the same 30 walked times, so no extra walk is needed. The table's and the baseline's seconds are those in the walking evaluation's list of pairs. The results go to ticket 01's `## Comments`, with the walked times.

- **Late risk.** The share of the 30 pairs where walked − predicted is more than 120 seconds, for the table and for the baseline. The share within ±2 minutes counts both directions alike, and this is the direction that makes a User late.
- **Speed factor.** k = Σ(walked × table) / Σ(table²) over the 30 pairs, the one factor that best scales the table to the walks. Above 1, the walks took longer than the table says.
- **The pairs that tell them apart.** The MAE of the table and of the baseline over pairs 5, 11, 15, 20, 22, 23, 24 and 27. The two differ there by more than 2 minutes at the freeze: by 231, 399, 356, 133, 314, 179, 174 and 250 seconds. On the other 22 pairs they agree within 2 minutes, so on those a walk cannot favour one over the other by much.

## Calibration

The 13 calibration pairs are walked only when one of these holds:

- the threshold is missed: fewer than 70% of the pairs within ±2 minutes, or the table's MAE not below the baseline's;
- k is outside 0.9–1.1.

When one holds:

- TaeHyun79 walks the calibration pairs by the same method.
- The model stays: seconds = path metres / speed + climb metres × climb seconds per metre, where climb is max(0, destination elevation − origin elevation).
- Speed and the climb value are fitted by ordinary least squares over all 13 calibration pairs, never the test pairs, and nothing else changes: not the paths, the pins or the elevations. So k itself is never applied to the table.
- The fit runs once. A climb value below 0 becomes 0, and no pair is left out.
- The fitted values, unrounded in the working and as used in the rebuilt table, are recorded in ticket 01's `## Comments`.
- The calibrated table is scored against the same 30 walked times as a new entry, beside the original result, which stays.

When neither holds, nothing is calibrated, and the reason is recorded in ticket 01's `## Comments`.

## The real shuttle rides

The shuttle metric compares logged days with each other, and no real ride is timed. These rides are a small check on that.

### The procedure

- 5 rides on 11-02, in service hours, on the circular route 41946.
- All 5 in one band of 08–11, 11–14, 14–17, 17–19 or 19–21, so only that band is compared. The rider names the band before the first ride. A ride's band is the band of the time of reaching the stop, as Travel Time reads it.
- At least 2 rides include the longest segment, 신소재공동연구소 → 302동 (1,096 m). They board before 신소재공동연구소, so that a hold there counts on both clocks. A ride whose car rests there for more than 3 minutes says so in one line, since the log leaves such a visit out.
- Each ride records the date, the rider, the boarding and alighting stops, and the times of reaching the stop, boarding and alighting.

TaeHyun79 rides and records the times under ticket 02's `## Comments`.

### The comparison

It follows after the collection ends, once `shuttle-timing.json` is committed.

- Only the ride, boarding to alighting, is compared, as an error per ride and an MAE over the rides:
  - with the logged median of that pair and band;
  - with the fallback, along-loop distance ÷ 4.15 m/s.
- A ride whose pair and band has no logged median is compared with the fallback only, and the record says so.
- A wait is recorded and not compared, since 5 waits depend too much on the headway.

### Reading the result

- The log times a ride from the car's arrival at the boarding stop, and a rider from boarding. A hold at the boarding stop can count in the log and not in the ride, so the logged median may read slightly long.
- 11-02 is one of the days the median is derived from, so the rides are not held out from it.
- 5 rides in one band check whether logged rides are near real ones. They say nothing about the other bands.
