# 수집 평가 run: ai-choice

## 실행 기록

| 항목 | 값 |
|---|---|
| 명령 | `pnpm eval:collection --run ai-choice --part held-out --from eval/results/collection-held-out-judgement-40cb60e5.json --budget 1` |
| 시각 | 2026-11-05T17:36:01.910Z – 2026-11-05T17:36:42.908Z |
| 커밋 | `40cb60e5ce7ed950b83adfe3d135dc924c41311f` |
| 고정 세트 | 태그 `eval-freeze-iter3-collection`의 후손: 예. 정렬한 id의 SHA-256 `af9f5ed56cb5854d09b9e8e0a59247dcac97c64d6303d6c2385a617e8ec95bf3`, held-out |
| threshold 파일 | blob `ee1b5bc95cf83a0cbdee44f246aae875a811c8ff` |
| 모델 | 요청 `anthropic/claude-haiku-5.5`, 목록의 canonical `anthropic/claude-haiku-5.5-20261007`, 응답 `anthropic/claude-haiku-5.5` |
| 실행 제한 | 60000 ms, 출력 4000 토큰, 재시도 없음, 글당 한 번. 공급자 기본 디코딩 |
| 켠 설정 | {"SAME_EVENT_TITLE_RULE":true,"SAME_EVENT_AI_CHOICE":true} |
| 캠퍼스 설정 | campusDefault {"snu_events":"gwanak","extra_snu":"gwanak"} |
| 켠 검사 | announcesEvent, linesInPost, dateAgrees, weekdayAgrees, timeAgrees, notApplicationPeriod, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches, newSession, timesConsistent |
| 다시 쓴 답 | eval/results/collection-held-out-judgement-40cb60e5.json |
| 사용량과 비용 | 호출 14, 입력 42978 (캐시 읽기 0, 쓰기 0), 출력 4507, USD 0.0066 (openrouter), 예산 USD 1 |

## 점수

| 지표 | 값 |
|---|---|
| D1 잘못된 자동 병합 | 0 |
| D2 TP / FP / FN | 1 / 0 / 31 |
| D2 정밀도 / 재현율 / F1 | 1.000 / 0.031 / 0.061 |
| D2 관리자 큐 포함 재현율 | 9/32 (28.1%) |
| D3 후보 단계 (Pair Completeness) | 10/32 (31.3%) |
| D4 관리자 큐 비율 | 15/83 (18.1%) |
| D4 이유별 | {"link_not_one_to_one":8,"ai_unsure":5,"place_unchecked":2} |
| D5 다대일 묶음 | 0/5 (0.0%) |
| D6 자동 붙이기 재현율 | 1/32 (3.1%) |

## threshold

| threshold | 종류 | 값 | 이번 | 판정 |
|---|---|---|---|---|
| d1.floor | floor | = 0 | 0 | PASS |
| d1.target | target | = 0 | 0 | PASS |
| d2.recall-with-queue.target | target | >= 0.8 | 9/32 | FAIL |
| d3.target | target | >= 0.95 | 10/32 | FAIL |
| d4.target | target | <= 0.3 | 15/83 | PASS |
| d6.target | target | >= 0.5 | 1/32 | FAIL |

## failure analysis

| 실패한 항목 | 실패한 검사 | 원인 분류 (자동, 사람이 확인) | 다음 run에서 바꾸는 것 |
|---|---|---|---|
| b-002 | 못 붙음 (none) | 후보 단계 누락 | |
| b-003 | 못 붙음 (none) | 후보 단계 누락 | |
| b-004 | 못 붙음 (none) | 후보 단계 누락 | |
| b-008 | 못 붙음 (held) | 금지 규칙 | |
| b-013 | 못 붙음 (none) | 후보 단계 누락 | |
| b-017 | 못 붙음 (none) | 후보 단계 누락 | |
| b-029 | 못 붙음 (none) | 모델 판단 | |
| b-035 | 못 붙음 (none) | 후보 단계 누락 | |
| b-038 | 못 붙음 (held) | 다대일 | |
| b-040 | 못 붙음 (none) | 후보 단계 누락 | |
| b-047 | 못 붙음 (held) | 다대일 | |
| b-048 | 못 붙음 (none) | 후보 단계 누락 | |
| b-057 | 못 붙음 (held) | 모델 판단 | |
| b-064 | 못 붙음 (none) | 후보 단계 누락 | |
| b-067 | 못 붙음 (held) | 모델 판단 | |
| b-075 | 못 붙음 (none) | 후보 단계 누락 | |
| b-081 | 못 붙음 (none) | 후보 단계 누락 | |
| b-089 | 못 붙음 (none) | 후보 단계 누락 | |
| b-090 | 못 붙음 (none) | 후보 단계 누락 | |
| b-092 | 못 붙음 (held) | 다대일 | |
| b-093 | 못 붙음 (none) | 후보 단계 누락 | |
| b-094 | 못 붙음 (none) | 후보 단계 누락 | |
| b-096 | 못 붙음 (none) | 후보 단계 누락 | |
| b-098 | 못 붙음 (none) | 후보 단계 누락 | |
| b-100 | 못 붙음 (none) | 후보 단계 누락 | |
| b-105 | 못 붙음 (none) | 후보 단계 누락 | |
| b-108 | 못 붙음 (none) | 후보 단계 누락 | |
| b-109 | 못 붙음 (none) | 후보 단계 누락 | |
| b-110 | 못 붙음 (none) | 후보 단계 누락 | |
| b-113 | 못 붙음 (held) | 모델 판단 | |
| b-117 | 못 붙음 (held) | 금지 규칙 | |
