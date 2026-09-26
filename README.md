# 캠퍼스 프로토타입

서울대학교의 행사, 동행 파티, 친구 약속과 생활 정보를 연결하는 Android 프로토타입입니다. 제품 이름은 아직 정하지 않았습니다. 실제 학교 Google 계정과 실제 외부 데이터를 사용하며, 키가 없는 기능은 설정 필요 상태를 표시합니다.

## 구성

| 프로젝트 | 역할 | 로컬 포트 |
| --- | --- | --- |
| `mobile/` | React Native / Expo Android 앱 | Metro 8081 |
| `admin-frontend/` | Next.js 팀원용 행사 관리 | 3100 |
| `main-server/` | 계정·행사·친구·파티·퀘스트·위치 권한 | public 3000 / admin 3001 |
| `socket-server/` | 인증된 사용자에게 변경 알림 | 3002 |
| `worker-server/` | 실제 행사·학식·셔틀 수집 | 내부 3003 |
| `match-server/` | 동의한 요청의 후보 계산·매칭 | 3004 |

각 프로젝트에서 독립적으로 `pnpm install --frozen-lockfile`을 실행합니다. 루트 package.json이나 workspace는 없습니다. main-public과 main-admin은 같은 소스·이미지·DB를 사용하며 실행 자원과 HTTP 라우트를 분리합니다. PostgreSQL은 서비스별 DB·역할을 나누고, main/match는 각각 Prisma 7.10.0 schema와 migration을 소유합니다. Redis는 캐시와 BullMQ 큐를 별도 컨테이너로 실행합니다.

## 서버 실행

Node.js 22, pnpm 10, Docker 호환 엔진과 Compose가 필요합니다. macOS에서는 Colima 또는 Docker Desktop을 사용할 수 있습니다. `.env.prototype.example`을 **파일이 없는 경우에만** `.env.prototype.local`로 복사합니다. 다섯 로컬 비밀 값(`POSTGRES_PASSWORD`, `DB_MAIN_PASSWORD`, `DB_MATCH_PASSWORD`, `JWT_SECRET`, `INTERNAL_API_KEY`)은 각각 `openssl rand -hex 32`로 생성합니다. 실제 값은 커밋하거나 채팅에 붙이지 않습니다.

```sh
docker compose --env-file .env.prototype.local -f compose.local.yaml up --build -d
docker compose --env-file .env.prototype.local -f compose.local.yaml ps
```

새 DB에는 시작 시 Prisma migration을 적용합니다. Prisma 도입 이전 DB가 있다면 먼저 백업·스키마 비교 후 명시적으로 baseline을 등록해야 합니다. [main-server 절차](main-server/README.md), [match-server 절차](match-server/README.md)를 따르며 기존 데이터를 reset하지 않습니다. 현재 로컬 DB는 이 검증과 전환을 완료했습니다.

어드민은 <http://localhost:3100>, 메인 API 상태는 <http://localhost:3000/health>입니다. DB와 Redis 포트는 로컬 루프백에만 노출됩니다. 모바일 접속을 위해 public/socket/match 포트는 로컬 네트워크에서 접근할 수 있습니다. 이 Compose는 개발용이며 인터넷 공개 배포용 보안/TLS 설정은 포함하지 않습니다.

공식 PostGIS 컨테이너가 amd64 이미지이므로 Apple Silicon에서는 에뮬레이션을 사용합니다. DB 볼륨은 중지 후에도 남으며 비밀번호 변경만으로 기존 DB 계정이 갱신되지는 않습니다. `down -v`는 데이터를 지우므로 일반 재시작에 사용하지 않습니다.

## Colima로 실행하기

Colima도 같은 Compose 파일을 사용할 수 있습니다. macOS Apple Silicon에서는 공식 PostGIS amd64 이미지를 위해 Rosetta를 지원하는 VZ VM을 선택합니다. Docker Desktop과 Colima는 이미지·볼륨을 별도로 보관하므로 전환 시 DB가 자동으로 옮겨지지는 않습니다. 같은 포트를 쓰는 이 프로젝트를 두 엔진에서 동시에 실행하지 않습니다.

```sh
brew install colima docker docker-compose
colima start --vm-type=vz --vz-rosetta --cpu 4 --memory 8 --disk 40
docker --context colima compose --env-file .env.prototype.local -f compose.local.yaml up --build -d
```

`docker compose` 플러그인을 찾지 못하면 `brew info docker-compose`의 설치 안내를 확인합니다. 이미 Docker Desktop에서 이 프로젝트를 실행했다면 먼저 해당 엔진에서 이 프로젝트만 중지하고 전환합니다. Rosetta/VZ는 지원되는 macOS에서 사용합니다. 이 명령을 문서화한 것과 Colima에서 실제 검증을 완료한 것은 구분합니다.

[Colima 공식 안내](https://github.com/abiosoft/colima), [Docker Desktop 교육용 무료 사용 조건](https://docs.docker.com/subscription-billing/desktop-license/)

## 현재 검증 상태 (2026-09-27)

- public/admin API, Socket, Worker, Match, Next.js와 DB/Redis 등 Compose 컨테이너 9개가 정상 상태로 실행되었습니다. 최초 관리자 허용 목록은 로컬 설정에 `fyoon46@snu.ac.kr`로 지정했습니다.
- 서버·모바일 검사와 서버·어드민 빌드, 모바일 타입·번들 검사를 통과했습니다. 이번 모바일 개선에서는 main-server 18개 검사(임시 PostgreSQL/Redis 사용)와 HTTP/Socket 통합 검사를 확인했습니다. 세부 결과는 `.scratch/mobile-experience/`에 기록합니다.
- Android ARM64 테스트 APK를 에뮬레이터에 설치하고 cold launch를 확인했습니다. 시작 화면 렌더링을 확인했고 해당 프로세스에 AndroidRuntime/ReactNativeJS 오류는 없었습니다. 이 최초 cold launch 검사와 아래의 실제 Google 로그인 검증은 별개입니다.
- 실제 테스트 DB 연결 종료 후 public/admin API의 재연결을 확인했습니다.
- 행사 수정 → 캐시 무효화 → 소켓 알림 → 최신 조회, 위치 공유 권한, 두 매칭 요청 → 단일 파티 확정과 재시도 중복 방지를 확인했습니다.
- 실제 학식 조회와 공식 행사 1건 수집에 성공했습니다. 시간·장소가 불명확한 공지 4건은 제외했고, 당시 셔틀 응답에는 차량이 없었습니다.
- 저장된 셔틀 응답을 동시 조회한 20건에서 캐시 사용 20건·추가 원본 요청 0건을 관찰했습니다. 이는 캐시 재사용 확인이며 처리량 벤치마크가 아닙니다.
- 사용자의 학교 Google 계정 추가 후 에뮬레이터의 실제 모바일 로그인과 Naver 캠퍼스 지도 타일 표시를 확인했습니다. 이전 계정 미등록 상태의 `INTERNAL_ERROR`는 현재 인증 성공을 막지 않습니다. AI 실제 호출·두 기기 이동·실기기 백그라운드 위치 검증은 남아 있습니다. Colima 명령은 제공하지만 이번 실행 검증은 기존 Docker Desktop에서 했습니다.
- `610f4c2`에서 프로필·관심사 편집과 비공개 학기 시간표 직접 입력을 추가했습니다. 모바일18 테스트·타입 검사, 서버24 테스트 및 소유자 격리/저장 충돌을 포함한 통합 E2E가 통과했습니다. 시간표를 저장하는 기능과 일정·이동시간을 반영한 추천은 별도이며 후자는 아직 구현 중입니다.
- main/match의 일반 데이터 처리를 Prisma 7.10.0으로 전환했습니다. Main 27개 회귀 검사, Match 동시성·재시도 5개 검사와 별도 legacy baseline 검사, Prisma 기반 서비스간 E2E, 두 Docker 이미지의 비관리자 기동이 통과했습니다. 실제 DB 12개 업무 테이블의 컬럼·기본값·제약·인덱스를 baseline과 비교한 뒤 이력을 등록했으며, 전후 모든 업무 데이터가 동일함을 확인했습니다.
- 현재 APK에서 실제 계정으로 프로필 편집과 학기 시간표 화면 표시도 확인했습니다. 사용자의 실제 프로필·시간표에 테스트 데이터를 저장하지 않았습니다.
- 파티 인원/참여 상태 조회, 공동 퀘스트 수정 충돌 거부·취소 → 소켓 알림 → 구성원 최신 조회를 임시 DB에서 확인했습니다. 소켓 알림 병합의 단위 검사에서는 동시 100개 알림이 조회 1회로 합쳐졌습니다. 실제 서버 처리량 수치는 아닙니다.

서버 4개를 각 디렉터리에서 빌드하고 모바일 의존성을 설치한 뒤, Compose DB/Redis가 실행 중일 때 통합 검사를 재현할 수 있습니다.

```sh
node tests/prototype-e2e.mjs
```

이 검사는 로컬 설정을 읽고 임시 DB·빈 Redis 테스트 인덱스 14/15·13900~13904 포트를 사용합니다. 기존 데이터가 있는 테스트 인덱스는 거부하고 자신이 만든 리소스만 정리합니다. 테스트 계정은 실제 로그인 우회에 사용되지 않습니다.

현재 APK는 전체 MVP 완료가 아닙니다. 시간표 이미지 추출/OCR, AI 대화형 명령, 일정·이동시간을 고려한 추천, 개인 행사, 비공개 구역, 운영 부하 시험 등은 개발 목록에 남아 있습니다. 공동 퀘스트는 함께 합의한 활동 계획이며 단계별 완료/체크인을 임의로 추가하지 않습니다.

## Google·지도·AI 설정

1. Google Cloud 프로젝트에 Web OAuth client를 만들고 `GOOGLE_WEB_CLIENT_ID`에 넣습니다. 어드민 Web client의 허용 JavaScript origin은 `http://localhost:3100`입니다. 서버는 같은 audience의 ID token을 검증합니다.
2. 학교 계정의 `email_verified`, 정확한 `snu.ac.kr` 도메인과 `hd`를 검증합니다. 학교 Google 계정 확인은 재학 증명이나 학교 SSO 연동과 다릅니다.
3. 팀원 학교 이메일을 `ADMIN_EMAILS`에 쉼표로 구분해 넣습니다. 비어 있으면 누구에게도 관리자 권한을 주지 않습니다.
4. Android OAuth client는 앱 package와 실제 APK 서명 SHA-1을 등록합니다. 기존 Web client는 유지합니다. 모바일의 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`에는 같은 Web client ID를 넣으며, Android client는 네이티브 SDK가 package/서명으로 선택합니다.
5. 지도는 네이버 네이티브 SDK를 사용합니다. Naver Cloud Maps 애플리케이션에서 Dynamic Map 및 Android package `kr.ac.campus.prototype`을 등록하고 Client ID를 `mobile/.env.local`의 `NAVER_MAP_CLIENT_ID`에 넣습니다. Client Secret은 앱에 넣지 않습니다. 모바일 설정 변경 후 네이티브 앱을 다시 빌드합니다. Google Maps 설정은 필요 없습니다. 어드민 Web ID 변경 때만 Next.js 이미지도 다시 빌드합니다.
6. `OPENAI_API_KEY`가 있으면 매칭 임베딩 경로를 사용할 수 있습니다. 없으면 규칙 기반임을 표시합니다. 호출 비용이 발생할 수 있으며 임베딩을 동행 궁합 확률로 해석하지 않습니다.

학교 로그인과 지도 검증에는 사용자 소유의 OAuth/Maps 설정이 필요합니다. 사용자는 향후 인증이 개발을 막을 때 명시적으로 켠 개발 환경의 테스트 세션을 허용했습니다. 현재 전달 APK는 실제 Google 로그인을 사용하며 개발 세션을 학교 인증 성공의 증거로 보고하지 않습니다.

## Android 개발

`mobile/.env.local`이 없을 때만 예시 파일에서 생성합니다. 현재 로컬 테스트는 API·Socket·Match를 `http://127.0.0.1:3000`, `:3002`, `:3004`로 설정하고 USB 디버깅의 `adb reverse`로 Mac에 연결합니다. 에뮬레이터도 같은 방식을 쓸 수 있습니다. `PROTOTYPE_LOCAL_HTTP=true`일 때만 생성하는 Android 네트워크 설정은 루프백/에뮬레이터 주소에만 HTTP를 허용합니다. 일반 LAN 주소는 이 예외에 포함하지 않습니다. 외부 배포와 백그라운드 공유에는 HTTPS/WSS가 필요합니다.

```sh
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3002 tcp:3002
adb reverse tcp:3004 tcp:3004
```

기기가 여러 개면 각 명령에 `adb -s <기기 ID>`를 사용합니다. 연결을 해제하거나 재부팅한 뒤에는 다시 설정합니다.

```sh
cd mobile
pnpm install --frozen-lockfile
pnpm android
```

개발 빌드는 Metro 서버가 필요합니다. 별도 Metro 없이 실행되는 ARM64 테스트 APK도 아래 명령으로 빌드했습니다. JDK 21과 Android SDK 경로를 먼저 설정합니다.

```sh
pnpm exec expo prebuild --platform android --no-install
cd android
NODE_ENV=production ./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
```

결과는 `mobile/android/app/build/outputs/apk/release/app-release.apk`입니다. 이번 파일은 루트 `artifacts/prototype-arm64.apk`에도 저장했으며 Git에는 포함하지 않습니다. JavaScript 번들을 내장했고, Expo가 생성한 **개발용 서명**을 사용하므로 스토어 배포용 서명이 아닙니다. 빌드 시점의 `.env.local` 설정이 반영됩니다. 키가 빠진 기능은 설정 필요 상태로 표시하며, APK 생성 성공만으로 실제 로그인·지도·위치 검증이 완료된 것은 아닙니다.

- Android package: `kr.ac.campus.prototype`
- 이번 테스트 서명 SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- 다른 키로 서명하면 새 SHA-1을 Google OAuth에 등록합니다. 네이버 Maps는 등록된 Android package를 확인합니다. 위치 공유는 사용자 스위치와 OS 권한이 모두 필요하며 화면을 끈 실제 Android에서 별도로 확인해야 합니다.

## 데이터와 공개 범위

- 행사: 팀원이 직접 생성한 실제 행사와 날짜·장소가 확인되는 공식 학교 공지. 불완전한 원문은 임의 보충하지 않습니다.
- 학식: SNUCO의 요청 날짜 HTML. 공란·휴무·조회 실패를 구분합니다.
- 순환 셔틀: 학교에서 안내한 busin 노선 41946/41914. 좌표는 **정류장 노선도의 픽셀**이며 GPS가 아닙니다. 빈 차량 응답을 움직이는 샘플 차량으로 채우지 않습니다.
- 관정 좌석·예약은 초기 버전에서 보류합니다.
- 파티 공유는 기본 ON이지만 OS 권한이나 전체 공유를 자동으로 켜지는 않습니다. 파티 OFF여도 서로 공유 중인 친구와는 공유가 유지됩니다. 친구 OFF와 파티 ON 등 남은 충돌 조합은 보수적으로 차단합니다.
- 테스트용 사용자는 자동 검증에만 사용하며 실제 로그인·외부 데이터 성공으로 보고하지 않습니다.

설계와 endpoint는 [API 계약](docs/prototype-api.md), 이전 결정과 조사 근거는 [.scratch/architecture-planning](.scratch/architecture-planning)에서 확인할 수 있습니다. 재시도·이벤트 버전·권한 검사를 적용하더라도 성능 개선 수치는 실측 전까지 주장하지 않습니다.
