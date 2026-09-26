# React Native·Android 위치 공유 실현 가능성 조사

조사일: 2026-09-26. 공식 제품 문서와 라이브러리 작성자의 저장소를 확인했다. 구현·실기기 테스트는 수행하지 않았다. 아래 권고는 기술 판단이며 채택 결정이 아니다.

사용자 확인 전제: 핵심 MVP 범위와 아키텍처를 정한다. 위치 공유를 켠 동안에는 앱 화면이 보이지 않아도 위치 갱신이 필요하다. 최초 배포는 수업 시연·소규모 테스트이며 예산은 미정이다.

후속 확인: 행사 참여·친구 약속·생활 편의 세 흐름 모두 MVP 필수이며 첫 시연은 Android APK 직접 설치로 진행한다.

## 결론

**React Native + TypeScript + Expo development build는 적합한 후보**다. React Native 공식 문서도 신규 앱에 Expo 같은 프레임워크 사용을 권장한다. 다만 지도 바인딩과 Android 위치 서비스의 실기기 검증이 채택 전제다. [React Native 시작 안내](https://reactnative.dev/docs/environment-setup)

**Expo Go만 사용하는 개발 방식은 맞지 않는다.** Expo Go에 포함되지 않은 네이티브 라이브러리는 development build에 넣어야 한다. Expo는 config plugin, 네이티브 모듈, 로컬 빌드를 지원하므로 필요한 Kotlin 코드를 추가하는 경로도 있다. EAS 이용은 필수가 아니다. [Expo 네이티브 코드 추가](https://docs.expo.dev/workflow/customizing/), [React Native의 Expo 설명](https://reactnative.dev/docs/environment-setup)

## 확인된 사실과 남은 검증

| 영역 | 확인된 사실 | 아직 확정할 수 없는 부분 |
| --- | --- | --- |
| 카카오 지도 | 카카오 공식 SDK 목록은 Web·Android·iOS다. RN 연동은 별도 연결 계층이 필요하다. [카카오 지도 개념](https://developers.kakao.com/docs/en/kakaomap/common) | 특정 커뮤니티 바인딩의 최신 RN·Expo·카카오 SDK 조합 호환성, 마커 갱신 성능 |
| 커뮤니티 지도 바인딩 | `jiggag/react-native-kakao-maps` 작성자 저장소는 네이티브 지도 뷰·마커·플랫폼 설정을 제공한다. [작성자 저장소](https://github.com/jiggag/react-native-kakao-maps) | 이 조합을 현재 프로젝트의 채택안으로 검증하지 않았다. RN 신구 아키텍처, 라이프사이클, config plugin 검증 필요 |
| 라이브러리 이름의 함정 | `mym0404/react-native-kakao`는 Expo 지원을 표방하지만 현재 README의 모듈 표에 Map은 없다. [작성자 저장소](https://github.com/mym0404/react-native-kakao) | 카카오 로그인·공유 모듈 지원을 지도 지원의 증거로 간주할 수 없음 |
| 화면이 꺼진 위치 공유 | Android는 실행 중인 location foreground service의 위치 접근을 foreground location으로 취급한다. 홈 이동·화면 꺼짐에도 접근할 수 있다. [Android 위치 권한](https://developer.android.com/develop/sensors-and-location/location/permissions) | 모든 기종·절전 조건에서 일정 간격 전송을 보장하지는 않음 |
| 일반 background 위치 수집 | Android 일반 백그라운드 위치는 시간당 몇 회로 제한될 수 있다. foreground service는 더 빈번한 갱신 경로지만 배터리 비용이 있다. [Android background 위치 제한](https://developer.android.com/about/versions/oreo/background-location-limits) | 필요한 위치 신선도·정확도·배터리 예산 |
| 앱 종료 | Expo는 사용자 종료 시 background 위치가 중단되며 Android에서는 위치·지오펜스 이벤트가 종료 앱을 자동 재시작하지 않는다고 설명한다. 최근 앱 목록에서 제거하는 동작도 제조사에 따라 다르다. [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/) | 강제 종료 후에도 계속 공유하는 경험은 보장 불가. 재시작 UX와 오래된 위치 처리 필요 |
| QR·이미지 | Expo Camera는 QR 스캔, ImagePicker는 사진 촬영·갤러리 선택을 제공한다. [Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) | QR 보상 중복 방지, OCR 정확도, 업로드 크기·재시도는 별도 애플리케이션 설계 |

## 권고하는 위치 공유 흐름

설계 제안: 사용자가 **앱 화면에서 공유 ON → 권한 확인 → location foreground service 시작 → 지속 알림 → 화면이 꺼져도 위치 갱신 → 공유 OFF·만료 시 서비스 종료** 순서로 만든다. Android는 백그라운드에서 foreground service를 새로 시작하는 데 제한이 있고, 위치의 while-in-use 권한에는 추가 제약이 있다. 화면이 보일 때 시작하는 경로가 단순하다. [Android 서비스 시작 제한](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), [location 서비스 타입](https://developer.android.com/develop/background-work/services/fgs/service-types)

권한은 구현 계층을 구분해야 한다. Android OS는 화면에서 시작한 foreground service 경로와 `ACCESS_BACKGROUND_LOCATION`을 쓰는 경로를 구분한다. 반면 Expo Location 문서는 background 위치 추적에 foreground·background 권한을 모두 요청하도록 안내한다. **“화면이 안 보인다”만으로 항상 background 권한이 필수라고 단정하거나, Expo에서 foreground 권한만으로 된다고 단정하지 않는다.** 선택한 API 경로의 권한 요구를 PoC에서 확인한다. [Android 위치 권한](https://developer.android.com/develop/sensors-and-location/location/permissions), [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)

background 권한 경로를 사용한다면 Android 11 이상에서는 설정 화면에서 ‘항상 허용’을 켜야 한다. 설명 후 이동하고 거절 상태를 처리한다. 대략적 위치만 허용하면 background에서도 대략적 위치만 얻는다. [Android background 권한 요청](https://developer.android.com/develop/sensors-and-location/location/permissions/background)

설계 추론: 교외·비공개 구역 숨김을 **OS 지오펜스 이벤트 하나에만 의존하면 안 된다.** 이벤트가 늦거나 위치 자체가 부정확할 수 있기 때문이다. 전송 직전의 위치와 정확도·시간을 검사하고, 서버에서도 공유 권한·세션 만료·허용 영역을 확인하는 편이 안전하다. 경계 근처 불확실한 위치와 오래된 위치는 숨기는 정책을 검토한다. 서버 자체 수집 금지인지 친구에게만 비공개인지에 따라 원본 좌표 처리 위치는 달라진다. [Android 위치 제한](https://developer.android.com/about/versions/oreo/background-location-limits), [Android 위치 정확도·권한](https://developer.android.com/develop/sensors-and-location/location/permissions/background)

## WebSocket·푸시 역할

설계 권고: 지도·채팅 화면이 활성 상태일 때 WebSocket으로 새 상태를 전달하고, background 초대·메시지 알림에는 FCM 또는 Expo Push를 사용한다. Android는 Doze에서 네트워크를 제한하며 백그라운드 수신용 지속 연결 대신 FCM 사용을 권장한다. 따라서 **소켓 연결 유지만으로 background 수신·위치 전송을 보장할 수 없다.** 서버를 따로 분리해도 단말의 이 제약은 해결되지 않는다. [Android Doze·App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)

무음 푸시로 앱을 주기적으로 깨워 위치를 수집하는 방식도 보장되지 않는다. Expo는 headless background notification의 앱 전달을 OS가 보장하지 않는다고 명시한다. 앱 복귀·재연결 시 서버에서 최신 상태를 다시 가져오도록 설계한다. [Expo 알림 동작](https://docs.expo.dev/push-notifications/what-you-need-to-know/)

Expo 알림 라이브러리는 FCM·APNs 네이티브 토큰을 제공하며, Android 원격 푸시는 development build에서 시험해야 한다. [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)

설계 추론: 위치 업로드는 앱의 위치 태스크에서 인증된 짧은 HTTP 요청으로 보내는 후보가 단순하다. 소켓은 주로 조회 중인 사용자에게 변경을 배포하는 역할로 둔다. 마지막 관측 시간·수신 시간·공유 만료 시간을 서버가 구분해야 한다. 네트워크 복구 뒤 오래된 좌표를 최신 좌표처럼 공개하지 않도록 한다.

## 다음 결정에 필요한 최소 실험

아래는 구현 완료 항목이 아니라, 지도·위치 기술 채택을 위해 후속 프로토타입에서 확인할 범위다.

1. Android 실기기 development build에서 카카오 지도 표시, 사용자 마커 반복 갱신, 화면 이동·복귀를 검증한다. 커뮤니티 바인딩 실패 시 직접 네이티브 연결과 다른 지도 선택의 비용을 비교한다.
2. 공유 시작·화면 잠금·홈 이동·절전·네트워크 단절·권한 철회·공유 종료·앱 강제 종료를 시험하고 수집 간격, 서버 도착 지연, 배터리를 측정한다.
3. 교외·비공개 구역·경계 오차·오래된 좌표가 상대방에게 표시되지 않는지 검증한다. 숨김·만료 기준은 먼저 사람이 결정한다.

채팅 UI·이미지 선택·QR 스캔만으로 React Native가 부적합하다는 근거는 없다. AI 도구 실행과 QR 보상 확정은 서버에서 권한·중복 실행을 검증하도록 설계하는 것이 합리적이라는 판단이며, 특정 AI 공급자·SDK 채택은 이번 조사 범위 밖이다.
