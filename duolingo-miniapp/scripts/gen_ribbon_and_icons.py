#!/usr/bin/env python3
"""按设计图生成：1) 首页缎带底图 ribbon.png（两端 V 形凹口折翼 + 黄色图钉）
2) 第三版 tabbar 图标（实心圆润：房子/书/人，未选中灰蓝、选中绿）"""
from PIL import Image, ImageDraw

MINI = '/Users/yktc/Documents/english-applet/duolingo-miniapp'

# ---------- 缎带底图 ----------
# 画布 750x150 透明；使用时 <Image mode='scaleToFill'> 拉伸
W, H = 750, 150
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

DARK = (42, 118, 190, 255)    # 深蓝（折翼/底边）
MID = (64, 156, 232, 255)     # 主幅蓝
LIGHT = (96, 178, 240, 255)   # 主幅高光
YELLOW = (255, 196, 32, 255)  # 图钉
YEL_DARK = (230, 160, 10, 255)

# 左折翼（带 V 凹口，凹口朝外）
d.polygon([(14, 34), (86, 34), (86, 122), (14, 122), (44, 78)], fill=DARK)
# 右折翼
d.polygon([(736, 34), (664, 34), (664, 122), (736, 122), (706, 78)], fill=DARK)

# 主幅（圆角矩形，盖住折翼内侧）+ 底边深色（卡通厚度）
d.rounded_rectangle([64, 46, 686, 128], radius=24, fill=DARK)          # 厚度层
d.rounded_rectangle([64, 26, 686, 112], radius=24, fill=MID)           # 主面
d.rounded_rectangle([80, 34, 670, 62], radius=18, fill=LIGHT)          # 顶部高光条

# 黄色定位图钉（水滴形 + 白点），位于主幅左端
d.ellipse([96, 34, 164, 102], fill=YELLOW)
d.polygon([(104, 86), (156, 86), (130, 122)], fill=YELLOW)
d.ellipse([116, 54, 144, 82], fill=(255, 255, 255, 255))

img.save(f'{MINI}/src/assets/home/ribbon.png')
print('ribbon.png 生成完成')

# ---------- tabbar 图标 v3 ----------
SIZE = 96
GRAY = (154, 166, 178, 255)      # 未选中灰蓝（贴近设计图）
GREEN = (88, 204, 2, 255)        # 选中绿
OUT = f'{MINI}/src/assets/tabbar'


def canvas():
    return Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)), ImageDraw.Draw(img)


def draw_home(color):
    """实心圆润房子 + 白色拱门，屋顶出檐"""
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # 屋顶（三角，略宽出檐，圆角用宽线条模拟）
    d.polygon([(48, 10), (88, 44), (8, 44)], fill=color)
    d.line([(12, 42), (84, 42)], fill=color, width=8)
    # 房身
    d.rounded_rectangle([18, 42, 78, 84], radius=8, fill=color)
    # 白色拱门
    d.rounded_rectangle([38, 56, 58, 84], radius=8, fill=(255, 255, 255, 255))
    return im


def draw_book(color):
    """打开的书：左右两页 + 中缝，实心圆润"""
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # 左页
    d.polygon([(48, 26), (10, 16), (10, 66), (48, 78)], fill=color)
    # 右页
    d.polygon([(48, 26), (86, 16), (86, 66), (48, 78)], fill=color)
    # 中缝（透明细缝）
    d.line([(48, 26), (48, 78)], fill=(0, 0, 0, 0), width=3)
    # 页面底缘圆头
    d.ellipse([6, 60, 16, 70], fill=color)
    d.ellipse([80, 60, 90, 70], fill=color)
    return im


def draw_me(color):
    """实心人形：圆头 + 圆肩身"""
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([30, 10, 66, 46], fill=color)                 # 头
    d.pieslice([16, 50, 80, 110], 180, 360, fill=color)     # 圆肩
    d.rounded_rectangle([16, 66, 80, 84], radius=10, fill=color)
    return im


def save(im, name):
    im = im.resize((81, 81), Image.LANCZOS)
    im.save(f'{OUT}/{name}.png')
    print(f'{name}.png 生成完成')


for fn, base in [(draw_home, 'learn'), (draw_book, 'words'), (draw_me, 'profile')]:
    save(fn(GRAY), base)
    save(fn(GREEN), f'{base}-active')
print('tabbar v3 全部完成')
