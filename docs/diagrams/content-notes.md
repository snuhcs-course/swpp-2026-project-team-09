# README 다이어그램 내용 근거

기준: 2026-09-27, Main `28173cb` 코드 감사. 그림은 구현 경로와 미완료 범위를 구분한다. 코드 변경 시 아래 근거와 README·PNG를 함께 갱신한다. 실제 두 기기 시연 완료, AI 매칭 품질 또는 전체 MVP 완료를 주장하지 않는다.

## 공통 표현

- AWS 아키텍처 다이어그램에서 착안한 그래픽 스타일: 직접 그린 범용 아이콘, 리소스 그룹, 번호가 붙은 흐름 화살표를 사용한다. 현재 배포는 로컬 Docker Compose이며 AWS 서비스 아이콘이나 클라우드 리소스 도입을 뜻하지 않는다. 번호는 요청·전달 흐름을 구분하고 리소스 그룹은 실제 서비스·데이터 소유권을 표현한다.
- **구현**: 현재 API·UI·저장 경로. 실선.
- **검증 대기**: 실제 두 계정/기기, 백그라운드 위치·이동·배터리, 운행 중 셔틀 확인. 별도 배지.
- **향후 / 보류**: 구현되지 않은 추천·경로 기능, 보류된 도서관 연동. 별도 안내 상자. 동작 경로에 섞지 않는다.
- Socket.IO는 `domain.changed` ID/버전 힌트 → HTTP 재조회. 업무 데이터나 개인 일정 내용을 실어 보내지 않는다. 전달 보장 푸시/FCM으로 표현하지 않는다.

## architecture.png

| 출발 → 도착 | 짧은 선/상자 라벨 |
| --- | --- |
| React Native/Expo → main-public | HTTP · `/v1/events`, `/parties`, `/quests`, `/meetups`, `/me/*`, `/locations`, `/campus/*` |
| React Native/Expo → match-server | HTTP · `/v1/matches` · 명시적 자동 합류 동의 |
| socket-server → 모바일 | Socket.IO 갱신 힌트 → HTTP 재조회 |
| Next.js admin → main-admin | 관리자 HTTP · `/v1/admin/events`, `/integrations` |
| main-public + main-admin → main DB | 같은 이미지 · 분리된 라우트 · main 소유 Prisma |
| match-server → match DB | 요청·배치 상태 · match 소유 Prisma |
| match-server → main-public | 내부 HTTP · `/v1/internal/parties/match` |
| worker → main-public | 내부 HTTP · `/v1/internal/events/import` |
| main-public/admin → worker | 내부 키 HTTP · 생활 조회/수집 관리/이미지 초안 |
| worker → 공식 제공처 | 학식 SNUCO · 셔틀 Busin · SNU 행사 |
| worker → 로컬 Ollama | 사진 → 편집 가능한 초안 · 이미지 저장 없음 |
| main DB outbox → Redis cache Pub/Sub | 업무 변경과 원자적 기록 후 relay |
| match / worker → Redis cache Pub/Sub | 일시적 변경 힌트 · outbox 아님 |
| Redis cache Pub/Sub → socket-server | 대상 사용자 방 / 공개 행사 방 |
| worker ↔ Redis queue | BullMQ `campus-feeds` 반복 수집 작업 |

Redis cache의 별도 용도: 행사 목록 캐시, 위치 TTL 120초, match 후보 인덱스·선택적 임베딩 캐시, 생활 스냅샷. Redis queue는 DB 동의/회원 상태의 원장이 아니다. PostgreSQL/PostGIS 안에서도 main·match DB/역할을 구분한다. worker/socket은 main 테이블에 직접 쓰지 않는다. main outbox가 있어도 Pub/Sub→단말 전달까지 보장하는 것은 아니므로 재조회 경로를 표시한다.

근거: [main HTTP](../../main-server/src/modules/http.ts), [main outbox](../../main-server/src/modules/database.ts), [match 서비스](../../match-server/src/modules/matches.ts), [worker 수집](../../worker-server/src/modules/feeds.ts), [socket 정책](../../socket-server/src/modules/policy.ts), [socket 전송](../../socket-server/src/modules/realtime.ts), [앱 재조회](../../mobile/App.tsx), [이미지 어댑터](../../worker-server/src/modules/image-extractions.ts), [Compose 소유권](../../docker-compose.yml).

## demo-event.png

`행사 조회 → 활동/신청 시간/인원 + 자동 합류 동의 → match 후보 계산 → main 내부 확정 → 파티 + 회원 → 파티원의 별도 공동 계획 저장 → 공유 퀘스트`.

- 행사 원천: 관리자 작성 또는 worker의 실제 공식 공지 import. 불완전한 공지는 임의 완성하지 않는다.
- 같은 활동·event ID·그룹 크기, 신청 시간 교집합을 만족하는 후보를 관심사 유사도로 정렬한다. 신청 시간은 개인 시간표 전체를 자동 추론한 결과가 아니다.
- 매칭 확정은 중복 요청 소비를 막고 파티/회원만 만든다. **퀘스트 자동 생성 없음.** 별도 `POST /v1/quests`에서 현재 구성원의 시간표·개인 일정·다른 활성 퀘스트 충돌을 검사한다.
- 위치는 사용자 전체 공유 설정, 관계/파티 공유 설정, OS 권한을 충족해야 한다. 파티 합류가 위치 동의가 아니다. 관계 충돌에서는 보수적으로 거부한다.
- 선택적 임베딩 코드는 존재하지만 현재 규칙 기반 데모를 AI 궁합 검증으로 표현하지 않는다. 향후 안내: `행사 후 AI 카페 추천`. 검증 대기: `실제 두 기기 합류·위치`.

근거: [후보/동의 규칙](../../match-server/src/modules/rules.ts), [선택적 임베딩](../../match-server/src/modules/embeddings.ts), [배치 확정](../../match-server/src/modules/matches.ts), [파티 확정·별도 퀘스트 저장](../../main-server/src/modules/social.ts), [일정 충돌](../../main-server/src/modules/schedule-conflicts.ts), [위치 권한](../../main-server/src/modules/location.ts).

## demo-friends.png

`수락된 친구 관계 → 구체적 계획 제안(제목·시작·종료·장소) → 상대 수락 → main 트랜잭션 재검증 → 비공개 2인 파티 + 활성 퀘스트 + outbox → 두 사람 HTTP 재조회`.

- 수락은 고정된 해당 계획에 대한 동의. 일반 만남 요청/AI 추천 수락과 구분한다.
- 사용자 행을 정렬해 잠그고 친구 관계 및 최신 시간표·개인 일정·활성 공동 퀘스트 중복을 확인한다. 충돌은 `SCHEDULE_CONFLICT`만 반환하고 상대의 사적 내용을 노출하지 않는다.
- 같은 결과 재시도는 중복 파티/퀘스트를 만들지 않는다. 비참여자는 이 파티를 조회·합류할 수 없다. 미설정 시간표는 검증된 빈 시간이 아니다.
- 향후 안내: `AI 장소 추천 / 도보 이동시간`. 검증 대기: `실제 두 계정 앱 제안·수락`.

근거: [친구 계획 트랜잭션](../../main-server/src/modules/meetups.ts), [일정 잠금·충돌](../../main-server/src/modules/schedule-conflicts.ts), [비공개 파티 권한](../../main-server/src/modules/social.ts), [모바일 제안/수락](../../mobile/src/ui/Meetups.tsx).

## demo-campus.png

두 갈래를 분리한다. `공식 제공처 → worker 주기 수집 → Redis 스냅샷 → main HTTP → 생활 화면의 조회/다시 조회 + 출처·조회 시각` / `본인 시간표 HTTP → 모바일 서울 날짜 계산 → 오늘 수업 기본 퀘스트`.

- BullMQ 주기: 셔틀 60초, 학식 30분, 행사 6시간. 스냅샷 TTL과 cache miss 동시 요청 합치기/잠금으로 중복 수집을 줄인다. 클라이언트 생활 화면 자체는 버튼 조회이며 실시간 GPS 스트림이나 자동 차량 추적 화면이 아니다.
- `sourceUrl`, `fetchedAt`, `available / no_vehicles / unavailable` 구분. 조회 시각을 차량 관측 시각으로 바꾸지 않는다. 셔틀 `positionKind: schematic`, `observedAt: null`; 노선도 좌표는 위경도가 아니다.
- 수업은 `GET /v1/me/timetable` → `Asia/Seoul` 당일 발생분을 계산한다. 반복 수업별 DB 퀘스트·출석 체크인을 만들지 않는다. owner-only `timetable.changed`와 재접속/주기 재조회로 갱신한다.
- 향후 안내: `학습 공간 / 길찾기`; 별도 보류: `도서관 연동`. 검증 대기: `운행 중 차량·정류장 대응`.

근거: [수집 주기·캐시·원천 필드](../../worker-server/src/modules/feeds.ts), [main 프록시](../../main-server/src/modules/http.ts), [생활 버튼·출처 표시](../../mobile/src/ui/Life.tsx), [오늘 수업 계산](../../mobile/src/class-quests.ts), [시간표 재조회](../../mobile/src/use-timetable.ts), [시간표 변경 힌트](../../main-server/src/modules/profile.ts).
