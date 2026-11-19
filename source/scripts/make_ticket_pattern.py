# 產生 Portal 版5 紙本車票的防偽底紋（臺灣島＋路徽圓圈交錯、細箭頭），參考早期臺鐵硬卡車票
# 用法：在 src/assets 目錄執行 python3 ../../scripts/make_ticket_pattern.py
from PIL import Image, ImageDraw
emb = Image.open('emblem-white.png').convert('RGBA')
TW = [(0.62,0.0),(0.75,0.05),(0.85,0.12),(0.88,0.2),(0.84,0.33),(0.79,0.48),(0.72,0.63),(0.62,0.78),(0.53,0.9),(0.46,1.0),(0.41,0.9),(0.31,0.78),(0.2,0.63),(0.13,0.49),(0.15,0.36),(0.25,0.23),(0.38,0.13),(0.5,0.05)]
def tile(color, out, S=192):
    c = tuple(int(color[i:i+2], 16) for i in (1, 3, 5)); C = c + (255,)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cell = S // 2; r = int(cell * 0.40)
    e = emb.resize((int(r * 1.45), int(r * 1.45)), Image.LANCZOS); a = e.split()[3]; tint = Image.new('RGBA', e.size, C); tint.putalpha(a)
    for row in range(2):
        for col in range(2):
            cx = col * cell + cell // 2; cy = row * cell + cell // 2
            d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=C, width=max(2, S // 80))
            if (row + col) % 2 == 0:
                w, h = r * 0.85, r * 1.5; d.polygon([(cx - w / 2 + x * w, cy - h / 2 + y * h) for x, y in TW], fill=C)
            else:
                im.alpha_composite(tint, (cx - tint.size[0] // 2, cy - tint.size[1] // 2))
            ax = (cx + cell // 2) % S; ay = cy; L = r * 0.35; up = (row % 2 == 0)
            d.line((ax, ay - L, ax, ay + L), fill=C, width=2)
            tip = ay - L - 3 if up else ay + L + 3; base = ay - L + 5 if up else ay + L - 5
            d.polygon([(ax - 4, base), (ax + 4, base), (ax, tip)], fill=C)
    im.save(out)
for name, col in (('budget', '#C9A066'), ('audit', '#6FA4D6'), ('bi', '#9A9FA6')):
    tile(col, f'ticket-pattern-{name}.png')
