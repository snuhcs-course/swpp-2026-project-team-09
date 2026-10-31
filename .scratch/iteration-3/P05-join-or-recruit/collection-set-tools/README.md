# 평가 A·B 세트를 만든 도구

한 번 쓰고 끝나는 스크립트입니다. 2026-10-31에 이 순서로 돌린 그대로 남깁니다. 세트 자체와 기록은 `main-server/eval/collection/`에 있습니다. 평가 실행기는 저장본만 읽으므로 이 스크립트를 다시 돌릴 일은 없습니다.

Playwright와 cheerio가 필요하고, 사이트 요청은 2초 간격입니다.

| 순서 | 파일 | 하는 일 |
|---|---|---|
| 1 | `lists.mjs` | SNU Now 목록(2026-08-01~2027-10-31) 읽기. 이 스크립트의 비교과 부분은 선택자가 틀려 쓰지 않았고 2번이 다시 읽었습니다 |
| 2 | `fetch-all.mjs` | 비교과 기본 목록(모집 마감 제외)과 그 상세, SNU Now 177300 이후 상세 받기 |
| 3 | `closed-list.mjs`, `fetch-closed.mjs` | 모집 마감 목록(`applyChkCdSh=0003`) 25쪽 읽기, `PGM012002150` 이후 상세 받기 |
| 4 | `fetch-older.mjs`, `fetch-older-extra.mjs` | 쌍을 더 찾으려고 SNU Now 176900–177299, 모집 마감 `PGM012002050`–`PGM012002149` 받기 |
| 5 | `analyze.mts` | 규칙으로 판정. SNU Now는 `parseEventPage` + `namedPlace`, 비교과는 강좌 정보 표의 회차별 기간·장소에 `readEventTime` + `namedPlace` |
| 6 | `overlap2.py` | 겹침 후보 찾기(본문 링크, 제목 유사도, 본문 날짜). 후보를 사람이 아닌 에이전트가 원문과 대조해 골랐고, 정답은 라벨로 정합니다 |
| 7 | `build-sets.py` | 세트, 저장본 복사, 빈 라벨 파일, `places.tsv` 생성(난수 시드 20261031) |
