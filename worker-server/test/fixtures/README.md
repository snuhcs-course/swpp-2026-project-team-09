Actual public source fixtures fetched with normal TLS on 2026-09-27 KST:

- meals-2026-09-27.html: https://snuco.snu.ac.kr/foodmenu/?date=2026-09-27
- shuttle-41946.html: https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F
- shuttle-empty.json: POST https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute with {"data":",F,41946,snu_1"}; empty d is a real response.
- event-176192.html: https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176192

These fixtures are test-only and never served as live source data. HTML is reduced to relevant source elements; original wording and values are retained.
