# AI 실행·이미지 업로드·알림·인증 구현 근거

확인일: 2026-09-26. 공식 문서와 OWASP 원문을 확인했다. 아래 설계 권고는 채택 결정이 아니며, 특정 AI 제공자 선택을 전제하지 않는다. 실행·실기기 검증은 수행하지 않았다.

## AI 도구 실행

**확인된 사실.** 도구 호출 입력에 JSON Schema를 정의하고, 지원하는 제공자의 strict 기능으로 그 스키마에 맞는 출력을 제한할 수 있다. Anthropic 문서는 strict tool use와 독립 도구의 병렬 호출을 제공한다. 지원 스키마·호출 제어는 제공자와 모델별로 확인해야 한다. [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use), [Parallel tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use)

**설계 권고.** `AiProvider` 뒤에 모델 호출을 감추고, 앱 내부 `ToolRegistry`에 허용 도구만 등록한다. 모델이 제안한 `{name, arguments}`는 서버에서 다시 파싱·스키마 검증하고, 로그인 주체는 모델 인자에서 받지 않고 인증 컨텍스트에서 주입한다. 스키마의 타입 정확성과 사용자 권한·행사 정원·조회 대상의 존재는 서로 다른 검증이다. 후자는 기존 Nest 도메인 서비스가 담당한다. 조회 도구는 동시 실행할 수 있지만 `검색 → 후보 선택 → 파티 생성 → 초대`처럼 결과가 필요한 작업은 순차 실행한다. 쓰기는 실행 내용을 카드로 제시하고 사용자가 실행 버튼을 누르면 기존 명령 API를 호출하는 형태를 권고한다. 무한 루프 방지를 위한 최대 단계·시간·도구 호출 수와 중복 명령 방지 키도 둔다. 이 단락은 위 도구 기능을 이용하는 애플리케이션 설계 제안이다.

**확인된 사실.** 웹 페이지·문서·업로드 파일 OCR·도구 응답에 포함된 명령문은 간접 프롬프트 인젝션 경로다. 공식 문서는 출처 표시, 신뢰할 수 없는 데이터의 구조적 분리, 사용자 원래 요청을 바꾸지 않도록 하는 정책을 설명한다. [Untrusted content handling](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)

**설계 권고.** 행사 포스터와 시간표 OCR은 출처·asset ID가 있는 데이터로 전달한다. 이미지에 적힌 문장이 도구 권한·공유 설정·예약 명령이 되지 않게 한다. 문서 추출 작업에는 쓰기 도구를 제공하지 않는다. 추출 결과는 `draft`로 저장하고 사용자가 날짜·장소·교시를 고친 후 확정한다. AI 추천은 SQL로 권한·시간·거리 조건을 통과한 후보 ID만 대상으로 설명하게 하며, 후보에 없는 ID를 반환하면 거절한다. 이는 위 위협 모델에 대한 설계 제안이다.

## 이미지 업로드

**확인된 사실.** S3 presigned URL은 소지자에게 권한을 주는 bearer token이고, 만료 전 여러 번 사용할 수 있으며 같은 객체 키에 업로드하면 기존 객체를 덮어쓴다. 따라서 presigned URL 발급만으로 일회 업로드·확정 이미지 불변성이 보장되지 않는다. [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

**확인된 사실.** S3 presigned POST policy에는 만료 시각, 객체 키 조건, Content-Type 조건과 `content-length-range`를 넣을 수 있다. 일반 PUT URL과 POST policy의 크기 제한 방식을 혼동하지 않는다. [S3 POST policy](https://docs.aws.amazon.com/AmazonS3/latest/developerguide/sigv4-HTTPPOSTConstructPolicy.html)

**확인된 사실.** 업로드 Content-Type은 위조 가능하다. OWASP는 파일 크기·허용 형식·파일 내용 검증, 서버 생성 파일명, 업로더 권한 검증과 저장소 분리를 권고한다. 이미지 재인코딩은 유효성 검증과 부가 콘텐츠 제거에 사용할 수 있다. [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

**설계 권고.** `POST /assets/upload-intents`에서 인증·용도·할당량을 확인하고, `asset(owner_id, purpose, status=awaiting_upload)`와 임시 객체 키를 만든다. 응답한 짧은 만료의 presigned POST로 직접 전송하고 `POST /assets/:id/complete`에서 소유권을 재검사한다. Worker는 바이트 수·실제 포맷·디코딩·픽셀 수를 제한한 뒤 이미지를 정규화하고, 사용자가 쓸 수 없는 별도 확정 키에 결과를 저장한다. `ready`가 된 확정 객체만 AI 입력으로 사용하면 임시 URL 재사용으로 확정 파일이 바뀌는 경쟁을 피할 수 있다. 읽기도 asset 권한 검사 후 짧은 signed GET을 발급한다. 실패·방치된 임시 객체는 만료 정리한다. 구체적인 파일 크기·보관 기간은 제품 정책으로 결정한다. 이 흐름은 위 저장소 기능과 업로드 검증 지침에 근거한 제안이다.

## 푸시 알림

**확인된 사실.** FCM에서 message ID를 돌려받은 것은 전송 접수이며 기기 도착을 뜻하지 않는다. 기기 상태·TTL에 따라 지연되거나 만료될 수 있다. Notification과 data 메시지는 foreground/background에서 처리 방식도 다르다. [FCM message lifespan](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan), [FCM message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type)

**설계 권고.** 초대·약속 변경을 DB와 알림 기록에 먼저 저장하고 worker가 푸시한다. payload는 `notificationId`, `resourceType`, `resourceId` 정도로 두고, 알림을 열거나 앱이 재개되면 HTTPS로 현재 권한·최신 상태를 다시 조회한다. 푸시 수신 여부로 파티 합류·예약 성공을 결정하지 않는다. 철회된 초대를 뒤늦게 열면 서버가 현재 상태를 반환한다. 이는 전달 보장 한계를 반영한 제안이다.

## Google 계정 인증

**확인된 사실.** Android Credential Manager의 Google 로그인은 Web Client ID를 서버 대상 audience로 설정하고 Google ID token을 얻어 서버에서 검증하는 경로를 제공한다. nonce를 사용하면 서버가 요청·응답 nonce 일치를 검증해야 한다. [Android Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)

**확인된 사실.** 백엔드는 서명·`aud`·`iss`·`exp`를 검증해야 하며 Google 계정 연결 키는 변경 가능한 이메일 대신 `sub`를 사용한다. Node.js 검증에는 Google Auth Library를 안내한다. Google 로그인이 학교 재학 여부까지 증명하는 것은 아니며, 조직 계정을 제한하려면 `hd` 등을 별도 확인해야 한다. [Google backend token verification](https://developers.google.com/identity/sign-in/android/backend-auth)

**설계 권고.** `POST /auth/google`에서 검증 후 `(provider='google', subject=sub)`를 내부 사용자에 연결하고 앱 세션을 발급한다. refresh token은 서버에는 해시, 앱에는 OS 보안 저장소에 보관하고 로그아웃 시 세션 폐기와 FCM token 연결 해제를 처리한다. 학교 인증이 필요하면 별도 요구로 다루고 일반 Google 로그인과 혼동하지 않는다. RN 로그인 라이브러리와 선택한 네이티브 API 조합은 별도 빌드 검증 대상이다. 이 단락은 위 인증 원리를 따르는 제안이다.
