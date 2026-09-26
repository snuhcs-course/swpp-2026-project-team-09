# 교내 순환 셔틀 연동 조사

**최신 조사(2026-09-27):** 이 문서는 구형 `shuttlebus.snu.ac.kr` 서비스의 관측 기록이다. 이후 학교 공식 공지에서 안내한 별도 서비스에서 정상 HTTPS와 정류장 노선도용 실시간 조회 경로를 찾았다. 현재 연동 후보와 제한은 [서울대 앱·정류장 운행 정보 추가 조사](shuttle-app-stop-info.md)를 우선한다. 구형 사이트의 인증서 만료를 모든 서울대 셔틀 경로의 상태로 일반화하지 않는다.

조사일: 2026-09-26. 공식 서울대학교 셔틀 서비스의 공개 HTML·연결된 JavaScript를 읽었다. 로그인, 노선 수정, 반복 수집, DWR RPC 실행은 하지 않았다. 현재 운행 중인 차량의 위치 응답은 검증하지 않았다.

## 결론

**공식 사이트에 실제 차량 좌표를 읽어 지도에 표시하는 경로는 존재한다.** 정문-순환도로의 노선 식별자와 정류장 좌표, 실시간 조회 메서드를 공개 화면 소스에서 확인했다. 다만 이것은 외부 개발자용으로 지원되는 Open API 계약이나 재배포 허가를 뜻하지 않는다. 기본 권고는 정보화본부에 이 경로의 사용 또는 별도 JSON feed 제공을 협의하고, 승인된 어댑터를 NestJS worker에 두는 것이다.

학교 셔틀은 서울시 시내버스와 구분해야 한다. 서울시 버스 API로 교내 순환 셔틀 차량까지 제공된다고 가정하지 않는다.

## 공식 소스에서 확인한 구조

| 확인 대상 | 관측한 사실 | 원문 |
| --- | --- | --- |
| 노선 목록 | 정문-순환도로가 bus_route_id=61로 연결됨. 사용자용 노선 목록은 로그인 없이 내려옴 | [노선 목록](https://shuttlebus.snu.ac.kr/mobile/route/routeList.action) |
| 노선 상세 | 운행표·정류장/버스 위치·지도 화면이 분리됨. 학기/방학/계절학기 선택 필드 존재 | [순환 노선 상세](https://shuttlebus.snu.ac.kr/mobile/route/routePlan.action?bus_route_id=61) |
| 정적 지리 정보 | 지도 HTML에 경로 좌표와 정류장 이름·좌표·코드가 포함됨 | [순환 노선 지도](https://shuttlebus.snu.ac.kr/mobile/route/routeMap.action?bus_route_id=61) |
| 동적 차량 정보 | 지도는 RouteDWR.selectStationInBusAll(61, callback)을 호출하고 결과의 bus_latitude, bus_longitude로 차량 마커를 생성함 | [순환 노선 지도](https://shuttlebus.snu.ac.kr/mobile/route/routeMap.action?bus_route_id=61) |
| 조회 방식 | 공개 RouteDWR.js가 /dwr 경로의 동일 이름 RPC를 호출함. 일반적인 REST JSON endpoint와는 다름 | [RouteDWR.js](https://shuttlebus.snu.ac.kr/dwr/interface/RouteDWR.js) |
| 화면 갱신 | 지도 소스는 응답 처리 뒤 10초 후 다음 조회를 예약함. 호출 timeout이 길어 실제 주기는 10초로 보장되지 않음 | [순환 노선 지도](https://shuttlebus.snu.ac.kr/mobile/route/routeMap.action?bus_route_id=61) |
| 문의처 | 서비스 문의/개선사항은 서울대학교 정보화본부 02-880-8282로 명시 | [공식 서비스 안내가 포함된 목록](https://shuttlebus.snu.ac.kr/mobile/route/routeList.action) |

정류장 코드는 방향을 포함한 표시 코드와 내부 식별자를 구분해 저장한다. 예를 들어 정문은 표시 코드 1A와 내부 코드 101을 사용한다. 노선 ID 61은 관측값이므로 영구 상수로 취급하지 않고 제공자 설정/주기적 목록 갱신으로 관리한다.

## 이번 조회에서 확인한 제약

- 조회 시 초기 HTML의 busList는 비어 있었다. 해당 관측만으로 서비스 중단, 차량 미운행 또는 장애를 판정할 수 없다. 날짜·시간과 실제 DWR 응답을 별도로 확인해야 한다.
- 선택 인자가 없는 기본 운행표 응답에는 시간표 정보 없음이 표시되었다. 최신 학기 운행계획을 이 응답 하나에서 추론하지 않는다.
- 일반 HTTPS 요청에서 certificate expired 검증 오류가 발생했다. 소스 조사만을 위해 인증정보 없이 일회성 검증 예외로 HTML/JS를 읽었다. 이를 운영 코드의 TLS 검증 해제 방식으로 옮기지 않는다. 공급자에게 현재 유효한 HTTPS endpoint를 확인해야 한다.
- 지도 소스의 외부 지도 SDK URL은 HTTP였다. 공식 화면을 React Native WebView에 그대로 넣는 방식은 mixed content·인증서·오래된 SDK 문제 때문에 실기기 동작을 보장할 수 없다.
- 공개 마커 생성 코드는 위도·경도만 사용한다. 안정적인 vehicleId, GPS 관측 시각, 운행 여부, 방향, 데이터 지연을 모두 제공하는지는 확인하지 못했다. poll 수신 시각을 GPS 관측 시각으로 표시하지 않는다.
- 서비스 정보 팝업의 업데이트 표기는 2014년이다. 이것을 백엔드의 마지막 유지보수 날짜로 해석하지 않는다.

별도의 최근 공식 공지에는 2026년 8월 순환도로 셔틀 임시 증차·운행시간 변경이 있어 노선·시간표가 변할 수 있음을 확인했다. 이미 종료된 임시 운행시간을 현재 시간표로 채택하지 않는다. [2026년 8월 운행 변경 공지](https://gses.snu.ac.kr/news/notice/notice?bbsidx=6146&md=v)

## 우리 앱에 권고하는 연동

1. 정보화본부에 해당 위치알림 서비스의 운영 담당자와 API 사용·재배포 문의 경로를 확인한다.
2. 지원되는 JSON/XML feed 또는 DWR 읽기 경로의 사용 허가, 허용 호출 주기, 최신 TLS endpoint를 확보한다.
3. worker가 허용된 주기로 노선당 한 번 조회하고 모든 앱이 같은 캐시를 공유한다. 단말 수만큼 원본 사이트를 polling하지 않는다.
4. 응답을 ShuttleSnapshot으로 변환하여 지도에 표시한다. 경로·정류장은 별도 저빈도 갱신한다.
5. 원본에 GPS timestamp가 없으면 receivedAt만 “서버 확인 시각”으로 표시한다. TTL은 수신 지연과 실제 데이터 갱신 특성을 측정해 정한다.
6. 만료·조회 실패·비운행을 구분하고 위치를 임의로 계속 이동시키지 않는다. 사용자가 실제 데이터를 요구했으므로 가상 차량으로 대체하지 않는다. 공식 링크만으로 기능을 완료 처리하거나 셔틀을 보류하는 것도 사용자와 합의된 선택이 아니다.

계약 초안:

```text
ShuttleRoute: providerRouteId, name, direction?, stops[], geometry?
ShuttleStop: providerStopId, displayCode, name, latitude, longitude
ShuttleVehicle: providerVehicleId?, providerRouteId, latitude, longitude,
                observedAt?, receivedAt, expiresAt, operatingState?
ShuttleSnapshot: source, fetchedAt, dataMode, vehicles[], status
```

vehicleId가 제공되지 않으면 응답 배열 인덱스를 영구 차량 ID로 쓰지 않는다. 첫 버전에서는 노선 snapshot 전체를 교체해 그릴 수 있다. 실제 측정 시각 없이 동일 좌표가 반복될 때 움직이지 않는 차량과 stale 데이터를 구별하기 어려우므로 제공자 timestamp 확보가 우선이다.

## 문의할 내용

- 수업 프로젝트 앱에 순환 셔틀 위치·정류장을 표시하고 캐시/재배포해도 되는가?
- 공식 지원 endpoint가 있는가, 현재 공개 DWR 경로를 승인하에 사용해도 되는가?
- 최신 순환 노선 ID, 반대 방향/방학 노선과 비운행 응답 규칙은 무엇인가?
- vehicleId, GPS timestamp, 좌표계, 갱신 지연, 도착예정정보를 제공하는가?
- 호출 상한·허용 주기·출처 표기·보관 기간·서비스 중단 공지를 어떻게 받는가?
- 인증서 검증이 가능한 최신 HTTPS 주소와 테스트 환경이 있는가?

문의는 준비만 했으며 실제 연락은 보내지 않았다. API 이용 허가와 소규모 동작 검증 전까지는 “실시간 연동 확보”로 표시하지 않는다.

## 2026-09-27 추가 관측 — 공개 차량 조회 단발 실측

첫 프로토타입부터 교내 셔틀을 포함한 실제 데이터를 사용하고 9월 28일 Android에서 실행한다는 조건에 따라, 02:04 KST경 공개 지도 클라이언트의 차량 조회를 한 번 검증했다. 로그인·계정·인증 우회·예약·쓰기·반복 polling은 하지 않았다. 이전 결론을 대체하는 운영 채택 결정이 아니라 추가 관측이다.

| 항목 | 관측 |
| --- | --- |
| 정상 TLS | 공개 `/dwr/engine.js` GET은 `curl` 오류 60, `certificate has expired`, `ssl_verify_result=10`으로 실패했다. 현재도 인증서 문제가 있다. |
| 조사 범위 | 인증정보를 보내지 않는 조사용 단발 예외로 공개 `engine.js`를 읽었다. 운영 코드·Android 앱·NestJS 서버에서 TLS 검증을 해제하는 방안은 채택하지 않는다. |
| 요청 계약 | 이미 공개된 `RouteDWR.selectStationInBusAll(61, callback)`와 `engine.js`의 plaincall 직렬화 규칙만 사용했다. 호출 경로는 `/dwr/call/plaincall/RouteDWR.selectStationInBusAll.dwr`, 메서드는 POST이고 작업 의미는 조회다. 공개 스크립트의 세션 생성 규칙을 따랐으며 사용자 인증정보는 없었다. |
| 응답 | 2026-09-27 02:04 KST, HTTP 200, 119 bytes. 응답의 DWR callback은 `_remoteHandleCallback('0','0',[])`였다. DWR 예외 callback은 없었다. |
| 확인한 것 | 노선 61에 대한 공개 읽기 호출이 성공 callback과 빈 배열을 반환하는 경로는 실제로 동작했다. |
| 확인 못한 것 | 운행 중 좌표, 차량 ID, GPS 관측 시각, 데이터 지연, 좌표 갱신 여부는 빈 배열이어서 검증하지 못했다. **일요일 새벽의 빈 배열은 운행 불가·폐쇄·서비스 장애의 증거가 아니다.** |

응답 앞의 `allowScriptTagRemoting` 관련 throw 문자열은 같은 응답에 정상 DWR callback이 함께 있는 형식이다. 외부 응답 JavaScript를 서버에서 `eval`해 실행하는 방식은 권고하지 않는다. 실제 어댑터를 구현할 때에는 한정된 응답 형식을 데이터로 해석하거나 지원되는 JSON feed를 사용해야 한다.

공식 근거: [순환 노선 지도](https://shuttlebus.snu.ac.kr/mobile/route/routeMap.action?bus_route_id=61), [공개 RouteDWR 인터페이스](https://shuttlebus.snu.ac.kr/dwr/interface/RouteDWR.js), [공개 DWR 엔진](https://shuttlebus.snu.ac.kr/dwr/engine.js). 요청·응답과 공개 JS의 조사 사본은 `/private/tmp/campus-shuttle-research/`에 있으며 임시 파일이므로 영구 보존을 보장하지 않는다. 원본 HTML에 포함된 지도 API 키는 문서에 복사하지 않았다.

9월 28일 목표에 대한 함의: 실제 정류장·노선 정보는 기존 공개 자료에서 확보했지만, 움직이는 실제 차량을 표시할 수 있다고 아직 약속할 수 없다. 운영 시간대의 한정된 실측과 정상 TLS 경로 확보가 남았다. 외부 앱의 사용·캐시·재배포 허가는 여전히 별도 미확인이다. 사용자가 실제 데이터를 요구했으므로 빈 응답을 가상의 차량 좌표로 채우지 않으며, 현재 상태를 “수신 차량 없음”으로 표시하는 후보가 적절하다.

## 2026-09-27 추가 관측 — 구형 정류장 도착 화면

사용자 제보에 따라 공개 노선 화면의 링크를 따라 `stationDetail.action?bus_station_code=101`과 `stationBusDetail.action?bus_route_id=61&bus_station_code=101&type=SHUTTLE`를 각각 한 번 읽었다. 정상 TLS 요청은 여전히 만료 오류였고 공개 HTML 조사에만 인증정보 없는 일회성 예외를 사용했다. 정문 정류장의 첫 번째/두 번째 도착예정 버스 영역은 모두 “운행정보없음”이었다. 차량 관측을 확보했다는 뜻이 아니며 서비스 폐쇄의 증거도 아니다. 새 서비스의 정상 HTTPS 조회와 혼동하지 않는다. [구형 정류장 도착 화면](https://shuttlebus.snu.ac.kr/mobile/station/stationBusDetail.action?bus_route_id=61&bus_station_code=101&type=SHUTTLE)
