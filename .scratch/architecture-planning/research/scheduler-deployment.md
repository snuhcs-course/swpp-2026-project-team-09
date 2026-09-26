# 행사 변경 처리·예약 작업과 Kubernetes 대안 조사

확인일: 2026-09-27. 공식 문서만 확인했다. 아래 권고는 설계 제안이며, `schedule-server`, BullMQ, Redis, 배포 사업자 선택은 사용자에게 확정받지 않았다. 현재 합의는 main 코드·데이터 소유권 유지, public/admin 실행 그룹 분리, 독립 socket/worker와 Next.js admin frontend다. Kubernetes는 필수가 아니다.

사용자 후속 설명: 여기서 말한 `schedule-server`의 목적은 **행사 변경에 따른 캐시 갱신·실시간 알림뿐**이다. 따라서 별도 시간 스케줄러를 추가할 필요는 없다는 것이 현재 권고다. main이 소유하는 outbox/캐시 동기화 처리, 공유 캐시 후보 Redis, socket 전달 경로로 설계한다. 아래 시간 기반 작업 조사는 향후 요구를 구분하기 위한 참고이며 사용자 요구로 추가하지 않는다.

## 먼저 구분할 책임

| 발생 원인 | 필요한 책임 | 초기 배치 제안 |
| --- | --- | --- |
| 어드민이 공식 행사의 장소·시간·발행 여부를 변경 | 변경 이벤트 전달, 캐시 무효화/재생성, socket 알림 | main 소유 변경 저장/outbox·캐시 동기화 처리 + socket |
| 예약 발행·시작·종료 시각 도달 | 예약 작업 등록·실행·재시도 | worker 안의 scheduling 모듈 + 영속적인 작업 큐 |
| 식단·행사 공지 주기적 수집 | 반복 작업 등록·실행 | worker |

이는 프로젝트에 대한 설계 판단이다. 변경 직후 갱신은 시간표에 따라 실행하는 cron과 다르므로, 캐시가 필요하다는 사실만으로 별도 scheduler 서비스가 필요해지지는 않는다. 행사 데이터 자체를 소유하는 서비스를 뜻한다면 그것은 timer 담당 scheduler가 아니라 별도의 업무 서비스 분리 결정이다.

## 시간 기반 작업의 구현 후보

- Nest의 `@Cron`은 프로세스마다 실행된다. main-public/admin 또는 worker 복제본에 같은 cron을 등록하면 중복 실행된다. `waitForCompletion`만으로 여러 프로세스를 조정할 수는 없다. 공유 저장소를 통한 lease/lock 또는 큐의 공통 scheduler 등록이 필요하다. [Nest Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- BullMQ Job Scheduler는 반복 작업을 생성한다. 동일 scheduler ID의 `upsertJobScheduler`로 등록 중복을 피하고 설정을 갱신할 수 있다. 이전 작업이 처리되기 시작해야 다음 작업을 생성하므로, 큐 혼잡 시 실제 빈도는 설정보다 낮을 수 있다. 반복 수집에 맞는 후보이며 행사별 일회성 시각에는 delayed job을 쓴다. [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers/)
- Delayed job은 지정한 시간이 지난 뒤 처리 가능해진다. worker 부하 때문에 정확한 시각 실행을 보장하지 않는다. `changeDelay`는 아직 delayed 상태인 작업에만 적용된다. 따라서 이미 실행 중인 작업과 일정 수정이 경합할 수 있다. [BullMQ Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed)

프로젝트 적용 제안:

1. main이 행사 변경과 revision을 DB에 저장하고, 예약 작업 갱신 의도를 신뢰성 있게 전달한다. DB 저장과 큐 등록 사이 장애는 outbox 재전송으로 복구한다.
2. 작업에 `eventId`, `expectedRevision`, `action`, `dueAt`을 넣는다. 실행 시 최신 일정·취소 상태를 검증해 수정 전 작업은 무시한다. 실제 도메인 상태 변경은 main이 소유한 내부 명령과 트랜잭션을 거친다.
3. 작업 ID만 믿지 않고 도메인 변경과 알림 기록에 멱등 키를 둔다. 재시도되어도 중복 보상·중복 알림이 생기지 않아야 한다. BullMQ도 재시도를 전제로 멱등 작업을 권장한다. [BullMQ Idempotent Jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
4. DB에 예약 의도를 남기고 재시작 후 누락된 작업을 재등록하는 복구 절차를 둔다. 시작/종료 표시는 가능하면 `startsAt`, `endsAt`과 현재 시각으로 계산하고, 마감 등 권한 판단은 서버가 현재 시각을 검사한다. 큐가 늦었다고 종료된 행사 참여를 허용하지 않는다.
5. AI 추출 등 긴 작업과 시간 민감 작업은 큐·동시성 또는 worker 실행 그룹을 구분한다. 시간 민감성이 커지면 동일 worker 이미지의 별도 실행 그룹으로 먼저 격리할 수 있다. 여러 업무 서비스의 예약 정책·복구·운영을 독립 관리할 필요가 생기면 `schedule-server`의 이점이 커진다.

BullMQ를 Redis 백엔드로 채택한다면 영속성과 `noeviction` 설정이 필요하다. 버려도 되는 캐시와 유실되면 안 되는 작업 큐는 보존 정책이 다르므로, eviction을 사용하는 캐시와 큐 저장소는 분리하는 방향을 권한다. DB 번호·키 접두어만 나누어도 서버의 eviction 정책이 분리되는 것은 아니다. 큐 제품 자체는 미결정이며 이 조사로 기존 메시지 브로커 후보를 교체하지 않는다. [BullMQ Production Guide](https://docs.bullmq.io/guide/going-to-production)

## Kubernetes 없이 배포하는 선택지

| 선택 | 이 프로젝트에 적용 | 부담과 제한 |
| --- | --- | --- |
| 단일 VM + Docker Compose | public main, admin main, socket, worker, admin frontend를 독립 컨테이너로 실행 | 구조가 로컬과 유사하다. OS·패치·TLS·백업·로그 운영은 직접 맡고, VM 장애는 전체 서비스에 영향을 준다. 컨테이너 분리가 물리 서버 분리는 아니다. |
| 관리형 PaaS: Render 예시 | public/admin main을 별도 Web Service, socket을 Web Service, worker를 Background Worker, Next.js를 Web Service로 배치 | 서버 OS 관리 부담을 줄일 수 있다. 여러 상시 실행 서비스와 데이터 저장소의 합산 비용, 지원 리전, 영속성 및 네트워크 조건을 선택 전에 확인해야 한다. |

Docker는 Compose를 단일 서버에서 production에 사용하는 방법을 공식 지원하며 환경별 설정·재시작 정책을 안내한다. 따라서 작은 수업 시연의 첫 원격 배포에 충분히 고려할 수 있다. 초기 비용이 무조건 더 저렴하다는 뜻은 아니다. [Docker Compose in Production](https://docs.docker.com/compose/how-tos/production/)

Render Web Service는 Docker 배포를 지원한다. 같은 main 이미지를 서로 다른 환경 설정으로 두 서비스에 실행하는 것은 현재 합의와 맞는 적용안이다. Render Background Worker는 계속 실행되며 큐에서 작업을 가져오고 외부 요청을 직접 받지 않는 유형이다. [Render Web Services](https://render.com/docs/web-services), [Render Background Workers](https://render.com/docs/background-workers)

Render는 WebSocket에 고정 연결 시간 제한을 두지 않지만 인스턴스 교체·배포 시 연결이 닫힌다. 클라이언트 재연결과 최신 데이터 재동기화는 여전히 필요하다. socket 서버를 짧게 실행되고 종료되는 cron 유형으로 배치하지 않는다. [Render WebSockets](https://render.com/docs/websocket)

Render Cron Job은 UTC 기준 주기 작업이고 종료되는 명령에 적합하다. 같은 cron의 동시 실행을 제한하지만 이는 사용자별 동적 예약 전체의 업무 멱등성을 해결하지 않는다. 고정 수집이나 정합성 점검에는 후보지만, 행사별 임의 시각마다 클라우드 cron 리소스를 만드는 설계는 권하지 않는다. [Render Cron Jobs](https://render.com/docs/cronjobs)

무료 조건을 상시 운영 보장으로 해석해서는 안 된다. 무료 Web Service는 유휴 상태에서 내려가며, 무료 Key Value는 재시작 시 데이터가 사라진다. 예약 작업 보존이 필요한 큐에 무료 비영속 Key Value를 기본안으로 제안하지 않는다. [Render Free Instances](https://render.com/docs/free)

## 제안

현재 요청에는 **별도 `schedule-server` 추가를 권하지 않는다.** main이 소유하는 변경 기록/outbox와 캐시 동기화 처리, 공유 캐시, socket 변경 알림으로 해결할 수 있다. 독립 실행이 필요하면 그 처리 역할을 별도 실행 그룹으로 뺄 수 있으나 서비스·폴더 추가 합의와는 구분한다. 나중에 시간 기반 요구가 확인되면 worker의 scheduling 모듈과 영속 큐가 후보가 된다.

배포는 **첫 시연·구조 단순성 우선이면 Compose + 단일 VM**, **서버 운영 시간 절약 우선이면 Render 같은 관리형 PaaS**가 후보이다. 예산이 정해지기 전 총비용 우열은 확정할 수 없다. 어느 쪽이든 현재의 public/admin 실행 그룹, socket/worker 분리와 서비스별 `package.json`은 유지되며 Kubernetes나 루트 workspace를 요구하지 않는다.
