"""Animated sticker strip from rendered frames (same placement for every frame).

Usage (from the repo root, with the stickers venv):
    python tools/stickers/anim_strip.py <frames dir> /tmp/last.png [name]
Frames: transparent PNGs f00..fNN of the same size, rendered with three.js:
  - bureau-assis-debout (default): the 3D desk at heights 74 -> 116 cm, walking pad hidden;
  - meuble-skate-3d: Tom's skate rack, the decks sliding in and clipping into the slots.
Writes frontend/assets/things/<name>.webp (frame 0, the static sticker) and
<name>-anim.webp, a horizontal strip of half-size frames stepped by things.js.
"""
import sys,glob,hashlib,numpy as np,cv2
from PIL import Image
sys.path.insert(0,'tools/stickers'); import make_stickers as M
fr=sorted(glob.glob(sys.argv[1]+'/f*.png'))
ims=[np.asarray(Image.open(f).convert('RGBA'),np.float32)/255 for f in fr]
al=np.max([i[...,3] for i in ims],axis=0); ys,xs=np.where(al>0.04)
y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
W,H,SS=M.W,M.H,M.SS
bw=(W-2*(M.BORDER+M.MARGIN))*SS; bh=(H-2*(M.BORDER+M.MARGIN))*SS
cw,ch=x1-x0,y1-y0; s=min(bw/cw,bh/ch)
cov=float((ims[0][y0:y1,x0:x1,3]>0.5).sum())*s*s/(bw*bh)
if cov>M.COVERAGE: s*=(M.COVERAGE/cov)**0.5
nw,nh=round(cw*s),round(ch*s); ox=(W*SS-nw)//2; oy=(H*SS-nh)//2
NAME=sys.argv[3] if len(sys.argv)>3 else 'bureau-assis-debout'
seed=int(hashlib.sha1(NAME.encode()).hexdigest()[:8],16)
outs=[]
for im in ims:
    crop=im[y0:y1,x0:x1].copy(); crop[...,:3]*=crop[...,3:4]
    pm=np.clip(cv2.resize(crop,(nw,nh),interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC),0,1)
    art=np.zeros((H*SS,W*SS,4),np.float32); art[oy:oy+nh,ox:ox+nw]=pm
    cut,inside=M.die_cut(art[...,3]); paper=M.paper_layer(cut,inside,seed)
    a=art[...,3:4]; rgb=art[...,:3]+paper*(1-a); oa=np.maximum(cut,art[...,3])
    p=np.dstack([rgb*oa[...,None],oa]); p=cv2.resize(p,(W,H),interpolation=cv2.INTER_AREA)
    af=p[...,3:4]; rf=np.where(af>1e-4,p[...,:3]/np.maximum(af,1e-4),0)
    outs.append(Image.fromarray((np.dstack([np.clip(rf,0,1),np.clip(af,0,1)])*255+.5).astype(np.uint8),'RGBA'))
M.save_webp(outs[0],__import__('pathlib').Path(f'frontend/assets/things/{NAME}.webp'))
fw,fh=W//2,H//2
strip=Image.new('RGBA',(fw*len(outs),fh))
for k,o in enumerate(outs): strip.paste(o.resize((fw,fh),Image.LANCZOS),(k*fw,0))
strip.save(f'frontend/assets/things/{NAME}-anim.webp','WEBP',quality=82,alpha_quality=90,method=6)
outs[-1].save(sys.argv[2])
print(W,H,len(outs))
