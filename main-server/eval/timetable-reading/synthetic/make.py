#!/usr/bin/env python3
################################################################################
# AI-generated with Claude
#
# 2026-11-18  Opus 5.5   prompted by AhnJinYoung
################################################################################

# P15-52: synthetic weekly timetables in layouts neither SNUTT nor 에브리타임 uses, as a generality check of the
# reader: a Saturday column, English day labels with a 12-hour "9 AM" axis, an axis of 오전/오후 labels, a seven-day
# week starting at 8, a professor's name and a class code inside blocks, names that wrap inside a word. Each gives
# <name>.png, <name>.truth.json (as the fixtures' truth files), and the blocks as drawn, as the phone would send them:
# <name>.grid.json (columns and pixel rectangles) and <name>.blocks.json (days and times, the earlier design). Needs Pillow and the Noto Sans CJK font; run with `python3 -I make.py` in this folder.

import json
import os
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
KR_INDEX = 1  # Noto Sans CJK KR in the collection
WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size, index=KR_INDEX)


def wrap(draw, text, width, size):
    """Lines of `text` that fit `width`, broken inside words when a word is too long, as phones wrap Korean."""
    lines, line = [], ''
    for char in text:
        trial = line + char
        if draw.textlength(trial, font=font(size)) > width and line:
            lines.append(line.rstrip())
            line = char.lstrip()
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


def make(name, days, labels, first_hour, hours, blocks, dark=False, title=None, gutter=90, top=240, hour_px=110, bar=None,
         fades=()):
    width, height = 921, top + hour_px * hours + 260
    background = (24, 24, 27) if dark else (255, 255, 255)
    line_colour = (60, 60, 64) if dark else (225, 225, 228)
    ink = (200, 200, 205) if dark else (90, 90, 95)
    image = Image.new('RGB', (width, height), background)
    draw = ImageDraw.Draw(image)
    if title:
        draw.text((40, 60), title, fill=(240, 240, 240) if dark else (20, 20, 20), font=font(44, True))
    column = (width - gutter - 20) / len(days)
    header = top - 60
    for index, label in enumerate(days):
        x = gutter + column * index + column / 2
        draw.text((x, header + 20), label, fill=ink, font=font(26), anchor='mm')
    for hour in range(hours + 1):
        y = top + hour * hour_px
        draw.line([(gutter, y), (width - 20, y)], fill=line_colour, width=2)
        if hour < hours:
            draw.text((gutter - 12, y + 6), labels[hour], fill=ink, font=font(22), anchor='ra')
    for index in range(len(days) + 1):
        x = gutter + column * index
        draw.line([(x, header), (x, top + hours * hour_px)], fill=line_colour, width=2)
    truth, sent, grid = [], [], []
    seen_end = {(day, start): visible for day, start, visible in [(f[0], f[1], f[3]) for f in fades]}
    for day, start, end, title_text, room, extra, colour in blocks:
        x0 = gutter + column * days_index(days, day) + 2
        y0 = top + (start - first_hour) * hour_px
        y1 = top + (end - first_hour) * hour_px
        draw.rectangle([x0, y0, x0 + column - 4, y1], fill=colour)
        y = y0 + 8
        for line in wrap(draw, title_text, column - 16, 24):
            draw.text((x0 + 8, y), line, fill=(255, 255, 255), font=font(24, True))
            y += 30
        for line in [room, extra]:
            if line:
                draw.text((x0 + 8, y), line, fill=(255, 255, 255), font=font(21))
                y += 27
        weekday = WEEK[days_index(days, day)]
        record = {'weekday': weekday, 'start': clock(start), 'end': clock(end), 'name': title_text,
                  'roomLine': room, 'building': room.split('-')[0] if room else None,
                  'room': '-'.join(room.split('-')[1:]) if room else None}
        truth.append(record)
        sent.append({'weekday': weekday, 'start': clock(start), 'end': clock(end), 'colour': list(colour), 'fades': False})
        hidden = (day, start) in seen_end or (bar is not None and end >= bar - 0.01)
        visible = min(seen_end.get((day, start), end), bar if bar is not None else end)
        grid.append({'column': days_index(days, day), 'top': y0, 'bottom': top + (visible - first_hour) * hour_px,
                     'colour': list(colour), 'fades': hidden})
    # A fade: the block's colour blends into the background over its lowest part, as behind a blurred bar.
    for day, start, end, fade_from in fades:
        x0 = int(gutter + column * days_index(days, day) + 2)
        y_from, y_end = int(top + (fade_from - first_hour) * hour_px), int(top + (end - first_hour) * hour_px)
        for y in range(y_from, y_end + 1):
            t = (y - y_from) / max(1, y_end - y_from)
            for x in range(x0, int(x0 + column - 4)):
                r, g, b = image.getpixel((x, y))
                image.putpixel((x, y), tuple(round(c * (1 - t) + bg * t) for c, bg in zip((r, g, b), background)))
    # An opaque bar over the bottom of the grid, as a floating tab bar.
    if bar is not None:
        y_bar = int(top + (bar - first_hour) * hour_px)
        draw.rounded_rectangle([40, y_bar, width - 40, y_bar + 120], radius=50, fill=(235, 235, 238) if not dark else (50, 50, 54))
    image.save(f'{name}.png')
    with open(f'{name}.truth.json', 'w', encoding='utf-8') as out:
        json.dump({'screenshot': f'{name}.png', 'app': 'synthetic', 'title': title, 'times': truth}, out,
                  ensure_ascii=False, indent=2)
        out.write('\n')
    with open(f'{name}.grid.json', 'w', encoding='utf-8') as out:
        json.dump({'columns': len(days), 'blocks': grid}, out, indent=2)
        out.write('\n')
    with open(f'{name}.blocks.json', 'w', encoding='utf-8') as out:
        json.dump(sent, out, indent=2)
        out.write('\n')


def days_index(days, day):
    return days.index(day)


def clock(hours):
    minutes = round(hours * 60)
    return f'{minutes // 60:02d}:{minutes % 60:02d}'


BLUE, GREEN, ORANGE, PURPLE, RED, TEAL = (66, 133, 244), (52, 168, 83), (240, 140, 40), (142, 84, 200), (219, 68, 55), (0, 150, 136)

# 월–토, 24-hour labels written 09:00, a professor's name in each block.
make('synthetic-saturday', ['월', '화', '수', '목', '금', '토'], [f'{h:02d}:00' for h in range(9, 19)], 9, 10, [
    ('월', 9, 10.25, '선형대수학', '27-115', '김교수', BLUE),
    ('수', 9, 10.25, '선형대수학', '27-115', '김교수', BLUE),
    ('화', 13, 14.5, '경제학원론', '16-201', '이교수', GREEN),
    ('목', 13, 14.5, '경제학원론', '16-201', '이교수', GREEN),
    ('토', 10, 12.833, '창의공학설계', '301-204', '박교수', ORANGE),
    ('금', 15.5, 17.333, '확률및통계', '302-308', '최교수', PURPLE),
], title='2026 가을')

# English day labels, a 12-hour axis written "9 AM", dark.
make('synthetic-english', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
     ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'], 9, 9, [
    ('Mon', 11, 12.25, '물리학 1', '56-105', None, RED),
    ('Wed', 11, 12.25, '물리학 1', '56-105', None, RED),
    ('Tue', 14, 15.833, '물리학실험 1', '26-304', None, TEAL),
    ('Thu', 9.5, 10.75, '수학 1', '25-101', None, BLUE),
    ('Fri', 9.5, 10.75, '수학연습 1', '25-102', None, PURPLE),
], dark=True, title='Fall 2026')

# 오전/오후 labels, a class code under the room, a long name wrapped inside a word.
make('synthetic-ampm', ['월', '화', '수', '목', '금', '토'],
     ['오전 9시', '오전 10시', '오전 11시', '오후 12시', '오후 1시', '오후 2시', '오후 3시', '오후 4시', '오후 5시'], 9, 9, [
    ('월', 10, 11.25, '컴퓨터프로그래밍', '302-105', 'M1522.000600', GREEN),
    ('수', 10, 11.25, '컴퓨터프로그래밍', '302-105', 'M1522.000600', GREEN),
    ('화', 15, 16.75, '데이터구조와알고리즘', '301-118', '4190.209', ORANGE),
    ('토', 13, 15, '글쓰기의 기초', '1-201', None, BLUE),
], title=None, gutter=120)

# 월–일, axis from 8 to 21 in plain numbers, two classes back to back on one day.
make('synthetic-week', ['월', '화', '수', '목', '금', '토', '일'], [str(h) for h in range(8, 22)], 8, 14, [
    ('월', 8, 9.25, '아침영어', '3-101', None, TEAL),
    ('월', 9.5, 10.75, '미적분학', '28-102', None, RED),
    ('일', 19, 20.833, '프로그래밍연습', '302-105', None, ORANGE),
    ('수', 19, 20.833, '프로그래밍연습', '301-118', None, ORANGE),
    ('금', 12, 13.25, '프로그래밍의 원리', '302-107', None, PURPLE),
], title='연습', hour_px=95)

# Blocks whose end is not where their colour is last seen: one under an opaque bar, one fading out and then covered,
# and one whose colour stops at 20:50 under the bar although the class runs to 21:50 (a fade rule must not take 20:50).
make('synthetic-fades', ['월', '화', '수', '목', '금'], [str(h) for h in range(9, 22)], 9, 13, [
    ('화', 9, 10.25, '회계원리', '58-324', None, BLUE),
    ('목', 11, 12.833, '수학연습 1', '24-211', None, GREEN),
    ('화', 14, 15.25, '이산수학', '301-118', None, PURPLE),
    ('목', 14, 15.25, '이산수학', '301-118', None, PURPLE),
    ('월', 19, 20.833, '논리설계', '302-310-2', None, RED),
    ('수', 18.5, 20.333, '컴퓨터프로그래밍', '302-105', None, TEAL),
    ('금', 19, 21.833, '창의공학설계', '301-204', None, ORANGE),
], title='fade', hour_px=100, bar=20.833 - 0.666, fades=[('수', 18.5, 20.333, 19.666)])

# The bar's top at 20:50: one block truly ends there, the other runs on to 21:50 under it, and the colour of both
# stops at 20:50, a usual end.
make('synthetic-fades-2', ['월', '화', '수', '목', '금'], [str(h) for h in range(9, 22)], 9, 13, [
    ('화', 10, 11.25, '경제학원론', '16-201', None, GREEN),
    ('목', 10, 11.25, '경제학원론', '16-201', None, GREEN),
    ('수', 13, 14.833, '물리학실험 2', '26-302', None, BLUE),
    ('월', 19, 20.833, '논리설계', '302-310-2', None, RED),
    ('금', 19, 21.833, '창의공학설계', '301-204', None, ORANGE),
], title='fade 2', hour_px=100, bar=20.833)
