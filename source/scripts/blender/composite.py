# 合成：彩色版（版5）＝天空漸層＋陰影；鉛筆版（版6）＝灰階加亮減淡素描＋邊線＋紙紋
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageChops
SKY={'taipei':('#9FD0EE','#EAF6FB'),'keelung':('#9CCBE8','#EAF4FA'),'hsinchu':('#A9CBE6','#EEF4F8'),'taichung':('#F2C9A0','#FBF0E3'),
     'changhua':('#EFD7AE','#FBF3E6'),'kaohsiung':('#8FD6E3','#EAF8F6'),'hualien':('#9DD5E0','#EEF8F7'),'jiji':('#BFE3B5','#F2F8EA')}
def h(c): return tuple(int(c[i:i+2],16) for i in (1,3,5))
def grad(W,H,a,b):
    ca,cb=np.array(h(a)),np.array(h(b)); t=np.linspace(0,1,H)[:,None]
    g=(ca+(cb-ca)*t).astype(np.uint8); return Image.fromarray(np.repeat(g[:,None,:],W,axis=1),'RGB').convert('RGBA')
rng=np.random.default_rng(3)
for n,(a,b) in SKY.items():
    im=Image.open(f'out/{n}-final.png').convert('RGBA'); W,H=im.size; alpha=im.split()[3]
    sh=Image.new('RGBA',(W,H),(30,50,70,0)); sh.putalpha(alpha.point(lambda v:int(v*0.22)))
    sh=sh.transform((W,H),Image.AFFINE,(1,0,0,0,1,-30)).filter(ImageFilter.GaussianBlur(26))
    bg=grad(W,H,a,b); bg.alpha_composite(sh); bg.alpha_composite(im)
    bg.convert('RGB').resize((1800,720),Image.LANCZOS).save(f'/home/claude/aa-app/src/assets/stations/{n}.webp','WEBP',quality=80,method=6)
    # 鉛筆版
    white=Image.new('RGBA',(W,H),(255,255,255,255)); sh2=sh.copy(); white.alpha_composite(sh2); white.alpha_composite(im)
    g=np.asarray(white.convert('L'),dtype=np.float32)
    inv=255-g; blur=np.asarray(Image.fromarray(inv.astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)),dtype=np.float32)
    dodge=np.clip(g*255/np.maximum(255-blur,1),0,255)
    edges=np.asarray(Image.fromarray(g.astype(np.uint8)).filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.8)),dtype=np.float32)
    tone=255-(255-g)*0.5
    sk=np.clip(dodge*tone/255-edges*2.2,0,255)
    sk=255-(255-sk)*1.25; sk=np.clip(sk,0,255)
    # 陰影區淡淡排線
    yy,xx=np.mgrid[0:H,0:W]; hatch=((xx+yy)%9<1.2).astype(np.float32)
    shade=np.clip((200-g)/200,0,1); sk=sk-hatch*shade*70
    paper=np.array(h('#F7F3EA'),dtype=np.float32)
    noise=rng.normal(0,5,(H,W)).astype(np.float32)
    s=np.clip(sk+noise,0,255)/255.0
    rgb=(paper[None,None,:]*s[:,:,None]).clip(0,255).astype(np.uint8)
    # 石墨略帶暖灰
    out=Image.fromarray(rgb,'RGB').resize((1800,720),Image.LANCZOS)
    out.save(f'/home/claude/aa-app/src/assets/stations-pencil/{n}.webp','WEBP',quality=82,method=6)
print('ok')
