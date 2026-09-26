# DB와 이미지 저장 구조 결정

Type: grilling
Labels: wayfinder:grilling
Status: needs-info
State: open
Assignee: unassigned
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: 01, 03, 06

## Question

주 데이터베이스, 공간 검색 확장, 이미지 객체 저장소, 최신 위치와 이력의 저장 범위, 데이터 제약의 책임을 어떻게 정할 것인가? 관계·권한·중복 QR 보상 방지를 고려해 PostgreSQL/PostGIS를 검토하되 선정은 사용자와 결정한다. 사용자가 Redis의 적극적인 활용을 허용했으므로 캐시·후보 인덱스·벡터 검색·큐의 구체적 배치와 복구/메모리 정책을 정한다. 별도 벡터 DB가 필요한지는 Redis 후보와 비교한다.

## Comments

- 2026-09-27: 사용자가 Redis를 필요에 따라 적극 쓰고 부하 감소를 기술적 기여로 측정하라고 했다. 재구축 가능한 캐시/벡터 인덱스와 동의·배정·가입의 DB 원본을 구분한다. Search 기능 지원·메모리 비용·캐시 eviction/큐 noeviction 분리는 [매칭 설계](15-party-matching.md)와 [조사](../research/matching-ai-redis.md)에 제안으로 기록했다.
- 2026-09-27 서비스 분리 반영: main 업무 DB와 worker 작업/수집 DB의 소유권을 분리하고 각자 migration·접근 역할을 갖는 안을 제안한다. 같은 PostgreSQL 인스턴스를 사용할지는 비용·운영 선택이며 한 공유 테이블에 여러 서비스가 직접 쓰는 구조로 해석하지 않는다. socket 최신 위치 TTL 저장소는 별도 후보이고 저장소 기술은 미확정이다. [상세 제안](13-project-organization.md).

- 2026-09-27 admin-backend 추가: 공식 행사 관리 원본·감사·관리 보고서 데이터를 admin이 소유하고 main은 학생 조회용 발행 데이터 사본을 소유하는 안을 제안했다. 사용자 답변 전이다. 동일 테이블 공동 쓰기나 전체 DB 공유를 승인받은 것으로 간주하지 않는다. 전파 지연·취소 경합·복구와 실제 물리 DB 부하 격리를 함께 결정한다.

- 2026-09-27 최신 답변으로 직전 admin 원본/main projection 분리 제안은 철회한다. 일반/관리 pool은 같은 main 업무 코드·소유 DB·migration을 사용한다. 전용 파드는 DB I/O·잠금 부하를 자동 격리하지 않으므로 관리 연결 상한·무거운 작업의 worker 이관을 검토한다.
