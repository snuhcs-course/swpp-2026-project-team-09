# 수집 평가 run: place-name

## 실행 기록

| 항목 | 값 |
|---|---|
| 명령 | `pnpm eval:collection --run place-name --part held-out --from eval/results/collection-held-out-judgement-fed4a2e0.json` |
| 시각 | 2026-11-01T15:37:46.369Z – 2026-11-01T15:37:47.377Z |
| 커밋 | `fed4a2e0343dffbe6209e883e4474c96b853b7dc` |
| 고정 세트 | 태그 `eval-freeze-iter3-collection`의 후손: 예. 정렬한 id의 SHA-256 `af9f5ed56cb5854d09b9e8e0a59247dcac97c64d6303d6c2385a617e8ec95bf3`, held-out |
| threshold 파일 | blob `ee1b5bc95cf83a0cbdee44f246aae875a811c8ff` |
| 모델 | 요청 `anthropic/claude-haiku-5.5`, 목록의 canonical `anthropic/claude-haiku-5.5-20261007`, 응답 `anthropic/claude-haiku-5.5` |
| 실행 제한 | 60000 ms, 출력 4000 토큰, 재시도 없음, 글당 한 번. 공급자 기본 디코딩 |
| 켠 설정 | {"AUTOMATIC_JUDGEMENT":true,"SAME_EVENT_TITLE_RULE":false,"SAME_EVENT_AI_CHOICE":false} |
| 캠퍼스 설정 | buildingNumberIsGwanak {"snu_events":true,"extra_snu":true}, placeNameIsGwanak 켬 (extra.snu) |
| 켠 검사 | announcesEvent, linesInPost, dateAgrees, weekdayAgrees, timeAgrees, notApplicationPeriod, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches, newSession |
| 다시 쓴 답 | eval/results/collection-held-out-judgement-fed4a2e0.json |
| 사용량과 비용 | 호출 0, 입력 0 (캐시 읽기 0, 쓰기 0), 출력 0, USD 0.0000 (openrouter), 예산 USD 1 |

## 점수

| 지표 | 값 |
|---|---|
| C1 무인 발행률 | 32/64 (50.0%) |
| C2 틀린 발행 | 2/34 (5.9%) |
| C3 틀린 장소 (발행된 회차, 판정) | 0 |
| C3 진단 (검사에 떨어진 회차 포함) | 0 |
| C4 스키마 유효 | 59/60 (98.3%) |
| C4 호출 실패 | 0 |
| C5 행사가 아닌 글의 발행 | 0 |
| C6 기간형 여부 | 63/85 (74.1%) |
| C7 신청 기간을 행사 시각으로 발행 | 0 |

| C4 필드 | 정밀도 | 재현율 | 지어낸 값 |
|---|---|---|---|
| 시작 | 59/63 (93.7%) | 59/84 (70.2%) | 2/63 (3.2%) |
| 끝 | 51/55 (92.7%) | 51/76 (67.1%) | 1/55 (1.8%) |
| 장소 | 42/42 (100.0%) | 42/64 (65.6%) | 0/42 (0.0%) |
| 행사 여부 | 44/44 (100.0%) | 44/49 (89.8%) | — |

## threshold

| threshold | 종류 | 값 | 이번 | 판정 |
|---|---|---|---|---|
| c1.floor | floor | >= 0.25 | 32/64 | PASS |
| c1.target | target | >= 0.6 | 32/64 | FAIL |
| c2.floor | floor | <= 0.0333 | 2/34 | FAIL |
| c2.target | target | = 0 | 2/34 | FAIL |
| c3.floor | floor | = 0 | 0 | PASS |
| c3.target | target | = 0 | 0 | PASS |
| c4.schema.floor | floor | = 1 | 59/60 | FAIL |
| c4.start-precision.floor | floor | >= 0.9 | 59/63 | PASS |
| c4.start-precision.target | target | >= 0.95 | 59/63 | FAIL |
| c4.start-recall.target | target | >= 0.8 | 59/84 | FAIL |
| c5.floor | floor | = 0 | 0 | PASS |
| c5.target | target | = 0 | 0 | PASS |
| c6.floor | floor | >= 0.8 | 63/85 | FAIL |
| c6.target | target | >= 0.95 | 63/85 | FAIL |
| c7.floor | floor | = 0 | 0 | PASS |
| c7.target | target | = 0 | 0 | PASS |

## failure analysis

| 실패한 항목 | 실패한 검사 | 원인 분류 (자동, 사람이 확인) | 다음 run에서 바꾸는 것 |
|---|---|---|---|
| a-004 (1) | 미발행: dateAgrees, length, placeMatches | 캠퍼스 기본 가정 | |
| a-005 (1) | 미발행: AI_NoObjectGeneratedError | 추출 | |
| a-005 (2) | 미발행: AI_NoObjectGeneratedError | 추출 | |
| a-005 (3) | 미발행: AI_NoObjectGeneratedError | 추출 | |
| a-005 (4) | 미발행: AI_NoObjectGeneratedError | 추출 | |
| a-015 (2) | 틀린 발행 | 추출 | |
| a-017 (1) | 미발행: placeMatches | 캠퍼스 기본 가정 | |
| a-029 (2) | 미발행: linesInPost | 근거 줄 | |
| a-044 (1) | 미발행: dateAgrees, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches | 캠퍼스 기본 가정 | |
| a-053 (1) | 틀린 발행 | 추출 | |
| a-056 (1) | 미발행: 답 없음 | 추출 | |
| a-056 (2) | 미발행: 답 없음 | 추출 | |
| a-056 (3) | 미발행: 답 없음 | 추출 | |
| a-056 (4) | 미발행: 답 없음 | 추출 | |
| a-058 (1) | 미발행: dateAgrees, timeAgrees | 검사 규칙 | |
| a-058 (2) | 미발행: dateAgrees, timeAgrees | 검사 규칙 | |
| a-058 (3) | 미발행: dateAgrees, timeAgrees | 검사 규칙 | |
| a-058 (4) | 미발행: dateAgrees, timeAgrees | 검사 규칙 | |
| a-058 (5) | 미발행: dateAgrees, timeAgrees | 검사 규칙 | |
| a-058 (6) | 미발행: dateAgrees, timeAgrees | 검사 규칙 | |
| a-062 (1) | 미발행: dateAgrees, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches | 캠퍼스 기본 가정 | |
| a-062 (2) | 미발행: 답 없음 | 추출 | |
| a-063 (1) | 미발행: 답 없음 | 추출 | |
| a-063 (2) | 미발행: 답 없음 | 추출 | |
| a-063 (3) | 미발행: 답 없음 | 추출 | |
| a-063 (4) | 미발행: 답 없음 | 추출 | |
| a-063 (5) | 미발행: 답 없음 | 추출 | |
| a-063 (6) | 미발행: 답 없음 | 추출 | |
| a-064 (1) | 미발행: timeAgrees | 검사 규칙 | |
| a-065 (1) | 미발행: dateAgrees, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches | 캠퍼스 기본 가정 | |
| a-065 (2) | 미발행: 답 없음 | 추출 | |
| a-073 (1) | 미발행: placeMatches | 캠퍼스 기본 가정 | |
