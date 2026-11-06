# 수집 평가 run: judgement

## 실행 기록

| 항목 | 값 |
|---|---|
| 명령 | `pnpm eval:collection --run judgement --part development --provider anthropic --cache auto --budget 0.3` |
| 시각 | 2026-11-06T01:34:02.533Z – 2026-11-06T01:36:54.303Z |
| 커밋 | `6f042872c29e224f9ae3bd3df86e3aad1e4ce9c7` |
| 고정 세트 | 태그 `eval-freeze-iter3-collection`의 후손: 예. 정렬한 id의 SHA-256 `af9f5ed56cb5854d09b9e8e0a59247dcac97c64d6303d6c2385a617e8ec95bf3`, development |
| threshold 파일 | blob `ee1b5bc95cf83a0cbdee44f246aae875a811c8ff` |
| 경로 | anthropic, 캐시 auto |
| 모델 | 요청 `claude-haiku-5-5`, 목록의 canonical `claude-haiku-5-5`, 응답 `claude-haiku-5-5` |
| 실행 제한 | 60000 ms, 출력 4000 토큰, 429·529에만 한 번 재시도, 글당 한 번. 공급자 기본 디코딩 |
| 켠 설정 | {"AUTOMATIC_JUDGEMENT":true,"SAME_EVENT_TITLE_RULE":false,"SAME_EVENT_AI_CHOICE":false} |
| 캠퍼스 설정 | buildingNumberIsGwanak {"snu_events":true,"extra_snu":true} |
| 켠 검사 | announcesEvent, linesInPost, dateAgrees, weekdayAgrees, timeAgrees, notApplicationPeriod, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches, newSession |
| 다시 쓴 답 | 없음 |
| 사용량과 비용 | 호출 42, 입력 77715 (캐시 읽기 0, 쓰기 77547), 출력 38947, USD 0.0292 (anthropic), 예산 USD 0.3 |

## 점수

| 지표 | 값 |
|---|---|
| C1 무인 발행률 | 12/16 (75.0%) |
| C2 틀린 발행 | 1/13 (7.7%) |
| C3 틀린 장소 (발행된 회차, 판정) | 1 |
| C3 진단 (검사에 떨어진 회차 포함) | 1 |
| C4 스키마 유효 | 12/12 (100.0%) |
| C4 호출 실패 | 0 |
| C5 행사가 아닌 글의 발행 | 1 |
| C6 기간형 여부 | 18/20 (90.0%) |
| C7 신청 기간을 행사 시각으로 발행 | 0 |

| C4 필드 | 정밀도 | 재현율 | 지어낸 값 |
|---|---|---|---|
| 시작 | 19/21 (90.5%) | 19/20 (95.0%) | 2/21 (9.5%) |
| 끝 | 14/16 (87.5%) | 14/16 (87.5%) | 1/16 (6.3%) |
| 장소 | 12/13 (92.3%) | 12/17 (70.6%) | 1/13 (7.7%) |
| 행사 여부 | 16/17 (94.1%) | 16/16 (100.0%) | — |

## threshold

| threshold | 종류 | 값 | 이번 | 판정 |
|---|---|---|---|---|
| c1.floor | floor | >= 0.25 | 12/16 | PASS |
| c1.target | target | >= 0.6 | 12/16 | PASS |
| c2.floor | floor | <= 0.0333 | 1/13 | FAIL |
| c2.target | target | = 0 | 1/13 | FAIL |
| c3.floor | floor | = 0 | 1 | FAIL |
| c3.target | target | = 0 | 1 | FAIL |
| c4.schema.floor | floor | = 1 | 12/12 | PASS |
| c4.start-precision.floor | floor | >= 0.9 | 19/21 | PASS |
| c4.start-precision.target | target | >= 0.95 | 19/21 | FAIL |
| c4.start-recall.target | target | >= 0.8 | 19/20 | PASS |
| c5.floor | floor | = 0 | 1 | FAIL |
| c5.target | target | = 0 | 1 | FAIL |
| c6.floor | floor | >= 0.8 | 18/20 | PASS |
| c6.target | target | >= 0.95 | 18/20 | FAIL |
| c7.floor | floor | = 0 | 0 | PASS |
| c7.target | target | = 0 | 0 | PASS |

## failure analysis

| 실패한 항목 | 실패한 검사 | 원인 분류 (자동, 사람이 확인) | 다음 run에서 바꾸는 것 |
|---|---|---|---|
| a-014 | 틀린 발행 | 추출 | |
| a-043 (1) | 미발행: placeMatches | 캠퍼스 기본 가정 | |
| a-046 (2) | 미발행: 답 없음 | 추출 | |
| a-068 (1) | 미발행: placeMatches | 캠퍼스 기본 가정 | |
| a-068 (2) | 미발행: placeMatches | 캠퍼스 기본 가정 | |
