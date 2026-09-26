# 행샤 행사 데이터 연동 조사

조사일: 2026-09-26 KST. 공개 공식 저장소와 공개 API만 읽었다. 아래는 확인된 사실과 설계 제안을 구분한 조사 결과이며 채택 결정이 아니다. 저장소 코드를 실행하거나 계정을 만들지 않았고, 운영 행사 API는 인증 없이 `GET` 1회, 일별 목록 1건으로 제한해 확인했다. 원천 사이트 크롤링·로그인·문의 전송은 하지 않았다.

## 결론

**행샤는 공개 행사 데이터를 가져올 기술 경로가 확인된 유력한 공급자다.** 공식 저장소명은 `wafflestudio/hangsha-server`, `wafflestudio/hangsha-web`이다. 공식 OpenAPI는 행사 월별·일별 조회를 Public API로 명시하고 `security: []`를 둔다. 서버 보안 설정과 nullable 사용자 인자도 비로그인 읽기를 뒷받침한다. [공개 API 명세](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/resources/static/openapi.yaml#L1194-L1206), [일별 명세](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/resources/static/openapi.yaml#L1260-L1271), [보안 설정](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/config/SecurityConfig.kt#L50-L90)

추천은 **행샤 운영팀과 데이터 이용 범위를 합의하고, NestJS worker의 `HangshaEventProvider`가 공개 API를 제한적으로 조회해 우리 행사 모델에 정규화하는 방식**이다. 사용자별 행샤 로그인은 공개 행사 조회에 필요하지 않다. 다만 운영 서버의 자동 조회·저장·재배포 허용, 포스터 이용, 호출량과 정정 정책은 이번 조사에서 확인되지 않았다. HTTP 200이나 공개 저장소 자체를 이러한 이용 조건의 대체 근거로 삼지 않는다.

## 조사 기준 버전과 라이선스

| 저장소 | 기본 브랜치의 확인 커밋 | 해당 커밋 시각(UTC) | 저장소 상태 |
|---|---|---|---|
| [hangsha-server](https://github.com/wafflestudio/hangsha-server) | [4a33bf96](https://github.com/wafflestudio/hangsha-server/commit/4a33bf96bff8b71f1fb837c779da057e136f7784), `develop` | 2026-09-14 15:16:09 | public, archived=false; 마지막 push 2026-09-20 |
| [hangsha-web](https://github.com/wafflestudio/hangsha-web) | [9c5c9150](https://github.com/wafflestudio/hangsha-web/commit/9c5c9150d6c650df6672223e6435b892c3c65783), `dev` | 2026-09-05 08:47:32 | public, archived=false; 마지막 push 2026-09-20 |

메타데이터는 조사 시점 [GitHub 서버 저장소 API](https://api.github.com/repos/wafflestudio/hangsha-server), [웹 저장소 API](https://api.github.com/repos/wafflestudio/hangsha-web)에서 직접 확인했다. 마지막 push 시각은 기본 브랜치 HEAD 시각과 다르다. **기본 브랜치 코드가 그대로 production에 배포되었다는 뜻도 아니다.** 현재 운영 환경은 아래 일별 GET 한 건만 검증했다.

두 저장소 모두 GitHub `license` 값은 `null`이고, 받은 해당 커밋의 소스 트리에서 루트 라이선스 파일을 확인하지 못했다. 따라서 서버·웹 코드를 MIT로 가정해 복사·재배포하지 않는다. GitHub도 명시적 라이선스가 없는 공개 저장소의 사용·수정·배포 권한을 일반적인 오픈소스 라이선스와 구분한다. [GitHub 라이선스 안내](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

실제 확인할 권한은 별개다: **소스 코드 재사용**, **운영 API 호출·캐시·재배포**, **원 게시자의 행사 설명·포스터 재사용**. 행샤 운영팀이 원 게시물의 재배포까지 허용할 수 있는지도 질문해야 한다.

## 공개 읽기 계약

프론트엔드 설정이 사용하는 production API 호스트는 `https://hangsha-api.wafflestudio.com`이다. 앱 서비스 주소는 저장소 메타데이터 기준 `https://hangsha.wafflestudio.com`이며, README의 `hangsha.site`와 차이가 있으므로 실제 연동 주소는 운영팀과 고정한다. [API 호스트 설정](https://github.com/wafflestudio/hangsha-web/blob/9c5c9150d6c650df6672223e6435b892c3c65783/vite.config.ts#L6-L22), [서버 README](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/README.md#L1-L16)

운영 [OpenAPI YAML 문서](https://hangsha-api.wafflestudio.com/openapi.yaml)도 별도로 읽어 HTTP 200, `application/yaml`, `openapi:` 문서임을 확인했다. 이 문서 조회는 위 행사 데이터 GET 1회와 별개의 정적 문서 조회다. 변경 가능한 운영 문서와 위에 고정한 커밋의 명세는 차이가 날 수 있다.

아래 경로는 호스트 뒤 `/api/v1` 기준이다. 정확한 파라미터는 [EventController](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/event/controller/EventController.kt#L21-L120)에 있다.

| 조회 | 요청 | 응답·주의점 |
|---|---|---|
| 기간별 행사 | `GET /events/month?from=YYYY-MM-DD&to=YYYY-MM-DD` | `range`, `byDate[date].events[]`; 여러 날짜에 같은 행사가 반복되므로 `id`로 중복 제거 |
| 하루 행사 | `GET /events/day?date=YYYY-MM-DD&page=1&size=20` | `page`, `size`, `total`, `date`, `items[]`; page는 1부터 |
| 행사 수 | `GET /events/count?from=...&to=...` | 기간/분류별 개수 |
| 행사 상세 | `GET /events/{eventId}` | 목록 필드와 `detail`; 없는/숨겨진 행사는 도메인 오류 |
| 검색 | `GET /events/search?query=...&page=1&size=20` | 현재 서버 소스는 `items[].event`와 `highlight` 형태 |
| 분류 목록 | `GET /event-statuses`, `/event-types`, `/organizations` | 상태·행사 유형·기관 매핑. ID를 자체 enum 값과 동일시하지 않는다 |

기간·일별 조회는 `statusId`, `eventTypeId`, `orgId`의 복수 필터를 지원한다. 로그인 사용자는 관심사/제외 키워드/북마크 개인화가 적용될 수 있으므로 **서버 간 동기화에는 사용자의 행샤 토큰을 보내지 않는 편이 적합하다.** 분류 조회는 [공식 웹 클라이언트](https://github.com/wafflestudio/hangsha-web/blob/9c5c9150d6c650df6672223e6435b892c3c65783/src/api/event.ts#L100-L114)와 보안 설정에서 확인했다.

인증 경계는 **문서화된 행사 GET** 기준이다. 계정·북마크·관리자 기능까지 비로그인 사용 가능하다는 뜻은 아니다. JWT 필터는 `Authorization: Bearer`를 읽어 유효할 때 사용자 정보를 설정한다. [JWT 필터](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/user/JwtAuthenticationFilter.kt#L20-L42)

CORS도 별도다. 현재 소스의 허용 origin은 localhost 3000/5173/5174, 행샤 dev/prod 웹, `https://*.app.github.dev`이며 credentials를 허용한다. **임의의 우리 웹 도메인은 이 목록에 없다.** [CORS 설정](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/config/WebConfig.kt#L24-L36) React Native의 네이티브 HTTP 계층과 NestJS 서버 간 요청은 브라우저 CORS 적용 대상이 아니지만, 이것이 제공자의 이용 허가·인증을 대체하지 않는다. [React Native 네트워킹 안내](https://reactnative.dev/docs/network#using-other-networking-libraries) 이번 실측은 Origin 없는 서버 GET이므로 production의 웹 CORS 헤더·preflight는 검증하지 않았다. WebView/웹 버전에서 직접 조회하려면 별도 origin 허용을 확인한다.

검색 경로는 버전 확인이 특히 필요하다. 웹 코드에는 `/events/search/title` 호출도 남아 있지만 조사한 현재 EventController에는 그 매핑이 없고 `/events/search`가 있다. 따라서 프론트 코드의 함수만 복사해서 계약으로 간주하지 말고 허용된 환경에서 계약 테스트를 해야 한다. [웹 검색 호출](https://github.com/wafflestudio/hangsha-web/blob/9c5c9150d6c650df6672223e6435b892c3c65783/src/api/event.ts#L57-L87), [서버 검색 반환](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/event/service/EventService.kt#L217-L299)

### 운영 API 한 건 검증

- 시각: 2026-09-26 01:27:02 KST.
- 요청: [하루·1건 공개 조회](https://hangsha-api.wafflestudio.com/api/v1/events/day?date=2026-09-26&page=1&size=1).
- Authorization·Cookie 없이 `Accept: application/json`만 사용했다.
- 결과: HTTP 200, `application/json`, `page=1`, `size=1`, `total=17`, `items` 1개.
- 반환 필드명·유형은 아래 DTO와 일치했다. 사용자 개인화 필드는 null이었다.
- `total=17`은 해당 날짜 API 결과 수이며 캠퍼스 전체 행사 수나 장소·일정 정확성의 검증 결과가 아니다. 이후 지속적인 가용성·호출 허가도 입증하지 않는다.

## 얻을 수 있는 데이터와 빠진 데이터

공개 [EventDto](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/event/dto/core/EventDto.kt#L6-L35)에는 다음이 있다.

| 데이터 | 해석 |
|---|---|
| `id`, `title` | 행샤 행사 ID와 제목 |
| `applyStart`, `applyEnd` | 신청/접수 기간; 실제 활동 시간과 구분 |
| `eventStart`, `eventEnd`, `isPeriodEvent` | 실제 행사 기간 또는 기간형 행사 분류; null 가능 |
| `location` | 문자열 장소. 위도·경도·건물 ID는 없음 |
| `organization`, `orgId`, `eventTypeId`, `statusId` | 주관기관·유형·상태 |
| `imageUrl`, `applyLink`, `tags` | 이미지 URL·원문/신청 링크·태그 문자열. 원문 링크와 실제 신청 완료는 구분 |
| `capacity`, `applyCount` | 제공자가 가진 정원·신청 수. 잔여 정원 실시간 보장으로 해석하지 않음 |
| `detail` | 상세 조회에서 추가되는 문자열; 저장 모델은 HTML 본문을 보유 |

상세 응답은 [DetailEventResponse](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/event/dto/response/DetailEventResponse.kt#L9-L38)로 확인했다. 공개 DTO에는 **좌표, `updatedAt`, 원문 검증 시각, 변경 cursor, 삭제 tombstone, 데이터 라이선스**가 없다. DB 모델에는 `updatedAt`과 `adminDeleted`가 있으나 공개 DTO에 전달되지 않는다. [저장 모델](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/common/src/main/kotlin/com/team1/hangsha/event/model/Event.kt#L12-L47)

월별 버킷의 날짜를 활동 날짜로 복사해서는 안 된다. 현재 서비스는 `isPeriodEvent=true`면 신청 기간으로, 그 외에는 행사 기간으로 날짜 버킷을 만든다. 신청 마감일을 동행 가능한 행사 시각으로 잘못 추천하지 않도록 분리해야 한다. [기간별 버킷 생성](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/event/service/EventService.kt#L67-L102)

## 원천 수집과 정정·삭제

확인된 수집 경로는 **서울대 비교과관리시스템(extra.snu.ac.kr)** 및 **서울대학교 공식 행사 게시판(www.snu.ac.kr/snunow/events)**이다. 전 학과의 개별 공지판 전체를 수집한다는 근거는 확인하지 못했다. [Extra SNU 크롤러](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/crawler/ExtraSnuCrawler.kt#L19-L29), [서울대학교 공식 행사 게시판 크롤러](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/crawler/SnuNowCrawler.kt#L14-L61)

코드에는 HTTP·HTML 파싱, 상세 정보 추출과 AI 필드 해석을 거친 batch 수집이 있다. 운영 batch의 실제 주기·성공률·누락률은 조사하지 못했다. 또한 **기존 `applyLink`가 존재하면 수집 대상을 건너뛰는 필터**가 있고, 모집 시작·종료 상태는 batch에서 별도 갱신한다. 그러므로 원 게시자가 바꾼 시간·장소·취소 공지가 매번 자동 반영된다고 가정할 수 없다. [기존 링크 제외](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/job/ExtraSnuSyncRunner.kt#L239-L264), [모집 상태 갱신](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/batch/src/main/kotlin/com/team1/hangsha/batch/job/ExtraSnuSyncRunner.kt#L214-L224)

한 원문이 여러 회차로 나뉘어 서로 다른 행사 row가 될 수 있다. 기존 행 찾기도 `applyLink + 시작/종료 기간`을 사용한다. 따라서 **같은 applyLink만으로 여러 회차를 합치면 안 된다.** 우리 DB의 공급자 식별자는 `(provider, externalId)`로 두고 원문 URL은 별도 그룹/출처 필드로 둔다. [회차 분리와 upsert 키](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/common/src/main/kotlin/com/team1/hangsha/event/service/EventSyncService.kt#L70-L115)

관리자 soft-delete가 있고, 공개 상세는 `admin_deleted=false`만 반환한다. 하지만 외부 소비자용 삭제 피드·webhook은 조사한 공개 읽기 API/문서에서 확인되지 않았다. [상세 가시성과 삭제](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/common/src/main/kotlin/com/team1/hangsha/event/repository/EventRepository.kt#L90-L113), [상세 조회](https://github.com/wafflestudio/hangsha-server/blob/4a33bf96bff8b71f1fb837c779da057e136f7784/hangsha/src/main/kotlin/com/team1/hangsha/event/service/EventService.kt#L164-L172)

## 제안하는 NestJS 연동 구조

아래는 연구자의 설계 제안이다. 구체적인 호출 주기·저장 범위는 운영팀 합의 후 정한다.

```text
HangshaEventProvider (서버 간 공개 GET)
  → worker: 제한된 기간 조회 → 스키마 검증 → externalId 기준 중복 제거
  → 정규화: 신청 기간 / 활동 기간 / 원문 URL / 장소 문자열
  → PostgreSQL: 공급자 관측값 + 자체 지도·검토 정보
  → 우리 API: 지도·검색·AI 추천
```

1. **읽기 전용 어댑터:** `listWindow(from,to)`, `getEvent(id)`, `listCategories()`로 감싼다. 행샤의 북마크·계정·개인화·시간표 API를 행사 수집 때문에 사용하지 않는다. 모바일 화면을 열 때마다 upstream을 호출하지 않고 서버 캐시를 공유한다.
2. **기간 제한:** 최초 시연은 현재~가까운 미래의 합의한 기간만 수집한다. 일별 pagination 또는 좁은 월별 window를 사용한다. 목록을 가져왔다고 상세를 전부 연속 호출하지 않고 필요·허용 범위만 조회한다. 요청 한도·backoff·동시성 1·last-success 지표를 둔다.
3. **저장 형태:** `provider='hangsha'`, `externalId`, `providerUrl`, `upstreamUrl/applyLink`, `fetchedAt`, `lastSeenAt`, `contentHash`, `syncRunId`, `availabilityState`를 둔다. 공개 DTO에 없는 `sourceUpdatedAt`을 `fetchedAt`으로 꾸미지 않는다. 공급자 원문 값과 자체 `placeId`, 좌표·보정 이력은 분리한다.
4. **동행 가능 여부:** 실제 시작/종료 시각이 확실한 행사를 우선 추천한다. 미정·기간형·온라인 행사는 별도로 표시한다. API의 로컬 날짜·시간은 제공자의 timezone을 확인한 뒤 `Asia/Seoul` 기준으로 정규화한다.
5. **지도 좌표 보강:** `location`을 학교 건물/시설 사전에 매핑하고, 미확인 위치는 검토 대기로 둔다. AI가 추정한 임의 좌표를 공식 행사 장소처럼 확정하지 않는다.
6. **정정·삭제:** `contentHash` 변경 시 최신 값을 반영하고, 이미 파티가 연결된 행사의 시간/장소가 바뀌면 참가자에게 변경 사실을 표시한다. 한 번 목록에서 빠졌다고 삭제하지 않는다. 완전히 성공한 동기화 범위·기간 이동·필터·상세 재조회 결과를 구분하고, 명시적 부재가 확인되면 신규 추천을 중단한다. 기존 파티의 참조는 보존한다. 가장 좋은 계약은 운영팀이 `updatedAt`과 변경/삭제 피드를 제공하는 것이다.
7. **본문·이미지:** 허용된 제목/일정/출처 중심으로 시작하고, 본문 HTML은 그대로 신뢰·실행하지 않는다. 이미지 저장·리사이즈·재호스팅 및 AI 입력은 별도 허용 범위를 따른다. 원문과 행샤 링크를 모두 표기한다.
8. **폴백:** 연동 합의가 지연되면 자체 입력 행사와 확인된 행샤 상세 링크를 연결한다. 공식 웹 라우트는 `/events/:eventId`다. 별도 RSS/ICS/export·제휴 API 발급 문서는 조사 범위에서 확인하지 못했다. [상세 링크 라우트](https://github.com/wafflestudio/hangsha-web/blob/9c5c9150d6c650df6672223e6435b892c3c65783/src/router/AppRoutes.tsx#L41-L47)

## 행샤 운영팀과 확인할 질문

문의는 아직 보내지 않았다. 다음은 연동을 구체화할 질문 목록이다.

1. 수업 프로젝트의 NestJS 서버가 공개 행사 API를 주기적으로 호출하고, 제목·일정·장소·출처를 캐시해 Android 앱에서 재표시해도 되는가? 필요한 신청·표기·API key가 있는가?
2. production API base URL·권장 버전·호출량/동시성/조회 기간 한도·변경 공지 채널은 무엇인가? 시험용 환경을 사용할 수 있는가?
3. 설명 본문·포스터 썸네일/원본을 저장·재표시하거나 AI 요약·추천의 입력으로 써도 되는가? 원 게시자 허가 범위와 삭제 요청 절차는 무엇인가?
4. `updatedAt`, stable ID, `updatedSince` cursor, 삭제/취소 feed를 제공할 수 있는가? 기존 링크의 원문 정정은 어떻게 반영되는가?
5. `isPeriodEvent`, 신청 기간/실제 행사 시각, 다회차 ID, timezone의 공식 의미는 무엇인가? 날짜 변경 시 ID가 유지되는가?
6. 현재 수집 범위·갱신 주기·취소 반영 정책은 무엇인가? 지도에 쓸 건물 ID/좌표나 정정 제안을 공유할 수 있는가?
7. 공개 저장소 코드를 일부 재사용할 필요가 생길 경우 적용할 라이선스/허가는 무엇인가? API 데이터 연동만 하는 경우와 구분해 답변 받을 수 있는가?

## 남은 검증과 판단

- **기술 연결 가능성:** 높음. 공식 공개 읽기 문서·서버 코드·실제 비로그인 응답의 세 근거가 있다.
- **안정적인 외부 데이터 계약:** 미확정. 호출 한도, 재표시/이미지/AI 이용 범위, 변경/삭제 전달 방식 확인이 필요하다.
- **Proposal 전체 행사 범위 충족:** 미확정. 행샤는 유력한 첫 공급자이지만 모든 학과/주최자의 행사, 정확한 지도 좌표, 정정 즉시 반영을 보장한다고 볼 수 없다.
- **다음 구현 검증:** 허용된 환경/fixture에서 null 일정, 기간형 행사, 다회차 중복, 월 window 중복, 원문 정정, 목록 누락·삭제, timeout/429를 다루는 어댑터 계약 검증을 한다. 이번 조사에서는 구현·테스트를 수행하지 않았다.
