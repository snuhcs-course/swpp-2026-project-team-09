# 매칭 AI의 Redis 활용과 부하 검증

조사일: 2026-09-27. 공식 문서 기반 설계 조사이며 구현·성능 측정 결과가 아니다. Redis를 필요에 따라 적극 활용한다는 사용자 방향을 반영한다. 구체적인 Redis 배포, 벡터 엔진, 큐 기술은 선택 제안이다.

## 권고 요약

매칭의 반복 후보 조회·임베딩 재계산·동시 재처리를 줄이는 데 Redis를 쓴다. 영속 DB는 매칭 요청·자동 가입 동의·취소·배정 및 최종 파티 가입의 원본으로 유지한다. Redis가 재시작되면 원본으로 조회용 데이터를 복구할 수 있어야 한다. 전 학생 프로필을 매번 LLM에 보내거나 전원 간 조합을 생성하지 않는다.

```text
영속 매칭 요청 + 변경 기록
       ↓ 변경 전달 / 복구 시 재구축
Redis: 현재 유효한 매칭 요청의 필터·벡터·대기 순서
       ↓ 제한된 후보 조회
match-server: 정확한 조건 검사 + 의미 점수 + 그룹 구성
       ↓ 배정 ID / 요청 버전 / 멱등 확정
main-server: DB 트랜잭션으로 최종 파티 생성·가입
```

## 1. 후보 조회와 임베딩 재사용

AI 설계 참고: 추천 시스템의 후보 생성·점수·재정렬을 나누는 구조는 [Google 추천 개요](https://developers.google.com/machine-learning/recommendation/overview/types), 사전 임베딩 검색 후 상위 후보를 함께 읽는 cross-encoder는 [Sentence Transformers Retrieve & Re-rank](https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html)에서 확인했다. 이것은 일반 검색/추천 근거이며 학교 동행의 품질 보장은 아니다. 프로필/동행 선호를 구분한 양방향 점수와 그룹 목적함수, Redis와 AI를 분리한 비교 실험은 [프로젝트 설계 제안](../issues/15-party-matching.md)에 기록한다.

Redis Set은 고유 요청 ID 집합과 교집합, Sorted Set은 점수에 따른 정렬·범위 조회에 적합하다. 다음 키 배치는 응용 설계 예시다. [Sets](https://redis.io/docs/latest/develop/data-types/sets/), [Sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/)

| 용도 | 제안 데이터 | 줄이는 작업 |
|---|---|---|
| 행사·활동별 대기자 | `match:event:{id}` Set | 전체 매칭 요청 DB 스캔 |
| 오래 기다린 요청 우선 | `match:waiting:{partition}` Sorted Set, 신청 시각 점수 | 매번 전체 정렬 |
| 만료 처리 | `match:expires` Sorted Set, 만료 시각 점수 | 전체 요청 만료 검사 |
| 후보 특성 | 요청별 Hash/JSON: 상태·버전·활동·시간·명시적 선호 | 후보마다 main API/DB 조회 |
| 임베딩 | `embedding:{modelVersion}:{inputHash}` | 동일 텍스트의 반복 모델 호출 |
| 공개 행사·지도 정보 | 행사 버전과 조회 범위를 포함한 캐시 키 | 많은 앱의 동일 조회 |

활성 인덱스에는 **현재 매칭에 동의한 유효 요청만** 넣고, 취소·만료·소비된 요청은 제거한다. TTL만 믿지 않고 원본 상태와 버전을 최종 검증한다. 임베딩 키는 모델·전처리 버전·텍스트 해시를 포함하고 개인 데이터는 사용자/권한 범위도 구분한다. 임베딩은 학습 데이터나 영구 사용자 분류가 아니라 해당 요청의 활동·선호 의미 표현으로 제한하는 안이다.

시각 구간의 실제 교집합, 차단 관계, 전체 그룹의 시간 가능 여부는 정확한 코드 검사다. Set으로 단순화하려고 시간대를 거칠게 잘라 유효 후보를 누락하지 않는다. 후보 조회는 제한된 크기로 페이지 처리하며, 사용자 수가 작을 때는 SQL 인덱스 조회와 프로세스 내 정확한 cosine 계산도 함께 비교한다.

## 2. 벡터 검색을 쓴다면

Redis Search는 Hash/JSON 문서의 벡터와 TAG·NUMERIC 등 필터를 결합할 수 있다. `FT.SEARCH`의 개념형은 `필터=>[KNN K @vector $BLOB] ... DIALECT 2`이다. **결과는 필터를 만족하지만 실행이 언제나 선필터 후 벡터 계산인 것은 아니다.** Redis는 조건에 따라 후보 배치 방식과 필터 후 직접 거리 계산 등을 선택한다. 그룹 전체의 조건은 검색 결과에 대해 재검증한다. [Vector search](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/), [Query syntax](https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/)

우리 제안은 행사/활동·유효 상태 등으로 후보를 제한하고 의미상 가까운 후보를 가져온 뒤 시간 여유·대기 시간 등 구조화 점수를 결합하는 것이다. Top-K 숫자는 성능·재현율 측정 후 선택한다. 같은 행사 희망자라도 함께할 방식의 선호가 다를 수 있으므로 행사 설명 자체보다 요청자가 명시한 활동 선호를 비교한다.

FLAT은 정확한 탐색 기준선, HNSW는 근사 탐색 후보로 삼는다. 소규모에서 HNSW가 더 빠르다고 단정할 수 없다. 인덱스 메모리·업데이트 비용과 recall@K를 함께 측정한다. 후보군이 작으면 정확 검색이 단순하고 충분할 수 있다. 이는 우리 규모에 대한 설계 판단이며 측정 결과가 아니다. [Redis vector index 설명](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/)

배포 주의: Redis 8.0은 이전 Stack 기능을 통합한 OSS 배포에 Search 등을 포함한다. 그렇다고 오래된 `redis:7` 또는 모든 Redis 호환 호스팅에 `FT.CREATE`/`FT.SEARCH`가 있는 것은 아니다. 배포판·고정 버전·지원 명령을 확인하고 최소 인덱스 생성/조회 검증을 해야 한다. Redis Cloud도 버전·플랜·유형의 지원 조건을 확인한다. [Redis 8.0](https://redis.io/docs/latest/develop/whats-new/8-0/), [Cloud capabilities](https://redis.io/docs/latest/operate/rc/databases/configuration/advanced-capabilities/)

## 3. 캐시를 적극 사용하면서 오래된 결과를 막기

다음은 응용 일관성 설계다.

- 행사 원본 수정과 outbox를 같은 DB 트랜잭션에 저장한다. 캐시/인덱스 소비자는 객체 버전을 비교해 오래된 변경을 무시한다.
- 임베딩은 텍스트가 바뀌었을 때만 다시 만든다. 요청 버전 v3용 계산이 늦게 끝나 v4를 덮지 않게 한다. 모델 버전이 바뀌면 임베딩 공간과 인덱스를 구분한다.
- 캐시 TTL은 회복 장치다. 어드민 수정 반영은 변경 이벤트로 한다. 행사 상세뿐 아니라 날짜별 목록·지도 영역 등 관련 조회 캐시도 무효화한다.
- 인기 키가 만료되면 짧은 `SET NX PX` 임대와 토큰 확인 해제로 재생성을 합친다. 대기자는 짧게 재조회하거나 제한된 대체 경로를 사용한다. TTL에 지터를 주면 동시 만료를 완화할 수 있다. [Redis cache-aside의 stampede 방지 예시](https://redis.io/docs/latest/develop/use-cases/cache-aside/java-jedis/)
- 임대 만료 후 이전 계산이 종료될 수 있으므로 singleflight는 DB의 유일성 보장이 아니다. 캐시 쓰기도 원본 버전/세대 확인이 필요하다. Redis 장애 때 모든 요청을 무제한 DB로 우회시키면 오히려 DB가 과부하된다. 후보 크기·동시성 제한과 지연 재시도를 둔다.
- 개인정보·권한·매칭 요청·후보 버전이 다른 결과에 의미 유사 캐시를 재사용하지 않는다. 임베딩 캐시와 최종 가입 결과 캐시는 다른 문제다. 특히 사람 매칭 결과를 텍스트가 비슷하다는 이유로 그대로 반환하지 않는다.

## 4. Redis 원자성은 최종 가입의 원본을 대신하지 않음

Lua는 한 Redis 실행 안의 짧은 상태 검사와 변경을 원자적으로 수행할 수 있다. 대기 상태·버전 확인과 임시 점유를 묶어 경쟁하는 계산을 줄이는 용도로 쓴다. Lua 실행은 다른 작업을 막으므로 긴 후보 탐색·AI 호출·대규모 반복은 스크립트 밖에서 수행한다. [Lua 실행 특성](https://redis.io/docs/latest/develop/programmability/eval-intro/)

Redis의 임시 점유가 만료되어도 이미 main에서 생성된 파티는 사라지지 않는다. 따라서 main의 최종 DB 트랜잭션은 배정 ID의 멱등성과 매칭 요청의 1회 소비를 유일 제약/상태 전이로 보장한다. 취소와 확정이 경쟁하면 영속 요청 상태의 전이 순서로 승자를 결정한다. 응답 유실 시 같은 배정 ID로 상태를 조회·재시도하고 새 파티를 만들지 않는다. Redis 복제는 기본적으로 비동기이므로 Redis 락만으로 이 경계를 안전하다고 주장하지 않는다. [Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## 5. 변경 이벤트·큐·캐시는 수명과 유실 정책이 다름

Redis Pub/Sub은 at-most-once이고 단절 중 메시지가 유실된다. 화면에 재조회하라는 신호에는 사용할 수 있지만 매칭 요청·배정 확정·캐시 동기화의 유일한 기록으로는 부족하다. 앱 복귀 시 원본 상태 재조회가 필요하다. [Pub/Sub delivery](https://redis.io/docs/latest/develop/pubsub/)

Redis Streams consumer group은 ACK 전 실패한 작업을 pending으로 추적하고 `XAUTOCLAIM` 등으로 복구할 수 있다. at-least-once 처리는 중복 실행을 허용하므로 소비자는 변경 ID·버전으로 멱등 처리한다. 기록 보관 길이, 지연 소비자, 재처리 한도, 지속 실패 관측을 설계해야 한다. Streams를 쓴다고 DB와 원자적으로 쓰이거나 영구 무손실이 되는 것은 아니다. Redis persistence 설정과 outbox 원본을 함께 다룬다. [Streams](https://redis.io/docs/latest/develop/data-types/streams/), [Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

BullMQ를 비동기 임베딩 작업 등에 채택한다면 공식 지침은 `maxmemory-policy=noeviction`이다. 따라서 메모리가 차면 버려도 되는 조회 캐시와 큐/매칭 제어 상태의 Redis를 **서로 다른 인스턴스로 분리하는 안**이 적절하다. 같은 Redis의 DB 번호·키 접두사만 나누어서는 메모리/eviction 정책이 독립되지 않는다. noeviction도 메모리 한도에서 쓰기 실패가 발생하므로 용량·지연·실패 모니터링은 필요하다. Redis Streams와 BullMQ와 RabbitMQ를 목적 없이 모두 추가하지 않는다. [BullMQ production](https://docs.bullmq.io/guide/going-to-production), [Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/), [Logical databases](https://redis.io/docs/latest/commands/select/)

## 6. 기술 발표에서 보여 줄 비교 실험

같은 데이터·서버 자원·요청 패턴으로 단계를 비교한다. 최적화 전의 기준선도 적절한 SQL 인덱스·배치 조회를 사용해야 한다.

1. SQL 후보 조회 + 정확 의미 점수: 기능과 품질 기준선.
2. 같은 알고리즘 + Redis 활성 후보 인덱스/임베딩 캐시: 반복 DB 조회·AI 호출 감소 검증.
3. 필요한 경우에만 벡터 인덱스/후보 축소 추가: 지연 감소와 후보 누락의 교환 관계 검증.

| 관점 | 측정할 항목 |
|---|---|
| DB 부하 | 요청당 쿼리 수, 총 DB QPS·CPU·연결 사용량 |
| 응답·처리 | p50/p95/p99, 처리량, 에러율, 큐 대기 시간, 실제 매칭 대기 시간 |
| Redis | 캐시 적중률, 메모리·eviction, 조회 지연, hot key, 복구 시간 |
| AI | 요청당 모델 호출 수·토큰·비용·임베딩 캐시 적중률 |
| 품질 | 사람 평가/합의된 정답셋 기반 적합도, exact 기준 recall@K, 필수 조건 위반 수 |
| 정합성 | 중복 가입·취소 후 가입 수, 변경 반영 지연, 요청 유실 여부 |

평상시의 따뜻한 캐시만 보여 주지 않는다. 첫 실행의 차가운 캐시, 행사 일괄 수정, 인기 행사 동시 요청, Redis 재시작, 소비자 종료, AI timeout을 함께 본다. k6는 사용자 수 고정뿐 아니라 도착률을 정한 부하와 p95/error threshold를 지원한다. 테스트 데이터 수는 실험 설정으로 명시하고 실제 사용자 규모처럼 표현하지 않는다. 정합성 측정과 AI 품질 평가는 HTTP 지연만으로 대체할 수 없다. [k6 arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/), [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)

성능 개선 비율이나 처리 가능 사용자 수는 아직 측정하지 않았으므로 제시하지 않는다. 기술적 깊이는 Redis 개수보다 **후보 축소·계산 재사용·실패 복구·품질과 부하의 동시 검증**에서 드러나도록 설계한다.
