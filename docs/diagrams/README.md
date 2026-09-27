# README 그림 재생성

네 PNG는 `render.py`의 고정 레이아웃과 실제 글꼴 폭 측정으로 생성합니다. 네트워크, 자격 증명, 실행 중인 서버가 필요하지 않습니다. 내용의 코드 근거는 [content-notes.md](content-notes.md)에 정리되어 있습니다.

Python 3와 Pillow가 설치된 환경에서 저장소 루트에서 실행합니다.

```sh
python3 docs/diagrams/render.py --preview-dir /tmp/readme-diagrams
```

기본 글꼴은 macOS의 Apple SD Gothic Neo입니다. 다른 OS에서는 한글을 지원하는 글꼴을 지정합니다. 글꼴이 달라지면 줄바꿈도 달라질 수 있으므로 검사 실패를 무시하지 말고 여백이나 문구를 조정합니다.

```sh
python3 docs/diagrams/render.py --font /path/to/Korean-Regular.ttf --bold-font /path/to/Korean-Bold.ttf
```

논리 너비는 1200px이며 기본 `--scale 2`로 2400px PNG를 만듭니다. 본문은 논리 22–23px, 제목은 39px입니다. `--output`으로 별도 출력 폴더를 지정할 수 있습니다. `--preview-dir`은 README 폭에 가까운 900px 미리보기를 함께 생성합니다.

| 파일 | 픽셀 크기 | 설명 |
| --- | --- | --- |
| architecture.png | 2400 × 4240 | HTTP·데이터 소유권, Worker·원천, Socket 알림 경로 |
| demo-event.png | 2400 × 3180 | 행사 매칭 동의, 파티 생성, 별도 공동 계획 저장 |
| demo-friends.png | 2400 × 3320 | 구체적인 친구 약속 수락과 일정 재검증 |
| demo-campus.png | 2400 × 3400 | 실제 정보 수집·조회와 본인 시간표의 로컬 계산 |

2026-09-27 렌더 검증: 네 그림 모두 텍스트 영역/캔버스 경계, 텍스트 간 충돌, 연결선과 텍스트/카드 교차 검사 통과. 생성된 원본과 900px 미리보기를 직접 확인해 한글 잘림, 겹침, 화살표 침범이 없음을 확인했습니다. 동일 환경 재생성 결과는 바이트 단위로 동일합니다. 글꼴을 바꾸거나 문구·배치를 수정하면 다시 원본과 README 크기에서 확인합니다.

파랑은 클라이언트·원천, 청록은 서비스·구현 흐름, 보라는 저장소, 황색은 확인 한계입니다. 색만으로 상태를 구분하지 않고 구현/미검증/향후/보류 문구도 표시합니다. 그림은 실제 운영 검증이나 AI 품질을 주장하지 않습니다. 전체 저장소 연결을 모두 그리지 않고, 핵심 요청 방향과 소유권을 보여 줍니다. 특히 Main만 main_db를 쓰며, 행사 매칭은 퀘스트를 자동 생성하지 않고 수업 카드는 DB 퀘스트 행을 만들지 않습니다.
