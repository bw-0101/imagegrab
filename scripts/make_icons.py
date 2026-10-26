# -*- coding: utf-8 -*-
"""生成 图提取 插件图标（16/32/48/128），渐变圆角方块 + 白色图片图形。"""
from PIL import Image, ImageDraw

OUT = r"C:\Users\边伟\Doubao\chats\2026-10-26\new-chat-1\imagegrab\imagegrab-extension\icons"

SS = 8          # 超采样倍数（抗锯齿）
S = 512         # 绘制底图边长
draw = Image.new("RGBA", (S * SS, S * SS), (0, 0, 0, 0))
d = ImageDraw.Draw(draw)

# ---- 1. 渐变背景圆角方块 ----
R = int(S * SS * 0.22)
r = S * SS
tl, tt = 0, 0
br, bt = r, r
mask = Image.new("L", (r, r), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, r - 1, r - 1], radius=R, fill=255)

# 对角线渐变（#4f6bff -> #7b5bff）
c1 = (0x4F, 0x6B, 0xFF)
c2 = (0x7B, 0x5B, 0xFF)
for i in range(r):
    t = i / (r - 1)
    col = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
    d.line([0, i, r, i], fill=col + (255,))

bg = Image.new("RGBA", (r, r), (0, 0, 0, 0))
bg.paste(Image.new("RGBA", (r, r), (0, 0, 0, 0)), (0, 0))
# 直接构造：把渐变层按圆角 mask 抠出
grad = Image.new("RGBA", (r, r), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
for i in range(r):
    t = i / (r - 1)
    col = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
    gd.line([0, i, r, i], fill=col + (255,))
grad.putalpha(mask)
draw.paste(grad, (0, 0))

# ---- 2. 白色图片图形（相框 + 山 + 太阳）----
white = (255, 255, 255, 255)
margin = 0.24  # 相框相对尺寸
fw = int(r * 0.50)          # 相框宽
fh = int(r * 0.50)          # 相框高
fx = (r - fw) // 2
fy = (r - fh) // 2
stroke = max(6, int(r * 0.045))
d.rounded_rectangle([fx, fy, fx + fw, fy + fh], radius=int(r * 0.05), outline=white, width=stroke)

# 太阳（右上角圆）
sun_r = int(r * 0.055)
sun_cx = fx + int(fw * 0.72)
sun_cy = fy + int(fh * 0.30)
d.ellipse([sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r], fill=white)

# 山（左下）
mt_a = (fx + int(fw * 0.18), fy + int(fh * 0.78))
mt_b = (fx + int(fw * 0.50), fy + int(fh * 0.38))
mt_c = (fx + int(fw * 0.82), fy + int(fh * 0.78))
d.polygon([mt_a, mt_b, mt_c], fill=white)
# 小山
mt2_a = (fx + int(fw * 0.56), fy + int(fh * 0.78))
mt2_b = (fx + int(fw * 0.70), fy + int(fh * 0.56))
mt2_c = (fx + int(fw * 0.84), fy + int(fh * 0.78))
d.polygon([mt2_a, mt2_b, mt2_c], fill=white)

# ---- 3. 缩放到目标尺寸 ----
import os
os.makedirs(OUT, exist_ok=True)
for size in (16, 32, 48, 128):
    icon = draw.resize((size, size), Image.LANCZOS)
    icon.save(os.path.join(OUT, f"icon{size}.png"))
    print(f"icon{size}.png ok")

print("DONE")
