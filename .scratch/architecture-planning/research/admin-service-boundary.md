# 독립 어드민 서비스와 로컬 Docker 구성 조사

## 최신 결정 — 2026-09-27 추가 사용자 지시

**관리 API를 `main-server` 코드에 통합하고 관리자 요청용 Pod를 별도로 실행한다.** 독립 `admin-backend` 서비스와 그 서비스가 공식 행사 원본을 소유한다는 아래 후보는 현재 설계에서 폐기되었다. Next.js `admin-frontend`, 독립 socket/worker, 루트 편의용 `package.json` 미사용은 유지한다. 아래 실행 프로필·이름은 구체화 제안이며 아직 구현하지 않았다.

- 하나의 main-server image digest를 `main-public`과 `main-admin` 두 Deployment의 Pod template에서 사용한다. 각각 replica·rollout·환경 설정을 따로 관리한다. Deployment의 label selector는 서로 겹치지 않게 `app=main-server, role=public/admin`으로 구분하는 안이다. [Kubernetes Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- 각 Service도 해당 role까지 selector에 포함하여 public 요청이 admin Pod로 분산되지 않게 한다. Ingress controller의 host/path 규칙으로 공개 API는 public Service, 관리 API는 admin Service에 연결한다. Ingress 리소스만 생성한다고 controller가 자동 제공되는 것은 아니다. 이는 공식 Service·Ingress 모델에 따른 구성 제안이다. [Kubernetes Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- 실행 설정 예시 `APP_ROLE=public`/`APP_ROLE=admin`은 **우리 애플리케이션이 해석할 사용자 정의 환경 변수**이며 NestJS·Kubernetes 내장 기능이 아니다. public은 일반 controller만, admin은 관리 controller만 등록하고 공통 업무 service·repository는 함께 사용한다. 잘못된 프로필은 시작 실패로 처리하는 안이다.
- 경로 분리·Ingress 제한만을 관리자 권한 검사로 삼지 않는다. 관리 controller에서도 인증·역할/행위별 권한 검사를 수행한다. 공통 인증 경로와 health endpoint의 프로필별 제공 범위는 구현 전에 정한다.
- 두 Deployment에 replicas를 각각 지정할 수 있고, 필요하면 각각을 대상으로 별도 HPA를 둔다. HPA는 metrics API가 필요하며 resource metrics는 통상 Metrics Server가 제공한다. CPU utilization 기준은 CPU requests에 의존한다. Pod를 분리했다는 이유만으로 자동 확장되는 것은 아니다. [Kubernetes HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- 자원 requests/limits·Pod 배치를 별도 지정하는 안이다. 프로세스의 CPU·메모리 사용을 구분할 수 있으나 동일 노드와 DB의 I/O·connection pool·행 잠금은 공유 병목이다. main-public/admin은 같은 업무 서비스의 실행 풀 두 개이므로 서비스별 private DB 원칙 위반으로 볼 별도 도메인 서비스가 아니다. DB 변경은 공통 migration으로 관리하고 Pod마다 경쟁 실행하지 않는다.
- 따라서 공식 행사 작성과 모바일 조회 사이에 **별도 admin→main 복제 event/projection이 필요하지 않다.** 같은 업무 모듈·DB가 원본을 처리한다. main→socket/worker 비동기 전달에 필요한 outbox·이벤트와 별개다. 관리자 전용 Pod를 추가한다고 불필요한 도메인 event를 만들지 않는다.
- 로컬에서는 같은 main Dockerfile/image를 쓰는 Compose service 두 개에 서로 다른 `environment`와 포트를 지정한다. 동일 image를 한 번 빌드해서 두 서비스가 쓰는 구성으로, root npm workspace는 필요 없다. Docker Compose의 `profiles:` 기능과 위 `APP_ROLE` 값은 다른 개념이다. [Compose services](https://docs.docker.com/reference/compose-file/services/)

## 이전 조사 — 독립 admin-backend 후보의 이력

확인일: 2026-09-27. 사용자 결정: Next.js `admin-frontend`, 독립 `admin-backend`, 기존 main/socket/worker 서버 분리; 로컬 Docker로 실행하고 편의용 루트 `package.json`은 사용하지 않는다. **아래 데이터 소유권과 세부 폴더는 추가 논의용 후보이며 미확정이다.** 제품 코드·설치·부하 시험은 수행하지 않았다.

## 분리로 얻는 것과 얻지 못하는 것

- 독립 admin-backend는 관리자 요청의 인증·입력 검증·조회·업무 처리 자원을 별도 프로세스로 배치할 수 있다. 그러나 모든 명령을 main에 그대로 전달하는 proxy라면 main의 해당 업무 CPU·DB 부하는 그대로 남는다. 이 항목은 실행 경로에 따른 설계 판단이다.
- 서비스 분리는 서로 다른 업무를 다른 프로세스에 배치하는 것이고, 로드 밸런싱은 요청을 복수 backend로 분산하는 기능이다. 필요하면 각 서비스 내부에서 replica와 load balancer를 별도로 사용한다. [Microsoft load balancing](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/load-balancing-overview)
- 컨테이너는 기본적으로 호스트 자원에 제한 없이 접근할 수 있으므로 별도 컨테이너만으로 CPU·메모리 격리가 완성되지 않는다. CPU·메모리 한도와 운영 배치를 설계해야 한다. [Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- 같은 물리 DB 서버를 쓰면서 서비스별 private DB/schema를 두는 것은 가능하다. 다만 같은 테이블을 여러 서비스가 읽고 쓰면 schema와 변경 일정이 결합된다. 같은 호스트·DB 인스턴스의 CPU·메모리·I/O·장애는 여전히 공유한다. [Microsoft data considerations](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/data-considerations)
- 따라서 별도 관리자 UI API만으로 도메인 MSA나 완전한 부하 격리가 달성되었다고 표현하지 않는다. 독립 배포 경계와 데이터 소유권을 함께 정해야 한다.

## 데이터 소유권 후보

| 서비스 | 쓰기 원본으로 소유할 후보 | 다른 서비스와 연결 |
|---|---|---|
| admin-backend | 운영자가 관리하는 공식 행사 초안·발행·수정·취소, 수집 행사 승인/반영 정책, 관리자 감사 기록 | 행사 발행 상태 변경을 event로 전달 |
| main-server | 개인 일정·친구·파티·퀘스트·사용자 참여 상태; 모바일 조회용 발행 행사 projection | 공식 행사 원본 수정 없이 전달된 version을 자기 projection에 반영 |
| worker-server | 외부 수집·AI 작업의 실행 상태와 원천 수집 기록 | 공식 행사 수집 결과를 admin-backend에 전달; 소유자가 검증·발행 |
| socket-server | 연결·구독·실시간 전달, 합의될 위치 공개 책임 | main projection 반영 후 사용자 화면 갱신 알림 |

서비스의 데이터는 소유 서비스의 API/메시지 계약으로 접근하고 다른 서비스 테이블을 직접 수정하지 않는 원칙을 적용한 **제안**이다. Admin에서 사용자 초기화·제재를 수행할 경우에도 사용자 데이터 소유자는 main이므로 명시적인 관리 명령을 main에 보낸다. 어드민에 모든 업무 규칙을 복제하지 않는다. [AWS database per service](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/database-per-service.html)

```text
운영자 → admin-frontend → admin-backend
                            └─ 공식 행사 + outbox 저장
                                  ↓ 발행 event
외부 원천 → worker ──수집 결과──→ admin-backend
                                  ↓
                            main의 행사 projection 갱신
                                  ↓ 갱신 완료 event
                            socket → 모바일 지도 갱신
```

- 공식 행사 작성·수정 작업은 admin이 처리하고, 모바일의 빈번한 지도/행사 조회는 main의 로컬 projection으로 제공한다. 따라서 모바일 조회 때마다 admin을 호출하지 않는다. main의 event 반영 부하는 남지만 관리용 검증·초안·감사 처리 부하는 옮길 수 있다.
- 별도 읽기 모델은 독립 최적화에 유리하지만 반영 지연·중복·유실 처리가 생긴다. outbox·idempotent consumer·entity revision·재동기화가 필요하다. 어드민의 “원본 발행 완료”와 “앱 반영 완료”도 구분한다. [Microsoft CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- main projection 갱신 이전에 socket이 바로 발행 알림을 보내면 모바일 재조회가 구버전을 읽을 수 있다. 위 예시는 main 반영 후 알림을 보내며, 행사 취소·삭제도 revision이 있는 변경으로 처리한다. 이는 일관성 요구를 적용한 설계 판단이다.
- 대가: 단순 공유 DB CRUD보다 구현량과 동기화 운영이 늘어난다. 사용자 선택 전 이 소유권을 확정하거나 코드를 생성하지 않는다.

## 루트 Node workspace 없이 실행하는 후보

- 각 Node 앱/서버가 자기 `package.json`, lockfile, 설정, 테스트와 Dockerfile을 가진다. Next.js admin-frontend도 독립 이미지다. 루트는 `compose.yaml`, 문서, 계약 파일만 둘 수 있다. pnpm을 앱별로 사용해도 루트 workspace가 필수인 것은 아니다. 이 구성은 사용자 요청을 반영한 제안이다.
- `contracts/`에는 버전이 있는 OpenAPI·JSON Schema 등의 언어 중립 계약을 보관하고, 각 서비스가 고정된 계약 버전에서 client/type을 생성하거나 생성 결과를 포함한다. 비공개 `workspace:*` 의존성이나 다른 앱의 `src` 직접 import를 숨겨 넣지 않는다. 이벤트 schema 공개는 서비스간 결합을 줄이는 권고다. [Microsoft data considerations](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/data-considerations)
- Dockerfile은 각 이미지를 **어떻게 빌드할지** 정의한다. Docker Compose는 여러 container의 이미지·실행 설정·network·volume·환경 등을 묶어 **어떻게 함께 실행할지** 정의한다. 루트 npm script 없이 `docker compose up --build`로 실행할 수 있다. [Dockerfile](https://docs.docker.com/build/concepts/dockerfile/), [Compose model](https://docs.docker.com/compose/intro/compose-application-model/)
- `depends_on`만으로는 DB 준비 완료를 기다리지 않는다. healthcheck와 `condition: service_healthy`, 필요하면 일회성 migration의 `service_completed_successfully`를 사용한다. 실행 중 연결 단절은 앱 자체 retry·timeout으로 처리해야 한다. [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- RN 앱은 Android 기기/에뮬레이터에서 실행한다. Compose 대상은 서버·어드민·DB·broker 등 로컬 서비스이며, RN native 실행을 컨테이너 서비스로 자동 대체하지 않는다.

논의할 결정은 **공식 행사 원본을 admin-backend에 둘지**, **main에 발행 projection을 둘지**, **개발 DB의 물리 인스턴스와 논리 DB 분리 수준**이다. 별도 어드민과 Docker 실행 자체는 이미 사용자 요구로 주어졌다.
