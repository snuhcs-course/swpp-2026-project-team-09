# 모바일 기술과 백그라운드 위치 제약 조사

Type: research
Labels: wayfinder:research
Status: ready-for-agent
State: resolved
Assignee: mobile_research
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: none

## Question

Android 우선 앱에서 React Native와 Expo development build가 지도, 사용자가 켜 둔 동안의 백그라운드 위치 갱신, 이미지 업로드, QR 기능을 지원하는가? Kakao 지도 SDK와 React Native 바인딩의 공식 지원 범위, Expo Go 제약, Android 권한·foreground service·종료 상태별 제한, 푸시와 소켓의 역할을 공식 문서로 확인한다. 기술 선정이나 갱신 정책을 대신 결정하지 않는다.

## Comments

## Answer

2026-09-26 조사 완료. React Native + TypeScript + Expo development build는 후보로 적합하며, Kakao 지도 연결 계층과 Android 백그라운드 위치의 실기기 검증이 필요하다. Expo Go만으로 이 조합을 검증할 수 없다. 화면에서 시작하는 location foreground service와 지속 알림 경로를 검토하되, Android OS의 권한 모델과 Expo API의 요구를 구분한다. 앱 강제 종료 이후 연속 갱신은 보장할 수 없다.

- 상세 근거와 검증 범위: [React Native·Android 위치 공유 실현 가능성 조사](../research/mobile-feasibility.md).
- 보존된 조사 맥락: research/mobile-feasibility, commit 0002e12f7d1d85150bcd901cf74ae84458551164, 파일 .scratch/architecture-planning/research/mobile-feasibility.md.
- 조사 종료는 모바일 기술 채택이나 위치 정책 확정을 의미하지 않는다. 구현·실기기 검증은 수행하지 않았다.
