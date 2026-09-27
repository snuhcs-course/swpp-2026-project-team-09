# 시간표 기반 당일 수업 퀘스트

Status: ready-for-agent
State: implemented, reviewed, integrated and locally deployed
Updated: 2026-09-27

사용자 요청: 시간표가 있으면 그날 기본 퀘스트 목록에 수업에 가는 활동을 표시한다. 결정적으로 계산 가능한 매 수업을 DB 퀘스트 행으로 복제하지 않는 방향이다.

## 구현 경계

- 시간표 원본과 버전은 기존 main 소유 users.timetable/timetable_version에 보존한다. 기존 quests는 party_id가 있는 공동 활동 계획이며 그대로 유지한다.
- 앱은 기존 소유자 GET /me/timetable 응답에서 Asia/Seoul 날짜, 학기 범위, 요일, 시작·종료 분을 사용해 당일 수업을 계산한다. 생성 ID는 class:<entryId>:<date>로 버전·정렬 변경에 흔들리지 않는다. DB occurrence나 일별 생성 worker, 새 Redis 캐시는 추가하지 않는다.
- 지도 하단과 약속/파티에서 시간표 기준의 개인 수업과 기존 공동 퀘스트를 표시한다. 시간 상태는 예정/수업 시간/시간 지남이다. 완료 체크, 출석·위치 검증, 보상은 추가하지 않는다.
- 시간표 저장과 본인 전용 timetable.changed outbox 힌트를 한 transaction으로 기록한다. 소켓은 원문 없이 ID/version만 전달하며 모바일은 자기 시간표를 재조회한다. 오래된 응답이 저장 직후의 최신 원본을 덮어쓰지 못한다.
- 앱에서 날짜/시각 변화만으로 다시 계산하며, 현재 원본에는 휴강·보강/공휴일 예외가 없으므로 임의 추정하지 않는다. 추후 사용자별 완료·숨김·휴강 등이 필요해지면 그 예외 상태만 별도 보존하는 설계를 논의한다.
- 시간표 조회·인증에는 DB 읽기가 남는다. 이 변경은 반복 퀘스트 저장/갱신을 피하며 전체 DB 조회가 없어지거나 측정하지 않은 부하 개선이 있다고 주장하지 않는다.

## 검증

서울 날짜 경계·학기 양끝·요일·24:00·미설정·순서/버전과 무관한 ID, 원본 보존, 취소 공동 퀘스트 분리, 계정 전환/구버전 응답 방어를 검증한다. 서버는 저장/힌트 원자성·stale no-hint·권한 검증, 소켓은 소유자 제한/원문 제거를 확인한다. 기존 DB/실제 시간표에 테스트 수업을 넣지 않는다. worktree별 구현 → root 리뷰 → E2E/APK → 0.0/Main squash.

## 검증 기록

- 별도 worktree에서 main/socket `42e714f`, mobile `e2136bf` 구현. Root는 시간표 잠금/힌트 원자성·소유자 제한·source version/epoch/session 방어·날짜 경계를 리뷰했다.
- Main49/49(DB 검사 포함, skip0), Socket5/5, mobile36/36, TypeScript 빌드 통과.
- 서비스간 E2E: 시간표 저장→소유자만 metadata hint, stale 저장의 추가 hint 없음, 기존 quests 행 증가 없음. 기존 비공개 일정/친구 약속/파티/매칭/캐시/DB 재연결 회귀 통과. 시험 데이터는 임시 DB/Redis에만 생성하고 제거했다.
- 이번에는 schema/migration 변경이 없다. 기존 main/socket 이미지만 로컬에서 갱신했다.

- Android ARM64 APK 빌드/설치 성공. 실제 로그인 세션에서 지도 하단과 약속 탭의 오늘 수업·시간표 미설정 안내를 확인했다. 실제 사용자 시간표에는 시험 수업을 저장하지 않았다. 수업이 있는 경우의 계산은 격리된 입력으로 테스트했고 실제 시간표 입력 후 화면 확인은 사용자 검증 항목이다.
- APK SHA256: `44dd5e78be405d7c895a9597ffd886ab4b59afca56dbc6b029d866ccc59d6158`. API/public/admin/socket/worker/match/Next 모두 HTTP200.
