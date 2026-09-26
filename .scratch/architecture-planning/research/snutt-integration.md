# SNUTT 시간표 연동 조사

확인일: 2026-09-26 KST. 공개된 와플스튜디오 저장소의 기본 브랜치, 공식 릴리스, 조직 소개를 조사했다. 저장소 코드를 실행하거나 인증된 운영 API를 호출하지 않았다. 아래에서 **확인된 구현**, **아직 확인되지 않은 운영 조건**, **우리 앱의 제안 설계**를 구분한다.

## 결론

**SNUTT에는 외부 서비스에 사용자가 고른 시간표를 전달하는 `timetable-picker`가 이미 있다. 이 경로의 사용 승인을 받고 React Native 동작을 검증하는 것이 가장 적합하다.** 2026-08-25 공식 릴리스에 React Native WebView 시간표 공유 지원과 origin 검사 수정이 포함되어 있다. 단순히 비공개 API를 추정한 수준보다 진전된 연동 가능성이 확인됐다. [공식 릴리스](https://github.com/wafflestudio/snutt-frontend/releases/tag/snutt-webclient-prod-26.08.25-1)

다만 **운영 서비스에서 우리 origin을 허용하는지, 실제 Android WebView에서 끝까지 동작하는지는 미확인**이다. 최신 소스에는 React Native 송신 분기가 있으나 확인 버튼은 `window.opener`를 요구하는 불일치가 있다. 운영 키를 가져와 API를 호출하는 방식으로 우회하지 않고, 유지보수자에게 지원 조건과 수정 여부를 확인해야 한다. 가져온 시간표는 사용자가 작성한 계획이며 서울대 수강신청 완료 내역이나 학생 신원 증명이 아니다.

| 연동안 | 구현 가능성·난이도 판단 | 외부 의존성과 권고 |
|---|---|---|
| 공식 시간표 선택창 → JSON snapshot | 구조화된 데이터 제공 코드가 있음. 우리 파싱·검토·저장은 낮음~중간 난이도 | **1순위.** origin 등록, Android 로그인·공유 동작, payload 계약 확인 필요 |
| 화면 캡처 → OCR/vision → 사용자 수정 | SNUTT 전용 API 없이 가능. 이미지 인식 검증 비용이 듦 | **병행할 fallback.** 최초 MVP 진행을 파트너 응답에 전부 묶지 않음 |
| 승인된 개인 시간표 API → 서버 동기화 | 개인 목록·상세 조회 코드는 있음 | **추후.** 전용 권한 위임·토큰·호출량·삭제 계약이 필요하며 공개 OAuth 제공자로 확인되지 않음 |
| 수강편람 snapshot/feed → 강좌 검색 | 시간표 API와 별도인 강좌 검색·수집 코드가 있음 | 필요할 때 **별도 데이터 제공 협의**. 개인 수강 목록을 얻는 방법은 아님 |
| SNUTT 서버 자체 운영 | 기존 `snutt`는 MIT. 수집·배치·검색·운영까지 떠안음 | 현 MVP에는 과함. 자체 서버를 띄워도 기존 SNUTT 사용자의 데이터가 생기지 않음 |

## 조사한 저장소와 변경 위험

날짜는 GitHub `pushed_at`과 기본 브랜치 HEAD의 commit 시각을 구분한다. 브랜치가 유지된다는 사실만으로 운영 서버의 배포 버전을 확정하지 않는다.

| 저장소 | 확인한 기준 | 역할·주의점 |
|---|---|---|
| [snutt](https://github.com/wafflestudio/snutt) | `develop`, `bbad28d87c23f7b510a256daaad47ee2a3358a14`, HEAD 2026-09-22, archived=false | Kotlin/Spring, MongoDB 기반 시간표 서버. LICENSE에 MIT 명시 |
| [snutt-frontend](https://github.com/wafflestudio/snutt-frontend) | `main`, `9f6674974c3c8171d64b646b49eb6038119e11b7`, HEAD 2026-09-23, archived=false | 웹 클라이언트·공유 picker. GitHub license=null이며 조사한 checkout에서 LICENSE 파일을 찾지 못함 |
| [snutt-v2](https://github.com/wafflestudio/snutt-v2) | `develop`, `35e5951475d46811540ffff6635490e7dacc94ab`, HEAD 2026-09-23, 최근 push 2026-09-24, archived=false | MySQL 기반 통합 서버·`v1compat`·migration 코드. README는 MIT라고 하지만 LICENSE 파일과 GitHub license 식별은 미확인 |
| [snutt-android](https://github.com/wafflestudio/snutt-android), [snutt-ios](https://github.com/wafflestudio/snutt-ios) | 최근 push 각각 2026-09-23, 2026-09-24, 모두 archived=false | 현재 관리되는 네이티브 앱. 이번 API·공유 계약의 직접 근거는 위 세 저장소 |

활동·기본 브랜치·license 식별은 확인일의 [공식 GitHub 저장소 API](https://api.github.com/orgs/wafflestudio/repos?per_page=100&sort=updated)에서 확인했다. 코드 기준은 [기존 서버 commit](https://github.com/wafflestudio/snutt/commit/bbad28d87c23f7b510a256daaad47ee2a3358a14), [프론트엔드 commit](https://github.com/wafflestudio/snutt-frontend/commit/9f6674974c3c8171d64b646b49eb6038119e11b7), [새 서버 commit](https://github.com/wafflestudio/snutt-v2/commit/35e5951475d46811540ffff6635490e7dacc94ab)이다.

기존 서버의 MIT는 코드 사용·수정·배포에 관한 허가이며 고지 유지 조건이 있다. 이 파일이 운영 API 호출 권한, 원천 강좌 데이터 재배포 허가, 사용자 데이터 이용 동의를 대신하지 않는다. 프론트엔드 코드 복제·수정·재배포가 필요하면 별도로 라이선스를 확인한다. [기존 서버 LICENSE](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/LICENSE#L1-L21)

## 공식 시간표 선택창에서 확인한 계약

웹 클라이언트는 `/timetable-picker` 라우트를 제공한다. 요청의 `origin` query를 허용 목록과 비교하고, 허용되지 않으면 오류를 표시한다. 허용 목록은 `VITE_TIMETABLE_PICKER_ORIGINS` 환경 설정으로 주입된다. 허용된 요청도 SNUTT 로그인이 없으면 SNUTT 로그인 화면으로 간다. [라우트](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/App.tsx#L175-L180), [origin·로그인 검사](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/pages/timetable-picker/index.tsx#L15-L38), [환경 설정 읽기](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/main.tsx#L24-L27)

사용자는 자기 시간표 목록에서 하나를 선택하고 미리 본 뒤 확인한다. 송신 메시지는 아래 형태이며, 웹에서는 `window.opener.postMessage`, React Native 환경에서는 `window.ReactNativeWebView.postMessage(JSON.stringify(message))`를 사용한다. 시간표의 `_id`, `user_id`, `updated_at`, `theme`와 강의의 `_id`, `color`, `colorIndex`를 제거한다. 강좌 참조용 `lecture_id` 같은 나머지 필드는 있을 수 있다. [목록·선택](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/pages/timetable-picker/timetable-picker-content/index.tsx#L23-L57), [공유 데이터 변환·송신](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/usecases/timetablePickerService.ts#L12-L58)

```ts
// 확인된 메시지 구조의 요약. 전체 라이브 응답을 호출해 얻은 예제가 아니다.
{
  type: 'SNUTT_TIMETABLE_SELECTED',
  payload: {
    year: number,
    semester: 1 | 2 | 3 | 4,
    title: string,
    lecture_list: [
      {
        course_title: string,
        course_number?: string,
        lecture_number?: string,
        lecture_id?: string,
        instructor?: string,
        class_time_json: [
          { day: number, startMinute: number, endMinute: number, place?: string }
        ]
      }
    ]
  }
}
```

**Android에 대한 코드상 확인 필요점:** 서비스에는 RN bridge가 있지만, 호출 화면의 `hasOpener`는 `window.opener !== null`만 검사한다. 버튼도 `!hasOpener`이면 비활성화하고 `onConfirm` 역시 opener가 없으면 송신 전에 중단한다. 따라서 보통 opener 없이 여는 RN WebView에 바로 URL을 넣으면 된다고 보장할 수 없다. 유지보수자가 제공하는 정상 연동 예제와 운영 빌드를 검증하고, 필요하면 `ReactNativeWebView` 존재를 허용하는 UI 수정·닫기 처리를 요청해야 한다. 이 결과는 **정적 코드 분석에 따른 호환성 우려**이며 실제 운영 앱의 재현 결과는 아니다. [opener 검사](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/pages/timetable-picker/timetable-picker-content/index.tsx#L59-L100), [버튼 활성 조건](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/pages/timetable-picker/timetable-picker-content/index.tsx#L126-L133)

개인 ID·토큰을 공유 payload에서 받는 방식이 아니며, 이는 외부 OAuth 계정 연결이나 백그라운드 동기화가 아니라 **사용자 선택형 데이터 내보내기**로 해석하는 것이 적절하다. 동기화를 위해 안정적 source timetable ID, revision, 철회/변경 알림이 필요하다면 별도 계약을 요청해야 한다. 현재 payload만으로 재학 인증이나 SNUTT 계정 연결 완료 상태를 만들지 않는다.

## 직접 API를 사용할 경우 확인된 범위

기존 서버에서 개인 시간표는 `GET /v1/tables`, `GET /v1/tables/{year}/{semester}`, `GET /v1/tables/{timetableId}`로 노출된다. 목록과 상세 모두 현재 사용자 기준이며 상세 조회는 `(userId, timetableId)`로 소유권을 검사한다. `recent`는 최근 수정한 시간표이므로 사용자가 실제 수업으로 쓰는 시간표라고 자동 판단하지 않는다. [개인 시간표 controller](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/api/src/main/kotlin/controller/TimetableController.kt#L26-L85), [소유권 검사](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/core/src/main/kotlin/timetables/service/TimetableService.kt#L170-L173)

기존 개인 API에는 API key와 사용자 인증 필터가 함께 적용되며 `x-access-apikey`, `x-access-token`을 검증한다. 강좌 검색의 `SnuttNoAuthApiFilterTarget`는 사용자 로그인이 불필요하다는 뜻이지만 API key 필터는 포함한다. **검색이 공개 소스에 보인다는 이유로 무인증 공개 데이터 API라고 부르면 안 된다.** [필터 묶음](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/api/src/main/kotlin/filter/CompositeFilterTarget.kt#L3-L20), [API key 검사](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/api/src/main/kotlin/filter/ApiKeyWebFilter.kt#L67-L90), [사용자 토큰 검사](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/api/src/main/kotlin/filter/UserAuthenticationWebFilter.kt#L28-L36)

친구의 대표 시간표를 가져오는 경로도 있지만 수락된 SNUTT 친구 관계이고 호출자가 그 관계에 속하는지 검사한다. 우리 앱의 친구 관계는 SNUTT의 친구 관계와 같지 않다. 기본 설계는 **각 사용자가 자신의 시간표를 가져오고 우리 앱에서 허용한 범위로 가용 시간을 계산**하는 것이다. [친구 시간표 권한 검사](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/api/src/main/kotlin/controller/FriendTableController.kt#L21-L49)

새 서버는 `GET /v2/timetables` 계열을 제공하고 `Authorization: Bearer`를 검증한다. 로그인 결과에 access/refresh token이 들어간다. v1 호환 계층에는 deprecation/sunset 헤더 코드도 있다. 이는 버전 전환 위험의 근거이지 실제 운영 전환일이나 공표된 종료일을 확정하는 근거는 아니다. 연동을 승인받더라도 NestJS의 adapter 밖으로 legacy DTO를 퍼뜨리지 않는다. [v2 시간표](https://github.com/wafflestudio/snutt-v2/blob/35e5951475d46811540ffff6635490e7dacc94ab/api/src/main/kotlin/com/wafflestudio/snutt/api/v2/timetable/TimetableController.kt#L134-L184), [v2 인증](https://github.com/wafflestudio/snutt-v2/blob/35e5951475d46811540ffff6635490e7dacc94ab/api/src/main/kotlin/com/wafflestudio/snutt/api/auth/UserAuthInterceptor.kt#L27-L45), [v2 token 응답·로그인](https://github.com/wafflestudio/snutt-v2/blob/35e5951475d46811540ffff6635490e7dacc94ab/api/src/main/kotlin/com/wafflestudio/snutt/api/v2/auth/AuthController.kt#L56-L111), [v1 종료 헤더 구현](https://github.com/wafflestudio/snutt-v2/blob/35e5951475d46811540ffff6635490e7dacc94ab/v1compat/src/main/kotlin/com/wafflestudio/snutt/v1compat/config/V1DeprecationHeaderInterceptor.kt#L9-L21)

조사한 서버·새 서버·웹 소스에서 외부 서비스가 등록해 사용할 수 있는 OAuth authorization server, scope 기반 read-only 위임, ICS 구독/내보내기 API 문서는 확인하지 못했다. 이는 모든 비공개·미문서 기능의 부재를 증명하지 않으므로 문의 항목으로 남긴다. SNUTT에서 Google/Kakao 로그인을 한다는 사실은 **SNUTT가 우리 앱에 OAuth를 제공한다는 뜻이 아니다.**

## 수강편람과 개인 시간표는 별개의 데이터

기존 서버 `POST /v1/search_query`는 연도·학기·과목명·학과·시간 조건 등으로 강좌 목록을 검색한다. 강좌 목록에는 특정 학생이 실제로 무엇을 듣는지 포함되지 않는다. [검색 controller·query](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/api/src/main/kotlin/controller/LectureSearchController.kt#L19-L56)

SNUTT README는 서울대 수강편람 데이터를 내려받아 가공한다고 명시하며 과도한 수집 부하와 차단 가능성을 안내한다. 저장소에도 수강편람 검색·Excel 다운로드 경로를 사용하는 수집 구현이 있다. 이 경로는 개인 수강신청 정보를 가져오는 SSO 연동 근거가 아니다. 우리 앱이 강좌 검색 자체를 제공해야 한다면 SNUTT 측에 학기별 dump/feed 또는 허가된 검색 API를 요청하고 갱신·출처·재배포 조건을 합의하는 편이 좋다. [README의 데이터 원천](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/README.md#L51-L61), [수집 경로](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/batch/src/main/kotlin/sugangsnu/common/SugangSnuRepository.kt#L25-L35)

## SNUTT 학교 인증과 서울대 SSO

기존 서버의 로그인 provider는 LOCAL, FACEBOOK, APPLE, GOOGLE, KAKAO이다. 학교 인증에는 `@snu.ac.kr` 주소 확인 후 메일로 코드를 보내고 확인 결과를 저장하는 구현이 있다. 이는 서울대 SSO 위임이나 현재 재학 상태 확인 API의 근거가 아니다. 따라서 SNUTT 시간표를 가져왔다는 이유로 우리 계정의 `snuSsoVerified`나 `enrollmentVerified`를 설정하면 안 된다. [로그인 provider](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/core/src/main/kotlin/auth/AuthProvider.kt#L3-L12), [학교 메일 검사](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/core/src/main/kotlin/users/service/AuthService.kt#L70-L75), [메일 코드 인증](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/core/src/main/kotlin/users/service/UserService.kt#L385-L418)

## 우리 앱에 적용할 구현안

아래는 SNUTT가 제공한다고 주장하는 API가 아니라 **우리 React Native/NestJS에 만들 계약**이다.

```text
React Native: 시간표 가져오기
  → 승인받은 SNUTT picker 열기
  → SNUTT에서 로그인·시간표 선택·사용자 확인
  → SNUTT_TIMETABLE_SELECTED 메시지 수신
  → POST /me/schedule-imports (provider=snutt-picker, payload)
  → NestJS schema 검증·정규화·미리보기 draft 저장
  → 사용자 학기/과목/장소/시간 검토
  → POST /me/schedule-imports/{id}/confirm
  → transaction으로 해당 import 일정 집합 교체
  → 가용 시간·친구 약속 추천 재계산
```

모바일은 허용된 SNUTT URL만 열고 수신 메시지의 타입·최대 크기·필수 필드를 검사한다. 웹 popup 연동에서는 `event.origin`과 `event.source`를 확인한다. RN bridge는 웹의 origin 검증과 같지 않으므로 탐색 URL과 frame/message 정책을 별도로 검증해야 한다. 학교 및 SNUTT 비밀번호·쿠키·API key를 읽거나 우리 서버에 전송하는 기능을 만들지 않는다. WebView의 소셜 로그인 지원까지 포함한 실제 Android APK 검증이 필요하다.

Picker의 payload는 외부 UI에서 받은 사용자 제출 데이터로 취급한다. 서명된 학사 원장이라는 가정을 하지 않는다. 원본 시간표 ID와 revision이 없으므로 첫 버전은 **사용자가 다시 가져오는 snapshot 교체**로 한다. 사용자가 확인한 import 묶음만 교체하고 수동 추가 일정·확정 친구 약속까지 지우지 않는다. 중복 클릭은 import ID와 confirm idempotency로 처리한다.

| SNUTT 필드 | 우리 저장 필드 제안 | 변환·검증 |
|---|---|---|
| `year`, `semester` | `academic_terms.year`, `term_kind` | `1=봄`, `2=여름`, `3=가을`, `4=겨울`. `semester=2`를 2학기로 잘못 해석하지 않음 |
| `title` | `schedule_imports.source_title` | 표시용. 고유 식별자로 사용하지 않음 |
| `course_title` | `schedule_entries.title` | 사용자 입력 과목도 허용 |
| `course_number`, `lecture_number` | `course_code`, `section_code` | 있을 때 학기와 조합. 없는 custom 강좌는 우리 UUID 부여 |
| `lecture_id` | `source_lecture_ref` (nullable) | 제공될 때만 저장. 개인 시간표 항목 ID와 구분 |
| `class_time_json[]` | `schedule_recurrences[]` | 한 강의가 여러 요일·장소를 가지므로 배열을 모두 보존 |
| `day` | `weekday` | SNUTT `0=월 … 6=일`. JS `Date.getDay()`와 그대로 섞지 않음 |
| `startMinute`, `endMinute` | `start_minute`, `end_minute` | 자정 기준 분. 범위와 시작<종료를 검사하고 시간대는 `Asia/Seoul`로 명시 |
| `place` | `raw_place`, `building_id`, `room_label` | 원문 보존 후 건물 매핑. 애매하면 사용자 확인, 임의 좌표 생성 금지 |
| `instructor` | `instructor_name` (optional) | 가용 시간 계산에는 필수가 아님 |
| payload에 없는 학기 시작·끝, 휴강·보강 | `academic_terms`, `schedule_exceptions` | 학사 일정/사용자 입력으로 별도 관리. 수업 반복을 무기한 생성하지 않음 |
| payload에 없는 원본 revision·수정 시각 | `imported_at`, `payload_hash` | 우리 수신 시각을 기록. 원본 최신 시각인 것처럼 표시하지 않음 |

필드의 근거는 [웹 시간표 타입](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/entities/timetable.ts#L14-L23), [강의·시간 타입](https://github.com/wafflestudio/snutt-frontend/blob/9f6674974c3c8171d64b646b49eb6038119e11b7/apps/snutt-webclient/src/entities/lecture.ts#L4-L32), [학기 enum](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/core/src/main/kotlin/common/enums/Semester.kt#L9-L18), [요일 enum](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/core/src/main/kotlin/common/enums/DayOfWeek.kt#L9-L21)이다. 표 오른쪽 정책과 DB 이름은 우리 설계 제안이다.

## 와플스튜디오에 확인할 구체적인 항목

1. 수업 프로젝트의 Android APK에서 공식 picker를 사용할 수 있는가? 등록할 `origin` 형식, dev/prod 허용 목록, 신청 담당자는 누구인가?
2. 현재 배포본은 RN WebView에서 opener 없이 확인 버튼·닫기가 정상 동작하는가? 지원 샘플 앱이나 통합 테스트가 있는가? Google/Kakao 등 로그인 방식별 지원은 어떠한가?
3. `SNUTT_TIMETABLE_SELECTED` payload의 보장 필드·schema 버전·변경 공지 방식은 무엇인가? custom 강좌·빈 시간표·여름/겨울학기도 지원하는가?
4. 가져온 개인 시간표를 사용자의 일정 조율·가용 시간 계산에 저장·이용하는 데 필요한 동의/출처/보존 조건은 무엇인가?
5. 미래 자동 동기화가 필요하면 read-only scope, 승인 화면, 철회, 만료가 있는 파트너 API를 제공할 수 있는가? 기존 개인 토큰 전달 이외의 위임 경로가 있는가?
6. 강좌 검색까지 필요해지면 별도 데이터 dump/feed, 캐시·갱신 주기·rate limit·재배포 허용 범위는 무엇인가?
7. `snutt-v2` 전환 일정과 picker 계약 영향, 기존 API의 실제 지원 기간은 무엇인가?

공식 GitHub 조직은 공개 문의 주소로 `master@wafflestudio.com`을 표시한다. 이 주소로 담당 팀 연결을 요청할 수 있으며, SNUTT README의 문서·피드백 경로도 참고 가능하다. **이번 조사에서는 문의를 발송하지 않았다.** [공식 조직 소개](https://github.com/wafflestudio), [SNUTT 문서 링크](https://github.com/wafflestudio/snutt/blob/bbad28d87c23f7b510a256daaad47ee2a3358a14/README.md#L44-L48)

확정 전 검증 순서는 **사용 승인·origin 등록 → 실제 Android에서 로그인·선택·취소 → 시간표 import 검증 → 다시 가져오기·수동 일정 보존 → 변경 시 가용 시간 재계산**이다. 승인된 테스트 계정과 최소한의 샘플 시간표로 수행한다.
