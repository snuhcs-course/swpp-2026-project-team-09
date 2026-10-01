# External sources: access, formats and limits

The sources outside the project that Iteration 1 depends on, as checked in P05 (Confirm external API access). Each section gives the address, the request and page format, what was observed, the limits and the gotchas. The specs decide how each source is used; this file records what the source itself does.

Everything was checked on 2026-09-30 unless a line says otherwise. `[K1]`-style links point to the Sources list at the end. "My judgement" marks conclusions that no source states directly.

## 1. Summary

| Source | Used by | Access | Status on 2026-09-30 |
|---|---|---|---|
| SNU official events list | P07 | Public HTML | Confirmed |
| SNU Co-op menus | P07, P15 | Public HTML | Confirmed |
| Dormitory menus | P07, P15 | Public HTML | Confirmed |
| Veterinary college menus | P07, P15 | Public HTML | Confirmed |
| Shuttle stops and vehicles (Busin) | P07, P15 | Public HTML and JSON | Confirmed, vehicles seen in service |
| OpenStreetMap | P07, P08, P15 | Open data, loaded once as seed data | Confirmed |
| Kakao Maps SDK for Android | P06 | Native app key and key hash | Key issued; package name and development key hash registered; map shown in a trial build |
| Kakao Maps JavaScript SDK | P12 | JavaScript key and domain | Key issued; `http://localhost:3100` registered |
| Kakao walking route API | P07 | REST API key | Key issued; not called yet |
| Google Sign-In | P04, P06, P12 | OAuth clients | Clients exist; see §8 |

## 2. Scraped pages in general

- None of the scraped sources is an API, and no permission to reuse the data has been given. All of them answer without a login or a cookie.
- Terms of use: the Co-op's site links its terms, in force since 2005-11-29 [S7]. Article 8, item 아, forbids copying, distributing or commercially using information obtained through the service without the Co-op's prior consent. The other sites link no terms; `www.snu.ac.kr` and `vet.snu.ac.kr` link only a refusal of email address collection.
- robots.txt: `www.snu.ac.kr` blocks only named crawlers such as AhrefsBot. `snuco.snu.ac.kr`, `snudorm.snu.ac.kr` and `vet.snu.ac.kr` allow everything. `web.busin.co.kr` has no robots.txt.
- No page is a versioned interface. A layout change breaks a parser without notice.
- The university's firewall answers a blocked request with HTTP 200 and a page that refreshes to `snucert.snu.ac.kr/waf/error.html`; one was seen on `vet.snu.ac.kr` on 2026-10-01. A parser checks the content, such as the table being present and the date repeated back, not the status code.
- The text holds no-break spaces (U+00A0): in the event labels, in Co-op cells and in the veterinary college's dinner cells. Normalise them before matching.

## 3. Events: SNU official events list

- List: `GET https://www.snu.ac.kr/snunow/events`, further pages with `?page=N`.
  - The last page is linked as `a.pg.next-all`; it was 599 on 2026-10-01. A page past the end answers 200 with `.board-noresult` (`검색된 자료가 없습니다.`).
  - The list is ordered by post, newest first, not by the event's date.
  - `sc=y&df=YYYY.MM.DD&dt=YYYY.MM.DD` lists the events that overlap a date range. The pager's links drop `df` and `dt`.
  - Items: `.board-imgline a.item`, each linking to `/snunow/events?md=v&bbsidx={id}`.
  - In an item: title `.texts .title`, date label `.texts .point` such as `2026.10.13.(화)` or `2026.10.12.(월) ~ 2026.10.16.(금)`.
- Detail: `GET https://www.snu.ac.kr/snunow/events?md=v&bbsidx={id}`.
  - Title `.board-view .header .title`, the event's date or range `.header .date` such as `2026.10.12. ~ 2026.10.16.`, body `.board-view .content`. The page shows no posting date.
  - An unknown `bbsidx` answers 404.
- Observed: 12 items on the first page. The detail of `bbsidx=176432` was readable.
- Gotchas:
  - `bbsidx` identifies a post. My judgement: use it as the source key.
  - The body labels the time and place in text, for example `· 일   시: 2026. 10. 13.(화) 19:30 ~ 21:30 (예정)` and `· 장   소: 서울대학교 종합운동장`. The spacing inside the labels varies and includes no-break spaces.
  - The same body can hold other periods, such as `· 신청 기간: 2026. 9. 29.(화) 10:00 ~ 9. 30.(수) 17:00`. Only the `일시` line is the event's time.
  - Not every post uses these labels.
  - A post can describe several sessions, such as a lecture series. §9 records how Haengsha handles them.

## 4. Menus

### 4.1 SNU Co-op

- `GET https://snuco.snu.ac.kr/foodmenu/?date=YYYY-MM-DD`, the date in Asia/Seoul. The page repeats the date in `input[name="date"]`; a parser can check it against the request.
- `table.menu-table` has one row per restaurant, after a header row (`식당 | 아침 | 점심 | 저녁`). The cells are `td.title`, `td.breakfast`, `td.lunch` and `td.dinner`. The header row sits in `thead` and uses the same cell classes, so a parser reads the rows of `tbody` only.
- Observed: 13 restaurants on 2026-09-30, and 14 on 09-29 and 10-01. The list changes from day to day.
- Gotchas:
  - `td.title` carries a phone number, as in `학생회관식당 (880-5543)`. Some names start with `* `, as in `* 공대간이식당`.
  - A cell is free text. Items are written `메뉴 : 6,000원`, sometimes `:3,000원` or `4,500 원`. Corners are marked like `<A코너>`, and a buffet has one price for the whole line. Hours come as `※ 운영시간 : 11:00~14:30`, sometimes `※운영시간:`, and busy hours as `※ 혼잡시간 : …`.
  - An empty cell does not mean closed. A closed restaurant is usually left out of the table. A closure written in the cell is the exception, such as `추석연휴 휴무` for `기숙사식당` on 2026-09-27, the Sunday after Chuseok.
  - `기숙사식당 (881-9072)` is the same restaurant as `생협기숙사(919동)` on the dormitory page. On 2026-09-30 both cells were identical. Collect it once.

### 4.2 Dormitory (관악학생생활관)

- `GET https://snudorm.snu.ac.kr/foodmenu/?date=YYYY-MM-DD`. The page is built like the Co-op page: the same `table.menu-table`, cell classes and `input[name="date"]`.
- Observed: two restaurants, `아워홈(901동)` and `생협기숙사(919동)`.
- Gotcha: `생협기숙사(919동)` repeats the Co-op page's `기숙사식당` (§4.1).

### 4.3 Veterinary college

- `GET https://vet.snu.ac.kr/cafe_menu/`. It shows the current week and takes no date.
- One plain `table` without classes: a header `일자 | 중 식 | 석 식`, then one row per weekday with a date such as `9. 28(월)`. Every row, the header included, sits in `thead`; there is no `tbody`.
- Observed: 9. 28(월) to 10. 2(금), one lunch dish a day.
- Gotchas:
  - No prices and no year. My judgement: in late December a row such as `1. 2(금)` belongs to the next year. The weekday next to each date settles the year.
  - The `석 식` column was empty all week. Dinner is served by reservation, and its menu is in the text under the table: `평일 저녁은 예약제로 운영합니다. 식사시간: 17:30~18:30 저녁메뉴: 제육볶음 …`.

## 5. Shuttle: Busin route page and vehicle positions

The operator's service. The university's notices reach it through `서울대.info`, which leads to the operator's site [S2]; its route page links Busin.

- Route page: `GET https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F` for the circular route (순환셔틀), 교내순환1, which runs anticlockwise.
  - `di=41914` is 순환셔틀(역순환), 교내순환2. It runs clockwise but is not 41946 reversed: it has 29 drawing points through 호암교수회관, 교수아파트 and 연구공원, and runs from 9:50 to 17:10 all year.
  - Each stop is a `span.route_point` with its pixel position in the inline style (`top`, `left`) and its name in `<em>`.
  - The number of vehicles in service when the page was served is in `.driving .num`; the page's polling does not update it. The service hours are in the page header.
- Vehicles: `POST https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute` with `Content-Type: application/json; charset=utf-8` and the body `{"data":",F,41946,snu_1"}`.
  - The page itself sends `{ data: "…"}` with an unquoted key; strict JSON works too. No cookie, view state or Referer is needed.
  - The answer carries no CORS header, so a browser cannot call the endpoint; the server does.
  - The answer is `{"d":"row;row;…"}`, and each row is `carid/x/y/count/plates/code`. The page reads `code` but never uses it; its meaning is unknown.
  - `x` and `y` are pixels on the route drawing, not coordinates. `d` was empty on Sunday 2026-09-27, when no vehicle ran. An empty `d` splits into one empty row, which is dropped.
- Stops of route 41946 on the drawing, in loop order:

| Stop | left | top |
|---|---|---|
| 정문 | 157 | 35 |
| 법과대 | 195 | 86 |
| 자연대 | 195 | 136 |
| 농생대 | 195 | 188 |
| 38동 | 195 | 239 |
| 신소재공동연구소 | 195 | 289 |
| 302동 | 195 | 341 |
| 301동 | 157 | 393 |
| 유전공학연구소 | 116 | 341 |
| 교수회관 | 116 | 289 |
| 기숙사삼거리 | 116 | 239 |
| 국제대학원 | 116 | 188 |
| 수의대 | 116 | 136 |
| 경영대 | 116 | 86 |

- Observed from 15:01 to 15:04 KST on 2026-09-30, 12 requests 15 seconds apart:
  - 6 vehicles were in service.
  - Every position was a stop's (`left`, `top` + 5). No position between two stops appeared. The page's code adds no offset; a stop marker's centre is `top` + 6.
  - A vehicle moved on by one stop every 45 to 90 seconds.
  - Four vehicles stood at 신소재공동연구소 throughout.
- Gotchas:
  - A position tells only which stop a vehicle is at. A fraction of the loop between two stops, as P07 plans, therefore always falls on a stop. The app has to interpolate if a vehicle is to move smoothly.
  - `count` and `plates` describe everything at that position, not one vehicle. The four vehicles at one stop came as four rows with `count` 4 and the same four plates. Tell vehicles apart by `carid`. A plate cannot be matched to a `carid` while vehicles stand together.
  - The answer has no time of observation. Use the time it was received.
  - The page itself asks for positions every 5 seconds.
- Service hours, from the route page's header:
  - Semester weekdays: 08:00 to 21:00, every 5 to 7 minutes until 19:00 and every 20 minutes after. The university's shuttle page [S1] gives every 5 minutes until 19:00.
  - Seasonal term and vacations: 08:00 to 18:00, every 5 to 7 minutes in the seasonal term and every 10 minutes in vacations. [S1] gives the seasonal term as 08:00 to 09:30, every 7 minutes.
  - No service at weekends, on public holidays or on the university's anniversary. [S1] does not say this.
- Permission and contacts:
  - 정보화본부 was asked by email on 2026-09-30 and answered the same day.
    - The operator, 동영관광, manages the live positions.
    - 캠퍼스관리과 holds the contract with the operator, so questions about the data go there.
    - It suggested the public data portal. data.go.kr has no dataset for the campus shuttle. Searches for 서울대학교 셔틀, 순환셔틀, 셔틀버스 위치 and 관악캠퍼스 found only other institutions' shuttles and the self-driving shuttle that an SNU institute runs in Pangyo [S4].
  - 캠퍼스관리과 is the department in charge of the shuttle [S1].
    - Its duty list puts the shuttle's operation and contract under (02) 880-5228 [S5]. Two staff members share that number, and the university's member search does not say which of them handles the shuttle.
    - (02) 880-5135, the number on the shuttle page, belongs to the head of the drivers' team [S5].
  - 동영관광's main number is 1588-9718. The privacy policy on its site lists the company's mail addresses [S6]. It also takes passenger inquiries through a form [S3].
  - On 2026-09-30 the team emailed 캠퍼스관리과's shuttle staff and 동영관광. The email asked whether the app may show the positions, how often it may ask, and whether coordinates with a time of observation exist. No reply yet.
- Since March 2025 all 11 campus circular shuttles have shown their current and next stop on a display driven by GPS, a project of a student team of 글로벌사회공헌단 funded by HD Hyundai [S8]. Whether its positions can be shared is worth asking.
- Unusable: the university's old service at `shuttlebus.snu.ac.kr`. Its TLS certificate expired on 2021-06-26, and its vehicle call returned an empty list during service hours on 2026-09-30.

## 6. OpenStreetMap

- Campus Boundary: relation 11917142 [O4]. It is tagged `amenity=university` and `name=서울대학교 관악캠퍼스`, is a multipolygon of four outer ways, and was last edited on 2026-03-15.
- The campus extent is latitude 37.4470628 to 37.4692598 and longitude 126.9474475 to 126.9612239.
- The main Overpass instance, `overpass-api.de`, asks for fewer than 10,000 queries and 1 GB a day, and a hundredth of that for regular automated use [O1]. It wants one query at a time and a User-Agent or Referer that names the project. After a 429 response, wait 30 seconds before trying again. A one-off seed export is far below this.
- Licence: ODbL [O3].
  - Attribution is to "OpenStreetMap", with a link to `https://www.openstreetmap.org/copyright`; "© OpenStreetMap contributors" is an accepted historical form [O2].
  - The guidelines ask for it to be visible without any interaction, where the data is shown. Shown on a splash screen when the app starts, it need not be shown every time [O2].
  - An info button or menu is named only as where the full licence details go once a visible attribution has collapsed. P15 places the attribution on an information screen only, which does not meet the guidelines. A small attribution in a map corner while OSM-derived layers are shown, or a splash at app start, does.
  - Publishing a database derived from OSM data brings share-alike obligations.

## 7. Kakao

### 7.1 One app for the team

- The team uses one Kakao app, with the other members added under [앱] > [멤버] [K1].
  - The operating policy forbids running one service as several apps or from several developer accounts. A shared package name, bundle ID or site domain counts as the same service [K5].
  - Since 2026-07-21, the free quota applies only to the first app on which the owner's developer account turns Kakao Map on [K2][K3]. Only one of an owner's apps has it [K15][K16].
  - Apps turned on before that date keep their quota until further notice [K3].
  - The free quota has no end date, but Kakao may change the criteria [K3][K8]. The change of 2026-07-21 was announced on 2026-06-16.
  - No source says what happens to the free quota when the app is deleted, when Kakao Map is turned off and on again, or when the Owner changes. Keep the app, its Kakao Map setting and its Owner as they are.
- The app gets its keys when it is created [K1]: a REST API key, a JavaScript key and a native app key under [앱] > [플랫폼 키], and an admin key under [앱] > [어드민 키], which only the Owner sees.
- Kakao Map is turned on under [카카오맵] > [사용 설정] > [상태]. The app then shows a "카카오맵 무료 쿼터" badge when the free quota applies [K2].
- Registration record. Update it whenever something is registered at Kakao.

| Item | Value |
|---|---|
| Owner | A team member's developer account, since 2026-09-30 |
| Free quota | Applies. The "카카오맵 무료 쿼터" badge is shown. |
| Members | The team, invited on 2026-09-30 |
| Keys | REST API, JavaScript and native app keys issued on 2026-09-30 |
| Android package name | `com.bonnieandclaude.snunow`, registered on 2026-10-01. The prototype used `kr.ac.campus.prototype`. |
| Key hashes (which keystore) | `Xo8WBi6jzSxKDVR4drqm84yr9iU=`, the Expo template's debug keystore, registered on 2026-10-01. Development builds only. |
| JavaScript SDK domains | `http://localhost:3100`, registered on 2026-09-30 |
| Allowed IP addresses for the REST API key | None |

- The package name is permanent once the app is on the Play Store. Kakao's key hashes and Google's Android client are both tied to it. `kr.ac.snu.*` is the university's namespace; its official app is `kr.ac.snu.mobile`.

#### 7.1.1 How keys reach the code

A person fills in every key value. When the work in front of an agent needs a key:

1. The agent adds the variable to the project's `.env.example`, with an empty value and a one-line comment saying what it is and where it comes from.
2. The agent names the variable and the `.env` file, asks the person to fill in the value, and waits.
3. The agent continues once the person says the value is in place, and refers to the key by its variable name only.

| Key | Variable | File | Secret |
|---|---|---|---|
| REST API key | `KAKAO_REST_API_KEY` | `main-server/.env` | Yes. It stays on the server. |
| JavaScript key | `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | `admin/.env` | No. It ships to the browser; the registered domains protect it. |
| Native app key | `KAKAO_NATIVE_APP_KEY` | `mobile/.env`, read by the app config at build time | No. It ships in the app; the registered key hash protects it. |

The root `.gitignore` keeps every `.env*` file out of Git except `.env*.example`. The Owner shares the values with the team privately.

A build on EAS does not receive `mobile/.env`, because EAS uploads only the files Git does not ignore [E2]. Such a build takes `KAKAO_NATIVE_APP_KEY` from an EAS environment variable instead.

### 7.2 Maps SDK for Android (P06)

- The native app key is `KAKAO_NATIVE_APP_KEY` (§7.1.1). It is registered with the package name and one key hash per signing key [K1].
- A key hash is the Base64 of the signing certificate's SHA-1 [K11].
  - From a keystore:

    ```sh
    keytool -exportcert -alias androiddebugkey -keystore <keystore> -storepass android -keypass android | openssl sha1 -binary | openssl base64
    ```

  - From a SHA-1 shown by EAS or the Play Console. Paste the fingerprint alone; a `SHA1:` label in front changes the result:

    ```sh
    echo "<SHA-1>" | tr -d ':' | xxd -r -p | openssl base64
    ```

- Signing keys, one registration each (P20):
  - A project made by `expo prebuild` signs debug and release builds with the template's `android/app/debug.keystore` [E1]. The `expo` package ships that file, so every teammate gets the same hash, `Xo8WBi6jzSxKDVR4drqm84yr9iU=` (SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`). The key is public, so it is for development only.
  - EAS builds use the EAS keystore.
  - Builds from the Play Store use Play's app signing key.
- SDK: `com.kakao.maps.open:android:2.15.2` from `https://devrepo.kakao.com/nexus/repository/kakaomap-releases/` [K4].
  - It needs Android 6.0 (API 23), `armeabi-v7a` or `arm64-v8a`, OpenGL ES 2.0 and the `INTERNET` permission [K17].
  - Start it with `KakaoMapSdk.init(context, nativeAppKey)` and show the map with `MapView.start()`. Call `MapView.resume()` and `pause()` [K4].
  - My judgement: an x86_64 emulator installs the app's x86_64 libraries, which React Native provides, and the SDK's ARM-only libraries are then missing. Use an arm64 emulator on Apple Silicon, or a phone.
- Errors [K1][K4]:
  - A wrong key hash or package name gives `invalid android_key_hash or ios_bundle_id or web_site_url`. The map's own check answered `MapAuthException(401)` with `android keyhash mismatched! caller=…` while no key hash was registered.
  - `MapAuthException` 429 means the quota is used up or the per-second limit was exceeded.
- The map's logo stays visible and unchanged. It may be moved with `getLogo().setPosition` [K18].
- Checked on 2026-10-01 with a trial build, a copy of `mobile/` kept outside the repository:
  - Expo 57.0.25 and React Native 0.86.3 with the New Architecture on. The map was a local Expo module in `modules/`, a view around the SDK's `MapView`.
  - Kakao's Maven repository went in through `expo-build-properties` (`android.extraMavenRepos`), with `buildArchs` set to `arm64-v8a`.
  - A release APK built with JDK 21 and Gradle 9.3.1. The first build took 26 minutes, later ones 4 to 9. JDK 26 was not tried.
  - On an arm64 emulator with Android 16, the campus map appeared, and a label was added and moved between two points with `Label.moveTo`.
  - `react-native-nitro-google-signin` 2.3.0 (§8) was built into the same APK and its `configure` ran. A sign-in itself was not tried.

### 7.3 Maps JavaScript SDK (P12)

- The JavaScript key is `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` (§7.1.1).
- The admin site is registered under [플랫폼 키] > [JavaScript 키] > [JavaScript SDK 도메인], up to 10 entries [K1]. Registering `http` or `https` allows both.
- The docs' example is `http://localhost:8080` [K6]. My judgement: register the exact origin with its port. `http://localhost:3100` is registered.

### 7.4 Walking route API (P07)

- `GET https://dapi.kakao.com/v2/routing/walk` with the header `Authorization: KakaoAK {REST_API_KEY}` [K7]. The key is `KAKAO_REST_API_KEY` (§7.1.1).
- Required parameters: `start_x`, `start_y`, `end_x`, `end_y`. `x` is the longitude and `y` the latitude, in WGS84 by default.
- Optional parameters:
  - `via_x` and `via_y`: up to 5 waypoints, comma-separated.
  - `s_name`, `v_name` and `e_name`: names of the start, the waypoints and the end.
  - `route_mode`: `BROAD_FIRST` (the default, wide roads first), `SHORTEST` or `ACCESSIBLE` (편안한 길, comfortable roads).
  - `input_coord` and `output_coord`: the coordinate systems.
- The answer's `route` holds `totalDistance` (m), `totalTime` (s) and `landingUrl`, and `legs` of `steps`, each with its distance, time, guidance and line as `[x, y]` points.
- `status` is one of `OK`, `SAME_POINT`, `START_LINK_NOT_FOUND`, `END_LINK_NOT_FOUND`, `TOO_MANY_SEARCH_LINK`, `TOO_FAR_AWAY` and `ROUTE_RESULT_NOT_FOUND`. `route` is present only with `OK`. My judgement: the other statuses arrive with HTTP 200.
- No review or extra application is needed once Kakao Map is on [K3], and the API lists no other requirement [K7].
- The REST API key can be limited to up to 10 IP addresses. A call from any other address gets `-401` `ip mismatched` [K1].
- Not called yet. A first check, from the main gate to the central library (approximate coordinates):

  ```sh
  curl -G "https://dapi.kakao.com/v2/routing/walk" -H "Authorization: KakaoAK $KAKAO_REST_API_KEY" --data-urlencode "start_x=126.9486" --data-urlencode "start_y=37.4664" --data-urlencode "end_x=126.9524" --data-urlencode "end_y=37.4592"
  ```

### 7.5 Quotas, prices and terms

| API | Free per day | Beyond the free quota |
|---|---|---|
| Maps SDK for Android and iOS | 300,000 | 0.1 KRW a call |
| Maps JavaScript SDK | 300,000 | 0.1 KRW a call |
| Walking route | 1,000 | 10 KRW a call |

- Quotas belong to the app, so the three keys share them [K8]. All of an app's APIs together also have a monthly quota of 3,000,000 calls [K8]. The docs say the figures may change.
- The console shows the usage under [통계] > [쿼터] [K2].
- What counts as a call:
  - Maps JavaScript SDK: creating a map object. Loading tiles does not count [K13]; no source mentions panning or zooming.
  - Maps SDK for Android: not documented. Starting a `MapView` sends one authentication request to `https://dapi.kakao.com/v2/maps/vector/auth` [K14]. My judgement: each map start counts once.
  - Walking route: each request.
- For the team's own use, the map quotas are far out of reach. The walking route's 1,000 a day is the tight one.
  - The app sends its position every 5 seconds (P06). A route requested on every position would use 720 calls an hour on one phone.
  - Request a route only when the User asks for one.
- Kakao also limits calls per second and per minute, but does not publish the figures. Kakao staff warned that calls repeated every 600 ms can be treated as abuse [K13].
- A call beyond the quota gets HTTP 429 [K2]. The error table also lists HTTP 400 with code `-10`, and code `-11` beyond a paid limit [K9]. A second app without the free quota was seen getting `-10` "API limit has been exceeded" [K12]. Treat both as the quota being used up.
- Paid use [K10]:
  - It needs a 비즈월렛 with a card, connected to the app, with paid use turned on. None of this is set up. A call beyond the free quota therefore fails, and nothing is billed [K13].
  - With paid use on, the month's bill, with 10% VAT added, is paid automatically from the 비즈월렛 and its card around 01:00 on the 1st [K10]. A walking route then costs 11 KRW a call.
  - Kakao Map has no spending limit; only KakaoTalk Share has one. A bug that repeats route requests would turn straight into a bill. My judgement: before turning paid use on, add a daily count on the server that stops route requests.
- The operating policy allows a cache only to improve the user's experience, and only if it is kept current [K5]. It forbids copying or handing on data from the service without Kakao's prior consent.

## 8. Google Sign-In

- The Google Cloud project and two OAuth clients were made during the prototype. Their IDs go in `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` of `main-server/.env.example` (P04).
  - On 2026-09-30 the project's owner was not confirmed. Two owners or more are safer.
- The app needs two clients:
  - A Web application client. Its ID is the `serverClientId` of the sign-in request [G2] and the `aud` of the ID token [G8].
  - An Android client for each signing key, with the package name and the SHA-1 [G6][G12]. The prototype's Android client was made for the prototype's package name. The development key's SHA-1 is in §7.2.
- The free library that Expo's guide lists for Credential Manager is `react-native-nitro-google-signin` [G13]. For Android alone it needs no config plugin; without Firebase files its plugin asks for an iOS URL scheme.
- The admin site has its own Web application client [G3].
  - Authorized JavaScript origins: both `http://localhost` and `http://localhost:3100`.
  - Wildcards, paths and IP addresses other than localhost's are not allowed, and origins other than localhost need HTTPS. A change takes from 5 minutes to a few hours [G6].
  - Over plain http, set `Referrer-Policy: no-referrer-when-downgrade`.
- SHA-1 of a signing key [G12][G13]:
  - `keytool -list -v -alias androiddebugkey -keystore <keystore> -storepass android -keypass android`
  - `./gradlew signingReport`
  - `eas credentials -p android`
  - The Play Console's app integrity page.
- The audience is External [G1].
  - In Testing, at most 100 test users can be added, and a user counts toward the cap once added [G4].
  - An app that asks only for `openid`, `email` and `profile`, as Sign in with Google does, is exempt: anyone can sign in without being on the list [G4].
  - An app asking only for `openid`, `email` and `profile` can go to "In production" without verification.
  - Showing the app's name and logo on the consent screen needs brand verification. That takes a public homepage, a privacy policy on the same domain, and the domain verified in Search Console; a manual review takes 2 to 3 business days [G5].
- A client unused for 6 months is deleted, with an email 30 days before [G6].
- ID token verification:
  - The hosted-domain request option, `setHostedDomainFilter` on Android [G14], only filters the account list. The server checks the `hd` claim [G7].
  - SNU accounts carry `hd=snu.ac.kr`. The prototype's check on `hd` passed with an SNU account on 2026-09-27.
  - Verify tokens locally against Google's keys at `https://www.googleapis.com/oauth2/v3/certs`. The tokeninfo endpoint is for debugging and may be throttled [G7][G8]. No quota is published for sign-in.
- Risk: a Google Workspace administrator can block unconfigured third-party apps [G9]. The user then sees `admin_policy_enforced` [G10]. Education editions block users marked as under 18 by default [G11].

## 9. Other sources checked

- SNUTT's timetable picker (Waffle Studio): P06 has the User enter the timetable instead. Using the picker later needs Waffle Studio to register our origin; the contact is `master@wafflestudio.com`.
- Siksha and Haengsha (Waffle Studio): read to find the sources above, as P07 records. `wafflestudio/siksha-crawler` has no LICENSE file [W1].
- Haengsha collects the same events list (§3). This was read in `wafflestudio/hangsha-server` at commit `4a33bf9` of 2026-09-15 (KST).
  - Its rules read one date and time per post [W2].
  - When a post's date is a range and its body mentions 모집 or 신청, the range is taken as the application period and no session is made [W2].
  - Posts that mention 비교과 or link to `extra.snu.ac.kr` are skipped as duplicates of the extracurricular site [W2].
  - With its AI parser switched on, a language model reads the title and body of every post after the rules. When it returns any period, its values replace the rules' [W3]. It returns each session on its own and is told never to merge sessions into one period [W3].
  - When a post has two sessions or more, each session is stored as its own event with its own start, end and place [W4]. The place falls back to the post's.
  - A collection finds a stored event again by the source link and the session's start and end [W4]. It compares them with the stored values, which an administrator can edit [W9]. A match that an administrator deleted is brought back [W4].
  - The scheduled run skips every post whose link is already stored [W10]. Only a manual sync reads a known post again, so an edit or a deletion at the source goes unseen.
  - Haengsha also serves what it collects through a public read API under `https://hangsha-api.wafflestudio.com/api/v1/events`. On 2026-09-27 the team decided to collect directly instead of using it. The decision is recorded in `.scratch/architecture-planning/spec.md` on `0.0/Main`, and the prototype's study of that API is `.scratch/architecture-planning/research/haengsha-integration.md` on the same branch.
- The extracurricular programme site: out of scope in P07.

## 10. Unverified

- The shuttle: whether regular requests are permitted, and whether coordinates exist. 캠퍼스관리과 and 동영관광 have not replied yet.
- The shuttle: mySNU offers a 셔틀버스 service that shows where the shuttle is. Whether it uses a feed other than Busin is unchecked.
- Kakao: the key hashes of EAS and Play builds. The walking route has not been called.
- Kakao: what the Android map SDK counts as a call, and when the daily quota resets.
- Google: the project's owner, and an Android client for `com.bonnieandclaude.snunow`.
- Google sign-in with the Iteration 1 app on a phone. The `hd` claim itself is confirmed (§8).
- P08 and P14: whether the tunnel's address can be fixed, for the Invite Link.

## 11. Sources (accessed 2026-09-30)

[S1]: https://www.snu.ac.kr/about/gwanak/shuttles/campus_shuttles
[S2]: https://sites.google.com/dongyeongtour.co.kr/snu/main
[S3]: https://dycs-widget.web.app/?tenant=snu&type=inquiry
[S4]: https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=%EC%84%9C%EC%9A%B8%EB%8C%80%ED%95%99%EA%B5%90%20%EC%85%94%ED%8B%80
[S5]: https://www.snu.ac.kr/about/overview/organization/facilities_bureau/management
[S6]: https://docs.google.com/presentation/d/e/2PACX-1vRDryW8Tlal0Gtu572IkeJlJ2CoKHZuKpB8NAT4qHaWs-Usm3QbupQWR0lEPBHTnxt0Q7hWYYTkkJP4/pub
[S7]: https://snuco.snu.ac.kr/%ec%9d%b4%ec%9a%a9%ec%95%bd%ea%b4%80/ (accessed 2026-10-01)
[S8]: https://dhnews.co.kr/news/view/1065580837520561 (accessed 2026-10-01)
[O1]: https://wiki.openstreetmap.org/wiki/Overpass_API
[O2]: https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
[O3]: https://www.openstreetmap.org/copyright
[O4]: https://www.openstreetmap.org/relation/11917142
[K1]: https://developers.kakao.com/docs/ko/app-setting/app
[K2]: https://developers.kakao.com/docs/ko/kakaomap/common
[K3]: https://devtalk.kakao.com/t/api-notice-on-new-kakao-map-api-features-and-free-quota-policy/150222
[K4]: https://apis.map.kakao.com/android_v2/docs/getting-started/quickstart/
[K5]: https://developers.kakao.com/terms/latest/ko/site-policies
[K6]: https://apis.map.kakao.com/web/guide/
[K7]: https://developers.kakao.com/docs/ko/kakaomap/rest-api
[K8]: https://developers.kakao.com/docs/ko/getting-started/quota
[K9]: https://developers.kakao.com/docs/ko/rest-api/error-code
[K10]: https://developers.kakao.com/docs/ko/app-setting/paid-api
[K11]: https://developers.kakao.com/docs/ko/android/getting-started
[K12]: https://devtalk.kakao.com/t/api-code-10-api-limit-has-been-exceeded/151160
[K13]: https://devtalk.kakao.com/t/web-sdk/150932/2
[K14]: https://devtalk.kakao.com/t/map/140507
[K15]: https://devtalk.kakao.com/t/api-150222/150757
[K16]: https://devtalk.kakao.com/t/topic/150466
[K17]: https://apis.map.kakao.com/android_v2/docs/getting-started/ (accessed 2026-10-01)
[K18]: https://apis.map.kakao.com/android_v2/docs/getting-started/precautions/ (accessed 2026-10-01)
[G1]: https://support.google.com/cloud/answer/15544987
[G2]: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
[G3]: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
[G4]: https://support.google.com/cloud/answer/15549945
[G5]: https://developers.google.com/identity/verification/authentication-verification
[G6]: https://support.google.com/cloud/answer/15549257
[G7]: https://developers.google.com/identity/openid-connect/openid-connect
[G8]: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
[G9]: https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data
[G10]: https://developers.google.com/identity/protocols/oauth2/web-server
[G11]: https://knowledge.workspace.google.com/admin/getting-started/editions/manage-access-to-unconfigured-third-party-apps-for-users-designated-as-under-18
[G12]: https://developers.google.com/android/guides/client-auth
[G13]: https://docs.expo.dev/guides/google-authentication/
[G14]: https://developers.google.com/identity/android-credential-manager/android/reference/com/google/android/libraries/identity/googleid/GetGoogleIdOption.Builder (accessed 2026-10-01)
[E1]: https://github.com/expo/expo/tree/sdk-57/templates/expo-template-bare-minimum/android/app
[E2]: https://docs.expo.dev/eas/environment-variables/ (accessed 2026-10-01)
[W1]: https://github.com/wafflestudio/siksha-crawler
[W2]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/crawler/SnuNowCrawler.kt
[W3]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/ai/EliceEventParserClient.kt
[W4]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/common/src/main/kotlin/com/team1/hangsha/event/service/EventSyncService.kt
[W9]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/common/src/main/kotlin/com/team1/hangsha/event/repository/EventRepository.kt (accessed 2026-10-01)
[W10]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/job/ExtraSnuSyncRunner.kt (accessed 2026-10-01)
