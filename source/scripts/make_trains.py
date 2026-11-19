# 產生三張特色列車示意插圖（SVG）：鳴日號、海風號、藍皮解憂號
# 之後取得官方照片時，直接以照片取代 src/assets/trains/*.svg 即可
import os

W, H = 1200, 480
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'trains')
os.makedirs(OUT, exist_ok=True)


def train(x0, base, cars, car_w, body, stripe, stripe2, win, roof, skirt, nose='slant', open_win=False):
    """側視列車：x0 起點（最左），base 為車底 y，由左而右，最右為車頭"""
    g = []
    h = 74
    top = base - h
    for i in range(cars):
        x = x0 + i * (car_w + 8)
        last = i == cars - 1
        w = car_w
        # 車身
        if last and nose == 'slant':
            d = f'M{x},{top+6} Q{x},{top} {x+6},{top} L{x+w-46},{top} Q{x+w-10},{top+4} {x+w},{top+40} L{x+w},{base} L{x},{base} Z'
            g.append(f'<path d="{d}" fill="{body}"/>')
        elif last and nose == 'round':
            d = f'M{x},{top+6} Q{x},{top} {x+6},{top} L{x+w-26},{top} Q{x+w},{top} {x+w},{top+26} L{x+w},{base} L{x},{base} Z'
            g.append(f'<path d="{d}" fill="{body}"/>')
        else:
            g.append(f'<rect x="{x}" y="{top}" width="{w}" height="{h}" rx="6" fill="{body}"/>')
        # 車頂
        g.append(f'<rect x="{x+4}" y="{top-6}" width="{w-(40 if last else 8)}" height="7" rx="3" fill="{roof}"/>')
        # 腰帶色條
        sw = w - (12 if last else 0)
        g.append(f'<rect x="{x}" y="{base-24}" width="{sw}" height="9" fill="{stripe}"/>')
        if stripe2:
            g.append(f'<rect x="{x}" y="{base-13}" width="{sw}" height="4" fill="{stripe2}"/>')
        # 車窗
        n = 6 if not last else 4
        ww = (w - (70 if last else 30)) / n
        for k in range(n):
            wx = x + 14 + k * ww
            g.append(f'<rect x="{wx:.1f}" y="{top+14}" width="{ww-8:.1f}" height="26" rx="3" fill="{win}"/>')
            if open_win and k % 2 == 0:
                g.append(f'<rect x="{wx:.1f}" y="{top+14}" width="{ww-8:.1f}" height="11" rx="2" fill="{body}" opacity="0.55"/>')
        if last and nose == 'slant':
            g.append(f'<path d="M{x+w-40},{top+10} Q{x+w-14},{top+12} {x+w-6},{top+38} L{x+w-40},{top+38} Z" fill="{win}"/>')
        if last and nose == 'round':
            g.append(f'<rect x="{x+w-30}" y="{top+12}" width="22" height="26" rx="5" fill="{win}"/>')
        # 裙板與輪
        g.append(f'<rect x="{x+6}" y="{base}" width="{w-12}" height="8" fill="{skirt}"/>')
        for cx in (x + 30, x + 58, x + w - 58, x + w - 30):
            g.append(f'<circle cx="{cx}" cy="{base+12}" r="8" fill="#2b2f36"/><circle cx="{cx}" cy="{base+12}" r="3" fill="#8a929c"/>')
    return '\n'.join(g)


def rails(y, color='#5b5f66'):
    ties = ''.join(f'<rect x="{x}" y="{y+2}" width="16" height="5" fill="#7a6a58" opacity="0.7"/>' for x in range(0, W, 26))
    return f'{ties}<rect x="0" y="{y}" width="{W}" height="3" fill="{color}"/>'


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">{body}</svg>'


# 1. 鳴日號：秋天的風、清晨日出、幾何山形（織紋意象）、深灰車身配橘金色條
sun = svg(f'''
<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c58a"/><stop offset="0.55" stop-color="#fbe3c0"/><stop offset="1" stop-color="#fdf3e4"/></linearGradient>
 <linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#e98a2b"/><stop offset="1" stop-color="#d9b25a"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
<circle cx="900" cy="190" r="74" fill="#f7a24a" opacity="0.85"/>
<circle cx="900" cy="190" r="110" fill="#f7a24a" opacity="0.18"/>
<path d="M0,330 L120,220 L230,300 L360,170 L500,290 L620,200 L760,300 L880,230 L1010,310 L1120,240 L1200,290 L1200,480 L0,480 Z" fill="#c9875a" opacity="0.55"/>
<path d="M0,350 L90,280 L180,340 L300,250 L420,340 L540,270 L660,350 L780,280 L900,350 L1030,290 L1200,350 L1200,480 L0,480 Z" fill="#8f5a3c" opacity="0.7"/>
<g fill="none" stroke="#fbe3c0" stroke-width="3" opacity="0.6">
 <path d="M300,262 L330,286 L300,310 L270,286 Z"/><path d="M540,282 L566,302 L540,322 L514,302 Z"/><path d="M780,292 L806,312 L780,332 L754,312 Z"/><path d="M90,292 L112,310 L90,328 L68,310 Z"/>
</g>
<rect x="0" y="388" width="{W}" height="92" fill="#6b4630"/>
{rails(396)}
{train(140, 388, 4, 230, '#23262b', 'url(#gold)', '#d9b25a', '#cfe0ec', '#16181b', '#16181b')}
<path d="M1068,330 L1088,350 L1068,370" fill="none" stroke="#e98a2b" stroke-width="5"/>
''')

# 2. 海風號：海天一線、藍綠漸層、半圓、溫暖馬卡龍色
sea = svg(f'''
<defs>
 <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ec"/><stop offset="1" stop-color="#f4efe6"/></linearGradient>
 <linearGradient id="sea2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fa7b0"/><stop offset="1" stop-color="#1f6f8b"/></linearGradient>
 <linearGradient id="body2" x1="0" x2="1"><stop offset="0" stop-color="#f7f5ef"/><stop offset="1" stop-color="#e9f3f2"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky2)"/>
<path d="M760,250 A120,120 0 0 1 1000,250 Z" fill="#f6c9a8" opacity="0.9"/>
<path d="M800,250 A80,80 0 0 1 960,250 Z" fill="#f3a98a" opacity="0.8"/>
<rect x="0" y="250" width="{W}" height="140" fill="url(#sea2)"/>
<g stroke="#e9f6f6" stroke-width="3" fill="none" opacity="0.55">
 <path d="M60,282 q20,-8 40,0 t40,0"/><path d="M420,300 q20,-8 40,0 t40,0"/><path d="M880,286 q20,-8 40,0 t40,0"/><path d="M640,330 q20,-8 40,0 t40,0"/>
</g>
<rect x="0" y="380" width="{W}" height="100" fill="#e7dccb"/>
{rails(396)}
{train(110, 388, 4, 240, 'url(#body2)', '#2f8f9d', '#f3a98a', '#2c5d73', '#9fc9cc', '#7aa9ad', nose='round')}
''')

# 3. 藍皮解憂號：南迴線海岸、復古藍皮車廂、白色腰帶、開窗、慢活
blue = svg(f'''
<defs>
 <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0f0"/><stop offset="1" stop-color="#e8f6fb"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky3)"/>
<g fill="#ffffff" opacity="0.85"><ellipse cx="220" cy="100" rx="70" ry="20"/><ellipse cx="270" cy="88" rx="44" ry="22"/><ellipse cx="860" cy="70" rx="80" ry="18"/></g>
<path d="M0,250 L1200,250 L1200,330 L0,330 Z" fill="#1b8ac4"/>
<path d="M0,250 L1200,250" stroke="#d6f0fb" stroke-width="2"/>
<path d="M700,330 C760,250 820,230 900,215 C980,200 1080,190 1200,200 L1200,360 L700,360 Z" fill="#5c8f4a"/>
<path d="M820,330 C880,270 960,250 1200,245 L1200,360 L820,360 Z" fill="#3f7136"/>
<g fill="#2f5e2a">
 <rect x="120" y="270" width="6" height="64"/><path d="M123,272 q-30,-6 -44,10 M123,272 q30,-6 44,10 M123,272 q-18,-22 -38,-22 M123,272 q18,-22 38,-22" stroke="#2f5e2a" stroke-width="6" fill="none"/>
</g>
<rect x="0" y="330" width="{W}" height="150" fill="#d9c9a3"/>
{rails(396)}
{train(150, 388, 4, 226, '#1d4f9a', '#f2f2ec', None, '#bfe4f5', '#163d78', '#123566', nose='round', open_win=True)}
<rect x="1060" y="306" width="16" height="10" rx="2" fill="#ffe082"/>
''')

# 4. 環島之星：唯一繞行全臺的觀光列車；暮色星空、粉嫩配色（不使用任何授權角色）
star = svg(f'''
<defs>
 <linearGradient id="sky4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3a78"/><stop offset="0.55" stop-color="#8a6fb0"/><stop offset="1" stop-color="#f3b6c8"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky4)"/>
<g fill="#fff">
 <circle cx="760" cy="60" r="2"/><circle cx="820" cy="120" r="1.6"/><circle cx="950" cy="80" r="2.4"/><circle cx="1080" cy="140" r="1.8"/><circle cx="1130" cy="50" r="2"/>
 <circle cx="640" cy="110" r="1.6"/><circle cx="560" cy="40" r="2"/><circle cx="420" cy="90" r="1.4"/><circle cx="1010" cy="200" r="1.4"/><circle cx="700" cy="180" r="1.6"/>
 <path d="M900,150 l6,16 l17,0 l-14,10 l5,17 l-14,-10 l-14,10 l5,-17 l-14,-10 l17,0 Z" opacity="0.95"/>
</g>
<path d="M880,330 C930,250 1010,200 1060,170 C1080,215 1060,270 1020,330 Z" fill="#6c5b9a" opacity="0.6"/>
<ellipse cx="1080" cy="230" rx="22" ry="26" fill="#f7c873"/><path d="M1068,254 L1092,254 L1086,272 L1074,272 Z" fill="#c98a4b"/>
<path d="M0,300 C200,280 400,320 600,300 C800,280 1000,310 1200,295 L1200,480 L0,480 Z" fill="#5d4f86"/>
<rect x="0" y="380" width="{W}" height="100" fill="#4a3f6e"/>
{rails(396, '#2e2848')}
{train(140, 388, 4, 230, '#fbf7fb', '#f19bb8', '#b9a3e3', '#5b5a8f', '#d9cde9', '#c6b6de', nose='slant')}
''')

# 5. 山嵐號：花東縱谷、晨霧山嵐、稻浪；清新黃綠車身
mist = svg(f'''
<defs>
 <linearGradient id="sky5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7e8e4"/><stop offset="1" stop-color="#f5f6ec"/></linearGradient>
 <linearGradient id="body5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4df6a"/><stop offset="1" stop-color="#a9c247"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky5)"/>
<path d="M0,260 L140,150 L260,220 L420,110 L560,210 L700,130 L860,220 L1000,140 L1200,230 L1200,330 L0,330 Z" fill="#7f9c93" opacity="0.55"/>
<path d="M0,290 L160,200 L300,270 L460,190 L620,270 L780,200 L940,280 L1100,210 L1200,260 L1200,340 L0,340 Z" fill="#4f7a6a" opacity="0.7"/>
<g fill="#ffffff" opacity="0.75"><ellipse cx="260" cy="232" rx="210" ry="18"/><ellipse cx="760" cy="215" rx="260" ry="16"/><ellipse cx="1080" cy="250" rx="160" ry="14"/></g>
<rect x="0" y="330" width="{W}" height="150" fill="#b8c95a"/>
<g stroke="#9bb04a" stroke-width="2" opacity="0.8">
 <path d="M0,350 L1200,350"/><path d="M0,365 L1200,365"/><path d="M0,430 L1200,430"/><path d="M0,450 L1200,450"/>
</g>
{rails(396, '#55603a')}
{train(150, 388, 4, 230, 'url(#body5)', '#2f5a45', '#f7f4e4', '#24413a', '#7f9a3a', '#5f7432', nose='round')}
''')

for name, s in (('sun', sun), ('sea', sea), ('blue', blue), ('star', star), ('mist', mist)):
    with open(os.path.join(OUT, f'{name}.svg'), 'w') as f:
        f.write(s)
print('ok')
