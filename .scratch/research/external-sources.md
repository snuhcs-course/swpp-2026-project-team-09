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
| Kakao Maps SDK for Android | P06 | Native app key and key hash | Key issued; package name and key hash not registered |
| Kakao Maps JavaScript SDK | P12 | JavaScript key and domain | Key issued; `http://localhost:3100` registered |
| Kakao walking route API | P07 | REST API key | Key issued; not called yet |
| Google Sign-In | P04, P06, P12 | OAuth clients | Clients exist; see §8 |

## 2. Scraped pages in general

- None of the scraped sources is an API. No terms of use and no permission to reuse the data were found. All of them answer without a login or a cookie.
- robots.txt: `www.snu.ac.kr` blocks only named crawlers such as AhrefsBot. `snuco.snu.ac.kr`, `snudorm.snu.ac.kr` and `vet.snu.ac.kr` allow everything. `web.busin.co.kr` has no robots.txt.
- No page is a versioned interface. A layout change breaks a parser without notice.

## 3. Events: SNU official events list

- List: `GET https://www.snu.ac.kr/snunow/events`, further pages with `?page=N` (598 pages).
  - Items: `.board-imgline a.item`, each linking to `/snunow/events?md=v&bbsidx={id}`.
  - In an item: title `.texts .title`, date label `.texts .point` such as `2026.10.13.(화)`.
- Detail: `GET https://www.snu.ac.kr/snunow/events?md=v&bbsidx={id}`.
  - Title `.board-view .header .title`, posting date `.header .date`, body `.board-view .content`.
- Observed: 12 items on the first page. The detail of `bbsidx=176432` was readable.
- Gotchas:
  - `bbsidx` identifies a post. My judgement: use it as the source key.
  - The body labels the time and place in text, for example `· 일   시: 2026. 10. 13.(화) 19:30 ~ 21:30 (예정)` and `· 장   소: 서울대학교 종합운동장`. The spacing inside the labels varies.
  - The same body can hold other periods, such as `· 신청 기간: 2026. 9. 29.(화) 10:00 ~ 9. 30.(수) 17:00`. Only the `일시` line is the event's time.
  - Not every post uses these labels.
  - A post can describe several sessions, such as a lecture series. §9 records how Haengsha handles them.

## 4. Menus

### 4.1 SNU Co-op

- `GET https://snuco.snu.ac.kr/foodmenu/?date=YYYY-MM-DD`, the date in Asia/Seoul. The page repeats the date in `input[name="date"]`; a parser can check it against the request.
- `table.menu-table` has one row per restaurant, after a header row (`식당 | 아침 | 점심 | 저녁`). The cells are `td.title`, `td.breakfast`, `td.lunch` and `td.dinner`.
- Observed: 13 restaurants.
- Gotchas:
  - `td.title` carries a phone number, as in `학생회관식당 (880-5543)`. Some names start with `* `, as in `* 공대간이식당`.
  - A cell is free text. Items are written `메뉴 : 6,000원`, sometimes `:3,000원` or `4,500 원`. Corners are marked like `<A코너>`, and a buffet has one price for the whole line. Hours come as `※ 운영시간 : 11:00~14:30`, sometimes `※운영시간:`, and busy hours as `※ 혼잡시간 : …`.
  - An empty cell does not mean closed. A closure is written in the cell; one was seen for `기숙사식당` during the holiday on 2026-09-27.
  - `기숙사식당 (881-9072)` is the same restaurant as `생협기숙사(919동)` on the dormitory page. On 2026-09-30 both cells were identical. Collect it once.

### 4.2 Dormitory (관악학생생활관)

- `GET https://snudorm.snu.ac.kr/foodmenu/?date=YYYY-MM-DD`. The page is built like the Co-op page: the same `table.menu-table`, cell classes and `input[name="date"]`.
- Observed: two restaurants, `아워홈(901동)` and `생협기숙사(919동)`.
- Gotcha: `생협기숙사(919동)` repeats the Co-op page's `기숙사식당` (§4.1).

### 4.3 Veterinary college

- `GET https://vet.snu.ac.kr/cafe_menu/`. It shows the current week and takes no date.
- One plain `table` without classes: a header `일자 | 중 식 | 석 식`, then one row per weekday with a date such as `9. 28(월)`.
- Observed: 9. 28(월) to 10. 2(금), one lunch dish a day.
- Gotchas:
  - No prices and no year. My judgement: in late December a row such as `1. 2(금)` belongs to the next year.
  - The `석 식` column was empty all week. Dinner is served by reservation, and its menu is in the text under the table: `평일 저녁은 예약제로 운영합니다. 식사시간: 17:30~18:30 저녁메뉴: 제육볶음 …`.

## 5. Shuttle: Busin route page and vehicle positions

The operator's service. The university's notices reach it through `서울대.info`, which leads to the operator's site [S2] and then to Busin.

- Route page: `GET https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F` for the circular route (순환셔틀). The reverse route is `di=41914`.
  - Each stop is a `span.route_point` with its pixel position in the inline style (`top`, `left`) and its name in `<em>`.
  - The number of vehicles in service is in `.driving .num`. The service hours are in the page header.
- Vehicles: `POST https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute` with `Content-Type: application/json; charset=utf-8` and the body `{"data":",F,41946,snu_1"}`.
  - The answer is `{"d":"row;row;…"}`, and each row is `carid/x/y/count/plates/code`.
  - `x` and `y` are pixels on the route drawing, not coordinates. `d` was empty on Sunday 2026-09-27, when no vehicle ran.
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
  - Every position was a stop's (`left`, `top` + 5). No position between two stops appeared.
  - A vehicle moved on by one stop every 45 to 90 seconds.
  - Four vehicles stood at 신소재공동연구소 throughout.
- Gotchas:
  - A position tells only which stop a vehicle is at. A fraction of the loop between two stops, as P07 plans, therefore always falls on a stop. The app has to interpolate if a vehicle is to move smoothly.
  - `count` and `plates` describe everything at that position, not one vehicle. The four vehicles at one stop came as four rows with `count` 4 and the same four plates. Tell vehicles apart by `carid`. A plate cannot be matched to a `carid` while vehicles stand together.
  - The answer has no time of observation. Use the time it was received.
  - The page itself asks for positions every 5 seconds.
- Service hours, from the page and the university's shuttle page [S1]:
  - Semester weekdays: 08:00 to 21:00, every 5 to 7 minutes until 19:00 and every 20 minutes after.
  - Vacations: 08:00 to 18:00.
  - No service at weekends, on public holidays or on the university's anniversary.
- Permission:
  - The department in charge of the shuttle is 캠퍼스관리과, (02) 880-5135 [S1].
  - 정보화본부 was asked by email on 2026-09-30 whether it manages this data, whom to ask otherwise, and whether coordinates with a time of observation exist. No reply yet.
  - The operator takes inquiries through a passenger form [S3].
- Unusable: the university's old service at `shuttlebus.snu.ac.kr`. Its TLS certificate expired on 2021-06-26, and its vehicle call returned an empty list during service hours on 2026-09-30.

## 6. OpenStreetMap

- Campus Boundary: relation 11917142 [O4]. It is tagged `amenity=university` and `name=서울대학교 관악캠퍼스`, is a multipolygon of four outer ways, and was last edited on 2026-03-15.
- The campus extent is latitude 37.4470628 to 37.4692598 and longitude 126.9474475 to 126.9612239.
- The public Overpass API asks for fewer than 10,000 queries and 1 GB a day, and a hundredth of that for regular automated use [O1]. It wants one query at a time and a User-Agent that names the project. After a 429 response, wait before trying again. A one-off seed export is far below this.
- Licence: ODbL [O3].
  - Attribution is "© OpenStreetMap contributors" with a link to `https://www.openstreetmap.org/copyright`. The guidelines ask for it to be visible without a click; showing it once on a splash screen is accepted [O2].
  - P15 places it on an information screen. Check that placement against the guidelines.
  - Publishing a database derived from OSM data brings share-alike obligations.

## 7. Kakao

### 7.1 One app for the team

- The team uses one Kakao app, with the other members added under [앱] > [멤버] [K1].
  - The operating policy forbids running one service as several apps. A shared package name or domain counts as the same service [K1].
  - Since 2026-07-21, the free quota applies only to the first app on which the owner's developer account turns Kakao Map on [K2][K3]. Only one of an owner's apps has it [K15][K16].
  - Apps turned on before that date keep their quota until further notice [K3].
  - The free quota has no end date, but Kakao may change the criteria [K3][K8]. The change of 2026-07-21 was announced on 2026-06-16.
  - No source says what happens to the free quota when the app is deleted, when Kakao Map is turned off and on again, or when the Owner changes. Keep the app, its Kakao Map setting and its Owner as they are.
- The app gets a REST API key, a JavaScript key, a native app key and an admin key when it is created, under [앱] > [플랫폼 키] [K1].
- Kakao Map is turned on under [카카오맵] > [사용 설정] > [상태]. The app then shows a "카카오맵 무료 쿼터" badge when the free quota applies [K2].
- Registration record. Update it whenever something is registered at Kakao.

| Item | Value |
|---|---|
| Owner | 김태현, since 2026-09-30 |
| Free quota | Applies. The "카카오맵 무료 쿼터" badge is shown. |
| Members | The team, invited on 2026-09-30 |
| Keys | REST API, JavaScript and native app keys issued on 2026-09-30 |
| Android package name | Not decided. Proposed: `com.bonnieandclaude.snunow`. The prototype used `kr.ac.campus.prototype`. |
| Key hashes (which keystore) | None yet. They need the package name. |
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

### 7.2 Maps SDK for Android (P06)

- The native app key is `KAKAO_NATIVE_APP_KEY` (§7.1.1). It is registered with the package name and one key hash per signing key [K1].
- A key hash is the Base64 of the signing certificate's SHA-1 [K11].
  - From a keystore:

    ```sh
    keytool -exportcert -alias androiddebugkey -keystore <keystore> -storepass android -keypass android | openssl sha1 -binary | openssl base64
    ```

  - From a SHA-1 shown by EAS or the Play Console. Remove the colons first, or the result is wrong:

    ```sh
    echo "<SHA-1>" | tr -d ':' | xxd -r -p | openssl base64
    ```

- Signing keys, one registration each (P20):
  - A project made by `expo prebuild` signs debug and release builds with the template's `android/app/debug.keystore` [E1]. Every teammate therefore gets the same hash. The key is public, so it is for development only.
  - EAS builds use the EAS keystore.
  - Builds from the Play Store use Play's app signing key.
- SDK: `com.kakao.maps.open:android:2.15.2` from `https://devrepo.kakao.com/nexus/repository/kakaomap-releases/` [K4].
  - It needs Android 6.0 (API 23), `armeabi-v7a` or `arm64-v8a`, and OpenGL ES 2.0.
  - Start it with `KakaoMapSdk.init(context, nativeAppKey)`. Call `MapView.resume()` and `pause()`.
  - My judgement: x86 emulator images cannot run it. Use an arm64 emulator on Apple Silicon, or a phone.
- Errors [K1][K4]:
  - A wrong key hash or package name gives `invalid android_key_hash or ios_bundle_id or web_site_url`.
  - `MapAuthException` 429 means the quota is used up.
- The map's logo stays visible and unchanged [K5].

### 7.3 Maps JavaScript SDK (P12)

- The JavaScript key is `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` (§7.1.1).
- The admin site is registered under [플랫폼 키] > [JavaScript 키] > [JavaScript SDK 도메인], up to 10 entries [K1]. Registering `http` or `https` allows both.
- The docs' example is `http://localhost:8080` [K6]. My judgement: register the exact origin with its port. `http://localhost:3100` is registered.

### 7.4 Walking route API (P07)

- `GET https://dapi.kakao.com/v2/routing/walk` with the header `Authorization: KakaoAK {REST_API_KEY}` [K7]. The key is `KAKAO_REST_API_KEY` (§7.1.1).
- Required parameters: `start_x`, `start_y`, `end_x`, `end_y`. `x` is the longitude and `y` the latitude, in WGS84 by default.
- Optional parameters:
  - `via_x` and `via_y`: up to 5 waypoints, comma-separated.
  - `route_mode`: `BROAD_FIRST` (the default), `SHORTEST` or `ACCESSIBLE`.
  - `input_coord`: the coordinate system.
- `status` is one of `OK`, `SAME_POINT`, `START_LINK_NOT_FOUND`, `END_LINK_NOT_FOUND`, `TOO_MANY_SEARCH_LINK`, `TOO_FAR_AWAY` and `ROUTE_RESULT_NOT_FOUND`. `route` is present only with `OK`. My judgement: the other statuses arrive with HTTP 200.
- No review, business registration or extra application is needed once Kakao Map is on [K3].
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

- Quotas belong to the app, so the three keys share them [K16]. All of an app's APIs together also have a monthly quota of 3,000,000 calls [K8]. The docs say the figures may change.
- The console shows the usage under [통계] > [쿼터] [K2].
- What counts as a call:
  - Maps JavaScript SDK: creating a map object. Loading tiles, panning and zooming do not count [K13].
  - Maps SDK for Android: not documented. Starting a `MapView` sends one authentication request to `https://dapi.kakao.com/v2/maps/vector/auth` [K14]. My judgement: each map start counts once.
  - Walking route: each request.
- For the team's own use, the map quotas are far out of reach. The walking route's 1,000 a day is the tight one.
  - The app sends its position every 5 seconds (P06). A route requested on every position would use 720 calls an hour on one phone.
  - Request a route only when the User asks for one.
- Kakao also limits calls per second and per minute, but does not publish the figures. Kakao staff warned that calls repeated every 600 ms can be treated as abuse [K13].
- A call beyond the quota gets HTTP 429 [K2]. The error table also lists HTTP 400 with code `-10`, and code `-11` beyond a paid limit [K9]. A second app without the free quota was seen getting `-10` "API limit has been exceeded" [K12]. Treat both as the quota being used up.
- Paid use [K10]:
  - It needs a 비즈월렛 with a card, connected to the app, with paid use turned on. None of this is set up. A call beyond the free quota therefore fails, and nothing is billed.
  - With paid use on, calls are billed by card around 01:00 on the 1st of each month, with 10% VAT added. A walking route then costs 11 KRW a call.
  - Kakao Map has no spending limit; only KakaoTalk Share has one. A bug that repeats route requests would turn straight into a bill. My judgement: before turning paid use on, add a daily count on the server that stops route requests.
- The operating policy allows a cache only to improve the user's experience, and only if it is kept current [K5]. It forbids copying, storing or handing on data from the service without consent.

## 8. Google Sign-In

- The Google Cloud project and two OAuth clients were made during the prototype. Their IDs go in `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` of `main-server/.env.example` (P04).
  - On 2026-09-30 the project's owner was not confirmed. Two owners or more are safer.
- The app needs two clients [G2]:
  - A Web application client. Its ID is the `serverClientId` of the sign-in request and the `aud` of the ID token.
  - An Android client for each signing key, with the package name and the SHA-1. Code never references it; it authorises the app. The prototype's Android client was made for the prototype's package name.
- The admin site has its own Web application client [G3].
  - Authorized JavaScript origins: both `http://localhost` and `http://localhost:3100`.
  - No IP addresses, wildcards or paths are allowed. A change takes from 5 minutes to a few hours.
  - Over plain http, set `Referrer-Policy: no-referrer-when-downgrade`.
- SHA-1 of a signing key [G12][G13]:
  - `keytool -list -v -alias androiddebugkey -keystore <keystore> -storepass android -keypass android`
  - `./gradlew signingReport`
  - `eas credentials -p android`
  - The Play Console's app integrity page.
- The audience is External [G1].
  - In Testing, at most 100 test users can sign in. A user counts toward the cap once added [G4].
  - An app asking only for `openid`, `email` and `profile` can go to "In production" without verification.
  - Showing the app's name and logo on the consent screen needs brand verification. That takes a public homepage, a privacy policy on the same domain, and the domain verified in Search Console; a manual review takes 2 to 3 business days [G5].
- A client unused for 6 months is deleted, with an email 30 days before [G6].
- ID token verification:
  - The hosted-domain request option, `setHostedDomainFilter` on Android, only filters the account list. The server checks the `hd` claim [G7].
  - SNU accounts carry `hd=snu.ac.kr`. The prototype's check on `hd` passed with an SNU account on 2026-09-27.
  - Verify tokens locally against Google's keys at `https://www.googleapis.com/oauth2/v3/certs`. The tokeninfo endpoint is for debugging and may be throttled [G7][G8]. No quota is published for sign-in.
- Risk: a Google Workspace administrator can block unconfigured third-party apps [G9]. The user then sees `admin_policy_enforced` [G10]. Education editions block users marked as under 18 by default [G11].

## 9. Other sources checked

- SNUTT's timetable picker (Waffle Studio): P06 has the User enter the timetable instead. Using the picker later needs Waffle Studio to register our origin; the contact is `master@wafflestudio.com`.
- Siksha and Haengsha (Waffle Studio): read to find the sources above, as P07 records. `wafflestudio/siksha-crawler` has no LICENSE file [W1].
- Haengsha collects the same events list (§3). This was read in `wafflestudio/hangsha-server` at commit `4a33bf9` of 2026-09-14.
  - Its rules read one date and time per post [W2].
  - When a post's date is a range and its body mentions 모집 or 신청, the range is taken as the application period and no session is made [W2].
  - Posts that mention 비교과 or link to `extra.snu.ac.kr` are skipped as duplicates of the extracurricular site [W2].
  - With its AI parser switched on, a language model reads the post again. It returns each session on its own and is told never to merge sessions into one period [W3].
  - When a post has two sessions or more, each session is stored as its own event with its own start, end and place [W4]. The place falls back to the post's.
  - A later collection finds a stored event again by the source link and the session's start and end [W4].
  - Haengsha also serves what it collects through a public read API under `https://hangsha-api.wafflestudio.com/api/v1/events`. On 2026-09-27 the team decided to collect directly instead of using it. The decision is recorded in `.scratch/architecture-planning/spec.md` on `0.0/Main`, and the prototype's study of that API is `.scratch/architecture-planning/research/haengsha-integration.md` on the same branch.
- The extracurricular programme site: out of scope in P07.

## 10. Unverified

- The shuttle: whether regular requests are permitted, and whether coordinates exist. 정보화본부 has not replied yet.
- Kakao: the Android package name and the key hashes. The walking route has not been called.
- Kakao: what the Android map SDK counts as a call, and when the daily quota resets.
- Google: the project's owner, and an Android client for the Iteration 1 package name.
- `hd=snu.ac.kr` with the Iteration 1 app on a phone.

## 11. Sources (accessed 2026-09-30)

[S1]: https://www.snu.ac.kr/about/gwanak/shuttles/campus_shuttles
[S2]: https://sites.google.com/dongyeongtour.co.kr/snu/main
[S3]: https://dycs-widget.web.app/?tenant=snu&type=inquiry
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
[E1]: https://github.com/expo/expo/tree/sdk-57/templates/expo-template-bare-minimum/android/app
[W1]: https://github.com/wafflestudio/siksha-crawler
[W2]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/crawler/SnuNowCrawler.kt
[W3]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/ai/EliceEventParserClient.kt
[W4]: https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/common/src/main/kotlin/com/team1/hangsha/event/service/EventSyncService.kt
