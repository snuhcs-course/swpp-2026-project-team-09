# 백엔드·데이터베이스·서버 구성 조사

확인일: 2026-09-26. 수업 시연과 소규모 테스트가 배포 목표이며, 예산·동시 사용자·위치 갱신 주기는 미정이다. 아래 **권고**는 기술 선택을 위한 제안이며 확정 결정이 아니다. 앱 이름은 사용하지 않는다.

## 권고 요약

**NestJS + TypeScript, PostgreSQL + PostGIS, API 내부의 Socket.IO Gateway**로 시작하는 구성이 적합하다. 이미지 분석·행사 가져오기처럼 오래 걸리거나 재시도해야 하는 기능을 MVP에 넣는다면 **별도 worker 프로세스**를 둔다. API와 worker는 같은 호스트에서 실행할 수 있으므로 처음부터 서버 머신을 여러 대 마련할 이유는 없다. Redis·독립 socket 서비스·전용 vector DB는 각각 필요가 확인될 때 추가한다.

## 데이터베이스

**확인된 사실.** PostgreSQL은 복합 UNIQUE, 외래 키, 트랜잭션을 지원한다. 여러 행의 변경을 원자적으로 반영할 수 있지만, 트랜잭션을 사용했다는 사실만으로 모든 동시성 규칙이 자동 해결되는 것은 아니다. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)

**권고.** 사용자·친구 관계·파티 참여·행사·가용 시간·공유 권한처럼 서로 연결된 데이터가 중심이므로 PostgreSQL을 주 저장소로 선택하는 편이 자연스럽다. 예를 들어 QR 보상은 `UNIQUE(user_id, event_id)`와 같은 DB 제약으로 중복 발급을 막고, 보상 기록과 잔액 변경이 있다면 같은 트랜잭션에 둔다. 파티 정원·상태 전이는 조건부 갱신 또는 잠금 등 별도 동시성 설계가 필요하다. AI 결과나 가져온 원본의 형태가 유동적이라는 이유만으로 전체 저장소를 문서 DB로 바꿀 필요는 없다.

**확인된 사실.** PostGIS `ST_DWithin`은 geography의 미터 단위 반경 검색과 공간 인덱스를 지원한다. `ST_Covers`는 경계를 포함한 영역 포함 여부를 검사한다. [ST_DWithin](https://www.postgis.net/docs/ST_DWithin.html), [ST_Covers](https://www.postgis.net/docs/ST_Covers.html)

**권고.** 주변 행사·사람 검색과 비공개 구역 판정이 실제 MVP에 들어가면 PostGIS를 사용한다. 지도에 좌표를 표시하기만 한다면 공간 확장이 필수는 아니다. 비공개 구역의 반경/다각형, 경계 처리, GPS 오차는 별도 정책 결정이다.

| 후보 | 확인된 장점 | 이 프로젝트에서의 판단 |
| --- | --- | --- |
| PostgreSQL + PostGIS | 관계 제약·트랜잭션·공간 질의를 한 DB에서 처리 | 관계와 권한이 중심인 현재 요구의 기본 권고 |
| MongoDB | 다중 문서 ACID 트랜잭션, GeoJSON·공간 인덱스 지원 | 기술적으로 가능하다. 문서 단위로 읽고 쓰는 구조를 선호할 명확한 이유가 생기면 재검토 |
| Firestore | 문서형 저장, 원자적 트랜잭션, 실시간 listener 지원 | 클라이언트 직접 동기화를 핵심으로 삼으면 장점. NestJS에서 권한·도메인 로직을 관리할 현재 방향에서는 별도 이점과 데이터 중복 관리 비용을 비교해야 함 |

MongoDB를 배제하는 이유를 “트랜잭션이나 공간 검색이 없다”로 설명하면 틀린다. Firestore도 트랜잭션을 제공한다. Firestore는 읽기·쓰기·일부 인덱스 읽기 등에 따라 과금되므로 위치 갱신과 구독자 수가 정해지기 전에는 저렴하다고 단정하지 않는다. [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/), [geospatial queries](https://www.mongodb.com/docs/manual/geospatial-queries/), [Firestore data model](https://firebase.google.com/docs/firestore/data-model), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [listeners](https://firebase.google.com/docs/firestore/query-data/listen), [billing](https://firebase.google.com/docs/firestore/pricing)

**벡터 DB 권고.** AI 이미지 추출·tool calling·일정 조건 필터링만으로 전용 vector DB가 필요해지지는 않는다. 먼저 SQL 조건으로 후보를 좁힌다. 의미 검색의 효과가 확인되면 PostgreSQL의 pgvector를 검토하고, 별도 제품은 그 이후에 판단한다. pgvector는 정확 검색과 근사 인덱스를 지원하며 필터와 근사 검색을 함께 쓰면 결과 수·재현율을 점검해야 한다. [pgvector 공식 저장소](https://github.com/pgvector/pgvector)

## API와 실시간 전달

**이미지 저장 권고.** 업로드한 시간표·포스터 원본은 비공개 객체 저장소에 두고, PostgreSQL에는 소유자·객체 키·처리 상태·추출 결과를 저장하는 구성을 권고한다. 객체 저장소는 파일을 객체로 보관하며, 제공자는 아직 선택하지 않는다. 원본 이미지의 보관 기간과 접근 제어는 별도 결정이다. [객체 저장소의 예: Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)

**확인된 사실.** Nest Gateway는 기본적으로 HTTP 서버와 같은 포트를 사용하며 기존 provider를 주입받을 수 있다. 별도 socket 서비스는 프레임워크의 요구 사항이 아니다. [NestJS gateways](https://docs.nestjs.com/websockets/gateways)

**권고.** NestJS 모듈로 사용자·행사·파티·위치 공유·AI 작업의 책임을 나누되 하나의 API 프로세스로 배포한다. Socket.IO는 화면을 보고 있는 사용자에게 위치·파티 변경을 전달하는 역할부터 맡긴다. 연결 부하나 독립 배포 필요가 실제로 나타나면 socket 프로세스를 분리한다. 여러 인스턴스로 늘리면 인스턴스 사이의 전달 adapter와, HTTP long-polling 사용 시 sticky session 처리가 필요하다. [Socket.IO multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)

**백그라운드와 소켓은 다른 문제다.** Socket.IO 공식 문서는 모바일 백그라운드 서비스에서 상시 연결을 쓰는 방식을 권장하지 않는다. 공유 중 백그라운드 위치 수집·업로드는 Android 위치 실행 방식과 HTTPS 업로드를 중심으로 설계하고, 수신자가 앱을 다시 열면 현재 권한과 최신 상태를 조회하도록 권고한다. 푸시는 알림 전달 수단이지 위치 수집을 대신하는 수단이 아니다. [Socket.IO introduction](https://socket.io/docs/v4/#what-socketio-is-not), [Android background location](https://developer.android.com/develop/sensors-and-location/location/background)

**권한 철회 설계 권고.** DB의 파티 참여·친구 공유·차단 상태가 권한의 기준이다. 파티 탈퇴 시 파티 공유 권한을 없애고, 별도로 허용한 친구 공유의 유지 여부는 독립 정책으로 다룬다. 연결 시 인증만 해두거나 클라이언트가 `leave` 요청을 보내리라 기대해서는 안 된다. 서버에서 모든 해당 기기의 구독을 해제하고, 위치 업로드·조회·재연결·송신 시 현재 권한을 검증한다. 파티 room 전체 방송도 구성원 사이의 개별 차단을 반영해야 하므로 room 소속 자체를 접근 권한으로 취급하지 않는다. Socket.IO middleware는 연결당 한 번 실행되고, 서버 API에는 대상 socket들의 room 이탈 기능이 있다. [middlewares](https://socket.io/docs/v4/middlewares/), [server socketsLeave](https://socket.io/docs/v4/server-api/#serversocketsleaverooms)

**즉시 철회는 추가 명세가 필요하다.** 권한 변경과 위치 송신이 경쟁하는 경우까지 포함해 서버가 철회 완료를 응답하는 시점과 이후 송신 금지 기준을 정해야 한다. 비동기 room 해제 이벤트만 보내고 끝내면 지연 중 유출을 막는 보장이 없다. 이미 수신된 좌표를 원격으로 회수할 수는 없다. 비공개 구역 진입·차단·탈퇴 시 최신 위치의 노출 중단, 화면 제거, 오래된 업데이트 거절을 같은 정책으로 정의한다.

**상태 저장 권고.** 권한과 도메인 기록은 PostgreSQL에 둔다. 소규모 초기안은 사용자별 최신 위치·측정 시각·유효기간을 DB에 저장하고 조회 시 만료 여부를 검사할 수 있다. 위치 이력 보관을 기본값으로 정하지 않는다. Redis 최신 위치 캐시는 갱신량과 지연을 측정한 뒤 추가할 선택지다. 재접속하면 현재 상태를 다시 조회한다. Socket.IO의 기본 전달 보장은 at-most-once여서 끊긴 동안의 이벤트가 자동 보존된다고 가정할 수 없다. [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)

## Worker와 작업 큐

**권고.** 시간표·포스터 추출, 일괄 행사 가져오기, 재시도 가능한 푸시 발송은 durable queue 후보이다. 요청에서는 작업 접수와 ID를 반환하고, worker가 처리 결과를 저장한다. 짧은 CRUD를 전부 큐에 넣을 이유는 없다. 별도 worker 프로세스는 API와 같은 코드·도메인 서비스를 공유해도 되며 처음에는 같은 머신에서 실행할 수 있다. 이는 배포 권고이며, NestJS 자체는 HTTP listener 없는 standalone 실행을 제공한다. [NestJS standalone applications](https://docs.nestjs.com/standalone-applications)

| 큐 선택 | 확인된 특성 | 선택 기준 |
| --- | --- | --- |
| pg-boss + 기존 PostgreSQL | 기존 DB 트랜잭션 안에서 job 생성, 재시도·backoff·예약 작업 지원 | 운영 저장소를 하나로 줄이고 싶을 때 우선 검토 |
| BullMQ + Redis | Nest 공식 통합 경로, 큐·worker 분산과 재시도 지원 | Nest 통합 편의나 Redis 운영 경험을 우선할 때 |

pg-boss를 쓰더라도 큐 라이브러리의 실행 보장을 외부 API 부작용의 “정확히 한 번 실행” 보장으로 해석하지 않는다. Redis 기반 BullMQ는 지속성 설정과 `noeviction` 정책을 확인해야 한다. [pg-boss 공식 저장소](https://github.com/timgit/pg-boss), [NestJS queues](https://docs.nestjs.com/application/queues), [BullMQ production](https://docs.bullmq.io/guide/going-to-production)

**최신 문서 주의.** 확인 시점 BullMQ 공식 문서에는 PostgreSQL backend도 있으며 Redis가 기본이자 가장 검증된 선택이라고 명시한다. 따라서 “BullMQ에는 반드시 Redis가 필요하다”는 단정은 피한다. Nest 통합 문서와 선택할 배포 버전의 호환성이 검증되지 않았으므로, 이 조사만으로 BullMQ PostgreSQL 조합을 채택하지 않는다. [BullMQ PostgreSQL backend](https://docs.bullmq.io/guide/postgresql)

**재시도·outbox 권고.** 일시 오류에 제한된 횟수와 backoff를 적용하고, 실패 상태와 수동 재시도 경로를 둔다. 작업 ID와 도메인 UNIQUE 제약으로 결과를 중복 반영하지 않도록 만든다. DB 저장 성공 뒤 큐 등록 전에 프로세스가 죽으면 접수한 작업을 잃을 수 있다. 반드시 이어져야 하는 작업에는 같은 PostgreSQL 트랜잭션 안의 job 등록이나 transactional outbox를 사용한다. Redis 큐를 선택했을 때 모든 위치 점을 outbox에 넣을 필요는 없다. 푸시·AI 외부 호출은 해당 제공자의 중복 방지 기능도 별도로 확인한다. [BullMQ retrying](https://docs.bullmq.io/guide/retrying-failing-jobs), [idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), [AWS transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## 남은 결정

- 첫 MVP에 실제로 들어갈 장시간 AI 작업·행사 가져오기 범위와 실패 시 사용자 경험.
- 공유 대상·친구 공유와 파티 공유의 관계·차단 우선순위·철회 완료 시점.
- 백그라운드 갱신 주기, 위치 만료와 보관 기간, 비공개 구역 경계·오차 처리.
- pg-boss로 저장소를 줄일지, Nest 통합 편의를 위해 BullMQ + Redis를 쓸지.
- 예산과 배포 환경, PostGIS 지원, WebSocket 유지 가능 여부, 관측할 성능 기준.

검증은 공식 문서 조사까지다. 실제 패키지 조합 실행, 부하 측정, 배포 검증은 하지 않았다.
