"""Generate the app icon, Android adaptive-icon layers, splash and favicon from brand kit v1.0.

Run from mobile/:  python3 scripts/make-icons.py   (needs Pillow and node_modules for the font)
The K symbol is the same 64x64 path as Frontend/src/components/brand/LogoMark.tsx.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("assets/images")
TURF, INK, CHALK, FLOOD = "#1F7A4D", "#111513", "#F3F2EC", "#D4F53C"
SS = 4  # supersampling for smooth edges

# M18 14.5h8v14.2L36.3 14.5h9.2L34.6 29.4 46 49.5h-9.3l-7.8-14.4-2.9 3.9v10.5h-8z
K = [(18, 14.5), (26, 14.5), (26, 28.7), (36.3, 14.5), (45.5, 14.5), (34.6, 29.4),
     (46, 49.5), (36.7, 49.5), (28.9, 35.1), (26, 39), (26, 49.5), (18, 49.5)]
DOT = (47, 15.5, 6)
# Symbol bounds in the 64 grid: x 18..53, y 9.5..49.5
BX0, BY0, BX1, BY1 = 18, 9.5, 53, 49.5


def symbol(size, bg, k_color, dot_color, scale_of_height):
    """Square canvas with the symbol centred; its height is `scale_of_height` of the canvas."""
    S = size * SS
    img = Image.new("RGBA", (S, S), bg)
    d = ImageDraw.Draw(img)
    unit = (S * scale_of_height) / (BY1 - BY0)
    ox = (S - (BX1 - BX0) * unit) / 2 - BX0 * unit
    oy = (S - (BY1 - BY0) * unit) / 2 - BY0 * unit
    d.polygon([(ox + x * unit, oy + y * unit) for x, y in K], fill=k_color)
    cx, cy, r = DOT
    d.ellipse([ox + (cx - r) * unit, oy + (cy - r) * unit, ox + (cx + r) * unit, oy + (cy + r) * unit], fill=dot_color)
    return img.resize((size, size), Image.LANCZOS)


def tile(size):
    """The rounded Turf tile from the web favicon (rx 14.4 of 64)."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 14.4 / 64, fill=TURF)
    sym = symbol(size, (0, 0, 0, 0), CHALK, FLOOD, 0.625).resize((S, S), Image.LANCZOS)
    img.alpha_composite(sym)
    return img.resize((size, size), Image.LANCZOS)


def wordmark(height):
    """KHELSP●T in Big Shoulders Black, Chalk letters and a Floodlight dot, transparent background."""
    font_path = "node_modules/@expo-google-fonts/big-shoulders/900Black/BigShoulders_900Black.ttf"
    fs = height * SS
    font = ImageFont.truetype(font_path, fs)
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l1, l2 = "KHELSP", "T"
    w1 = probe.textlength(l1, font=font)
    w2 = probe.textlength(l2, font=font)
    dot = fs * 0.5
    gap_l, gap_r = fs * 0.03, fs * 0.045
    pad = fs * 0.2
    W = int(w1 + gap_l + dot + gap_r + w2 + pad * 2)
    H = int(fs * 1.3)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Vertically centre on the cap height (bbox of "H").
    top, bottom = probe.textbbox((0, 0), "H", font=font)[1::2]
    y = (H - (bottom - top)) / 2 - top
    d.text((pad, y), l1, font=font, fill=CHALK)
    cap_mid = y + top + (bottom - top) / 2
    x = pad + w1 + gap_l
    d.ellipse([x, cap_mid - dot / 2, x + dot, cap_mid + dot / 2], fill=FLOOD)
    d.text((x + dot + gap_r, y), l2, font=font, fill=CHALK)
    return img.resize((W // SS, H // SS), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
# iOS / legacy icon: full-bleed Turf (the OS applies its own mask), symbol at 55% of the height.
symbol(1024, TURF, CHALK, FLOOD, 0.55).convert("RGB").save(OUT / "icon.png")
# Android adaptive icon: foreground inside the 66% safe zone, Turf background set in app.config.ts.
symbol(1024, (0, 0, 0, 0), CHALK, FLOOD, 0.42).save(OUT / "android-icon-foreground.png")
# Android 13 themed icon: one-colour silhouette; the system tints it.
symbol(1024, (0, 0, 0, 0), "#FFFFFF", "#FFFFFF", 0.42).save(OUT / "android-icon-monochrome.png")
# Splash: Chalk wordmark with a Floodlight dot, on the Ink background set in app.config.ts.
wordmark(160).save(OUT / "splash-icon.png")
tile(48).save(OUT / "favicon.png")
print("done")
