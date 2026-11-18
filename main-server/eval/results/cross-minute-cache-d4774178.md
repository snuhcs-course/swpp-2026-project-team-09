# Cross-minute cache measurement, d4774178

Model `claude-haiku-5-5` on the Anthropic API, `breakpoints` caching. 10 requests of "안녕하세요!", each one minute later and by another User. Started 2026-11-17T17:25:40.172Z, ended 2026-11-17T17:25:50.674Z.

| # | User | now | Steps | First call input | First call cache read | First call cache write | Cache read | Cache write | Cost USD | Error |
| - | ---- | --- | ----- | ---------------- | --------------------- | ---------------------- | ---------- | ----------- | -------- | ----- |
| 1 | cross-minute-user-1 | 2026-11-18T00:05:00.000Z | 1 | 43982 | 0 | 43978 | 0 | 43978 | 0.005549 |  |
| 2 | cross-minute-user-2 | 2026-11-18T00:06:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000505 |  |
| 3 | cross-minute-user-3 | 2026-11-18T00:07:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000496 |  |
| 4 | cross-minute-user-4 | 2026-11-18T00:08:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000507 |  |
| 5 | cross-minute-user-5 | 2026-11-18T00:09:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000498 |  |
| 6 | cross-minute-user-6 | 2026-11-18T00:10:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000500 |  |
| 7 | cross-minute-user-7 | 2026-11-18T00:11:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000499 |  |
| 8 | cross-minute-user-8 | 2026-11-18T00:12:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000502 |  |
| 9 | cross-minute-user-9 | 2026-11-18T00:13:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000498 |  |
| 10 | cross-minute-user-10 | 2026-11-18T00:14:00.000Z | 1 | 43982 | 43826 | 152 | 43826 | 152 | 0.000508 |  |

Total: input 439820, cache read 394434, cache write 45346, output 889, cost USD 0.010061.
