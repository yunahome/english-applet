#!/usr/bin/env python3
"""生成扁平彩色卡通风格 tabbar 图标（81x81 PNG，含默认灰 + 选中绿两个版本）。"""
from PIL import Image, ImageDraw

SIZE = 81
OUT = '/Users/yktc/Documents/english-applet/duolingo-miniapp/src/assets/tabbar'

# 配色
GRAY = (175, 179, 181, 255)      # 默认灰
GREEN = (88, 204, 2, 255)        # 选中绿（多邻国绿 #58CC02）
GREEN_DARK = (70, 168, 0, 255)
WHITE = (255, 255, 255, 255)


def base_canvas():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


def draw_learn(color, dark):
    """学习：一本打开的卡通书"""
    img, d = base_canvas()
    # 书脊
    d.rectangle([38, 22, 43, 60], fill=dark)
    # 左页
    d.polygon([(38, 22), (10, 30), (12, 54), (38, 50)], fill=color)
    # 右页
    d.polygon([(43, 22), (71, 30), (69, 54), (43, 50)], fill=color)
    # 左页高光
    d.line([(20, 32), (36, 44)], fill=WHITE, width=3)
    d.line([(20, 38), (36, 48)], fill=WHITE, width=3)
    # 右页高光
    d.line([(61, 32), (45, 44)], fill=WHITE, width=3)
    d.line([(61, 38), (45, 48)], fill=WHITE, width=3)
    return img


def draw_words(color, dark):
    """词库：一个圆角卡片 + 字母 A"""
    img, d = base_canvas()
    rounded(d, [16, 14, 65, 67], 10, fill=color)
    # 卡片顶部色条
    d.rectangle([16, 14, 65, 24], fill=dark)
    # 字母 A
    d.line([(28, 52), (40, 30)], fill=WHITE, width=5)
    d.line([(40, 30), (52, 52)], fill=WHITE, width=5)
    d.line([(32, 44), (48, 44)], fill=WHITE, width=5)
    return img


def draw_profile(color, dark):
    """我的：卡通人物头像"""
    img, d = base_canvas()
    # 头
    d.ellipse([28, 14, 53, 39], fill=color)
    # 身体
    rounded(d, [20, 40, 61, 68], 12, fill=color)
    # 高光（头发弧）
    d.arc([28, 14, 53, 39], 200, 340, fill=dark, width=5)
    return img


def save(icon, name, color, dark):
    icon.save(f'{OUT}/{name}.png')
    print(f'生成 {name}.png')


# 学习
save(draw_learn(GRAY, (140, 145, 148, 255)), 'learn', GRAY, GRAY)
save(draw_learn(GREEN, GREEN_DARK), 'learn-active', GREEN, GREEN_DARK)
# 词库
save(draw_words(GRAY, (140, 145, 148, 255)), 'words', GRAY, GRAY)
save(draw_words(GREEN, GREEN_DARK), 'words-active', GREEN, GREEN_DARK)
# 我的
save(draw_profile(GRAY, (140, 145, 148, 255)), 'profile', GRAY, GRAY)
save(draw_profile(GREEN, GREEN_DARK), 'profile-active', GREEN, GREEN_DARK)

print('全部完成')
