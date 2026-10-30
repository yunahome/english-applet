#!/usr/bin/env python3
"""生成 tabBar 图标（81x81 PNG，零依赖，纯标准库）。
生成 6 张：learn / words / profile，各含灰色默认态与绿色选中态。
"""
import math
import struct
import zlib
import os

SIZE = 81
GRAY = (175, 179, 181, 255)    # #AFB3B5
GREEN = (88, 204, 2, 255)      # #58CC02
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets', 'tabbar')


def new_canvas():
    return [[(0, 0, 0, 0)] * SIZE for _ in range(SIZE)]


def put(px, x, y, color):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        px[y][x] = color


def in_rounded_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    # 四个圆角区域
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        in_corner_zone = (x < x0 + r or x > x1 - r) and (y < y0 + r or y > y1 - r)
        if in_corner_zone:
            if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
                return False
    return True


def in_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def draw_book(px, color):
    """学习：一本合上的书 + 书签。"""
    # 书体
    for y in range(SIZE):
        for x in range(SIZE):
            if in_rounded_rect(x, y, 16, 16, 65, 66, 8):
                put(px, x, y, color)
    # 中缝（挖空一条竖线）
    for y in range(16, 67):
        for x in range(39, 43):
            put(px, x, y, (0, 0, 0, 0))
    # 底部页面线（挖空两条横线）
    for y in range(56, 60):
        for x in range(22, 65):
            put(px, x, y, (0, 0, 0, 0))
    # 书签（顶部伸出的小矩形，用挖空形成）
    for y in range(16, 32):
        for x in range(50, 58):
            put(px, x, y, (0, 0, 0, 0))


def draw_words(px, color):
    """词库：三层堆叠的卡片横条。"""
    bars = [(16, 50, 12), (24, 58, 12), (16, 50, 12)]
    ys = [14, 36, 58]
    for (x0, x1, r), y0 in zip(bars, ys):
        for y in range(y0, y0 + 10):
            for x in range(SIZE):
                if in_rounded_rect(x, y, x0, y0, x1, y0 + 10, 5):
                    put(px, x, y, color)
    # 中间条更短，形成错落感
    for y in range(36, 46):
        for x in range(46, SIZE):
            put(px, x, y, (0, 0, 0, 0))


def draw_profile(px, color):
    """我的：头像（头 + 肩）。"""
    for y in range(SIZE):
        for x in range(SIZE):
            if in_circle(x, y, 40, 28, 13):
                put(px, x, y, color)
            # 肩部：大圆被底部裁掉
            if in_circle(x, y, 40, 68, 22) and y <= 68:
                put(px, x, y, color)


def encode_png(px):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        c += struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    raw = b''
    for row in px:
        raw += b'\x00' + b''.join(struct.pack('4B', *p) for p in row)

    ihdr = struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ('learn', draw_book),
        ('words', draw_words),
        ('profile', draw_profile),
    ]
    for name, drawer in jobs:
        for suffix, color in (('', GRAY), ('-active', GREEN)):
            px = new_canvas()
            drawer(px, color)
            path = os.path.join(OUT_DIR, f'{name}{suffix}.png')
            with open(path, 'wb') as f:
                f.write(encode_png(px))
            print('written', os.path.normpath(path))


if __name__ == '__main__':
    main()
