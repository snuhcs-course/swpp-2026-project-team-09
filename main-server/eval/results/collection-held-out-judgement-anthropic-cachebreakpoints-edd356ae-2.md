# 수집 평가 run: judgement

## 실행 기록

| 항목 | 값 |
|---|---|
| 명령 | `pnpm eval:collection --run judgement --part held-out --provider anthropic --cache breakpoints --budget 1` |
| 시각 | 2026-11-15T13:58:57.684Z – 2026-11-15T14:07:57.162Z |
| 커밋 | `edd356ae3ce028354203302f5f4e2d5c2415b6e7` |
| 고정 세트 | 태그 `eval-freeze-iter3-collection`의 후손: 예. 정렬한 id의 SHA-256 `af9f5ed56cb5854d09b9e8e0a59247dcac97c64d6303d6c2385a617e8ec95bf3`, held-out |
| threshold 파일 | blob `ee1b5bc95cf83a0cbdee44f246aae875a811c8ff` |
| 경로 | anthropic, 캐시 breakpoints |
| 모델 | 요청 `claude-haiku-5-5`, 목록의 canonical `claude-haiku-5-5`, 응답 `claude-haiku-5-5` |
| 실행 제한 | 60000 ms, 출력 4000 토큰, 429·529에만 한 번 재시도, 글당 한 번. 공급자 기본 디코딩 |
| 켠 설정 | {"AUTOMATIC_JUDGEMENT":true,"SAME_EVENT_TITLE_RULE":false,"SAME_EVENT_AI_CHOICE":false} |
| 캠퍼스 설정 | campusDefault {"snu_events":"gwanak","extra_snu":"gwanak"} |
| 켠 검사 | announcesEvent, linesInPost, dateAgrees, weekdayAgrees, timeAgrees, notApplicationPeriod, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches, newSession, timesConsistent |
| 다시 쓴 답 | 없음 |
| 사용량과 비용 | 호출 141, 입력 280402 (캐시 읽기 151152, 쓰기 0), 출력 108204, USD 0.0685 (anthropic), 예산 USD 1 |

## 점수

| 지표 | 값 |
|---|---|
| C1 무인 발행률 | 38/64 (59.4%) |
| C2 틀린 발행 | 0/38 (0.0%) |
| C3 틀린 장소 (발행된 회차, 판정) | 0 |
| C3 진단 (검사에 떨어진 회차 포함) | 0 |
| C4 스키마 유효 | 60/60 (100.0%) |
| C4 호출 실패 | 0 |
| C5 행사가 아닌 글의 발행 | 0 |
| C6 기간형 여부 | 62/85 (72.9%) |
| C7 신청 기간을 행사 시각으로 발행 | 0 |

| C4 필드 | 정밀도 | 재현율 | 지어낸 값 |
|---|---|---|---|
| 시작 | 60/64 (93.8%) | 60/84 (71.4%) | 2/64 (3.1%) |
| 끝 | 50/56 (89.3%) | 50/76 (65.8%) | 1/56 (1.8%) |
| 장소 | 44/44 (100.0%) | 44/64 (68.8%) | 0/44 (0.0%) |
| 행사 여부 | 45/45 (100.0%) | 45/49 (91.8%) | — |

## threshold

| threshold | 종류 | 값 | 이번 | 판정 |
|---|---|---|---|---|
| c1.floor | floor | >= 0.25 | 38/64 | PASS |
| c1.target | target | >= 0.6 | 38/64 | FAIL |
| c2.floor | floor | <= 0.0333 | 0/38 | PASS |
| c2.target | target | = 0 | 0/38 | PASS |
| c3.floor | floor | = 0 | 0 | PASS |
| c3.target | target | = 0 | 0 | PASS |
| c4.schema.floor | floor | = 1 | 60/60 | PASS |
| c4.start-precision.floor | floor | >= 0.9 | 60/64 | PASS |
| c4.start-precision.target | target | >= 0.95 | 60/64 | FAIL |
| c4.start-recall.target | target | >= 0.8 | 60/84 | FAIL |
| c5.floor | floor | = 0 | 0 | PASS |
| c5.target | target | = 0 | 0 | PASS |
| c6.floor | floor | >= 0.8 | 62/85 | FAIL |
| c6.target | target | >= 0.95 | 62/85 | FAIL |
| c7.floor | floor | = 0 | 0 | PASS |
| c7.target | target | = 0 | 0 | PASS |

## failure analysis

| 실패한 항목 | 실패한 검사 | 원인 분류 (자동, 사람이 확인) | 다음 run에서 바꾸는 것 |
|---|---|---|---|
| a-004 (1) | 미발행: dateAgrees, length, placeMatches | 캠퍼스 기본 가정 | |
| a-005 (1) | 미발행: dateAgrees, length | 검사 규칙 | |
| a-005 (2) | 미발행: 답 없음 | 추출 | |
| a-005 (3) | 미발행: 답 없음 | 추출 | |
| a-005 (4) | 미발행: 답 없음 | 추출 | |
| a-015 (2) | 미발행: timesConsistent | 검사 규칙 | |
| a-017 (1) | 미발행: placeMatches, timesConsistent | 캠퍼스 기본 가정 | |
| a-029 (1) | 미발행: linesInPost | 근거 줄 | |
| a-029 (3) | 미발행: linesInPost | 근거 줄 | |
| a-037 (1) | 미발행: timesConsistent | 검사 규칙 | |
| a-044 (1) | 미발행: 답 없음 | 추출 | |
| a-053 (1) | 미발행: timesConsistent | 검사 규칙 | |
| a-056 (1) | 미발행: 답 없음 | 추출 | |
| a-056 (2) | 미발행: 답 없음 | 추출 | |
| a-056 (3) | 미발행: 답 없음 | 추출 | |
| a-056 (4) | 미발행: 답 없음 | 추출 | |
| a-062 (1) | 미발행: dateAgrees, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches | 캠퍼스 기본 가정 | |
| a-062 (2) | 미발행: 답 없음 | 추출 | |
| a-063 (1) | 미발행: 답 없음 | 추출 | |
| a-063 (2) | 미발행: 답 없음 | 추출 | |
| a-063 (3) | 미발행: 답 없음 | 추출 | |
| a-063 (4) | 미발행: 답 없음 | 추출 | |
| a-063 (5) | 미발행: 답 없음 | 추출 | |
| a-063 (6) | 미발행: 답 없음 | 추출 | |
| a-065 (1) | 미발행: dateAgrees, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches | 캠퍼스 기본 가정 | |
| a-065 (2) | 미발행: 답 없음 | 추출 | |
