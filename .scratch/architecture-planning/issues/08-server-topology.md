# 서버 프로세스·작업 큐·배포 구성 결정

Type: grilling
Labels: wayfinder:grilling
Status: needs-info
State: open
Assignee: unassigned
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: 01, 03, 06, 07

## Question

수업 시연과 소규모 테스트에 필요한 API, 실시간 전달, worker의 실행 단위와 배포 구성을 정한다. 사용자가 main·socket·worker 독립 코드와 main의 일반/관리 실행 그룹 분리를 선택했다. Kubernetes는 필수가 아니다. 행사 변경의 공유 캐시 갱신·실시간 알림을 어떻게 연결하며 이를 위해 별도 schedule-server가 필요한가? durable queue·worker 경계, 재연결/재조회, 권한 철회, 작업 중복·재시도, 장애 복구, 월 예산 미정 상태의 선택 기준과 향후 분리 기준을 포함한다.

## 최신 사용자 의도와 제안 상태

- 사용자는 schedule-server의 의도를 **행사 변경에 따른 캐시 갱신·실시간 알림**으로 명확히 했다. 정해진 시각에 실행하는 예약 작업 서버를 요구한 것이 아니다.
- Kubernetes는 필수가 아니며 관리하기 쉬운 배포 대안 비교를 요청했다. 기존 public/admin 실행 그룹 분리는 유지한다.
- 아래는 검토할 설계다. 사용자는 이후 Redis를 필요에 따라 적극 활용하도록 요청했다. schedule-server·Redis의 구체적인 인스턴스/검색 구성·큐 제품·운영 플랫폼은 아직 확정하지 않았다. 제품 코드·컨테이너·클라우드 자원은 생성하지 않았다.

## 행사 변경·캐시·실시간 전달 제안

**권고: main 소유 변경 전파 처리 + 공유 Redis 캐시 + 기존 socket-server.** 캐시 갱신만을 위해 schedule-server 프로젝트를 추가할 필요는 없다. main의 행사 도메인이 원본·캐시 표현·갱신 규칙을 소유하고 socket은 구독자에게 변경을 알린다. 초기 DB 직접 조회도 유효하며 인덱스·실제 부하로 캐시 효과를 측정한다. 목표는 반복 조회의 비용을 줄이고 수정 내용을 수렴시키는 것이지 DB 조회를 없애는 것이 아니다.

```text
admin-frontend → main-admin
  → DB transaction: 행사 수정 + revision 증가 + outbox 기록
  → main 소유 변경 전파 처리기: 관련 공유 캐시 무효화/갱신
  → 전달 메시지 → socket-server → 권한 있는 앱에 변경 알림
  → 앱: 영향받은 조회만 다시 요청 → main-public → Redis hit / DB miss
```

- main-public과 main-admin은 같은 공유 행사 캐시를 사용한다. admin 프로세스 메모리만 수정하면 public 프로세스에는 반영되지 않는다. 공개 행사 상세와 날짜/범위별 목록을 대상으로 하며, 개인 행사·친구 시간표·개인화 순위 결과를 공용 캐시 키에 섞지 않는다. [Cache-aside](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- 원본과 outbox를 같은 DB transaction으로 저장한다. outbox에는 messageId, entityId, entityVersion, 변경 유형과 필요한 조회 무효화 범위를 기록한다. DB commit 뒤 프로세스가 종료되어도 처리할 변경이 남는다. 처리기는 main 코드/소유권에 두고 처음에는 기존 main 실행 그룹의 내부 역할로 실행하며 replica 간 claim/lease와 재시도를 적용한다. 처리량이 커지면 같은 이미지의 별도 relay 역할로 독립 실행하는 안을 검토한다. [Transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- 캐시 반영을 끝내기 전에 앱 재조회를 유도하면 이전 값을 다시 읽을 수 있다. 정상 경로는 DB commit → 관련 캐시 반영 → socket 알림 순서로 둔다. 단순한 DB/Redis 이중 쓰기를 원자적이라고 주장하지 않으며, outbox 지연 동안 짧은 구버전 노출이 가능한 eventual consistency 설계다. 허용 지연은 미정이다.
- 상세 캐시만 갱신해서는 부족하다. 생성·취소·삭제·날짜/장소 이동이 바꾸는 목록/지도 결과도 무효화한다. 작은 공개 행사 집합에서는 캠퍼스 단위 catalogRevision/세대 키를 먼저 고려한다. DB transaction에서 직렬화되는 단조 증가 catalog revision을 발급하고 Redis 세대는 낮은 revision으로 되돌리지 않는 안이다. 오래된 조회는 기존 세대 키에만 저장하여 무효화 뒤 새 세대 캐시를 덮지 못하게 한다. 오래된 상세 쓰기도 version 비교로 거절한다. 정확한 키 구성·원자 연산은 구현 전 확정한다.
- 알림에는 변경 ID·행사 revision·목록 catalogRevision만 최소 포함한다. 알려진 revision보다 낮은 응답을 앱에 적용하지 않고 서버가 해당 최소 revision을 만족하는 원본을 다시 읽도록 하는 계약을 제안한다. 삭제/취소와 목록에서 사라진 항목도 표현해야 한다. 일반 읽기는 공유 캐시를 사용하되 신청·정원·권한·보상 판정은 서버 원본 상태와 트랜잭션으로 검증한다.
- 소켓 알림은 재조회 힌트다. 연결이 끊겼거나 백그라운드였던 앱은 복귀/재연결 때 최신 snapshot을 조회한다. 동일 revision 알림을 합치고 관련 화면만 조회한다. 서버는 인기 목록을 미리 채우거나 동시 cache miss를 하나의 재구성 작업으로 합쳐 재조회 폭주를 줄인다. TTL은 복구 안전장치로 사용하고 보장된 최대 stale 시간으로 단정하지 않는다. [Socket.IO delivery](https://socket.io/docs/v4/delivery-guarantees/)
- Redis Pub/Sub만으로 중요한 변경 기록을 보존하지 않는다. outbox 처리와 필요한 서버 간 전달은 재시도·멱등 처리를 갖추고, 휘발성 소켓 알림 누락은 snapshot으로 복구한다. 브로커를 RabbitMQ/BullMQ/Streams 중 하나로 아직 확정한 것은 아니다. BullMQ를 선택하면 작업 queue의 영속성/noeviction 설정을 캐시의 eviction 정책과 혼동하지 않는다. [Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/), [BullMQ production](https://docs.bullmq.io/guide/going-to-production)
- AI·외부 수집 작업이 변경 알림을 지연시키지 않도록 지연 민감도가 다른 처리 경로/큐를 분리한다. worker는 수집 결과를 main에 반영하도록 요청하고 main이 같은 캐시·알림 경로를 사용한다. 독립 처리량·장애 격리·별도 읽기 모델 소유가 실제로 필요해지면 전파 처리기를 분리할 수 있다.

## 배포 대안 제안

- **첫 소규모 시연 권고: 단일 VM + Docker Compose + reverse proxy.** main-public/main-admin은 같은 이미지의 별도 컨테이너, socket/worker/admin-frontend는 별도 컨테이너다. DB·Redis·브로커 배치와 자원 크기는 미확정이다. Kubernetes는 필요 없다. 한 VM의 CPU·메모리·호스트 장애는 공유하며 자동 다중 호스트 복구를 제공하는 구조가 아니다. OS 패치·TLS·백업·관측은 직접 운영해야 한다.
- **서버 운영 부담 우선: Render 같은 관리형 컨테이너 플랫폼 후보.** 일반/관리/소켓을 별도 web service, worker를 background worker로 분리한다. VM 관리 부담은 줄지만 상시 실행 서비스·저장소별 비용과 제한을 확인해야 한다. 플랫폼 제공의 cron job은 행사 변경 후 즉시 전파하는 처리 경로를 대신하지 않는다. 무료 sleep·휘발성 저장소를 상시 소켓/예약 작업 보장으로 간주하지 않는다.
- 기존 학교/팀 Kubernetes 클러스터가 준비되어 있다면 이를 사용하는 대안도 유효하지만 현재 제공된 환경은 없다. Compose와 PaaS 중 최종 선택은 예산·운영 선호에 따라 사용자와 정한다. [배포·예약 작업 조사](../research/scheduler-deployment.md)

## 합의 후 검증할 실패 상황

DB commit 직후 프로세스 종료, 캐시 반영 전/후 종료, outbox 중복·역순 전달, 오래된 조회의 늦은 캐시 쓰기, 행사 위치/날짜 이동·취소, socket 단절 후 복귀, 여러 앱의 동시 재조회, Redis 장애 시 제한된 DB fallback, public/admin 공통 캐시와 관리자 권한 분리를 확인한다. 이번에는 실행하지 않았다.

## Comments

- 2026-09-27 매칭 추가 논의: 독립 match-server 제안과 요청 시 자동 가입 동의·후보 계산/main의 최종 파티 생성 경계는 [파티 매칭 방식과 match-server 책임 결정](15-party-matching.md)에 기록한다. 초기 세 서버 선택을 자동으로 덮어쓰거나 서비스 신설을 확정하지 않는다.
- 2026-09-27 현재 요청: schedule-server를 추가해 행사 변경의 캐시 갱신·실시간 알림을 처리하는 가능성을 검토하고 Kubernetes 대안을 추천해 달라고 했다. 후속 질문에서 '행사 변경에 따른 캐시 갱신·실시간 알림'으로 역할을 확정했다. 이는 서비스 신설에 대한 최종 동의가 아니므로 기존 main 내부 전파 처리와 별도 프로세스의 trade-off를 제시한다.
- 2026-09-27: 사용자가 MSA 및 main·socket·worker 세 개 독립 서비스를 선택했다. main 내부에 계정·행사·파티·퀘스트 모듈을 유지한다. 기존 같은 API 프로세스 안의 Gateway 추천을 대체한다. 브로커·데이터 소유권·독립 설정과 배포는 [상세 저장소 논의안](13-project-organization.md), 사실 근거는 [서비스 분리 조사](../research/service-separation.md)에 기록했다. 상세를 전부 합의하지 않았으므로 티켓을 닫지 않는다.

- 2026-09-27 최신 확장: 별도 admin-backend와 Next.js admin-frontend를 추가한다. root package.json 대신 로컬 Docker Compose를 사용한다. 역할별 pool 라우팅·replica 부하 분산과 물리 CPU/DB 격리는 구분하며, 실제 관리 업무 소유권은 [어드민 논의](14-admin-scope.md)에서 미확정이다.

- 2026-09-27 최신 답변: 관리 API를 main-server에 통합하고 같은 이미지로 public/admin Deployment·Service를 분리한다. 직전 별도 admin-backend 추가안을 대체한다. 로컬 Compose도 같은 main 이미지의 두 서비스로 대응한다. CPU/메모리·replica는 분리 가능하지만 DB 병목은 공유한다.
