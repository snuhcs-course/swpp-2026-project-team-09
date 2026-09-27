# 지도·추출·푸시 제공자 결정

Status: needs-info
Updated: 2026-09-27

## 사용자 결정

- 지도는 Naver 유지. 장소/경로도 Naver API부터 고려하도록 요청했다. Kakao 채택은 아직 확정하지 않았다.
- 푸시는 Firebase FCM 사용으로 확정. 프로젝트 구성 파일과 서버 송신 인증은 아직 준비되지 않았다.
- AI 이미지 추출은 처음에는 무료 모델을 실행하는 방향. 유료 OpenAI 이미지 API 요청은 초기 필수가 아니다. 전체 AI 매칭/대화 모델까지 선택한 것으로 확대하지 않는다.
- 사용자는 Ollama + Qwen3-VL 2B Instruct 양자화 모델의 로컬 구현·평가를 승인했다. 지도는 Naver의 도보 API 부재 시 전체 Kakao 전환도 고려하도록 요청했으며, 실제 전환 승인은 아직 아니다.
- 월 예산 미정, 기존 서버 없음. 외부 호스팅/유료 자원 생성 승인이 아니다.

## 확인한 공식 근거

- [Naver Directions5](https://guide.ncloud-docs.com/docs/maps-direction5-api)는 자동차 경로만 제공한다고 명시한다. 네이버 소비자 앱의 도보 길찾기와 공개 API 제공 범위는 다르다.
- [NAVER API HUB 지역 검색](https://api.ncloud-docs.com/docs/naver-api-hub-search-local)은 업체/기관 검색·좌표를 제공하며 한 요청1~5개 결과를 반환한다. [HUB 키 발급](https://api.ncloud-docs.com/docs/naver-api-hub-overview)은 Maps 모바일 Client ID와 별도 서비스 설정이다. [신규 신청 이관](https://developers.naver.com/notice/article/32530)에 따라2026-07-31 이후 새 검색 API 신청은 HUB 기준으로 안내한다.
- 지역 검색 결과의 표시·재정렬·저장·AI 입력 허용은 적용되는 HUB 이용 조건을 별도로 확인한다. [개발자센터 검색 약관 변경](https://developers.naver.com/notice/article/33400)을 HUB의 동일 조건이라고 단정하지 않으며, 검색 결과를 자유롭게 AI에 전달/영구 수집할 수 있다고 가정하지 않는다.
- [Kakao 도보 API](https://developers.kakao.com/docs/ko/kakaomap/rest-api#walk-directions)는 공개 문서에 GET /v2/routing/walk가 있다. 실제 키 접근·교내 경로/시간·Naver 지도와 사용 조건 검증은 미완료다. [전체 Kakao 전환 검토](kakao-review.md) 후, 네이버 화면 유지+카카오 도보 우선 검증 또는 카카오 네이티브 전환 검증 중 사용자 결정을 기다린다.
- [FCM Android](https://firebase.google.com/docs/cloud-messaging/android/get-started)와 [Firebase 등록](https://firebase.google.com/docs/android/setup)에 따라 기존 Google Cloud 프로젝트에 Android 앱 kr.ac.campus.prototype를 연결할 수 있다. 앱 설정 파일 외에 서버 발송 인증도 필요하다.

## 무료 이미지 추출 구성 — 구현·평가 승인

현재 호스트는 Apple M1/16GiB 메모리이다. [Ollama의 Metal 지원](https://docs.ollama.com/gpu)과 [Qwen3-VL](https://github.com/QwenLM/Qwen3-VL)을 이용하여 native macOS 실행을 제안했고 사용자가 이 구성으로 구현·평가를 승인했다. 모델은 우선 [qwen3-vl:2b-instruct-q4_K_M](https://ollama.com/library/qwen3-vl:2b-instruct-q4_K_M), 약1.9GB 가중치이며 실행 메모리는 별도다. Docker/에뮬레이터가 함께 메모리를 사용하므로 작은 모델·짧은 입력·동시성1부터 실측한다. Ollama0.34.4 및 고정 모델을 설치·실행했고 실제 추출을 평가했다. 결과와 한계는 [평가 기록](../local-image-extraction/evaluation.md)에 있으며,2B는 자동 등록 품질에 못 미친다.

초기 구성: main의 사용자 소유 업로드/작업 → 기존 worker의 추출 작업 → 로컬 모델 → 구조화 초안 → 날짜/요일/겹침 서버 검증 → 사용자 수정/확정 → 기존 시간표 또는 개인 행사 저장. 모델은 원본 이미지의 지시문을 실행하는 도구가 아니라 추출기이며, 불명확한 필드는 추정 확정하지 않는다. 저장소/업로드 세부 구현은 기존 비공개 데이터 소유권 안에서 구체화한다.

API 호출료가 없는 가중치 실행과 무료 클라우드 호스팅을 혼동하지 않는다. 한국어 시간표의 요일/시간 칸 대응·포스터 날짜/장소 추출 정확도와 M1에서의 응답시간은 실제 자료로 검증할 과제다. 큰 모델의 속도/정확도를 이미 확보했다고 주장하지 않는다.

현재 이미지 추출은 원본을 저장하지 않는 인증된 동기 요청(main→worker→로컬 모델)으로 구현했다. 모바일 원본 비교/수정 후 명시적으로 저장한다. 행사 일정 문구→보수적 코드 파서, 시간표 시각 문구→분 단위 코드 변환을 사용하며 AI가 판독한 원문 자체의 정확도는 보장하지 않는다.
