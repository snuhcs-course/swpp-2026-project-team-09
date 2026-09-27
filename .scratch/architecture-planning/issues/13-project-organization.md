# 저장소·폴더 구조와 공유 코드 경계 결정

Type: grilling
Labels: wayfinder:grilling
Status: needs-info
State: open
Assignee: Codex
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: none

## 현재 사용자 결정

- main-server·socket-server·worker-server는 독립 애플리케이션이다. 최신 답변에 따라 **관리 API는 main-server 코드에 통합하고 어드민 전용 파드를 별도로 실행**한다. 직전의 별도 admin-backend 프로젝트 제안은 대체한다.
- 루트 admin-frontend는 Next.js다. 서버도 루트에 직접 배치하고 기능은 src/modules, 기술 연결은 src/infrastructure로 묶는다.
- 각 실행 프로젝트는 자기 package.json을 가진다. 루트 편의 package.json은 두지 않고 로컬 통합 실행은 Docker Compose로 구성한다. root workspace·root lockfile에 의존하지 않는 독립 설치/빌드 안이다.
- main의 일반 API와 관리 API는 공통 업무 로직·소유 DB를 사용하되 별도 실행 그룹으로 부하를 분리한다. 운영 호스트/클러스터·브로커·DB 배치·상세 권한은 아직 미확정이다.
- 최신 보완: Kubernetes는 필수가 아니다. '파드'는 독립 실행 그룹을 설명한 표현이며 Compose 컨테이너·관리형 플랫폼 서비스로도 구현할 수 있다. schedule-server는 검토 요청 단계다. [캐시·예약 작업·배포 논의](08-server-topology.md)

## 저장소 구조 — 아직 생성하지 않은 설계

```text
/
├── mobile/
│   ├── src/
│   ├── package.json
│   └── pnpm-lock.yaml
├── admin-frontend/              Next.js
│   ├── src/app/
│   ├── src/components/
│   ├── src/lib/                 main의 관리용 API pool 호출
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── next.config.ts
│   ├── Dockerfile
│   └── .env.example
├── main-server/                 일반 API·관리 API를 하나의 코드베이스로
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   ├── public-api/      일반 API controller 구성 제안
│   │   │   ├── admin-api/       관리 API controller 구성 제안
│   │   │   ├── auth/
│   │   │   ├── events/          두 실행 그룹이 재사용하는 업무 규칙
│   │   │   ├── parties/
│   │   │   └── quests/
│   │   ├── infrastructure/      main 소유 DB·브로커·스토리지
│   │   └── config/
│   ├── migrations/              같은 DB를 위한 migration 하나
│   ├── test/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── Dockerfile               같은 이미지를 두 pool에 배포
│   └── .env.example
├── socket-server/
│   ├── src/modules/
│   ├── src/infrastructure/
│   ├── test/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── worker-server/
│   ├── src/modules/
│   ├── src/infrastructure/
│   ├── migrations/
│   ├── test/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── contracts/                   버전 있는 API·메시지 schema 후보
├── infra/
│   ├── postgres/
│   ├── broker/
│   └── proxy/
├── tests/                       컨테이너 간 계약·전체 흐름 검증
├── docs/
├── .scratch/
├── .github/workflows/
└── docker-compose.yml           파일명은 아래 최신 사용자 결정 반영
```

패키지 매니저는 현재 pnpm 후보이며 lockfile은 해당 프로젝트 안에 둔다. root package.json·pnpm-workspace.yaml·root lockfile과 admin-backend 디렉터리는 만들지 않는다. 실제 파일이 아직 없으므로 삭제한 제품 파일도 없다. public-api/admin-api 내부 폴더와 배포 파일명은 검토 가능한 제안이며 스캐폴딩하지 않았다.

## 같은 코드, 별도 실행 그룹

추가 서비스 후보: 사용자의 match-server 제안은 [파티 매칭 방식과 match-server 책임](15-party-matching.md)에서 검토한다. 채택 시 `match-server/`를 루트에 두고 자체 manifest·lockfile·Dockerfile·src/modules와 소유 저장소를 둔다. 위 확정 경계 목록에 아직 합의된 서비스처럼 넣거나 실제 폴더를 만들지는 않았다.

main-server 소스와 빌드 이미지는 하나다. 운영에서도 같은 이미지를 **main-public**과 **main-admin** 실행 그룹으로 나누고 일반 요청은 public, 관리 요청은 admin으로 라우팅한다. Compose에서는 별도 서비스/컨테이너와 reverse proxy, 관리형 플랫폼에서는 별도 앱 서비스로 구현할 수 있다. Kubernetes를 선택한 경우에만 각각 Deployment·Service를 사용한다. 그룹별 인스턴스 수·CPU/메모리 제한·DB connection pool 상한을 구성하되 실제 지원 범위는 배포 도구에 따라 다르다. 한 VM에서는 호스트 자원과 장애를 공유한다. Kubernetes HPA는 필수 구성이 아니며 선택 시 metrics 제공 구성이 필요하다.

앱 설정 후보 `APP_ROLE=public|admin`은 우리가 정의할 값이며 Nest/Kubernetes 내장 기능이 아니다. bootstrap이 해당 controller 모듈만 등록하도록 구성하는 안이다. public-api/admin-api는 공통 events/auth 등 업무 provider를 사용하되 라우트·정책은 구분한다. 공통 업무 모듈을 import하면서 불필요한 controller까지 함께 공개되지 않도록 provider와 진입 controller 구성을 분리한다. 정확한 파일 설계는 구현 전 정한다.

관리 API를 reverse proxy/ingress에서만 숨기지 않고 서버에서 관리자 신원·권한을 검사한다. public pool은 관리 라우트를 등록하지 않는 안이다. Next.js는 관리자 화면·웹 렌더링을 맡고 API는 main-admin 실행 그룹으로 보낸다. 관리 API가 main-public에 프록시되어야 하는 구조가 아니다.

## 데이터와 배치 작업

두 main pool은 같은 업무 서비스의 실행 인스턴스로 같은 소유 DB·schema·migration·규칙을 사용한다. 따라서 관리 원본과 학생용 별도 공식 행사 projection 사이의 복제 프로토콜은 현재안에서 필요하지 않다. 행사 변경/outbox는 같은 DB transaction으로 저장하고 기존 main→broker→socket 전달을 사용한다. 공유 DB·캐시의 부하와 장애는 여전히 공유하며 파드 분리만으로 DB 성능 격리를 주장하지 않는다.

migration은 배포별 파드 시작마다 무조건 실행하지 않고 별도 단일 작업으로 관리하는 안이다. 여러 main 인스턴스의 outbox relay는 claim/lease·잠금과 소비자 멱등 처리로 중복 실행을 다룬다. 동일 주기 작업이 모든 파드에서 실행되지 않도록 반복 수집·무거운 보고서 계산은 worker에 두고 작업별 concurrency/queue를 검토한다.

## Docker 기반 로컬 실행

Dockerfile은 이미지 빌드, 루트 `docker-compose.yml`은 로컬 서비스·환경 변수·네트워크·volume·기동 의존성을 정의한다. 현재 Compose는 main-public과 main-admin을 같은 main-server 이미지/Dockerfile과 다른 role 설정으로 실행하며 socket, worker, match, admin-frontend, PostgreSQL과 캐시/큐 Redis를 연결한다.

Compose 구성과 기존 Docker Desktop 실행 검증은 완료되었다. 저장소 루트에서 `docker compose --env-file .env.prototype.local up --build -d`로 기본 파일 탐색을 사용한다. 이번 파일명 변경은 구성 내용을 그대로 보존하며 컨테이너 재시작이나 Colima 실행 검증을 수행하지 않는다. health/readiness와 DB·브로커 재연결을 검증하며, 컨테이너를 시작했다는 이유로 dependency 준비가 끝났다고 판단하지 않는다. Android SDK/에뮬레이터/실기기 작업은 호스트에서 별도로 수행할 수 있다.

## root workspace 없는 계약 공유

이전 packages/* 직접 workspace 의존 제안은 제외한다. contracts에 생산 서비스가 관리하는 버전 있는 OpenAPI/JSON Schema를 두고 각 소비 프로젝트가 자기 빌드에 생성한 client/type/validator를 포함하는 안을 제안한다. 생성기는 미확정이다. 런타임에 다른 서비스 소스 경로를 import하거나 root node_modules·workspace:*를 암묵적으로 요구하지 않는다. main의 두 pool은 한 프로젝트이므로 업무 코드가 중복되지 않는다.

## 검증과 남은 결정

공유 DB 상태로 일반/관리 pool을 동시에 띄워 행사 수정 충돌·권한·관리 라우트 분리·worker 중복 작업·outbox 재전달을 검증한다. 무거운 관리 요청 중 일반 API 지연과 DB 지표도 확인한다. socket의 위치 철회는 실제 송신자를 포함한 ACK/pending/재시도 계약을 유지하며 관리자 권한만으로 개인 위치를 열람하지 않는다.

미확정: 관리자 사용 대상·초기 도구 범위·웹 세션, 구체적인 root 계약 생성 방식, 운영 클러스터/호스트, DB·브로커 선택·규모, main 각 pool 자원·replica 값, 위치 철회 분산 구현. 현재는 문서만 수정했다.

## Comments

- 2026-09-27 추가 보완: 사용자가 Kubernetes를 필수 조건에서 제외했다. 위 구조의 k8s 폴더·Deployment/Service는 확정 파일 구성이 아니므로 플랫폼 중립적인 실행 그룹으로 수정했다. schedule-server와 운영 Compose/관리형 플랫폼 선택은 검토 중이며 제품 파일은 생성하지 않았다.


- 2026-09-27 이전: 단일 backend 패키지 안에 API·Gateway·worker 시작점을 두는 안을 제안했으나 사용자 답변으로 대체했다.
- 2026-09-27 최신 사용자 답변: “worker server, socket server, main server 다 독립적인 서버로 구분 ... microservice architecture를 따를거야.” 독립 서버 방향을 반영했다. 후속 질문에서 사용자가 “우선 main·socket·worker 3개 서비스”를 선택했다. 저장소·계약·브로커·DB 배치 전체를 승인받은 것으로 간주하지 않는다.
- 스캐폴딩·앱 생성·브로커 설치·배포는 하지 않았다. 상세 초안을 제시하고 사용자의 기존 staged 변경을 유지한다.

- 구현 근거는 [독립 서비스 구성 조사](../research/service-separation.md)에 둔다. 이 구조의 상세 제안 전체를 채택하거나 제품 코드를 생성한 것은 아니다.

- 2026-09-27 후속 질문: 각 서버 package.json과 독립 실행을 다시 명확히 했다. 사용자에게 modules 없이 src 바로 아래 기능 폴더를 배치하는 수정안을 제시했으며 답변 전에는 제안 상태다. 어드민 framework는 [어드민 범위 결정](14-admin-scope.md)에서 Next.js와 React+Vite를 비교한다.

- 2026-09-27 최신 답변: 사용자는 modules 묶음을 선택하고 어드민 Next.js를 확정했다. 루트 main-server/socket-server/worker-server 배치를 요청했다. apps/services 그룹 관례를 제거한 수정안과 root package.json의 선택적 관리 역할, Next 웹 런타임과 main 관리 API의 차이를 설명했다. root workspace 채택과 별도 admin BE 추가에 동의한 것으로 간주하지 않는다.

- 2026-09-27 최신 사용자 요청: 별도 admin-frontend/admin-backend와 관리 부하 분리를 명시하고 root 편의 package.json을 거절했다. 로컬 Docker Compose와 프로젝트별 manifest/lockfile 안으로 변경했다. 어드민 업무를 main에 유지했던 이전 제안은 현재안에서 철회한다. 공식 행사 데이터 소유권 분리는 질문 중이며 미확정이다.

- 2026-09-27 최신 사용자 답변: “그냥 main-server에 통합하되 어드민 전용 파드를 띄우는 식”. 별도 admin-backend와 공식 행사 데이터 소유권 분리 제안을 대체한다. main 코드/업무 DB는 공유하고 public/admin 실행 pool을 분리한다. root 편의 manifest 제외와 Next.js admin-frontend는 유지한다.

- 2026-09-27 최신 파일명 결정: 사용자가 루트 Compose 파일명을 `docker-compose.yml`로 명시적으로 선택했다. 기존 `compose.local.yaml`을 내용 변경 없이 이름만 바꾸고 README의 일반/Colima 명령에서 `-f`를 제거해 기본 탐색을 사용한다. 환경 파일 `.env.prototype.local`, 서비스·데이터 소유권과 런타임 구성은 유지한다. 위 초기 설계·이전 논의 기록은 당시의 맥락으로 보존한다.
