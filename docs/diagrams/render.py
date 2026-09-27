#!/usr/bin/env python3
"""Render README diagrams with measured Korean typography and layout assertions.
Requires Pillow; no network, credentials, application runtime or private data.
"""
from __future__ import annotations
import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
DEFAULT_FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
C = dict(bg='#F7F9FC', ink='#172D42', muted='#536578', line='#C7D3DF',
         blue='#2563A6', blue_bg='#ECF3FC', teal='#087B70', teal_bg='#EAF7F3',
         purple='#7451A6', purple_bg='#F2EDF9', amber='#996017', amber_bg='#FFF5E4',
         slate='#5D6C7B', slate_bg='#EEF2F6', white='#FFFFFF')


def overlaps(a, b):
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


class Canvas:
    def __init__(self, height, args):
        self.w, self.h, self.s = 1200, height, args.scale
        self.image = Image.new('RGB', (self.w*self.s, self.h*self.s), C['bg'])
        self.draw = ImageDraw.Draw(self.image)
        self.args, self.texts, self.cards, self.segments = args, [], [], []
        self.fonts = {}

    def font(self, size, bold=False):
        key = size, bold
        if key not in self.fonts:
            path = self.args.bold_font if bold and self.args.bold_font else self.args.font
            index = 6 if bold and path == DEFAULT_FONT else 0
            self.fonts[key] = ImageFont.truetype(path, size*self.s, index=index)
        return self.fonts[key]

    def rect(self, box, fill, outline=None, radius=18, width=1):
        self.draw.rounded_rectangle(tuple(round(v*self.s) for v in box), radius=radius*self.s,
                                    fill=fill, outline=outline, width=width*self.s)

    def wrap(self, text, width, size, bold=False):
        font = self.font(size, bold)
        lines = []
        for para in text.split('\n'):
            line = ''
            for char in para:
                trial = line + char
                if font.getlength(trial) / self.s > width:
                    if not line:
                        raise AssertionError(f'Character exceeds available width: {char}')
                    # Prefer a word boundary; Korean text remains safe without spaces.
                    split = line.rfind(' ')
                    if split > len(line)//2:
                        lines.append(line[:split])
                        line = line[split+1:] + char
                    else:
                        lines.append(line.rstrip())
                        line = char.lstrip()
                else:
                    line = trial
            lines.append(line.rstrip())
        return lines

    def text(self, text, box, size=23, bold=False, color='ink', line_height=None):
        x, y, right, bottom = box
        line_height = line_height or math.ceil(size*1.43)
        lines = self.wrap(text, right-x, size, bold)
        if y + len(lines)*line_height > bottom + 0.01:
            raise AssertionError(f'Text overflow ({len(lines)} lines): {text!r} in {box}')
        font = self.font(size, bold)
        for i, line in enumerate(lines):
            if not line:
                continue
            pos = (round(x*self.s), round((y+i*line_height)*self.s))
            bounds = self.draw.textbbox(pos, line, font=font, anchor='lt')
            actual = tuple(v/self.s for v in bounds)
            if not (x-0.1 <= actual[0] and actual[2] <= right+0.1 and y-0.1 <= actual[1] and actual[3] <= bottom+0.1):
                raise AssertionError(f'Ink outside box: {line!r}: {actual} not in {box}')
            self.draw.text(pos, line, font=font, fill=C[color], anchor='lt')
            self.texts.append((actual, line))
        return y + len(lines)*line_height

    def heading(self, title, subtitle):
        self.text(title, (48, 42, 1152, 102), size=39, bold=True, line_height=54)
        self.text(subtitle, (48, 109, 1152, 151), size=23, color='muted')

    def legend(self, y=163):
        specs = [('구현된 흐름', 'teal', 240), ('미검증: 기기·운영', 'amber', 290), ('향후 / 보류', 'slate', 255)]
        x = 48
        for label, color, width in specs:
            self.rect((x, y, x+width, y+44), C[color+'_bg'], C['line'], 10)
            self.text(label, (x+16, y+10, x+width-16, y+41), size=21, bold=True, color=color, line_height=30)
            x += width+16

    def card(self, x, y, w, h, title, body, color='teal', title_size=29, body_size=23):
        box = (x, y, x+w, y+h)
        self.rect(box, C['white'], C['line'], 20)
        self.rect((x, y, x+7, y+h), C[color], radius=3)
        self.cards.append(box)
        after = self.text(title, (x+25, y+23, x+w-25, y+h-22), title_size, True, color)
        self.text(body, (x+25, after+12, x+w-25, y+h-18), body_size, color='ink')
        return box

    def note(self, y, title, body, color='amber', height=125):
        self.rect((48, y, 1152, y+height), C[color+'_bg'], C['line'], 18)
        end = self.text(title, (70, y+18, 1130, y+height-18), size=24, bold=True, color=color)
        self.text(body, (70, end+10, 1130, y+height-12), size=22, color='ink')

    def arrow(self, points):
        assert len(points) >= 2
        self.draw.line([(round(x*self.s), round(y*self.s)) for x, y in points], fill=C['slate'], width=3*self.s, joint='curve')
        for a, b in zip(points, points[1:]):
            if a[0] != b[0] and a[1] != b[1]:
                raise AssertionError('Use orthogonal connectors only')
            self.segments.append((min(a[0], b[0])-2, min(a[1], b[1])-2, max(a[0], b[0])+2, max(a[1], b[1])+2))
        a, b = points[-2:]
        direction = math.atan2(b[1]-a[1], b[0]-a[0])
        tip = b
        left = (b[0]-10*math.cos(direction)+5*math.sin(direction), b[1]-10*math.sin(direction)-5*math.cos(direction))
        right = (b[0]-10*math.cos(direction)-5*math.sin(direction), b[1]-10*math.sin(direction)+5*math.cos(direction))
        self.draw.polygon([(round(x*self.s), round(y*self.s)) for x, y in [tip, left, right]], fill=C['slate'])

    def footer(self, y):
        self.text('구현 범위 기준 2026-09-27  ·  실제 데이터와 명시적 사용자 동의', (48, y, 1152, y+34), size=21, color='muted')

    def save(self, name):
        for i, (a, label) in enumerate(self.texts):
            if not (0 <= a[0] < a[2] <= self.w and 0 <= a[1] < a[3] <= self.h):
                raise AssertionError(f'Text outside canvas: {label}')
            for b, other in self.texts[i+1:]:
                if overlaps(a, b):
                    raise AssertionError(f'Text collision: {label!r} with {other!r}')
            for segment in self.segments:
                if overlaps(a, segment):
                    raise AssertionError(f'Connector intersects text: {label!r}')
        for segment in self.segments:
            if any(overlaps(segment, box) for box in self.cards):
                raise AssertionError('Connector crosses a card')
        self.args.output.mkdir(parents=True, exist_ok=True)
        self.image.save(self.args.output / f'{name}.png', optimize=True)
        if self.args.preview_dir:
            self.args.preview_dir.mkdir(parents=True, exist_ok=True)
            self.image.resize((900, round(self.h*900/self.w)), Image.Resampling.LANCZOS).save(self.args.preview_dir / f'{name}.png')
        print(f'{name}.png: {self.w*self.s}x{self.h*self.s}; {len(self.texts)} text lines, {len(self.segments)} connector segments; bounds/collisions PASS')


def architecture(args):
    c = Canvas(2120, args)
    c.heading('서비스 경계와 데이터 소유권', '화살표는 요청·전달 방향입니다. HTTP 응답은 같은 연결로 돌아옵니다.')
    c.legend()
    c.text('01  HTTP 업무 API와 소유 DB', (48, 240, 1152, 282), 29, True)
    c.card(48, 305, 280, 200, '모바일 / 관리자 웹', 'Expo → public\nNext.js → admin\nGoogle 인증', 'blue', 26, 23)
    c.card(418, 305, 330, 200, 'Main public / admin', '같은 이미지·업무 DB\n실행 풀과 라우트 분리\n행사·관계·파티·일정', 'teal', 26, 23)
    c.card(838, 305, 314, 200, 'main_db · Prisma', 'Main만 업무 데이터 저장\n퀘스트·시간표·개인 일정\n내구성 있는 outbox', 'purple', 26, 22)
    c.arrow([(336, 400), (410, 400)])
    c.arrow([(756, 400), (830, 400)])
    c.card(48, 615, 280, 175, '모바일', '매칭 요청 HTTP\n현재는 규칙 기반', 'blue', 27, 23)
    c.card(418, 615, 330, 175, 'Match 서버', '후보 계산·매칭 요청\nMain DB 직접 쓰기 없음', 'teal', 27, 22)
    c.card(838, 615, 314, 175, 'match_db · Prisma', '매칭 요청 소유\nMain DB와 역할 분리', 'purple', 26, 22)
    c.arrow([(336, 700), (410, 700)])
    c.arrow([(756, 700), (830, 700)])
    c.arrow([(583, 607), (583, 513)])
    c.text('내부 HTTP\n파티·멤버 생성', (620, 533, 990, 603), 22)
    c.text('PostgreSQL + PostGIS: 같은 인스턴스, 서로 다른 main / match DB', (48, 818, 1152, 854), 22, color='muted')
    c.text('02  Worker · 수집과 로컬 이미지 추출', (48, 892, 1152, 936), 29, True)
    c.card(48, 966, 280, 220, 'Main public', '캠퍼스 조회·사진 추출\n내부 HTTP로 요청\n행사 import도 Main 소유', 'teal', 27, 22)
    c.card(418, 966, 330, 220, 'Worker 서버', '공식 원천 수집\n이미지 → 편집용 초안\n업무 DB 직접 쓰기 없음', 'teal', 27, 23)
    c.card(838, 966, 314, 220, '원천 / 로컬 모델', '학교 공식 정보 HTTP\n호스트 Ollama HTTP\nQwen3-VL 2B · Docker 밖', 'blue', 26, 22)
    c.arrow([(336, 1045), (410, 1045)])
    c.arrow([(410, 1120), (336, 1120)])
    c.arrow([(756, 1075), (830, 1075)])
    c.card(48, 1250, 530, 165, 'Redis queue · BullMQ', 'Worker의 정기 수집 작업\ncache와 별도 컨테이너', 'purple', 27, 23)
    c.card(622, 1250, 530, 165, 'Redis cache', '행사·학식·셔틀 / 매칭 후보·임베딩\nMain이 저장하는 위치 최신값 TTL', 'purple', 27, 22)
    c.arrow([(500, 1242), (500, 1194)])
    c.arrow([(710, 1194), (710, 1242)])
    c.text('03  실시간 알림 · 본문은 HTTP로 재조회', (48, 1460, 1152, 1505), 29, True)
    c.card(48, 1540, 350, 190, '변경 알림 생산자', 'Main: DB outbox → relay\nMatch·Worker: 일시적 발행\n좌표·일정 본문 제외', 'teal', 26, 22)
    c.card(446, 1540, 208, 190, 'Redis', 'cache의\nPub/Sub', 'purple', 27, 23)
    c.card(702, 1540, 208, 190, 'Socket 서버', '인증된 대상에\nSocket.IO 힌트', 'teal', 25, 22)
    c.card(958, 1540, 194, 190, '모바일', 'ID·버전 수신\nHTTP 재조회', 'blue', 26, 22)
    for start, end in [(406, 438), (662, 694), (918, 950)]:
        c.arrow([(start, 1630), (end, 1630)])
    c.note(1770, '구현된 기능의 확인 범위', '사진 초안은 원본과 비교·수정한 뒤 사용자가 저장합니다.\n위치는 모바일 HTTP → Main으로 업로드하며, 공개 조건을 통과한 HTTP 조회로만 받습니다.', 'teal', 140)
    c.note(1930, '미검증 / 향후', '미검증: 실제 두 기기 위치·운영 부하  ·  향후: FCM, 도보 경로, AI 계획 추천', 'amber', 110)
    c.footer(2080)
    c.save('architecture')


def demo_event(args):
    c = Canvas(1590, args)
    c.heading('행사에서 동행 파티와 공동 계획까지', '매칭 파티 생성과 공동 퀘스트 저장은 서로 다른 사용자 행동입니다.')
    c.legend()
    for y, title, body, color in [
        (240, '1  실제 공개 행사 선택', '공식 공지 수집 또는 관리자가 등록한 행사에서 일시·장소를 확인합니다.', 'blue'),
        (465, '2  동행 조건 입력 + 자동 가입 동의', '활동·요청 시간대·인원·관심사를 정하고, 매칭된 파티에 가입할 의사를 표시합니다.', 'blue'),
        (690, '3  매칭 결과 → 파티와 멤버 생성', 'Match: Redis 후보·요청 시간 교집합 → Main: 트랜잭션으로 파티 확정\n규칙 기반 매칭이며 퀘스트는 자동 생성하지 않습니다.', 'teal'),
    ]:
        c.card(100, y, 1000, 180, title, body, color)
    c.arrow([(600, 428), (600, 457)])
    c.arrow([(600, 653), (600, 682)])
    c.arrow([(600, 878), (600, 908), (318, 908), (318, 942)])
    c.arrow([(600, 908), (882, 908), (882, 942)])
    c.card(48, 950, 540, 260, '4A  공동 계획은 따로 저장', '파티원이 시간·장소를 정해 저장\n최신 시간표·개인 일정·공동 약속의\n충돌을 확인한 뒤 퀘스트 생성\n파티원이 확인·수정할 수 있습니다.', 'teal', 29, 23)
    c.card(612, 950, 540, 260, '4B  위치는 공개 조건을 확인', '파티별 공유 기본 ON\n전체 공유·OS 권한은 별도입니다.\n관계별 공개 조건이 허용될 때만\nMain HTTP로 최신 위치를 조회합니다.', 'teal', 29, 23)
    c.note(1240, '공동 변경 동기화', 'Main outbox → Redis Pub/Sub → Socket.IO 변경 힌트 → 모바일 HTTP 재조회', 'teal', 110)
    c.note(1360, '미검증 / 향후', '실제 두 계정·이동·백그라운드 위치 검증은 남아 있습니다.\nAI 궁합 품질, 도보 이동시간 추천, 출석·완료 인증을 뜻하지 않습니다.', height=140)
    c.footer(1540)
    c.save('demo-event')


def demo_friends(args):
    c = Canvas(1660, args)
    c.heading('친구에게 구체적인 약속 계획 제안', '일반적인 “만나자” 요청이 아니라, 시간과 장소까지 정한 계획에 동의합니다.')
    c.legend()
    rows = [
        ('1  연결된 친구에게 계획 제안', '활동·시작/종료 시간·장소를 직접 정합니다. 보내는 사람은 이 계획에 동의합니다.', 'blue'),
        ('2  받은 계획을 읽고 응답', '수신자: 이 계획으로 약속 확정 / 거절  ·  발신자: 제안 취소', 'blue'),
        ('3  수락 순간 Main이 다시 검증', '현재 친구 관계와 등록된 수업·개인 일정·진행 중 공동 약속의 겹침을 확인합니다.\n충돌 시 생성하지 않습니다. 다른 사람의 일정 상세는 공개하지 않습니다.', 'teal'),
        ('4  비공개 2인 파티 + 퀘스트 생성', '동의와 최신 검증을 통과하면 하나의 트랜잭션으로 파티·멤버·퀘스트·outbox를 저장합니다.', 'teal'),
        ('5  공동 약속 확인·수정', 'Socket.IO 변경 힌트 → HTTP 재조회로 두 사람의 계획을 갱신합니다.\n위치 공유는 전체·관계별 설정을 따릅니다.', 'teal'),
    ]
    for i, (title, body, color) in enumerate(rows):
        y = 240+i*240
        c.card(100, y, 1000, 200, title, body, color, 28, 23)
        if i < len(rows)-1:
            c.arrow([(600, y+208), (600, y+232)])
    c.note(1430, '미등록 일정·이동시간은 직접 확인', '시간표가 없다고 “비어 있는 시간”으로 검증한 것은 아닙니다.\n향후: AI 장소·활동 추천과 도보 경로  ·  미검증: 실제 두 계정 앱 시연', height=150)
    c.footer(1610)
    c.save('demo-friends')


def demo_campus(args):
    c = Canvas(1700, args)
    c.heading('실제 캠퍼스 정보와 오늘의 수업 퀘스트', '외부 정보 조회와 나만의 시간표 계산은 서로 독립된 흐름입니다.')
    c.legend()
    c.text('생활 정보 · 실제 원천', (48, 237, 588, 282), 30, True, 'blue')
    c.text('내 수업 · 소유자만 보기', (612, 237, 1152, 282), 30, True, 'teal')
    left = [
        ('1  실제 원천', 'SNUCO 학식 · 학교 셔틀\n원천에 없는 값을 만들지 않습니다.', 'blue'),
        ('2  Worker가 정기 수집', 'BullMQ: 셔틀 60초 · 학식 30분\nRedis cache · 캐시 미스 시 요청 병합', 'purple'),
        ('3  앱에서 조회 / 다시 조회', '모바일 HTTP → Main → Worker\n사용자가 조회할 때 정보를 받습니다.', 'teal'),
        ('4  출처와 조회 시각 표시', '학식 공란·휴무·실패를 구분\n셔틀 차량이 없으면 그대로 표시\n셔틀 좌표는 노선도 픽셀, GPS 아님', 'blue'),
    ]
    right = [
        ('1  내 시간표 저장', 'Main DB에 학기·요일·시간 저장\n본인 전용 변경 힌트 → HTTP 재조회', 'purple'),
        ('2  오늘 수업을 앱에서 계산', 'Asia/Seoul 날짜·요일·학기 범위\n자정·시간 경과에 따라 다시 계산', 'teal'),
        ('3  수업 퀘스트 카드 표시', '수업 들으러 가기 · 수업명\n시간표에서 계산 · DB 퀘스트 행 없음', 'teal'),
        ('4  시간표 기준 상태', '예정 / 수업 시간 / 시간 지남\n출석·완료 인증을 뜻하지 않습니다.\n카드를 누르면 내 시간표 편집', 'blue'),
    ]
    for x, rows in [(48, left), (612, right)]:
        for i, (title, body, color) in enumerate(rows):
            y = 306+i*270
            c.card(x, y, 540, 230, title, body, color, 28, 23)
            if i < len(rows)-1:
                c.arrow([(x+270, y+238), (x+270, y+262)])
    c.note(1370, '정확한 표시 범위', '학식·셔틀 화면은 자동 실시간 지도 추적이 아닙니다. 실제 운행 차량 대응은 미검증입니다.\n수업은 등록 시간표 기준이며 휴일·일회성 휴강 정보는 포함하지 않습니다.', 'amber', 140)
    c.note(1530, '향후 / 보류', '향후: 보행 경로·AI 이동시간 추천  ·  보류: 도서관 좌석·예약', 'slate', 110)
    c.footer(1655)
    c.save('demo-campus')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font', default=DEFAULT_FONT, help='Korean-capable TTF/OTF/TTC font path')
    parser.add_argument('--bold-font', help='Optional separate bold font; default Apple collection uses index6')
    parser.add_argument('--scale', type=int, default=2)
    parser.add_argument('--output', type=Path, default=ROOT)
    parser.add_argument('--preview-dir', type=Path)
    args = parser.parse_args()
    if args.scale < 1:
        parser.error('--scale must be at least1')
    for renderer in [architecture, demo_event, demo_friends, demo_campus]:
        renderer(args)

if __name__ == '__main__':
    main()
