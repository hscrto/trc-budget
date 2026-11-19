# 版6：鋼筆線稿＋水彩風格（Blender 彩色算圖＋Freestyle 線稿 → 水彩化）
import sys, numpy as np, cv2
from PIL import Image
rng = np.random.default_rng(11)
W, H = 2400, 960

def fractal(h, w, scales=(8, 32, 96), amps=(0.5, 0.3, 0.2)):
    out = np.zeros((h, w), np.float32)
    for sc, a in zip(scales, amps):
        n = rng.random((h // sc + 2, w // sc + 2)).astype(np.float32)
        out += a * cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    out = (out - out.min()) / (out.max() - out.min() + 1e-6)
    return out

paper_rgb = np.array([247, 242, 230], np.float32) / 255
def paper():
    grain = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 1.2)
    emb = cv2.filter2D(grain, -1, np.array([[-1, 0, 0], [0, 0, 0], [0, 0, 1]], np.float32))
    p = np.ones((H, W, 3), np.float32) * paper_rgb
    p *= (1 + 0.025 * emb)[..., None]
    return p

def hexrgb(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255

def sky_wash(top, bottom):
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    blot = fractal(H, W, (40, 120, 300), (0.3, 0.4, 0.3))
    amt = np.clip((1 - t * 1.25) * (0.75 + 0.5 * blot) , 0, 1)   # 上濃下淡
    # 白雲：紙色留白
    clouds = fractal(H, W, (60, 180, 420), (0.2, 0.4, 0.4))
    amt *= np.clip(1.4 - clouds * 1.25, 0.15, 1)
    col = hexrgb(top)[None, None, :] * (1 - t[..., None] * 0.3) + hexrgb(bottom)[None, None, :] * (t[..., None] * 0.3)
    wash = 1 - amt[..., None] * (1 - col)          # 減色混合（越濃越接近顏料色）
    return wash

def watercolor(rgb, alpha):
    img = (rgb * 255).astype(np.uint8)
    sty = cv2.stylization(img, sigma_s=40, sigma_r=0.35).astype(np.float32) / 255
    sty = cv2.bilateralFilter((sty * 255).astype(np.uint8), 9, 40, 9).astype(np.float32) / 255
    # 提亮、略降飽和（水彩透明感）
    hsv = cv2.cvtColor((sty * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.08, 0, 255); hsv[..., 2] = np.clip(hsv[..., 2] * 1.02 + 4, 0, 255)
    sty = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255
    # 顏料沉積（顆粒）＋邊緣加深
    gran = fractal(H, W, (3, 9, 30), (0.4, 0.4, 0.2))
    sty *= (0.94 + 0.1 * gran)[..., None]
    lum = cv2.cvtColor((sty * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    edge = cv2.GaussianBlur(np.abs(cv2.Laplacian(cv2.GaussianBlur(lum, (0, 0), 2), cv2.CV_32F)), (0, 0), 1.5)
    edge = np.clip(edge / 12, 0, 1)
    sty *= (1 - 0.12 * edge)[..., None]
    # 筆觸滲出：遮罩邊緣不規則
    a = cv2.GaussianBlur(alpha, (0, 0), 2.5)
    a = np.clip((a - 0.5) * 1.6 + 0.5 + (fractal(H, W, (6, 20), (0.6, 0.4)) - 0.5) * 0.5, 0, 1)
    # 顏色略為錯位（水彩不貼線）
    M = np.float32([[1, 0, 4], [0, 1, -3]])
    sty = cv2.warpAffine(sty, M, (W, H), borderMode=cv2.BORDER_REPLICATE)
    a = cv2.warpAffine(a, M, (W, H))
    return sty, a

def ridge(y0, amp, scales):
    x = np.zeros(W, np.float32)
    for sc, a in scales:
        n = rng.random(W // sc + 3).astype(np.float32)
        x += a * cv2.resize(n[None, :], (W, 1), interpolation=cv2.INTER_CUBIC)[0]
    return (y0 - amp * (x - x.mean()) / (x.std() + 1e-6)).astype(np.float32)

def land(img, hill1, hill2, ground):
    yy = np.arange(H, dtype=np.float32)[:, None]
    for ry, col, k in ((ridge(H * 0.50, 38, [(220, 0.6), (70, 0.3), (20, 0.1)]), hill1, 0.42), (ridge(H * 0.60, 30, [(160, 0.6), (50, 0.3), (14, 0.1)]), hill2, 0.5)):
        m = np.clip((yy - ry[None, :]) / 6, 0, 1) * np.clip(1 - (yy - ry[None, :]) / (H * 0.16), 0, 1)
        m *= (0.75 + 0.5 * fractal(H, W, (20, 80), (0.5, 0.5)))
        m = cv2.GaussianBlur(m, (0, 0), 1.2) * k
        img = img * (1 - m[..., None] * (1 - hexrgb(col)))
    g = np.clip((yy - H * 0.66) / (H * 0.3), 0, 1) * (0.7 + 0.5 * fractal(H, W, (30, 90), (0.5, 0.5)))
    img = img * (1 - (g * 0.45)[..., None] * (1 - hexrgb(ground)))
    return img

def run(name, top, bottom, out, hill1='#9DBF9A', hill2='#7FAE78', ground='#E3CFA3'):
    col = np.asarray(Image.open(f'out/{name}-final-nc.png').convert('RGBA'), np.float32) / 255
    lines = np.asarray(Image.open(f'out/{name}-lines-nc.png').convert('RGBA'), np.float32) / 255
    pp = paper()
    base = land(pp * sky_wash(top, bottom), hill1, hill2, ground)
    sty, a = watercolor(col[..., :3], col[..., 3])
    # 水彩層以「相乘」疊上（透明顏料），再依遮罩混合
    painted = pp * (0.06 + 0.94 * sty)
    img = base * (1 - a[..., None]) + painted * a[..., None]
    # 地面陰影（淡灰水彩）
    sh = cv2.GaussianBlur(np.roll(col[..., 3], 26, axis=0), (0, 0), 22) * (1 - col[..., 3])
    img *= (1 - 0.18 * sh)[..., None]
    # 鋼筆線：線稿 alpha × 墨色（略帶暖褐）
    la = lines[..., 3] * (1 - lines[..., :3].mean(axis=2) * 0.9)
    la = cv2.GaussianBlur(la, (0, 0), 0.6)
    ink = np.array([0.20, 0.15, 0.11], np.float32)
    img = img * (1 - la[..., None] * 0.92) + ink * la[..., None] * 0.92
    out_img = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((1800, 720), Image.LANCZOS)
    out_img.save(out, 'WEBP', quality=84, method=6)

SKY = {'taipei': ('#8DC3E6', '#F3EEDF'), 'keelung': ('#8CBDDF', '#F3EEDF'), 'hsinchu': ('#9BC2E0', '#F3EEDF'), 'taichung': ('#9CC6E3', '#F5EAD6'),
       'changhua': ('#A6CBE3', '#F5EAD6'), 'kaohsiung': ('#86C9E0', '#F3EEDF'), 'hualien': ('#8EC8DD', '#F3EEDF'), 'jiji': ('#A3CFE2', '#F2F0DE')}
if __name__ == '__main__':
    for n in sys.argv[1:]:
        run(n, *SKY[n], f'/home/claude/aa-app/src/assets/stations-pencil/{n}.webp')
        print(n, 'ok')
