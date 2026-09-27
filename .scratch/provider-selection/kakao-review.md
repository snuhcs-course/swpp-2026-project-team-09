# Kakao 지도·도보 전환 검토

Status: needs-info
검토일: 2026-09-27. 범위: 공식 문서, 배포 패키지 소스, 현재 앱 코드 읽기. **Kakao 키가 없어 인증 호출·지도 렌더링·교내 경로 품질은 검증하지 않았다. 앱 전환이나 유료 사용을 구현·승인한 문서가 아니다.**

## 판단

**Kakao 도보 API는 현재 공개 문서에 존재한다. 그러나 현재 React Native 앱을 기능 손실 없이 바로 교체할 유지보수된 Kakao 래퍼는 이번 조사에서 확인하지 못했다.** 따라서 당장 Naver를 제거하기보다, 사용자 승인 후 Kakao REST 키로 교내 도보 경로를 먼저 검증하고, 전체 전환을 원하면 별도 네이티브 지도 검증을 거치는 것을 권한다. SDK 기능 부족보다는 React Native 연결층의 미완성이 더 큰 위험이다. 정확한 작업 일수나 성능 개선을 추정하지 않는다.

## 공식 API·요금·접근 조건

- 공식 [도보 경로 조회](https://developers.kakao.com/docs/ko/kakaomap/rest-api#walk-directions)는 `GET https://dapi.kakao.com/v2/routing/walk`, `Authorization: KakaoAK {REST_API_KEY}`를 명시한다. 출발·도착 좌표, 최대 5개 경유지를 받으며 거리(m), 시간(s), 단계별 안내와 경로 좌표, Kakao 길찾기 링크를 반환한다. 도로 미발견·경로 없음 등의 상태를 별도로 처리해야 한다. 문서에 추가 요구 사항이 없다는 표시는 **우리 앱 키의 실제 접근 성공을 의미하지 않는다**.
- [이용 설정/정책](https://developers.kakao.com/docs/ko/kakaomap/common): 앱의 Kakao Maps 사용 설정을 ON으로 하고 플랫폼 키를 설정한다. 2026-07-21부터 개발자 계정에서 **처음 활성화한 앱만 무료 쿼터**를 받는다. 두 번째 이후 앱 또는 무료 초과 사용은 비즈월렛과 유료 API 설정이 필요하다. 기존 Kakao 앱 보유 여부를 확인해야 한다.
- 검토 시점 [공식 쿼터·추가 요금](https://developers.kakao.com/docs/ko/getting-started/quota)은 도보 **일 1,000건**, Android/iOS 지도 **일 300,000건**, 전체 API **월 3,000,000건**을 표시한다. 추가 쿼터 단가는 도보 **10원/건**, 네이티브 지도 **0.1원/건**이다. 이는 문서상의 현행 수치이며 우리 계정 무료 적용·세금·실제 청구 총액을 검증한 견적이 아니다. 무료 자격 확인 없이 “무료 지도”라고 안내하면 안 된다. [유료 설정](https://developers.kakao.com/docs/ko/app-setting/paid-api)은 별도 결제 연결 절차이며 현재 승인되지 않았다.
- Naver의 공개 [Directions5](https://guide.ncloud-docs.com/docs/maps-direction5-api)는 자동차 경로다. 소비자 Naver Maps 앱의 도보 기능과 공개 API를 혼동하지 않는다. Kakao 네이티브 지도로 바꾸더라도 도보 계산은 별도 REST 연동이 필요하다.

## 네이티브 SDK와 React Native 연결층을 구분

| 필요한 기능 | Kakao 네이티브 SDK 근거 | 현재 앱 전환 시 확인할 점 |
| --- | --- | --- |
| 프로필 사진 마커·이름·탭 | Android [LabelStyle](https://apis.map.kakao.com/android_v2/reference/com/kakao/vectormap/label/LabelStyle.html)은 Bitmap 아이콘·텍스트를, iOS [PoiIconStyle](https://apis.map.kakao.com/ios_v2/references/Classes/PoiIconStyle.html)은 UIImage를 지원한다. [iOS Poi](https://apis.map.kakao.com/ios_v2/docs/map/04_label/02_poi/)는 클릭/위치/애니메이션을 제공한다. | 원격 이미지 다운로드, 원형 자르기, 실패 시 이니셜, 크기/앵커, 클릭 연결은 앱/브리지 구현 몫이다. 현재 React children 마커가 그대로 호환되는 것은 아니다. |
| 내 위치로 카메라 이동 | Android [KakaoMap.moveCamera](https://apis.map.kakao.com/android_v2/reference/com/kakao/vectormap/KakaoMap.html), iOS [animateCamera](https://apis.map.kakao.com/ios_v2/references/Classes/KakaoMap.html) | 카메라 좌표·줌·애니메이션 API 매핑과 초기화/재진입 검증 필요. |
| 경로 선·도형 | Android [RouteLine](https://apis.map.kakao.com/android_v2/docs/api-guide/routeline/), iOS [Route](https://apis.map.kakao.com/ios_v2/references/Classes/Route.html), Android [그래픽 계층](https://apis.map.kakao.com/android_v2/docs/getting-started/mapdraw/) | 선을 그리는 기능은 경로를 계산하는 기능이 아니다. REST 좌표를 변환하고 마커/선 표시 순서를 검증해야 한다. |

현재 로컬 `mobile/package.json`은 RN **0.81.5**, Expo **54**, React **19.1**이며 `app.config.ts`는 New Architecture를 사용한다. `CampusMap.tsx`에는 사람 사진/실패 대체 마커, 이벤트/자기 위치 마커, 탭 콜백, 위치 만료 제거, 재중심 애니메이션, 설정/초기화 실패 상태가 이미 있다. 전체 전환에는 이 동작들의 보존이 필요하다. Expo54와 RN0.81의 관계는 [Expo SDK54](https://expo.dev/sdk/54)에서도 확인된다.

**래퍼 조사 결과:**

- `@react-native-kakao/map`의 [현재 npm 메타데이터](https://registry.npmjs.org/@react-native-kakao%2Fmap)는 latest **2.2.7**, 배포일 **2025-03-19**이다. [배포 소스 tarball](https://registry.npmjs.org/@react-native-kakao/map/-/map-2.2.7.tgz)을 직접 읽었다. `src/component/KakaoMapView.tsx`에는 기본 지도/카메라 설정이 있지만 ref 인터페이스가 비어 있고, `src/index.ts`에는 마커·폴리라인 컴포넌트/API가 없다. Android 배포 소스는 모듈/패키지 중심으로, 현재 앱의 지도 뷰·오버레이 기능에 필요한 완성된 양 플랫폼 연결층을 확인하지 못했다.
- 해당 패키지는 Fabric만 허용하고 Expo Go 사용 불가를 명시한다. `package.json` 개발 기준 RN은 0.74.0이며 `@react-native-kakao/core` peer는 정확히 2.2.7이다. [core의 현재 메타데이터](https://registry.npmjs.org/@react-native-kakao%2Fcore)는 2.4.8이다. umbrella 저장소의 “Expo/New Architecture 지원” 문구나 `react-native: *`만으로 **map 패키지의 Expo54/RN0.81.5/양 플랫폼 기능 호환을 보장할 수 없다**. 설치/컴파일/실기기 검증은 수행하지 않았다.
- 대안으로 조사한 `@jiggag/react-native-kakao-maps`는 [배포 메타데이터](https://registry.npmjs.org/@jiggag%2Freact-native-kakao-maps)상 0.0.12, 2023-11-04 배포이며, [저자 저장소](https://github.com/jiggag/react-native-kakao-maps)의 이미지 마커 예제는 존재한다. 배포물은 구 DaumMap 프레임워크/JAR를 포함한다. 이 사실만으로 현재 Expo54/New Architecture용 유지보수된 대안이라고 추천할 근거는 없다.

- 추가 이름 검색: [react-native-kakao-maps](https://registry.npmjs.org/react-native-kakao-maps)는 0.1.2, 2020-09-11 배포이며 현재 README 예제는 `multiply(3, 7)` 형태여서 필요한 지도 기능/SDK v2 호환 증거가 되지 않는다. `react-native-kakao-map-view`, `react-native-kakao-mapview`의 정확한 이름은 npm 조회에서 404였다. npm 지도 키워드 검색과 공개 SDK v2/Fabric 저장소 검색도 수행했으나 추가로 추천할 호환성 증거를 얻지 못했다. 패키지명 변경이나 미배포 저장소까지 부재하다고 단정하지 않는다.

위 결론은 현재 배포 소스에 근거한다. 오래된 2024년 포럼의 “불가능” 주장으로 오늘의 네이티브 SDK 기능을 부정한 것이 아니며, 모든 비공개/새 래퍼가 존재하지 않는다는 주장도 아니다.

## 선택지와 미확인 항목

| 선택지 | 구현 범위에 대한 판단 | 위험/조건 |
| --- | --- | --- |
| Naver 표시 유지 + 별도 Kakao 도보 | 현 지도 동작을 유지하고 서버 REST 경로 연동, DTO/실패 상태, 경로 표시를 추가하므로 상대적으로 변경 범위가 작다. | 두 제공자 설정·쿼터 운영. Kakao 결과를 Naver 위에 표시하는 이용 조건을 별도 확인해야 한다. |
| Kakao로 전체 전환 | 동일한 REST 도보 작업에 더해 native 의존성/config plugin 교체, 지도 뷰·사진 마커·선·카메라·탭 이벤트 연결, Android/iOS lifecycle 검증이 필요하다. 현재 확인된 래퍼로 단순 패키지 교체는 어렵고 제한된 자체 브리지/래퍼 보완 가능성이 높다. | 표시·경로 제공자를 통일하지만 RN 브리지 유지보수와 기능 퇴행 위험이 커진다. 먼저 양 플랫폼 기능 증명을 거친 뒤 전환 여부를 정하는 것이 합리적이다. |

별도 대안으로 Kakao JavaScript 지도를 WebView에 표시할 수 있다. [공식 Web API](https://apis.map.kakao.com/web/documentation/)에는 MarkerImage/CustomOverlay/Polyline/panTo가 있어 사진 마커와 경로선을 표현할 수 있다. 다만 native SDK 전환과 다른 설계이며 JavaScript 키/등록 도메인, WebView↔앱 이벤트·위치 전달, 접근성·생명주기·사진 갱신/카메라 애니메이션을 검증해야 한다. 어느 쪽이 실제 더 부드러운지는 측정하지 않았다. 네이티브 UX 요구를 충족하는지 사용자와 정한 후 별도 검증할 선택지다.

이는 현재 코드와 공개 인터페이스를 비교한 **공학적 판단**이다. 전체 전환은 지도 공급자 통일이라는 이점이 있으나 실제 교내 보행 품질을 높인다는 증거는 아직 없다. 정문–중앙도서관, 언덕/계단 구간, 건물 출입구, 야간 통제 구간 등 대표 경로를 실제 동선과 비교해야 한다. 문서의 시간값은 개인 보행 속도나 접근성·안전 보장이 아니다.

**혼합 사용 조건:** 검토한 공식 [REST 문서](https://developers.kakao.com/docs/ko/kakaomap/rest-api#walk-directions), [이용 정책](https://developers.kakao.com/docs/ko/kakaomap/common), [운영 정책](https://developers.kakao.com/terms/ko/site-policies)만으로 Kakao 도보 geometry의 타사 지도 표시·보관·재가공을 명시적으로 허용/금지한다고 결론내리지 못했다. “혼합은 불법”도 “제약 없음”도 단정하지 않는다. 혼합안을 채택한다면 적용 약관/공식 담당자 답변으로 이 구체적 용도를 확인한다. 래퍼의 MIT 라이선스는 지도 데이터 이용 허가를 대신하지 않는다.

## 사용자가 승인할 경우 필요한 최소 준비

1. Kakao Developers 앱 한 개, Maps ON, 무료 쿼터 적용 배지 확인. 우선 유료 API/비즈월렛 연결 없이 허용된 범위에서 검증한다. 무료 적용 불가라면 과금 승인을 별도로 받아야 한다.
2. **서버용 REST API 키**를 비공개 환경 설정으로 제공하고, 키의 호출 허용 설정이 개발 서버와 맞는지 확인한다. 키 값은 저장소/모바일 번들에 넣지 않는다. 기존 Google 로그인은 변경하지 않는다.
3. 전체 네이티브 전환 검증까지 승인한다면 **네이티브 앱 키**, Android `kr.ac.campus.prototype`와 실제 개발/릴리스 인증서 키 해시, iOS 대상 bundle ID를 등록한다. [공식 플랫폼 설정](https://developers.kakao.com/docs/ko/app-setting/app#platform-android). 현재 Expo 설정에는 iOS bundle ID가 명시되지 않아 실제 빌드 대상을 정해야 한다. 네이티브 설정 변경 후 개발 빌드를 새로 만든다.
4. 승인 범위를 **도보 키/교내 경로 검증**과 **지도 브리지 기능 검증/전체 교체**로 명확히 나눈다. 지금은 어느 쪽도 이 연구 결과만으로 실행하지 않았다.
