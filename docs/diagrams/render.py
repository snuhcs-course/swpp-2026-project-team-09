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
C = dict(bg='#FFFFFF', ink='#172D42', muted='#536578', line='#C7D3DF',
         blue='#2563A6', blue_bg='#ECF3FC', teal='#C65B08', teal_bg='#FFF4E8',
         purple='#7451A6', purple_bg='#F2EDF9', amber='#996017', amber_bg='#FFF5E4',
         pink='#BF2876', pink_bg='#FFF0F7', slate='#5D6C7B', slate_bg='#EEF2F6', white='#FFFFFF')


def overlaps(a, b):
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


class Canvas:
    def __init__(self, height, args):
        self.w, self.h, self.s = 1200, height, args.scale
        self.image = Image.new('RGB', (self.w*self.s, self.h*self.s), C['bg'])
        self.draw = ImageDraw.Draw(self.image)
        self.args, self.texts, self.segments = args, [], []
        self.icons = []
        self.group_edges = []
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

    def group(self, box, label, color='slate'):
        self.rect(box, C['white'], C[color], radius=0, width=1)
        x,y,r,b=box
        self.group_edges.extend([(x,y,r,y+1),(x,b-1,r,b),(x,y,x+1,b),(r-1,y,r,b)])
        self.text(label, (box[0]+18, box[1]+16, box[2]-18, box[1]+55), 25, True, color)

    def center(self, value, x, y, width, size=23, bold=False, color='ink'):
        lines = self.wrap(value, width, size, bold)
        for i, line in enumerate(lines):
            w = self.font(size, bold).getlength(line)/self.s
            self.text(line, (math.floor((x-w/2)*self.s)/self.s, y+i*34, x+w/2+2, y+(i+1)*34), size, bold, color, 34)
        return y+len(lines)*34

    def icon(self, x, y, kind, color):
        # Original generic category glyphs: no vendor logos or AWS service symbols.
        box=(x-40, y, x+40, y+80)
        self.rect(box, C[color], radius=0)
        self.icons.append(box)
        def line(points):
            self.draw.line([(round((x-40+a)*self.s), round((y+b)*self.s)) for a,b in points], fill='white', width=2*self.s)
        def shape(b, ellipse=False):
            f=self.draw.ellipse if ellipse else self.draw.rectangle
            f(tuple(round(v*self.s) for v in (x-40+b[0],y+b[1],x-40+b[2],y+b[3])),outline='white',width=2*self.s)
        if kind=='database':
            shape((17,17,63,31),True);line([(17,24),(17,57)]);line([(63,24),(63,57)])
            self.draw.arc(tuple(round(v*self.s) for v in (x-23,y+49,x+23,y+64)),0,180,fill='white',width=2*self.s)
            self.draw.arc(tuple(round(v*self.s) for v in (x-23,y+32,x+23,y+47)),0,180,fill='white',width=2*self.s)
        elif kind=='client':
            shape((20,12,60,65));line([(32,58),(48,58)])
        elif kind=='queue':
            for yy in (19,34,49):
                shape((16,yy,64,yy+11));line([(23,yy+5),(28,yy+5)])
        elif kind=='source':
            shape((17,15,63,65));line([(27,28),(53,28)]);line([(27,40),(53,40)]);line([(27,52),(46,52)])
        elif kind=='integration':
            for xx,yy in ((13,15),(48,15),(30,49)): shape((xx,yy,xx+19,yy+17))
            line([(23,32),(23,41),(40,41),(40,49)]);line([(58,32),(58,41),(40,41)])
        else:
            shape((20,20,60,60));shape((29,29,51,51))
            for d in (28,40,52):
                line([(d,12),(d,20)]);line([(d,60),(d,68)]);line([(12,d),(20,d)]);line([(60,d),(68,d)])

    def resource(self, x, y, title, detail='', kind='compute', color='teal', width=260):
        self.icon(x,y,kind,color)
        end=self.center(title,x,y+96,width,24,True,color)
        if detail: self.center(detail,x,end+6,width,22)

    def step(self, x, y, number, label, width=260):
        self.text(f'{number}  {label}', (x,y,x+width,y+72),22,True,color='slate',line_height=32)

    def note(self, y, title, body, color='amber', height=112):
        self.rect((48,y,1152,y+height),C[color+'_bg'],radius=0)
        self.text(title,(66,y+16,1134,y+52),23,True,color)
        self.text(body,(66,y+58,1134,y+height-12),22,line_height=32)

    def arrow(self, points):
        assert len(points) >= 2
        self.draw.line([(round(x*self.s), round(y*self.s)) for x, y in points], fill=C['slate'], width=2*self.s, joint='curve')
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
        self.segments.append((min(p[0] for p in [tip,left,right]),min(p[1] for p in [tip,left,right]),max(p[0] for p in [tip,left,right]),max(p[1] for p in [tip,left,right])))

    def footer(self, y):
        self.text('구현 범위 기준 2026-09-27  ·  실제 데이터와 명시적 사용자 동의', (48, y, 1152, y+34), size=21, color='muted')

    def save(self, name):
        for i, (a, label) in enumerate(self.texts):
            if not (0 <= a[0] < a[2] <= self.w and 0 <= a[1] < a[3] <= self.h):
                raise AssertionError(f'Text outside canvas: {label}')
            for b, other in self.texts[i+1:]:
                if overlaps(a, b):
                    raise AssertionError(f'Text collision: {label!r} with {other!r}')
            for edge in self.group_edges:
                assert not overlaps(a,edge), f'Label touches group border: {label}'
            for segment in self.segments:
                if overlaps(a, segment):
                    raise AssertionError(f'Connector intersects text: {label!r}')
        for icon in self.icons:
            assert 0 <= icon[0] < icon[2] <= self.w and 0 <= icon[1] < icon[3] <= self.h, 'Icon outside canvas'
            assert not any(overlaps(icon, box) for box, _ in self.texts), 'Icon intersects label'
        for i, icon in enumerate(self.icons):
            assert not any(overlaps(icon, other) for other in self.icons[i+1:]), 'Icon collision'
        for segment in self.segments:
            if any(overlaps(segment, box) for box in self.icons):
                raise AssertionError('Connector crosses an icon')
        self.args.output.mkdir(parents=True, exist_ok=True)
        self.image.save(self.args.output / f'{name}.png', optimize=True)
        if self.args.preview_dir:
            self.args.preview_dir.mkdir(parents=True, exist_ok=True)
            self.image.resize((900, round(self.h*900/self.w)), Image.Resampling.LANCZOS).save(self.args.preview_dir / f'{name}.png')
        print(f'{name}.png: {self.w*self.s}x{self.h*self.s}; {len(self.texts)} text lines, {len(self.icons)} icons; connectors including arrowheads; bounds/collisions PASS')


def architecture(args):
    c=Canvas(2130,args)
    c.heading('서비스 아키텍처', '현재 배포: 로컬 Docker Compose · 범용 리소스 아이콘으로 표현')
    c.text('클라이언트', (48,190,310,230),25,True,'blue')
    c.group((360,175,1152,850),'로컬 Compose · HTTP API와 데이터 소유권')
    c.resource(165,280,'모바일 / 관리자 브라우저','Expo / Next.js UI','client','blue')
    c.resource(560,280,'Main public / admin','같은 이미지 · 분리된 실행 풀')
    c.resource(980,280,'main_db','업무 데이터 · outbox','database','purple')
    c.arrow([(213,320),(512,320)]);c.step(250,268,'1','HTTP',130)
    c.arrow([(608,320),(932,320)]);c.step(740,268,'2','Prisma',160)
    c.resource(165,585,'모바일','동행 요청 · 가입 동의','client','blue')
    c.resource(560,585,'Match','규칙 기반 후보 계산')
    c.resource(980,585,'match_db','매칭 요청 소유','database','purple')
    c.arrow([(213,625),(512,625)]);c.step(250,573,'3','HTTP',130)
    c.arrow([(608,625),(932,625)]);c.step(740,573,'4','Prisma',160)
    c.arrow([(560,577),(560,477)]);c.step(605,494,'5','내부 HTTP\n파티·멤버 생성',300)
    c.text('PostgreSQL + PostGIS · 같은 인스턴스, main / match DB·역할 분리',(390,797,1120,839),22)
    c.group((48,900,780,1450),'동일 Compose · Worker와 Redis')
    c.text('외부 원천 / 같은 Mac 호스트',(820,915,1152,956),23,True,'blue')
    c.resource(210,1000,'Main','생활 조회 · 이미지 요청')
    c.resource(590,1000,'Worker','수집 · 이미지 초안')
    c.resource(1000,1000,'공식 원천 / Ollama','학교 정보 / 로컬 Qwen3-VL\nOllama는 Docker 밖','source','blue')
    c.arrow([(258,1040),(542,1040)]);c.step(305,988,'6','내부 HTTP',220)
    c.arrow([(638,1040),(952,1040)]);c.step(795,983,'7','HTTP',130)
    c.arrow([(542,1100),(335,1100),(335,1056),(258,1056)])
    c.resource(210,1250,'Redis queue','BullMQ 정기 수집','queue','pink')
    c.resource(590,1230,'Redis cache','Worker 스냅샷\nMain 위치 TTL · Match 후보','database','purple')
    c.arrow([(258,1290),(375,1290),(375,1210),(560,1210),(560,1190)])
    c.arrow([(620,1190),(620,1222)])
    c.text('Worker → Main: 행사 import · Worker / Socket은 업무 DB 직접 쓰기 없음',(48,1475,1152,1515),22)
    c.group((48,1560,888,1870),'동일 Compose · 변경 알림 경로')
    c.resource(180,1640,'알림 생산자','Main outbox relay\nMatch·Worker 일시적 발행','integration','pink',width=240)
    c.resource(465,1640,'Redis cache','Pub/Sub','integration','pink',width=210)
    c.resource(750,1640,'Socket','인증된 사용자 방','compute','teal',width=210)
    c.resource(1030,1640,'모바일','ID·버전 힌트\nHTTP 재조회','client','blue',width=230)
    for a,b in [(228,417),(513,702),(798,982)]: c.arrow([(a,1680),(b,1680)])
    c.step(910,1582,'8','Socket.IO',240)
    c.note(1900,'구현 경계','위치 본문은 공개 조건을 통과한 HTTP 조회 · 이미지 초안은 사용자 검토 후 명시적 저장','slate',110)
    c.text('검증 대기: 실제 두 기기·운영 부하  |  향후: FCM · AI 계획 추천 · 도보 경로',(48,2038,1152,2075),22,color='amber')
    c.footer(2090)
    c.save('architecture')



def phase(c, y, label, resources, height=330):
    """A numbered phase reuses actors to keep independent paths unambiguous."""
    c.group((48,y,1152,y+height),label)
    centers=[200,600,1000] if len(resources)==3 else [180,460,740,1020]
    width=310 if len(resources)==3 else 245
    for x, item in zip(centers,resources):
        title,detail,kind,color=item
        c.resource(x,y+95,title,detail,kind,color,width)
    for a,b in zip(centers,centers[1:]):
        c.arrow([(a+48,y+135),(b-48,y+135)])


def sync(c,y):
    phase(c,y,'변경 동기화 · 내구성 있는 DB 기록 → 일시적 전송 → 본문 재조회',[
        ('Main outbox','업무 변경과 함께 기록','database','purple'),
        ('Redis cache','relay → Pub/Sub','integration','pink'),
        ('Socket','Socket.IO · ID/버전','compute','teal'),
        ('모바일','힌트 수신 → HTTP 조회','client','blue'),
    ])


def demo_event(args):
    c=Canvas(1650,args)
    c.heading('행사 동행 · 파티와 공동 계획', '숫자 순서로 읽는 리소스 흐름 · 반복 아이콘은 같은 서비스입니다.')
    phase(c,190,'1  행사 선택 + 자동 합류 동의 → 규칙 기반 매칭 · HTTP',[
        ('모바일','실제 행사 · 활동·인원\n요청 시간 · 관심사 입력','client','blue'),
        ('Match + Redis 후보','신청 시간 교집합\n관심사 유사도 정렬','compute','teal'),
        ('Main → main_db','트랜잭션: 파티·멤버\n퀘스트 자동 생성 없음','database','purple'),
    ],350)
    phase(c,590,'2  파티원의 별도 공동 계획 저장 · HTTP',[
        ('파티원','시간·장소 입력\n명시적으로 저장','client','blue'),
        ('Main · 충돌 검사','최신 시간표·개인 일정\n다른 활성 공동 퀘스트','compute','teal'),
        ('main_db','공유 퀘스트 + outbox\n참여자만 확인·수정','database','purple'),
    ],350)
    sync(c,990)
    c.note(1360,'위치 공유는 별도 조건을 충족할 때만','파티별 기본 ON · 전체 공유와 OS 권한은 별도\n관계별 공개 조건을 통과한 Main HTTP 조회만 허용','slate',148)
    c.text('검증 대기: 실제 두 기기 합류·위치  |  향후: 행사 후 AI 카페 추천',(48,1545,1152,1585),22,color='amber')
    c.footer(1610)
    c.save('demo-event')


def demo_friends(args):
    c=Canvas(1700,args)
    c.heading('친구 약속 · 구체적인 계획에 동의', '수락은 정해진 시간·장소의 계획에 대한 동의입니다. AI 추천 흐름이 아닙니다.')
    phase(c,190,'1  연결된 친구에게 계획 제안 · HTTP',[
        ('보내는 사람','제목·시작/종료·장소\n이 계획에 동의하고 전송','client','blue'),
        ('Main · 약속 제안','pending 상태 저장\n아직 파티·퀘스트 없음','compute','teal'),
        ('받는 사람','정확한 계획 확인\n수락 / 거절','client','blue'),
    ],350)
    c.text('HTTP 조회 응답',(745,278,943,313),22,color='slate')
    phase(c,590,'2  이 계획으로 약속 확정 → Main의 한 트랜잭션',[
        ('받는 사람','명시적 수락 HTTP\n같은 응답 재시도는 중복 없음','client','blue'),
        ('Main · 사용자 잠금','현재 친구 관계 재검증\n수업·개인 일정·활성 퀘스트','compute','teal'),
        ('main_db','비공개 2인 파티\n퀘스트 + outbox 원자적 기록','database','purple'),
    ],370)
    sync(c,1010)
    c.note(1380,'사적 일정은 공개하지 않습니다','충돌 시 생성하지 않고 충돌 상태만 반환 · 상대 일정 상세는 비공개\n시간표 미설정은 검증된 빈 시간이 아님 · 미등록 일정과 이동시간은 직접 확인','slate',148)
    c.text('검증 대기: 실제 두 계정 앱 수락  |  향후: AI 장소 추천·도보 이동시간',(48,1560,1152,1602),22,color='amber')
    c.footer(1655)
    c.save('demo-friends')


def demo_campus(args):
    c=Canvas(1770,args)
    c.heading('캠퍼스 정보 · 내 시간표 수업', '외부 정보 조회와 본인 시간표 계산은 독립된 경로입니다.')
    phase(c,190,'1  공식 정보 → 서버 정기 수집 → 캐시 스냅샷',[
        ('공식 제공처','SNUCO 학식 · 학교 셔틀\n실제 원천 정보','source','blue'),
        ('Worker + BullMQ','셔틀 60초 · 학식 30분\nRedis queue 정기 작업','compute','teal'),
        ('Redis cache','스냅샷 저장\n캐시 미스 시 요청 병합','database','purple'),
    ],350)
    phase(c,590,'2  생활 화면의 조회 / 다시 조회 · HTTP 요청',[
        ('모바일','사용자가 조회 버튼 선택\n자동 차량 추적 아님','client','blue'),
        ('Main','Worker 내부 HTTP 호출\n공식 원천·조회 상태 전달','compute','teal'),
        ('Worker + cache','출처 · fetchedAt\nno_vehicles / unavailable 구분','database','purple'),
    ],350)
    phase(c,990,'3  본인 시간표 HTTP → Asia/Seoul 당일 계산 → 내 수업 카드',[
        ('Main · 내 시간표','소유자 전용 API·변경 힌트\nHTTP로 최신 시간표 조회','database','purple'),
        ('모바일 · 당일 계산','요일·학기 범위\n자정과 시간 경과에 갱신','client','blue'),
        ('내 수업 퀘스트','시간표에서 계산\nDB 퀘스트 행·출석 인증 없음','source','blue'),
    ],350)
    c.note(1380,'표시 범위를 구분합니다','셔틀 좌표: 노선도 픽셀(GPS 아님) · fetchedAt은 조회 시각 · 운행 차량 대응 검증 대기\n수업 상태: 예정 / 수업 시간 / 시간 지남 · 휴일·일회성 휴강 정보는 미포함','slate',148)
    c.note(1560,'향후 / 보류','향후: 학습 공간·길찾기  |  보류: 도서관 연동','amber',110)
    c.footer(1725)
    c.save('demo-campus')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font',default=DEFAULT_FONT)
    parser.add_argument('--bold-font')
    parser.add_argument('--scale',type=int,default=2)
    parser.add_argument('--output',type=Path,default=ROOT)
    parser.add_argument('--preview-dir',type=Path)
    args=parser.parse_args()
    if args.scale<1: parser.error('--scale must be positive')
    for renderer in [architecture,demo_event,demo_friends,demo_campus]:
        renderer(args)

if __name__=='__main__': main()
