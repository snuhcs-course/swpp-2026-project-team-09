# 비공개 개인 일정

Status: ready-for-agent
State: implemented, integrated and locally deployed

기존 합의된 개인 행사 기능의 수동 입력 부분을 구현한다. 추가 제공자·서비스·업로드 저장소는 도입하지 않는다. 포스터 추출/AI/도보는 준비 후 후속 연결한다.

- 인증된 소유자만 조회·수정·삭제, 버전 CAS. 공개 행사/파티 목록과 분리. 관리자 권한도 개인 일정 접근 근거가 아니다.
- /v1/private-events GET/POST, /:id PATCH/DELETE. 제목·설명·시작/종료·선택 장소/좌표를 저장. 과거/중복 일정 가능, 각 구간 최대31일. 원천 일정 입력이 이미 확정된 다른 약속을 자동 변경하지 않는다.
- 시간표·퀘스트와 함께 확정 직전 충돌 판단에 사용. 사용자 행 잠금으로 개인 일정 변경과 새 약속 확정 순서를 직렬화한다. 상대방에게 원문을 주지 않는다.
- private-event.changed는 소유자에게만 ID/version 힌트. 클라이언트는 최신 인증 API로 재조회. 오래된 응답·저장 충돌에서 작성 내용을 자동으로 덮어쓰지 않는다.
- 추가 Prisma migration, 기존 데이터 보존, 격리 worktree 구현 후 root 리뷰/통합/0.0/Main squash.

## 검증

소유자 격리, 추측 ID의 outsider404, 버전 충돌과 수정/삭제 경합, 잘못된 시간/좌표, 공개 목록 노출 방지, 일정 충돌 차단과 삭제 후 재시도, 소유자 전용 Socket, 모바일 입력/버전/세션/삭제 확인 흐름을 확인한다.

## 검증 결과 (2026-09-27)

- API `6d64d32`, mobile `78602b9`를 별도 worktree에서 구현하고 root가 권한·잠금 순서·CAS·초안 보존·소켓 계약을 리뷰했다.
- Main48·mobile30·Socket4 검사가 통과했다. ARM64 APK·main/socket 이미지 빌드 및 서비스간 E2E 통과. E2E는 임시 DB/Redis만 사용하고 모두 정리했다.
- E2E에서 개인 일정의 소유자 한정 조회/수정/삭제, 버전 충돌, 공개 목록 비노출, 소유자 소켓 힌트, 일정 겹침 거부 후 삭제→동일 계획 수락을 확인했다.
- 보호된 로컬 백업(`artifacts/db-backups/main_db-20260927-before-private-calendar.dump`, Git 제외)을 만든 뒤 additive migration을 적용했다. 기존11개 업무 테이블의 전체 행 해시는 전후 동일했고 새 테이블은 비어 있었다. 실제 사용자용 시험 일정을 만들지 않았다.
- public/admin/socket/worker/match/Next 모두 HTTP200. 새 APK를 에뮬레이터에 설치했으며 기존 Google 계정으로 실제 재로그인했다.
- APK SHA256: `ba17d94f1b756762078189b9be799fe14876d6c39ad85e79f8114217a273deb1` (62,168,497bytes).
- 이미지 추출, AI 추천, 도보 검증, 실제 두 계정의 앱 간 수락 시연, 실기기 백그라운드 위치는 이 검증에 포함되지 않는다. 전체 MVP는 미완료다.

- 실제 로그인 세션에서 약속 탭→내 개인 일정의 정상 목록/빈 상태를 화면으로 확인했다.
