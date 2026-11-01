# 수집 평가 run: r0b

## 실행 기록

| 항목 | 값 |
|---|---|
| 명령 | `pnpm eval:collection --run r0b --part held-out --from eval/results/collection-held-out-judgement-fed4a2e0.json --budget 1` |
| 시각 | 2026-11-01T15:40:24.189Z – 2026-11-01T15:40:25.494Z |
| 커밋 | `e588e7024244710abf49e7f19665a3d25d9384e9` |
| 고정 세트 | 태그 `eval-freeze-iter3-collection`의 후손: 예. 정렬한 id의 SHA-256 `af9f5ed56cb5854d09b9e8e0a59247dcac97c64d6303d6c2385a617e8ec95bf3`, held-out |
| threshold 파일 | blob `ee1b5bc95cf83a0cbdee44f246aae875a811c8ff` |
| 모델 | 요청 `anthropic/claude-haiku-5.5`, 목록의 canonical `anthropic/claude-haiku-5.5-20261007`, 응답 `anthropic/claude-haiku-5.5` |
| 실행 제한 | 60000 ms, 출력 4000 토큰, 재시도 없음, 글당 한 번. 공급자 기본 디코딩 |
| 켠 설정 | {"equal starts with title similarity":true,"SAME_EVENT_TITLE_RULE":false,"SAME_EVENT_AI_CHOICE":false} |
| 캠퍼스 설정 | buildingNumberIsGwanak {"snu_events":true,"extra_snu":true} |
| 켠 검사 | announcesEvent, linesInPost, dateAgrees, weekdayAgrees, timeAgrees, notApplicationPeriod, startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches, newSession |
| 다시 쓴 답 | eval/results/collection-held-out-judgement-fed4a2e0.json |
| 사용량과 비용 | 호출 0, 입력 0 (캐시 읽기 0, 쓰기 0), 출력 0, USD 0.0000 (openrouter), 예산 USD 1 |

## 점수

| 지표 | 값 |
|---|---|
| D1 잘못된 자동 병합 | 0 |
| D2 TP / FP / FN | 2 / 0 / 30 |
| D2 정밀도 / 재현율 / F1 | 1.000 / 0.063 / 0.118 |
| D2 관리자 큐 포함 재현율 | 2/32 (6.3%) |
| D3 후보 단계 (Pair Completeness) | 7/32 (21.9%) |
| D4 관리자 큐 비율 | 0/26 (0.0%) |
| D4 이유별 | {} |
| D5 다대일 묶음 | 0/5 (0.0%) |
| D6 자동 붙이기 재현율 | 2/32 (6.3%) |

## threshold

| threshold | 종류 | 값 | 이번 | 판정 |
|---|---|---|---|---|
| d1.floor | floor | = 0 | 0 | PASS |
| d1.target | target | = 0 | 0 | PASS |
| d2.recall-with-queue.target | target | >= 0.8 | 2/32 | FAIL |
| d3.target | target | >= 0.95 | 7/32 | FAIL |
| d4.target | target | <= 0.3 | 0/26 | PASS |
| d6.target | target | >= 0.5 | 2/32 | FAIL |

## failure analysis

| 실패한 항목 | 실패한 검사 | 원인 분류 (자동, 사람이 확인) | 다음 run에서 바꾸는 것 |
|---|---|---|---|
| b-002 | 못 붙음 (none) | 후보 단계 누락 | |
| b-003 | 못 붙음 (none) | 후보 단계 누락 | |
| b-004 | 못 붙음 (none) | 후보 단계 누락 | |
| b-008 | 못 붙음 (none) | 후보 단계 누락 | |
| b-013 | 못 붙음 (none) | 후보 단계 누락 | |
| b-017 | 못 붙음 (none) | 후보 단계 누락 | |
| b-023 | 못 붙음 (none) | 제목 규칙 밖 (AI의 몫) | |
| b-029 | 못 붙음 (none) | 후보 단계 누락 | |
| b-035 | 못 붙음 (none) | 후보 단계 누락 | |
| b-038 | 못 붙음 (none) | 다대일 | |
| b-040 | 못 붙음 (none) | 후보 단계 누락 | |
| b-047 | 못 붙음 (none) | 다대일 | |
| b-048 | 못 붙음 (none) | 후보 단계 누락 | |
| b-057 | 못 붙음 (none) | 제목 규칙 밖 (AI의 몫) | |
| b-067 | 못 붙음 (none) | 후보 단계 누락 | |
| b-075 | 못 붙음 (none) | 후보 단계 누락 | |
| b-081 | 못 붙음 (none) | 후보 단계 누락 | |
| b-089 | 못 붙음 (none) | 후보 단계 누락 | |
| b-090 | 못 붙음 (none) | 후보 단계 누락 | |
| b-092 | 못 붙음 (none) | 다대일 | |
| b-093 | 못 붙음 (none) | 후보 단계 누락 | |
| b-094 | 못 붙음 (none) | 후보 단계 누락 | |
| b-096 | 못 붙음 (none) | 후보 단계 누락 | |
| b-098 | 못 붙음 (none) | 후보 단계 누락 | |
| b-100 | 못 붙음 (none) | 후보 단계 누락 | |
| b-105 | 못 붙음 (none) | 후보 단계 누락 | |
| b-108 | 못 붙음 (none) | 후보 단계 누락 | |
| b-109 | 못 붙음 (none) | 후보 단계 누락 | |
| b-110 | 못 붙음 (none) | 후보 단계 누락 | |
| b-113 | 못 붙음 (none) | 후보 단계 누락 | |
