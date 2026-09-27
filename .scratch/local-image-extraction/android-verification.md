# Android image import verification

Status: ready-for-agent
State: document-import smoke flow passed; default PhotoPicker and broader device acceptance remain limited
Verified: 2026-09-27

## Environment and binary

Android API36 emulator, ARM64 release-variant APK, existing development signing identity and real stored school Google session. Existing session and NAVER campus tiles survived reinstall. Final incremental native build passed in48s; mobile typecheck and44/44 tests passed. Native build success is separate from UI evidence below.

Local artifact: `artifacts/prototype-arm64.apk` (ignored, not published). SHA256: `2af0bf73020f072cdb0807f575c269e37f66b7fa083834c75883119a25d6c922`.

## Observed flow

1. Open 약속 / 파티 → 내 개인 일정 · 나만 보기 → 개인 일정 추가 → 파일에서 사진 선택; accept the selected-image/local-processing confirmation.
2. Android DocumentsUI displayed the known synthetic `team09-extraction-test.png`. Select only this fixture; no private gallery image was used.
3. The app normalized the selected image and called authenticated main → worker → native Ollama. The actual model HTTP request returned200 in15.27s, including this model load. This is not total UI latency or a performance guarantee.
4. The form displayed the original image, review warning and editable fields: title 캠퍼스 독서 모임; start2026-10-06 18:00; end2026-10-06 19:30; location 중앙도서관 세미나실. These matched the visible fixture.
5. Open original photo full-screen, switch to enlarged/scroll mode, and close it back to the draft. The source remained legible for field comparison.
6. Close the draft without saving; reopen the private calendar and confirm 등록한 개인 일정이 없어요. No synthetic calendar record was created in the real user's account. A manual text-entry attempt was not independently observed before closing; the evidence here establishes populated edit controls, not a complete manual-edit-and-save UI run.

## Picker-specific finding

On this emulator, Google's modern PhotoPicker ANRed on focus delivery. Expo image picker's legacy ACTION_GET_CONTENT path was also intercepted by PhotopickerGetContentActivity and ANRed. The final optional Android file button therefore uses expo-document-picker14.0.8 ACTION_OPEN_DOCUMENT/CATEGORY_OPENABLE. That actual app flow passed; the normal PhotoPicker remains available but was not successfully validated on this emulator.

Only the selected URI is copied into the app cache. No broad storage permission was added. Cache copies follow OS app-cache lifecycle; clearing the preview does not promise immediate physical file erasure. No raw image is persisted by the backend.

## Acceptance boundary

This is one emulator poster-import smoke test. Real-user timetable images, physical-device picker behavior, a full manual-edit/save UI flow with an isolated test account, two-device/background behavior and broader OCR quality remain separate checks. Existing save endpoints and timetable version preservation are covered by API/form regression tests; the isolated service E2E separately verifies extraction causes no timetable/quest/private-event writes. The four-input model evaluation remains the quality evidence, including known2B recognition failures.
