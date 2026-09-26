# 첫 프로토타입 계정·개발 환경 준비

> 2026-09-27 현재 준비 목록은 [전체 MVP 완료 기준과 준비 목록](../../mvp-completion/spec.md)을 따른다. 아래는 논의 이력이며 Google 지도 제안·이전 패키지 이름·미구현 당시 환경 상태는 최신 설정이 아니다. 현재 지도는 Naver, Android 패키지는 `kr.ac.campus.prototype`이다.

Type: task
Labels: wayfinder:task
Status: ready-for-human
State: open
Assignee: unassigned
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: none

## Question

실제 데이터로 동작하는 Android 프로토타입을 검증하기 위한 계정·키·개발 환경을 준비한다. 사용자는 계정이 아직 없고 설정 안내가 필요하다고 답했다. 계정 소유자 설정과 결제 등록은 사용자가 진행하며, 코드 연결과 개발 환경 점검은 구현 단계에서 진행한다. 키가 없는 동안의 코드 작성까지 막는 의존성은 아니다.

## 현재 경계

- 2026-09-27 착수 가능 여부 재확인: 합의한 앱·서버의 기본 구조 개발은 계정 준비와 병행할 수 있다. 앱 생성에 영향을 주는 미확정 기본값(Expo development build, PostgreSQL/PostGIS, BullMQ 및 캐시/큐 Redis 분리)을 묶어 사용자에게 제시했다. 이 질문의 답변 전에는 선정·설치 완료로 기록하지 않는다.
- 2026-09-27 최신 사용자 방향: 나머지는 구현하며 수정하고, 착수 전에 꼭 논의할 부분만 추린다. 아래 상세 미확정 항목 전체를 구현 시작의 일괄 선행 조건으로 삼지 않는다. 현재 요청은 남은 결정 안내이며 앱 스캐폴딩/배포 명령은 아니다.
- 첫 실행 목표: 2026-09-28, 구체적인 시각은 미정. 모든 외부 연동 완료를 보장한 일정이 아니다.
- Android 총 두 대 중 현재 한 대 사용 가능. 초기 동기화는 실기기+에뮬레이터의 독립 Google 학교 계정 두 개로 검증할 수 있다. 에뮬레이터의 위치 입력은 실제 이동 검증을 대신하지 않는다.
- Google 로그인+학교 도메인 확인, 지도·실제 위치·독립 NestJS socket 서버, 행사·친구 약속·생활 편의 세 흐름을 목표로 한다. 외부 샘플은 사용하지 않는다.
- SNUTT·행샤 운영 서비스에는 연결하지 않는다. 시간표는 실제 사용자 입력/이미지, 행사는 공식 원천에서 확보한다. 전체 강좌 검색 데이터는 별도 접근 검증 대상이다.
- 관정은 외부 앱용 좌석·예약 API 미확보로 후속 MVP에 보류한다. 공식 페이지 이동 대체는 채택하지 않았다.
- 셔틀은 새 정류장 노선도 서비스에서 정상 TLS와 공개 조회 경로를 확인했다. 실제 운행 중 비어 있지 않은 응답·정류장 대응·이용 조건은 미검증이다. [추가 조사](../research/shuttle-app-stop-info.md)

## 사용자 설정 순서

### 착수 전 최소 논의 — 2026-09-27 정리

- 첫 구현 기본값 제안: React Native + Expo development build의 로컬 Android 빌드, PostgreSQL + PostGIS(로컬 한 인스턴스, 서비스별 DB·계정·migration), BullMQ와 캐시/큐용 별도 Redis 컨테이너, 합의된 독립 서비스의 로컬 Compose 실행이다. 큰 기술 선택을 함께 논의하라는 사용자 원칙에 따라 한 번에 확인 중이다. 지도·AI 제공자 설정과 계정 준비는 병행하고 미확정 부분을 샘플 데이터나 로그인 우회로 완료 처리하지 않는다.
- 첫 구현 완료 기준 제안: 독립 프로젝트 설치/빌드와 Compose 기동, main-public/main-admin 경로 분리, DB migration, socket 연결과 worker 작업 처리까지 통합 확인한다. 다음으로 팀원 어드민에서 실제 생성한 행사 수정이 캐시 갱신·socket 알림을 거쳐 앱에 반영되는 흐름을 연결하고, 학교 로그인·지도·백그라운드 위치와 두 계정 검증을 붙인다. 이는 전체 세 흐름 중 구현 순서이며 MVP 범위 축소가 아니다.
- 사용자 정책: 초기 어드민은 **팀원 전용**, 파티 위치 공유는 기본 ON이며 친구/파티별 OFF 시 해당 관계의 양방향 열람을 중단한다. 파티 OFF여도 별도 친구 상호 ON은 유지한다. 반대 조합 등 남은 위치 경계는 [위치 정책](06-location-policy.md)에 둔다. 셔틀은 사용자 제보에 따라 서울대 앱의 정류장 기준 실제 운행 정보를 추가 조사하며 보류에 동의한 것으로 처리하지 않는다.
- 첫 검증 순서·완료 정의: 행사/친구 약속/생활 편의 세 흐름이라는 범위와 실데이터 원칙을 유지한다. 첫 APK 실행과 모든 기능 완료를 구분하고, 기존 9월 28일 목표는 아직 완료 보장이 아니다. 지도/두 계정 동기화부터 순차 검증하는 것이 추천이며 이를 전체 MVP 축소로 해석하지 않는다.
- 큰 기술 기본값: React Native의 Expo development build 적용, PostgreSQL/PostGIS와 서비스 소유권, 비동기 큐/업무 이벤트 전달 도구 등은 앱 생성 전에 짧게 기본안을 정한다. 이미 정한 Nest/Next/root 프로젝트별 manifest/modules/main-public·admin 분리를 다시 처음부터 논의하지 않는다. 사용자의 익숙한 도구가 있으면 반영하고 세부 라이브러리/버전은 호환 검증으로 고른다.
- 실제 연동 전 준비: Google OAuth·지도·AI 제공자/계정 소유·키·비용 상한. 실제 외부 호출은 키 준비 뒤 확인한다. 비밀 키는 채팅에 받지 않는다. 모델 정확한 이름·embedding 차원은 비용/한국어 검증으로 조정할 수 있다.
- 외부 실기기 접속 전 준비: 로컬 Wi-Fi 테스트 또는 외부 HTTPS/WSS 환경과 월 예산. 로컬 Compose로 코드/흐름 검증을 먼저 진행할 수 있고 원격 배포 선택을 모든 코드 작성의 선행 조건으로 삼지 않는다.
- 구현 중 결정할 항목: TTL·갱신 주기 세부 값, 매칭 가중치/K·reranker·HNSW, controller/service 상세 폴더, 관측 지표의 수치 목표, 화면 스타일의 세부 연출. 원본 데이터 소유권·위치 공개 정책 같은 큰 변경은 계속 사용자와 논의한다.

### 1. Google Cloud — 로그인

1. [Google Cloud Console](https://console.cloud.google.com/)에서 개발용 프로젝트 하나를 만든다. 표시 이름은 중립적인 `Team 09 Prototype` 같은 임시 관리명으로 충분하며 제품 이름을 확정하는 단계가 아니다.
2. Google Auth Platform의 Branding/동의 화면에서 지원 이메일·연락처를 설정한다. 학교 조직 내부 앱 관리 권한을 전제로 하지 않으므로 일반 개발 프로젝트의 Audience는 External로 준비하고, Testing 화면에서 요구하면 테스트 학교 계정을 등록한다. 요청 범위는 기본 `openid email profile`로 시작한다.
3. OAuth client를 Web application 유형으로 만든다. 그 client ID를 Android가 요청하는 ID token의 서버 audience로 사용한다. 네이티브 ID token 방식에 불필요한 웹 redirect URI를 임의로 만들지 않는다.
4. Android 유형 client도 만든다. 패키지 ID와 **실제로 설치할 APK의 서명 인증서 SHA-1**이 필요하므로 빌드 설정이 정해진 뒤 등록한다. 식별자 후보는 `com.team09.campusprototype`이며 아직 생성·채택하지 않았다. 이후 서명이 바뀌면 등록도 맞춘다.
5. NestJS는 ID token 서명·issuer·audience·만료·email_verified·정확한 `snu.ac.kr` 도메인을 검증한다. 사용자 식별자는 `sub`, 학교 관리 계정 여부는 `hd`로 확인한다. 실제 학교 계정의 claim과 기관 제한을 확인하기 전 로그인 성공을 보장하지 않는다. 학교 계정 확인을 재학 인증이나 도서관 위임 권한으로 표현하지 않는다.

근거: [Android 설정 공식 실습](https://codelabs.developers.google.com/sign-in-with-google-android), [서버 ID token 검증](https://developers.google.com/identity/sign-in/android/backend-auth), [Expo Google 인증과 development build](https://docs.expo.dev/guides/google-authentication/).

### 2. 지도 — 초기 제안은 Google Maps

같은 Google Cloud 프로젝트에서 결제를 연결하고 Maps SDK for Android를 활성화한다. API key를 만들고 Android 패키지+실제 서명 SHA-1, 허용 API는 Maps SDK for Android로 제한한다. 이 값은 네이티브 앱 설정에 포함되므로 서버 비밀 키와 취급이 다르며 앱/API 제한이 중요하다. 빌드에 반영한 뒤 다시 APK를 만든다.

React Native 지도 바인딩 후보는 `react-native-maps`다. 교내 건물·보행로 품질은 실기기에서 확인한다. 지도 SDK를 활성화해도 보행 이동시간 API까지 확보되는 것은 아니다. 지도 제공자는 제안이며 사용자가 이미 선택한 것으로 기록하지 않는다.

근거: [Expo 지도 설정](https://docs.expo.dev/versions/latest/sdk/map-view/), [Maps 키](https://developers.google.com/maps/documentation/android-sdk/get-api-key), [결제 요구사항](https://developers.google.com/maps/documentation/android-sdk/usage-and-billing).

### 3. AI — 초기 제안은 OpenAI API

[API 플랫폼](https://platform.openai.com/)에서 프로젝트·API 결제/크레딧을 준비하고 프로젝트 키를 만든다. 서버 환경의 `OPENAI_API_KEY`로만 저장한다. 모델은 아직 확정하지 않았으며 이미지 추출·구조화 출력·도구 호출에 맞춰 선택하고 소량 실제 호출로 검증한다. 키를 React Native 번들이나 `EXPO_PUBLIC_*` 변수에 넣지 않는다. [공식 시작 안내](https://developers.openai.com/api/docs/quickstart)

### 4. 도보 시간 — 초기 후보는 Kakao Map REST

[Kakao Developers](https://developers.kakao.com/)에서 앱을 등록하고 REST API 키를 준비한다. 공식 문서에 `GET https://dapi.kakao.com/v2/routing/walk`와 거리·예상 시간 응답이 있다. 서버가 호출하고 교내 출발지·목적지 몇 쌍으로 실제 응답과 경로 품질을 확인한다. 지도와 다른 제공자 결과를 함께 표시할 때의 이용 조건도 구현 전에 확인한다. 키 발급만으로 교내 경로의 정확성을 검증한 것은 아니다. [도보 경로 문서](https://developers.kakao.com/docs/en/kakaomap/rest-api)

### 키 보관

저장소의 `.env.prototype.example`은 **설정 목록만 제공하는 템플릿이며 앱에 연결되어 있지 않다**. 복사본 `.env.prototype.local`에 값을 넣는다. `.env*`는 Git에서 제외하고 비어 있는 example만 추적한다. 키를 채팅에 보낼 필요가 없다. Android 패키지·SHA-1과 OAuth client ID는 비밀 키와 구분한다.

## 개발 환경과 서버 준비

2026-09-27 로컬 확인: Node 22.23.1, pnpm 10.28.0, Android SDK와 에뮬레이터 AVD 존재. Docker CLI는 있지만 daemon에 연결되지 않았다. 기본 JDK는 26이며 JDK 17은 목록에 없었다. 선택할 Expo/RN/Gradle 버전에 맞춰 JDK를 정하고 Docker를 실행하거나 다른 로컬 PostgreSQL 실행 경로를 준비해야 한다. Android 실제 빌드는 아직 하지 않았다.

첫 실내 테스트는 Mac에서 main-public·main-admin(같은 main 코드)·socket·worker·admin-frontend를 컨테이너로 실행하고 각자 소유 저장소와 브로커를 연결하는 안으로 준비할 수 있다. 휴대전화가 접근할 서버 주소·TLS 경로와 실제 Wi-Fi 연결을 검증한다. 캠퍼스 이동/LTE 테스트에는 외부에서 닿는 HTTPS/WSS 호스트가 필요하며 배포 계정·비용은 아직 정하지 않았다. 객체 저장소와 앱 종료 상태의 푸시가 필요한 범위는 구현 계획에서 함께 준비한다. FCM 사용 시 같은 Google 프로젝트에 Firebase Android 설정을 추가할 수 있지만 아직 등록하지 않았다.

## 완료 증거

- 실제 학교 Google 로그인으로 서버 세션 생성; 잘못된 audience·다른 도메인 거부.
- 지도 표시와 실기기 위치, 위치 공유 ON/OFF·화면 잠금 동작 확인.
- 두 독립 계정 사이의 파티/약속 변경과 최신 위치 동기화. 저장 후 알림, 재연결 시 현재 상태 조회.
- 공식 원천 행사·해당 날짜 식단 표시. 관측시각·휴무·누락·수신 실패 구분.
- AI 실제 호출과 시간표/포스터 추출 결과 검토; 도보 API 실제 교내 구간 확인.
- 셔틀은 정상 TLS 조회 경로를 확보했으나 운행 중 응답을 받아 정류장 노선도의 실제 차량 상태가 갱신되는지 확인하기 전까지 미완료로 남김. GPS 제공을 완료 조건으로 임의 강제하지 않음. 관정은 보류 표시.

## Comments

- 2026-09-27: 계정 생성·키 발급·클라우드 결제·SDK 설치·앱 코드 구현은 수행하지 않았다. 위 절차를 제공하고 기존 설계의 샘플/picker/행샤 API/관정 대체 흐름 권고를 최신 사용자 결정에 맞춰 수정했다.
- 2026-09-27 추가 지시: 프로젝트 구조 등 큰 결정은 사용자와 먼저 논의한다. 계정 설정과 독립적인 준비는 진행할 수 있지만 워크스페이스·앱 scaffold는 [저장소·폴더 구조 논의](13-project-organization.md)의 합의 이후 진행한다. 어드민도 검토 대상으로 추가되었으며 첫 기능 범위는 미확정이다.

- 2026-09-27: 사용자가 초기 main·socket·worker 독립 서비스 구성을 선택했다. [상세 저장소 논의](13-project-organization.md)의 폴더·브로커·DB 상세는 아직 제안이며, 통합 실행 및 서비스 간 실패 시험 준비가 추가로 필요하다. 기존 단일 API+Gateway 준비안을 대체한다.

- 2026-09-27 최신 구조: 별도 admin-backend/admin-frontend와 서비스별 package.json·lockfile, root 편의 manifest 없는 Docker Compose 기동으로 준비안을 수정한다. 실제 구성 파일과 애플리케이션은 아직 생성하지 않았다.

- 2026-09-27 최신 steering: 별도 admin-backend 프로젝트 대신 main-server 코드/DB를 공유하는 일반·관리 pool을 실행한다. root 편의 manifest 제외와 Compose 기동은 유지한다. 프로파일별 경로/권한·공유 DB 부하·중복 outbox 작업을 검증해야 한다.
