"""Create explicitly synthetic Korean extraction fixtures; no real user data."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, sys
out=Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
font='/System/Library/Fonts/AppleSDGothicNeo.ttc'
def f(size): return ImageFont.truetype(font,size)
def poster(name,lines):
 im=Image.new('RGB',(1000,1000),'#f4f6fb');d=ImageDraw.Draw(im)
 d.text((55,45),'합성 평가 자료 · 실제 행사가 아닙니다',font=f(26),fill='#555555')
 for i,line in enumerate(lines): d.text((55,150+i*100),line,font=f(35 if i else 48),fill='#172b4d')
 im.save(out/name)
poster('synthetic-event.png',['캠퍼스 독서 모임','일시: 2026년 10월 6일 18:00 ~ 19:30','장소: 중앙도서관 세미나실','함께 책을 읽고 이야기를 나눕니다.'])
poster('synthetic-event-unknown-year.png',['가을 영화 모임','일시: 10월 6일 오후 6시','장소: 학생회관 2층','종료 시간은 미정입니다.'])
im=Image.new('RGB',(1400,1100),'white');d=ImageDraw.Draw(im)
d.text((50,30),'합성 평가용 시간표',font=f(42),fill='#172b4d')
d.text((50,95),'학기: 2026-09-01 ~ 2026-12-14',font=f(29),fill='#172b4d')
left,top,cw,rh=130,210,240,95
for i,day in enumerate(['월요일','화요일','수요일','목요일','금요일']): d.text((left+i*cw+30,165),day,font=f(30),fill='black')
for j in range(9):
 y=top+j*rh
 d.line((left,y,left+5*cw,y),fill='#bbbbbb',width=2)
 d.text((30,y-12),f'{9+j:02d}:00',font=f(27),fill='black')
for i in range(6): d.line((left+i*cw,top,left+i*cw,top+8*rh),fill='#bbbbbb',width=2)
entries=[{'title':'자료구조','weekday':1,'startMinute':540,'endMinute':630,'locationName':'301동 101호'}, {'title':'컴퓨터구조','weekday':3,'startMinute':660,'endMinute':750,'locationName':'302동 203호'}, {'title':'확률과 통계','weekday':5,'startMinute':840,'endMinute':960,'locationName':'28동 201호'}]
for e,col in zip(entries,['#daeaff','#d9f0e4','#f9e5d3']):
 x=left+(e['weekday']-1)*cw;y=top+(e['startMinute']-540)/60*rh;bottom=top+(e['endMinute']-540)/60*rh
 d.rectangle((x+3,y+3,x+cw-3,bottom-3),fill=col)
 d.text((x+15,y+15),e['title'],font=f(28),fill='black');d.text((x+15,y+54),e['locationName'],font=f(23),fill='black')
im.save(out/'synthetic-timetable-grid.png')
truth={'synthetic-event.png':{'kind':'event','title':'캠퍼스 독서 모임','startsAt':'2026-10-06T18:00:00+09:00','endsAt':'2026-10-06T19:30:00+09:00','locationName':'중앙도서관 세미나실'},'synthetic-event-unknown-year.png':{'kind':'event','title':'가을 영화 모임','startsAt':None,'endsAt':None,'locationName':'학생회관 2층'},'synthetic-timetable-grid.png':{'kind':'timetable','semesterStartsOn':'2026-09-01','semesterEndsOn':'2026-12-14','entries':entries}}
(out/'expected.json').write_text(json.dumps(truth,ensure_ascii=False,indent=2))
print('Created 3 synthetic fixtures and expected.json:',out)
