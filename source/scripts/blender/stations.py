import sys, random, math
sys.path.insert(0, '/home/claude/blender')
from lib import *

import os
def cloud2(x, y, z, s=1.0):
    if os.environ.get('NOCLOUD'): return
    cloud(x * 0.7 - 3, min(y, 3), z * 0.5 + 1.8, s * 1.5)

def plaza(x, y, w, d, color='#E9E3D6'):
    box((x, y, 0.03), (w, d, 0.06), color, bevel=0.05, rough=0.8)

def taipei():
    # 臺北車站：米色長方形量體、直向長窗、兩層金黃色廡殿頂
    plaza(0, -3.2, 13, 3.6)
    box((0, 0.2, 0.15), (10.6, 5.6, 0.3), '#CFC3A6', bevel=0.05)                     # 台基
    box((0, 0.2, 1.45), (10.0, 5.0, 2.3), '#EADCB8', bevel=0.06)                      # 主體
    windows(-4.6, 4.6, -2.33, 1.45, 14, 0.32, 1.7, '#7A5B3A')
    box((0, -2.36, 2.55), (10.0, 0.1, 0.12), '#CDBB92', bevel=0.0)
    curved_roof((0, 0.2, 2.6), (11.4, 6.4), 0.95, (7.6, 2.8), '#D39A3E', lift=0.22)   # 下層屋頂
    box((0, 0.2, 3.85), (7.2, 2.6, 0.7), '#EADCB8', bevel=0.04)                       # 上層牆
    windows(-3.2, 3.2, -1.12, 3.85, 10, 0.22, 0.42, '#7A5B3A')
    curved_roof((0, 0.2, 4.2), (8.2, 3.6), 1.15, (4.6, 0.05), '#D39A3E', lift=0.2)    # 上層屋頂
    box((0, 0.2, 5.38), (4.8, 0.16, 0.12), '#B47A2C', bevel=0.02)                     # 屋脊
    for x in (-6.2, -5.4, 5.4, 6.2, 7.0):
        tree(x, -3.0 if x < 0 else -2.6, s=1.0)
    for x in (-7.2, 7.6): tree(x, 2.6, s=1.15, kind='cone')
    for x in range(-5, 6, 2): lamp(x, -4.3)
    # 公車
    box((-3.0, -4.6, 0.45), (2.2, 0.8, 0.75), '#3B8FD3', bevel=0.12); box((-3.0, -5.01, 0.6), (1.9, 0.02, 0.25), '#2A3440', bevel=0)
    box((2.6, -4.6, 0.32), (1.1, 0.55, 0.45), '#F2C230', bevel=0.12)                 # 計程車
    cloud2(-2, 6, 7.5, 1.0); cloud2(6, 7, 8.6, 0.8)

def hsinchu():
    # 新竹車站：灰白石造巴洛克、中央鐘塔、青綠色塔頂
    track(3.6, -8.5, 8.5); train(-6.0, 3.6, cars=3)
    plaza(0, -3.0, 12, 3.4)
    box((0, 0.2, 1.1), (8.6, 3.2, 2.2), '#E3E1DA', bevel=0.05)
    box((0, -1.42, 0.25), (8.6, 0.1, 0.5), '#BFBAB0', bevel=0)
    for side in (-1, 1):
        prism((side * 2.8, 0.2, 2.2), (3.4, 3.6), 1.0, (2.2, 1.4), '#5E6B78')        # 兩翼屋頂
        windows(side * 1.4 - 1.2 * side, side * 4.1, -1.43, 1.25, 4, 0.36, 0.95, '#41505F')
    box((0, -0.1, 2.2), (2.2, 2.4, 4.4), '#ECEAE3', bevel=0.05)                       # 鐘塔
    box((0, -1.32, 1.0), (1.0, 0.08, 1.5), '#41505F', bevel=0)                        # 入口
    cyl((0, -1.33, 3.6), 0.5, 0.08, '#FFFFFF', rot=(math.pi / 2, 0, 0), bevel=0.02)
    cyl((0, -1.38, 3.6), 0.52, 0.03, '#C9A45C', rot=(math.pi / 2, 0, 0))
    box((0.13, -1.39, 3.68), (0.3, 0.02, 0.05), '#33363A', bevel=0, rot=(0, 0.6, 0)); box((0, -1.39, 3.75), (0.04, 0.02, 0.32), '#33363A', bevel=0)
    box((0, -0.1, 4.48), (2.5, 2.7, 0.18), '#D7D3C9', bevel=0.03)
    prism((0, -0.1, 4.55), (2.4, 2.6), 1.3, (0.9, 1.0), '#4E9C92')                    # 青綠塔頂
    box((0, -0.1, 6.0), (0.7, 0.8, 0.5), '#ECEAE3', bevel=0.03)
    prism((0, -0.1, 6.25), (0.9, 1.0), 0.6, (0.05, 0.05), '#4E9C92')
    cyl((0, -0.1, 7.05), 0.03, 0.5, '#C9A45C', verts=8)
    for x in (-6.4, -5.6, 5.8, 6.6): tree(x, -2.4, s=1.0)
    for x in (-7.4, 7.4): tree(x, 0.8, s=1.2, kind='cone')
    for x in range(-4, 5, 2): lamp(x, -4.2)
    cloud2(-1, 7, 8.6, 0.9); cloud2(5, 7, 7.4, 0.7)

def taichung():
    # 臺中舊站：紅磚、白色飾帶、中央鐘塔尖頂
    track(3.6, -8.5, 8.5); train(0.5, 3.6, cars=3, body='#F6F3EA', stripe='#D9662B', accent='#2D3A55')
    plaza(0, -3.0, 12, 3.4)
    box((0, 0.2, 1.05), (9.0, 3.0, 2.1), '#B65A3E', bevel=0.05)
    for z in (0.12, 1.0, 2.1): box((0, 0.2, z), (9.12, 3.12, 0.12), '#F1ECE1', bevel=0.02)
    windows(-4.2, -1.4, -1.32, 1.5, 4, 0.34, 0.6, '#F1ECE1'); windows(1.4, 4.2, -1.32, 1.5, 4, 0.34, 0.6, '#F1ECE1')
    windows(-4.2, -1.4, -1.34, 1.5, 4, 0.22, 0.48, '#3C4A57'); windows(1.4, 4.2, -1.34, 1.5, 4, 0.22, 0.48, '#3C4A57')
    for side in (-1, 1):
        prism((side * 2.9, 0.2, 2.16), (3.5, 3.3), 1.3, (2.1, 0.4), '#56606B')
        box((side * 2.9, -0.8, 2.8), (0.5, 0.6, 0.6), '#B65A3E', bevel=0.03); prism((side * 2.9, -0.8, 3.1), (0.6, 0.7), 0.4, (0.05, 0.7), '#56606B')
    box((0, -0.2, 2.1), (2.0, 2.2, 4.2), '#B65A3E', bevel=0.05)                       # 鐘塔
    for z in (2.1, 3.0, 4.2): box((0, -0.2, z), (2.12, 2.32, 0.12), '#F1ECE1', bevel=0.02)
    box((0, -1.31, 0.95), (0.9, 0.06, 1.4), '#F1ECE1', bevel=0.02); box((0, -1.34, 0.9), (0.7, 0.06, 1.2), '#3C4A57', bevel=0)
    cyl((0, -1.33, 3.55), 0.42, 0.06, '#FFFFFF', rot=(math.pi / 2, 0, 0)); cyl((0, -1.36, 3.55), 0.44, 0.02, '#F1ECE1', rot=(math.pi / 2, 0, 0))
    box((0.1, -1.38, 3.62), (0.25, 0.02, 0.04), '#33363A', bevel=0, rot=(0, 0.6, 0)); box((0, -1.38, 3.68), (0.035, 0.02, 0.28), '#33363A', bevel=0)
    prism((0, -0.2, 4.26), (2.2, 2.4), 2.0, (0.05, 0.05), '#56606B')                  # 尖頂
    cyl((0, -0.2, 6.5), 0.03, 0.6, '#C9A45C', verts=8)
    for x in (-6.4, -5.5, 5.6, 6.5): tree(x, -2.5, s=1.0)
    for x in (-7.4, 7.5): tree(x, 0.6, s=1.15, kind='cone')
    for x in range(-4, 5, 2): lamp(x, -4.2)
    cloud2(-2, 7, 8.2, 0.9); cloud2(5.5, 7, 7.0, 0.7)

def kaohsiung():
    # 高雄舊站（帝冠式）：米白西式量體＋中央日式屋頂、椰子樹
    plaza(0, -3.0, 13, 3.6, '#EFE8DA')
    box((0, 0.2, 0.95), (9.6, 3.2, 1.9), '#F1E9D6', bevel=0.05)
    box((0, 0.2, 1.95), (9.8, 3.4, 0.12), '#D8CDB4', bevel=0.02)
    windows(-4.4, -1.6, -1.42, 1.0, 4, 0.36, 1.0, '#4A5A66'); windows(1.6, 4.4, -1.42, 1.0, 4, 0.36, 1.0, '#4A5A66')
    for side in (-1, 1):
        prism((side * 3.0, 0.2, 2.0), (3.8, 3.6), 0.7, (2.6, 0.6), '#4D5B58')
    box((0, 0.0, 1.5), (3.0, 2.6, 3.0), '#F1E9D6', bevel=0.05)                        # 中央高塔
    windows(-1.1, 1.1, -1.32, 2.2, 3, 0.36, 0.8, '#4A5A66')
    box((0, -1.32, 0.75), (1.4, 0.06, 1.2), '#4A5A66', bevel=0)
    box((0, -1.6, 1.55), (2.4, 0.7, 0.12), '#D8CDB4', bevel=0.02)                     # 雨庇
    curved_roof((0, 0.0, 3.0), (4.4, 3.8), 1.0, (2.6, 1.6), '#4D5B58', lift=0.25)     # 帝冠屋頂（下）
    curved_roof((0, 0.0, 3.95), (2.9, 1.9), 0.75, (1.6, 0.05), '#4D5B58', lift=0.18)  # 上
    box((0, 0.0, 4.72), (1.8, 0.14, 0.12), '#3B4744', bevel=0.02)
    for x, y in ((-6.0, -2.4), (-7.2, -0.6), (5.8, -2.6), (7.0, -0.8), (-4.8, -4.6), (4.6, -4.6)):
        palm(x, y, s=1.0)
    for x in range(-3, 4, 2): lamp(x, -4.5)
    box((-6.8, 3.3, 0.04), (3.6, 2.6, 0.08), '#6FB3D8', bevel=0.3, rough=0.15)       # 水景
    cloud2(-1, 7, 8.4, 0.9); cloud2(6, 7, 7.2, 0.7)

def hualien():
    # 花蓮新站：白色山形屋頂、玻璃量體、後方中央山脈
    for x, h, r, c in ((-7.5, 3.0, 2.4, '#7FA88A'), (-4.0, 3.7, 2.9, '#6E9A80'), (-0.5, 3.2, 2.6, '#86AE8E'), (3.2, 3.5, 2.8, '#7AA386')):
        cone((x, 4.6, h / 2), r, 0.0, h, c, verts=6)
        cone((x, 4.6, h - 0.55), r * 0.24, 0.0, 1.1, '#F3F6F2', verts=6)
    track(-3.3, -8.5, 8.5); train(-7.5, -3.3, cars=3, body='#F5F5F2', stripe='#C8202F', accent='#C8202F')
    box((0, 0.6, 0.1), (11.0, 4.6, 0.2), '#DEDAD2', bevel=0.04)
    box((0, 0.6, 0.85), (10.0, 3.6, 1.4), '#9FCFE0', bevel=0.03, rough=0.08)           # 玻璃
    for i in range(21): box((-5 + i * 0.5, -1.22, 0.85), (0.05, 0.04, 1.4), '#E9EEF0', bevel=0)
    peaks = [(-4.0, 1.6), (-2.1, 2.4), (-0.2, 1.8), (1.8, 2.8), (3.8, 2.0), (5.2, 1.3)]
    for x, h in peaks:
        prism((x, 0.6, 1.55), (2.6, 4.6), h, (0.05, 4.6), '#FAFAF7', bevel=0.05, rough=0.5)
    for x in (-6.8, -6.0, 6.3, 7.1): tree(x, -1.4, s=1.0)
    for x in (-7.4, 7.6): tree(x, 2.6, s=1.2, kind='cone')
    cloud2(-3, 7, 8.8, 0.9); cloud2(5, 6, 8.0, 0.75)

def jiji():
    # 集集車站：日式木造小站、黑瓦、月台與鐵道、滿滿綠樹
    track(-1.6, -8.5, 8.5); train(-7.8, -1.6, cars=2, body='#E3D5B8', stripe='#2F5D46', accent='#B33A2B', L=2.4)
    box((0, -0.6, 0.18), (9.0, 0.9, 0.36), '#C9C1B2', bevel=0.03)                     # 月台
    box((0, 1.4, 0.2), (6.4, 3.2, 0.4), '#C9C1B2', bevel=0.04)
    box((0, 1.5, 1.2), (5.0, 2.6, 1.6), '#7A5034', bevel=0.04)                        # 木造主體
    for i in range(9): box((-2.4 + i * 0.6, 0.19, 1.2), (0.08, 0.06, 1.6), '#5C3A24', bevel=0)
    box((0, 0.19, 0.55), (5.0, 0.07, 0.12), '#5C3A24', bevel=0); box((0, 0.19, 1.9), (5.0, 0.07, 0.12), '#5C3A24', bevel=0)
    windows(-2.1, 2.1, 0.17, 1.35, 6, 0.4, 0.55, '#E9E1CF')
    windows(-2.1, 2.1, 0.15, 1.35, 6, 0.3, 0.45, '#3D4A52')
    curved_roof((0, 1.5, 2.0), (6.2, 3.8), 1.2, (3.2, 0.05), '#3E4448', lift=0.16)
    box((0, 1.5, 3.22), (3.4, 0.16, 0.12), '#2E3336', bevel=0.02)
    box((0, -0.35, 1.95), (6.0, 1.4, 0.08), '#3E4448', bevel=0.03, rot=(0.18, 0, 0))  # 月台雨棚
    for x in (-2.6, -0.9, 0.9, 2.6): cyl((x, -0.85, 1.05), 0.05, 1.7, '#5C3A24', verts=6)
    random.seed(7)
    for x, y, s in ((-6.2, 2.2, 1.3), (-4.6, 3.2, 1.1), (4.8, 3.0, 1.2), (6.4, 2.0, 1.35), (-7.4, 0.6, 1.1), (7.4, 0.4, 1.0), (-3.0, 3.4, 1.0), (3.0, 3.6, 1.05), (0.2, 3.9, 1.1)):
        tree(x, y, s=s)
    for x in (-5.6, 5.6): palm(x, 0.8, s=0.9, lean=0.05)
    for x, h, r, c in ((-7.0, 3.4, 2.2, '#7FAF78'), (-3.6, 4.2, 2.7, '#6EA06C'), (6.6, 3.0, 2.1, '#88B783')):
        cone((x, 4.4, h / 2), r, 0.0, h, c, verts=6)
    cloud2(-2, 7, 7.8, 0.85); cloud2(5, 6, 7.4, 0.7)

def keelung():
    # 基隆車站：港口旁的現代站房、海水、貨櫃船與吊車，後方山丘
    box((-4.2, 3.0, 0.02), (9.4, 4.6, 0.1), '#5FA9D6', bevel=0.3, rough=0.12)          # 港灣海水
    box((-4.4, 3.6, 0.45), (5.2, 1.3, 0.7), '#E8E4DA', bevel=0.15)                       # 船身
    box((-4.4, 3.6, 0.2), (5.3, 1.35, 0.3), '#C6463C', bevel=0.1)
    for i, c in enumerate(['#3E7CB8', '#E59A3A', '#5BA36B', '#C6463C', '#3E7CB8']):
        box((-6.0 + i * 0.8, 3.6, 1.0), (0.7, 1.0, 0.45), c, bevel=0.03)
    box((-2.3, 3.6, 1.3), (0.9, 1.0, 1.0), '#F2F0EA', bevel=0.06)
    for x in (-0.6, 1.2):                                                                  # 吊車
        box((x, 2.2, 1.4), (0.18, 0.18, 2.8), '#E2A23A', bevel=0.02); box((x - 0.8, 2.2, 2.8), (2.2, 0.2, 0.18), '#E2A23A', bevel=0.02)
    box((3.2, -0.2, 0.1), (8.4, 4.0, 0.2), '#DEDAD2', bevel=0.04)
    box((3.2, 0.0, 0.95), (7.4, 3.0, 1.5), '#F3F2EE', bevel=0.05)
    box((3.2, -1.52, 0.9), (6.6, 0.04, 1.0), '#8FC3DD', bevel=0, rough=0.1)
    for i in range(12): box((0.1 + i * 0.56, -1.55, 0.9), (0.05, 0.04, 1.0), '#E9EEF0', bevel=0)
    box((3.2, 0.0, 1.78), (7.8, 3.4, 0.16), '#5D6B78', bevel=0.04)                       # 平屋頂
    box((5.6, 0.0, 2.4), (2.0, 2.0, 1.2), '#F3F2EE', bevel=0.05); box((5.6, -1.02, 2.4), (1.6, 0.04, 0.8), '#8FC3DD', bevel=0, rough=0.1)
    box((5.6, 0.0, 3.06), (2.3, 2.3, 0.14), '#5D6B78', bevel=0.04)
    track(-3.9, -8.5, 8.5); train(-7.6, -3.9, cars=3)
    for x, h, r, c in ((5.0, 3.0, 2.6, '#6FA56A'), (8.0, 2.4, 2.0, '#7DB277')):
        cone((x, 4.2, h / 2), r, 0.0, h, c, verts=7)
    for i in range(4): box((4.0 + i * 0.5, 3.0, 2.0 - i * 0.05), (0.32, 0.08, 0.42), '#FFFFFF', bevel=0.02, rot=(0.3, 0, 0))   # 山上白色字牌
    for x in (7.0, 7.8): tree(x, -2.2, s=1.0)
    cloud2(-1, 7, 8.4, 0.9); cloud2(5, 7, 7.4, 0.7)

def changhua():
    # 彰化扇形車庫：扇形機車庫＋轉車台＋蒸汽機車
    cx, cy = 0.0, -2.6
    cyl((cx, cy, 0.06), 2.2, 0.12, '#B9AD9C', verts=40)                                  # 轉車台基座
    cyl((cx, cy, 0.14), 1.9, 0.06, '#9C8F7E', verts=40)
    box((cx, cy, 0.22), (3.8, 0.5, 0.1), '#5E646B', bevel=0.02, rot=(0, 0, 0.35))         # 轉車橋
    n = 12
    for i in range(n):
        a = math.radians(20 + i * (140 / (n - 1)))
        ux, uy = math.cos(a), math.sin(a)
        rx, ry = cx + ux * 5.6, cy + uy * 5.6
        box((rx, ry, 1.0), (1.05, 3.0, 2.0), '#F1EEE6', bevel=0.04, rot=(0, 0, a - math.pi / 2))
        box((cx + ux * 4.08, cy + uy * 4.08, 0.85), (0.8, 0.06, 1.5), '#4C5763', bevel=0, rot=(0, 0, a - math.pi / 2))
        prism((rx, ry, 2.0), (1.15, 3.2), 0.55, (0.05, 3.2), '#5B6570', bevel=0.02).rotation_euler = (0, 0, a - math.pi / 2)
        # 鐵軌放射
        box((cx + ux * 3.0, cy + uy * 3.0, 0.08), (0.08, 2.2, 0.04), '#8E949A', bevel=0, rot=(0, 0, a - math.pi / 2))
    # 蒸汽機車（停在轉車台）
    rot = 0.35
    body = [((0.0, 0), (1.9, 0.62, 0.62), '#2A2D31'), ((0.75, 0), (0.5, 0.7, 0.9), '#2A2D31')]
    for (dx, dy), size, c in body:
        x = cx + dx * math.cos(rot); y = cy + dx * math.sin(rot)
        box((x, y, 0.62 + size[2] / 2 - 0.3), size, c, bevel=0.08, rot=(0, 0, rot))
    cyl((cx - 0.55 * math.cos(rot), cy - 0.55 * math.sin(rot), 1.25), 0.12, 0.45, '#2A2D31', verts=12)
    for k in (-0.6, 0.0, 0.6):
        for side in (-1, 1):
            cyl((cx + k * math.cos(rot) - side * 0.34 * math.sin(rot), cy + k * math.sin(rot) + side * 0.34 * math.cos(rot), 0.42), 0.22, 0.08, '#B33A2B', verts=16, rot=(math.pi / 2, 0, rot))
    for x in (-7.2, -6.4, 6.6, 7.3): tree(x, -3.6, s=1.0)
    for x in (-7.4, 7.6): tree(x, 3.8, s=1.1, kind='cone')
    cloud2(-1, 7, 8.4, 0.9); cloud2(5, 7, 7.4, 0.7)

SCENES = {'taipei': (taipei, '#BFE3F5'), 'hsinchu': (hsinchu, '#CFE6F2'), 'taichung': (taichung, '#F6E1C8'),
          'kaohsiung': (kaohsiung, '#BFE9EE'), 'hualien': (hualien, '#CDEBEF'), 'jiji': (jiji, '#DCEFD3'),
          'keelung': (keelung, '#BFE0F0'), 'changhua': (changhua, '#F3E6CC')}

if __name__ == '__main__':
    name = sys.argv[-2]; mode = sys.argv[-1]
    fn, sky = SCENES[name]
    random.seed(3)
    s = reset(); base(); fn()
    res, smp = ((1200, 480), 16) if mode == 'preview' else ((2400, 960), 64)
    if mode == 'lines':
        # 版6 水彩鋼筆風：只算 Freestyle 線稿（材質全部改為白色自發光，背景透明）
        import bpy
        for m in bpy.data.materials:
            nt = m.node_tree; p = nt.nodes['Principled BSDF']
            p.inputs['Base Color'].default_value = (1, 1, 1, 1); p.inputs['Emission Color'].default_value = (1, 1, 1, 1); p.inputs['Emission Strength'].default_value = 1.0
        s.render.use_freestyle = True; s.render.line_thickness_mode = 'ABSOLUTE'; s.render.line_thickness = 2.2
        fs = s.view_layers[0].freestyle_settings
        lset = fs.linesets.new('ink') if not len(fs.linesets) else fs.linesets[0]
        if lset.linestyle is None: lset.linestyle = bpy.data.linestyles.new('ink')
        lset.select_silhouette = True; lset.select_border = True; lset.select_crease = True; lset.select_external_contour = True
        ls = lset.linestyle
        ls.color = (0.16, 0.11, 0.08); ls.thickness = 2.2
        ls.use_chaining = True
        try:
            m = ls.thickness_modifiers.new('noise', 'NOISE'); m.amplitude = 1.2; m.period = 30
            g = ls.geometry_modifiers.new('wob', 'PERLIN_NOISE_1D'); g.amplitude = 1.2; g.frequency = 6
        except Exception as e: print('mod', e)
        s.view_layers[0].freestyle_settings.crease_angle = 2.2
        setup(s, res=(2400, 960), samples=4, sky=(1, 1, 1))
        render(s, f"/home/claude/blender/out/{name}-lines{'-nc' if os.environ.get('NOCLOUD') else ''}.png")
    else:
        setup(s, res=res, samples=smp, sky=(0.86, 0.92, 0.97))
        render(s, f"/home/claude/blender/out/{name}-{mode}{'-nc' if os.environ.get('NOCLOUD') else ''}.png")
