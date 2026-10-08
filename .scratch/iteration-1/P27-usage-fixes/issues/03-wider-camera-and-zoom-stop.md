# 03: A wider camera area, and pinching out that stops

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: 02 (Place markers without words), as both change the main screen's map

## What to build

The camera may move over a wider area around campus: the current rectangle widened by half its height to the north and to the south and by half its width to the east and to the west. The on-campus rectangle, which decides whether the User's own Avatar is shown and where 장소 선택 may pick, stays as it is, and so does the lowest zoom, which is still taken from the campus rectangle.

Pinching out stops at the lowest zoom instead of snapping back: the map component takes a lowest native camera level and hands it to Kakao's SDK on Android and iOS. The SDK takes whole levels, so the level is 15, a hair closer than today's lowest of about 14.97. The SDK cannot restrict panning and reports only a move's end, so a drag past the wider area still settles back when it ends, as today.

## Acceptance criteria

- [x] The camera's area and the on-campus rectangle are two values; the main screen, 장소 선택 and the map check screen pass the camera's area to the map.
- [x] The lowest zoom stays as today on a phone-sized view.
- [x] The User's own Avatar and 장소 선택's pick use the on-campus rectangle, unchanged.
- [x] The map component takes the lowest native level and the Android and iOS map views set it on Kakao's map; the plain map, used in Expo Go and the tests, keeps its own rule.
- [x] Tests cover what the app hands the map (the camera area and the level 15) and the plain map's settling with the wider area; the existing camera tests pass, changed only where they assert the old area, which the PR names.

## Check on a phone

- [ ] On Android and iOS, pinching out at the lowest zoom does not zoom further and nothing snaps back.
- [ ] The map can be dragged about half a campus beyond each edge, and settles back past that.

## Comments

### 구현 메모 (2026-10-09)

- `mobile/src/map/campus.ts`: `CAMPUS_BOUNDS`(캠퍼스 안 사각형)는 그대로 두고, 그것을 남북으로 높이의 절반씩, 동서로 너비의 절반씩 넓힌 `CAMERA_BOUNDS`(37.432–37.484 N, 126.936–126.972 E)와 `NATIVE_MIN_LEVEL = 15`를 더했다. 세 화면(메인, 장소 선택, 지도 확인)은 `CAMPUS_CAMERA` 하나를 펼쳐 넘긴다.
- 지도 컴포넌트(`MapProps`)에 두 값이 생겼다. `fitBounds`는 가장 낮은 줌이 뷰를 맞추는 사각형(생략하면 `bounds`)이라 가장 낮은 줌이 오늘과 같다(390×700에서 14.895). `nativeMinLevel`은 Kakao SDK의 가장 낮은 레벨이다.
- 네이티브 모듈은 `fitBounds`를 받지 않는다. 대신 `native-map.tsx`가 뷰 크기를 안 뒤로는 맞춤 줌을 모듈의 `minZoom`으로 넘겨서, 모듈 자신의 규칙(`bounds` 안, `minZoom` 이상)이 인터페이스 규칙과 같아진다. 그래서 Kotlin/Swift의 `CameraRules`는 바꾸지 않았다.
- Android `SnuNowMapView`는 `setCameraMinLevel`, iOS는 `cameraMinLevel`로 `minLevel` prop을 지도 준비 시와 prop 갱신 시 건다(SDK 2.15.2 / iOS swiftinterface에서 이름 확인). 빌드와 동작은 폰에서 확인해야 한다.
- 장소 선택은 이제 캠퍼스 밖 최대 반 캠퍼스까지 핀을 옮길 수 있다. 여는 위치를 고르는 `isInside(position, CAMPUS_BOUNDS)`는 그대로다. 핀 아래 위치를 고르는 규칙에는 캠퍼스 사각형 검사가 원래 없었고, 이번에도 더하지 않았다.

### 바꾼 기존 테스트

- `mobile/__tests__/support/map.tsx`: `EMPTY`(화면이 지도에 주는 값)가 `bounds: CAMERA_BOUNDS`, `fitBounds: CAMPUS_BOUNDS`, `nativeMinLevel`을 갖는다.
- `mobile/__tests__/map-camera-test.tsx`의 "keeps the view inside ... and the zoom limits": 넓어진 영역의 북서 모서리를 기대하도록 `CAMPUS_BOUNDS` 대신 `CAMERA_BOUNDS`를 쓰고, 위도 차이를 0.00075에서 0.000745로 고쳤다(북쪽 끝 위도가 달라져 값이 조금 바뀐다).

### 새 테스트

- `mobile/__tests__/map-camera-area-test.tsx`: 메인, 장소 선택, 지도 확인이 지도에 넘기는 카메라 영역, `fitBounds`, 레벨 15.
- `mobile/__tests__/map-camera-test.tsx`: 일반 지도에서 넓은 영역 안의 카메라는 그대로 두고, 그 밖은 영역 가장자리로 되돌린다.
- `mobile/__tests__/map-native-view-test.tsx`: 네이티브 뷰가 받는 `bounds`, `minLevel`, 크기를 안 뒤의 `minZoom`(맞춤 줌), 맞춤 줌이 캠퍼스 기준인 것.

### Agent usage (2026-10-09)

- Agent time: about 1 hour 20 minutes (the implementer) in the resumed session (2026-10-08 to 09), an estimate. Much of it was spent waiting for the shared test slot while the Mac was short on memory. The earlier session, which was force-quit, is not counted: its usage was lost.
- Tokens: about 181 thousand in all, all subagents: the implementer (145 thousand). The subagent reports give only totals, so input and output, and the cache reads and writes, cannot be shown separately. Included is a ninth of the shared code review and review fixes (about 36 thousand tokens and 2.5 minutes). The orchestrator's own tokens are not counted.
