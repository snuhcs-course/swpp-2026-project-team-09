# AI 추천과 앱 도구 실행 범위 결정

Type: grilling
Labels: wayfinder:grilling
Status: needs-info
State: open
Assignee: unassigned
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: 01, 04, 06

## Question

MVP의 챗봇이 어떤 기능을 조회·추천·실행하고, 추천 후보/일정/이동시간/권한은 코드와 모델 중 누가 검증하는가? 파티 자동 생성·가입·초대 등 상태 변경에 필요한 사용자 의사 확인, 대화 맥락, 장기 작업, 실패 복구와 평가 기준을 정한다. 시간표/포스터 추출 및 벡터 검색 도입 여부는 확정된 MVP에 맞춘다.

## Comments

- 2026-09-27: match-server AI를 자연어 해석/설명에서 의미 후보 검색·양방향 적합도 계산으로 확장하는 안을 제시한다. 초기 사전 임베딩+규칙과 상위 후보 reranker 실험을 구분하고 원본 권한/시간/자동 가입 범위는 코드로 검증한다. 모델/제공자는 미정이며 신규 학습 모델을 이미 보유했다고 주장하지 않는다. [AI·Redis 매칭 설계](15-party-matching.md)
- 2026-09-26 [기능별 기술 설계 초안](../spec.md)에 도구 범위·맥락·서버 검증을 제안했다. [AI 실행·업로드·푸시·인증의 보충 근거](../research/ai-upload-primitives.md)는 research/ai-upload-primitives, commit 66c7db2d9442222cb392318c1b53ffe377663d1b에 보존했다. 사용자와 채택 범위를 합의하기 전까지 이 티켓은 열어 둔다.
