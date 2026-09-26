# 독립 main·socket·worker 서버 구성 조사

확인일: 2026-09-27. 사용자가 세 서버의 독립 실행·배포와 MSA 방향을 요청했다. 아래 폴더·브로커·데이터 소유권은 **논의용 제안이며 미확정**이다. 설치·제품 코드·실행 시험은 하지 않았다.

## 저장소와 서비스 경계

- Nest CLI standard mode는 앱별 `package.json`·설정을 가지며, Nest CLI monorepo mode는 앱별 `main.ts`와 빌드 설정을 두되 의존성 `package.json`은 공통으로 사용한다. 어느 모드든 독립 실행 앱을 만들 수 있다. [Nest workspaces](https://docs.nestjs.com/cli/monorepo)
- pnpm workspace는 여러 패키지를 한 저장소에 묶고 `workspace:` 의존성을 명시한다. 따라서 React Native·어드민·Nest 앱들을 각자 `package.json`이 있는 패키지로 구성할 수 있다. 이는 Nest CLI monorepo 전환과 별개다. 설치 시 현재 로컬 pnpm과 선택 버전을 고정해야 한다. [pnpm workspace](https://pnpm.io/workspaces)
- 권고: `apps/mobile`, `apps/admin`, `services/main`, `services/socket`, `services/worker`; 각 서버는 자체 진입점·의존성·환경 변수·Dockerfile·테스트를 가진다. 루트는 공통 실행 명령과 lockfile을 관리한다.
- 공유 패키지는 HTTP/event 계약, 런타임 검증 schema, 기술 설정 정도로 제한한다. 다른 서버의 service·repository·ORM entity를 import하면 배포만 나뉘고 변경은 결합된다. 공유 계약 변경도 배포 시 구버전 소비자와 호환되어야 한다.
- 세 프로세스로 나누는 것은 유효한 독립 배포 구성이다. 다만 `main/socket/worker`는 실행 역할 분리다. 도메인 MSA의 핵심인 데이터 소유권·업무 책임·통신 계약까지 정해야 하며 폴더 수만으로 완료되지 않는다. 이 항목은 설계 판단이다.

## 브로커에서 구분할 사실

- 같은 RabbitMQ queue에 여러 consumer를 연결하면 작업을 분담한다. socket과 worker가 같은 업무 이벤트를 **각각** 받아야 한다면 exchange에 `socket.events`와 `worker.events`를 별도로 bind한다. 같은 서비스의 replica들은 자기 서비스 queue를 공유할 수 있다. [AMQP model](https://www.rabbitmq.com/tutorials/amqp-concepts), [Publish/Subscribe](https://www.rabbitmq.com/tutorials/tutorial-three-javascript)
- 작업 명령은 하나의 담당 worker가 수행하고, 업무 이벤트는 관심 있는 여러 서비스가 받는다. 예: `poster.extract.requested` 작업과 `event.published` 사실을 별도 계약으로 구분한다. 이는 위 전달 모델을 적용한 권고다.
- publisher confirm은 브로커가 발행을 확인한 것이고 consumer ack는 소비 처리를 확인한 것이다. 서로 대체하지 않으며 모바일 수신 확인도 아니다. [RabbitMQ confirms](https://www.rabbitmq.com/docs/confirms)
- Nest RMQ transporter의 `noAck` 기본값은 `true`; 신뢰성 있는 작업은 `false`로 설정하고 필요한 결과 저장 후 ACK한다. 브로커 재전달·publisher 재시도는 중복을 일으킬 수 있다. [Nest RabbitMQ](https://docs.nestjs.com/microservices/rabbitmq), [RabbitMQ reliability](https://www.rabbitmq.com/docs/reliability)
- durable queue·persistent message·publisher confirm을 함께 검토하고, 라우팅 불가 메시지도 감지한다. infinite requeue 대신 제한된 재시도와 dead-letter 처리·관리자 재실행이 필요하다. confirm만으로 존재하지 않는 구독자에게 전달되었다고 판단하지 않는다. [RabbitMQ reliability](https://www.rabbitmq.com/docs/reliability)

## DB commit과 발행 사이 유실

행사를 DB에 저장한 직후 프로세스가 죽으면 `emit/publish`가 실행되지 않을 수 있다. 반대로 commit 전에 발행하면 실제로 저장되지 않은 상태가 전파된다. **업무 행과 outbox 행을 같은 로컬 DB transaction에 저장하고 relay가 발행**하는 설계가 이 간극을 다룬다. [Transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

권고 흐름:

```text
admin → main: 행사 발행 명령
main DB transaction: 행사 변경 + outbox(eventId, aggregateId, revision, version)
main 소유 relay → broker: publish + confirm
  ├─ socket.events → 현재 구독 권한 확인 → 모바일 변경 알림
  └─ worker.events → 필요한 후처리 → 결과 저장 → ACK
```

- relay는 main의 내부 역할로 시작하거나 같은 서비스 소유권의 별도 프로세스로 실행할 수 있다. 범용 worker에 모든 서비스 DB의 수정 권한을 주는 방식은 피한다.
- relay가 confirm 후 outbox 표시 전에 죽으면 중복 발행한다. 소비자는 `eventId` 중복 제거와 업무 결과를 같은 transaction에서 기록한다. 외부 API 호출에는 별도의 idempotency key·재시도 규칙이 필요하다.
- 메시지 중복 제거가 모든 업무 중복을 막지는 않는다. 예를 들어 동일 QR 보상은 업무 고유키로 별도 제한한다. 수정 순서가 중요한 데이터는 entity revision을 검사한다.
- 재접속 모바일은 main의 최신 snapshot을 조회한다. 중요 상태의 원본은 Socket.IO packet이나 broker queue가 아니다.

## Socket.IO와 위치 공개의 제약

- Socket.IO Redis adapter는 Pub/Sub으로 다른 인스턴스의 연결에도 packet을 전달한다. 일반 Redis adapter는 connection-state recovery를 지원하지 않는다. Redis가 끊기면 해당 인스턴스에 연결된 클라이언트에게만 보낸다. [Redis adapter](https://socket.io/docs/v4/redis-adapter/)
- 여러 socket 인스턴스에서 HTTP long-polling을 유지하면 sticky session이 필요하다. WebSocket만 허용하면 이 요구는 없지만 polling fallback을 잃는다. [Multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)
- Socket.IO 기본 전달은 at-most-once다. recovery는 항상 성공하지 않으며 `skipMiddlewares: true`는 단절 중 차단된 사용자의 검사를 건너뛸 수 있다. [Delivery](https://socket.io/docs/v4/delivery-guarantees/), [Recovery](https://socket.io/docs/v4/connection-state-recovery/)
- 권고: 좌표는 최신 값·짧은 TTL·sharing generation·seq를 사용하고 durable 업무 queue나 connection recovery로 과거 GPS를 재생하지 않는다. 재접속 때 새 인증·현재 권한으로 최신 snapshot만 전달한다. `volatile` 송신 여부와 과거 packet 보관 여부는 별도 검증한다.
- Redis adapter는 권한 검사·철회·위치 freshness를 해결하지 않는다. room membership이나 과거 허용 캐시만으로 좌표를 broadcast하지 않는다. Pub/Sub은 끊긴 수신자의 메시지를 복원하지 않으므로 철회 사실의 유일한 저장소로 쓸 수 없다. [Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/)
- 기존 [실시간 정합성 조사](realtime-consistency.md)의 단일 프로세스 mutex 보장은 서버 분리 후 성립하지 않는다. main에서 차단을 저장하는 순간과 socket에서 좌표를 송신하는 순간 사이에 경쟁이 생긴다.
- 강한 철회 보장이 필요하면 **한 논리적 공개 coordinator에서 권한 변경과 송신 등록을 순서화**하거나, 철회 적용 확인·미확인 노드의 송신 차단을 포함한 분산 프로토콜을 설계해야 한다. 단순 비동기 `permission.revoked` 알림이나 매번 원격 조회만으로 경쟁이 사라지지 않는다.
- 최초에는 socket 인스턴스 하나로 시작하되 위치 공개 coordinator의 소유권과 main의 친구/파티 변경 적용 순서를 먼저 합의한다. 다중 인스턴스·네트워크 단절 중 철회는 별도 검증 전까지 보장했다고 표현하지 않는다. 이미 수신한 좌표의 회수도 보장할 수 없다.

## 선택 가능한 작은 구성 두 가지

### A. RabbitMQ로 서비스 메시지 통합 + Redis는 일시적 실시간 상태

- main: 인증·회원·행사·친구·파티·퀘스트의 원본 및 outbox. socket: 연결·구독·위치 공유 세션·최신 위치. worker: 외부 데이터 수집·AI 작업·자기 실행 기록.
- 명령/결과/event는 RabbitMQ, 최신 위치·presence는 Redis. socket replica가 늘면 Redis adapter를 추가한다. 위치 공개 정책 원본의 최종 소유권은 위 경쟁 해결과 함께 정한다.
- worker는 main의 행사 테이블을 직접 갱신하지 않고 인증된 내부 API/결과 이벤트로 전달한다. main이 검증·반영하고 자체 outbox를 만든다. worker의 원천 수집 기록과 main의 사용자 공개 행사 레코드는 소유권을 나눈다.
- PostgreSQL 한 인스턴스에서 시작해도 각 서비스의 DB 또는 schema·DB role·migration을 분리할 수 있다. 다른 서비스 테이블의 직접 조회·쓰기와 교차 FK는 하지 않는 방향을 제안한다. 서버 분리는 별도 물리 머신 구매를 뜻하지 않는다.
- 장점: 작업 분배와 서비스별 event 수신이 명확하다. 비용: PostgreSQL·RabbitMQ·Redis 운영과 장애 조합이 늘고 일정/지연 작업·retry 운영을 설계해야 한다. **MSA 학습·명확한 이벤트 경계를 우선하면 A가 더 설명하기 쉽다.**

### B. Redis + BullMQ 중심, 중요한 상태는 PostgreSQL

- 독립 main/socket/worker 경계는 동일하다. BullMQ가 AI·수집 등 비동기 작업을 맡고 Socket.IO adapter는 Redis Pub/Sub을 사용한다. Nest는 BullMQ 통합을 제공한다. [Nest queues](https://docs.nestjs.com/techniques/queues)
- BullMQ `QueueEvents`는 Redis Streams로 작업 진행·완료 이벤트를 전달하지만 기본 자동 trim이 있으므로 영구 업무 이벤트 원장으로 삼지 않는다. 업무 event를 여러 서비스가 각각 처리하려면 별도 queue/Streams 소비 설계가 여전히 필요하다. [BullMQ events](https://docs.bullmq.io/guide/events/)
- Redis를 queue 저장소로 사용하면 persistence·`noeviction` 등 운영 정책을 맞춰야 한다. 일시적 캐시처럼 임의 삭제하면 안 된다. outbox와 idempotent job은 이 구성에서도 필요하다. [Production](https://docs.bullmq.io/guide/going-to-production), [Idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
- 장점: 기술 종류가 하나 줄고 Nest 비동기 작업 기능과 잘 맞는다. 비용: 작업 queue와 도메인 이벤트 분배를 혼동하기 쉬우며 durable queue와 휘발성 위치 데이터의 보존 정책을 명확히 분리해야 한다.

## 합의 후 확인할 최소 실패 시험

행사 commit 직후 main 종료; confirm 직후 relay 종료; worker 결과 저장 직후 ACK 전 종료; 같은 event 중복 전달; socket 재접속 snapshot; 위치 송신과 차단/탈퇴 경합; Redis 단절 중 철회; main 구버전과 socket 신버전의 계약 호환. 이 조사에서는 실행하지 않았다.
