# 데이터 저장과 실시간·작업 처리 선택지 조사

Type: research
Labels: wayfinder:research
Status: ready-for-agent
State: resolved
Assignee: backend_research
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: none

## Question

NestJS와 PostgreSQL/PostGIS가 친구·파티·행사·시간표·권한·QR 중복 방지 요구에 맞는가? 문서형 DB와의 trade-off, 이미지 저장·벡터 검색의 필요 조건, API 내 WebSocket Gateway, 별도 worker 프로세스와 호스트의 차이, Redis 기반 및 PostgreSQL 기반 큐 선택지를 공식 문서로 확인한다. 위치 접근 철회와 작업 재시도의 정확성 제약을 조사한다.

## Comments

- 2026-09-26 기능별 설계의 보충 근거: [위치 공개·실시간 전달·동시성](../research/realtime-consistency.md). 연구 맥락은 research/realtime-consistency, commit a09c8e549c6992e025db35717cbb6985d97241bd에 보존했다. 구현 검증이나 설계 채택을 의미하지 않는다.

## Answer

2026-09-26 조사 완료. 관계·공간·권한 요구에는 PostgreSQL/PostGIS가 적합한 기본 후보이다. NestJS Gateway는 API와 같은 프로세스·포트를 사용할 수 있으므로 별도 socket 서비스는 필수가 아니다. 장시간·재시도 작업을 별도 worker 프로세스로 분리해도 초기에는 같은 호스트에서 실행할 수 있다.

Redis는 필수가 아니며 PostgreSQL 기반 큐와 BullMQ + Redis의 운영·통합 비용을 비교하면 된다. 기본 Socket.IO 전달은 이벤트 영구 보존을 보장하지 않는다. 권한 철회는 연결 인증이나 클라이언트 room 이탈에 의존할 수 없으며 송신 시점·경쟁 상태 정책이 필요하다.

- 상세 근거와 선택지: [백엔드·데이터베이스·서버 구성 조사](../research/backend-feasibility.md).
- 보존된 조사 맥락: research/backend-feasibility, commit 7129e7469d11a4054ced68742e830756ec1442b2, 파일 .scratch/architecture-planning/research/backend-feasibility.md.
- 조사 종료는 DB·큐·배포 방식 확정을 의미하지 않는다. 실행·부하·배포 검증은 수행하지 않았다.
