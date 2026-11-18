# Cross-minute cache measurement, dc27a523

Model `claude-haiku-5-5` on the Anthropic API, `breakpoints` caching. 10 requests of "안녕하세요!", each one minute later and by another User. Started 2026-11-17T16:15:18.054Z, ended 2026-11-17T16:15:31.590Z.

| # | User | now | Steps | First call input | First call cache read | First call cache write | Cache read | Cache write | Cost USD | Error |
| - | ---- | --- | ----- | ---------------- | --------------------- | ---------------------- | ---------- | ----------- | -------- | ----- |
| 1 | cross-minute-user-1 | 2026-11-18T00:05:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005448 |  |
| 2 | cross-minute-user-2 | 2026-11-18T00:06:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005450 |  |
| 3 | cross-minute-user-3 | 2026-11-18T00:07:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005454 |  |
| 4 | cross-minute-user-4 | 2026-11-18T00:08:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005448 |  |
| 5 | cross-minute-user-5 | 2026-11-18T00:09:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005447 |  |
| 6 | cross-minute-user-6 | 2026-11-18T00:10:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005461 |  |
| 7 | cross-minute-user-7 | 2026-11-18T00:11:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005454 |  |
| 8 | cross-minute-user-8 | 2026-11-18T00:12:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005454 |  |
| 9 | cross-minute-user-9 | 2026-11-18T00:13:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005448 |  |
| 10 | cross-minute-user-10 | 2026-11-18T00:14:00.000Z | 1 | 43280 | 0 | 43276 | 0 | 43276 | 0.005448 |  |

Total: input 432800, cache read 0, cache write 432760, output 827, cost USD 0.054512.
