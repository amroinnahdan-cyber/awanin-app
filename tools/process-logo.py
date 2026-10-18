"""Derive app assets from the supplied Awanin logo (flat blue on #f8f7f5).

Standard library only: this environment has no Pillow/ImageMagick, so the module
carries a minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) and encoder.

The artwork is separated into its two bands (cloud glyph, then wordmark) by finding
empty scanline rows, so the app icon can use the glyph alone while the splash keeps
the full lockup.

Usage:  python3 tools/process-logo.py <source.png>
Writes into assets/:
  logo-source.png              untouched copy of the original
  logo-lockup.png              glyph + wordmark, transparent, 720px wide
  logo-mark.png                cloud glyph only, transparent, 512px square, centred
  icon.png                     glyph on #f5f9ff, 1024px
  favicon.png                  glyph, 64px
  android-icon-foreground.png  glyph, transparent, 1024px, adaptive safe zone
  android-icon-background.png  solid #f5f9ff, 1024px
  android-icon-monochrome.png  white alpha mask for themed icons, 1024px
"""

import os
import struct
import sys
import zlib

BRAND_BG = (245, 249, 255)  # color.bg in the design tokens
# The source artwork is #245dc5, but the UI accent (color.accent, verified from
# the Figma export) is #1854c8. Every derived asset is painted with the accent so
# the app ships one brand blue; the untouched original stays in logo-source.png.
BRAND_INK = (24, 84, 200)  # #1854c8
BG_THRESHOLD = 12
CROP_PADDING = 0.06
BAND_THRESHOLD = 0.08


# --------------------------------------------------------------------------- png

def decode_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat, ihdr = 8, b"", None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", body)
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break
        pos += 12 + length

    width, height, depth, color_type, _, _, interlace = ihdr
    assert depth == 8 and interlace == 0, (depth, interlace)
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[color_type]
    raw = zlib.decompress(idat)
    stride = width * channels
    out = bytearray(stride * height)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        filt = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if filt == 1:
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 255
        elif filt == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif filt == 3:
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 255
        elif filt == 4:
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                up = prev[i]
                upleft = prev[i - channels] if i >= channels else 0
                pa, pb, pc = abs(up - upleft), abs(left - upleft), abs(left + up - 2 * upleft)
                pred = left if (pa <= pb and pa <= pc) else (up if pb <= pc else upleft)
                line[i] = (line[i] + pred) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return width, height, channels, out


def encode_png(width, height, rgba):
    def chunk(kind, body):
        return (struct.pack(">I", len(body)) + kind + body
                + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))

    raw = b"".join(
        b"\x00" + bytes(rgba[y * width * 4:(y + 1) * width * 4]) for y in range(height)
    )
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


# ------------------------------------------------------------------------ alpha

def build_alpha(width, height, channels, pixels):
    """Alpha mask plus the logo's flat brand colour, from ink-on-flat-bg artwork."""
    bg = tuple(pixels[0:3])

    def at(x, y):
        i = (y * width + x) * channels
        return pixels[i], pixels[i + 1], pixels[i + 2]

    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        for x in range(width):
            r, g, b = at(x, y)
            if (abs(r - bg[0]) > BG_THRESHOLD
                    or abs(g - bg[1]) > BG_THRESHOLD
                    or abs(b - bg[2]) > BG_THRESHOLD):
                min_x, min_y = min(min_x, x), min(min_y, y)
                max_x, max_y = max(max_x, x), max(max_y, y)
    assert max_x >= 0, "logo looks empty"

    total, count = [0, 0, 0], 0
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            r, g, b = at(x, y)
            if min(r, g, b) < 120:
                total[0] += r
                total[1] += g
                total[2] += b
                count += 1
    brand = tuple(round(c / count) for c in total) if count else (36, 93, 197)

    alpha = [0.0] * (width * height)
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            i = (y * width + x) * channels
            estimates = []
            for ch in range(3):
                denom = bg[ch] - brand[ch]
                if abs(denom) > 20:
                    estimates.append((bg[ch] - pixels[i + ch]) / denom)
            value = sum(estimates) / len(estimates) if estimates else 0.0
            alpha[y * width + x] = min(1.0, max(0.0, value))

    return alpha, (min_x, min_y, max_x, max_y), brand


def split_bands(alpha, width, box):
    """Find the vertical ink bands (glyph first, then wordmark)."""
    min_x, min_y, max_x, max_y = box
    bands, start = [], None
    for y in range(min_y, max_y + 1):
        inked = any(alpha[y * width + x] > BAND_THRESHOLD for x in range(min_x, max_x + 1))
        if inked and start is None:
            start = y
        elif not inked and start is not None:
            bands.append([start, y - 1])
            start = None
    if start is not None:
        bands.append([start, max_y])
    return bands


def band_box(alpha, width, box, band):
    """Tight x bounds for a vertical band."""
    min_x, _, max_x, _ = box
    y0, y1 = band
    xs = [x for x in range(min_x, max_x + 1)
          if any(alpha[y * width + x] > BAND_THRESHOLD for y in range(y0, y1 + 1))]
    return (min(xs), y0, max(xs), y1)


def crop(alpha, width, box, pad_ratio=CROP_PADDING):
    """Crop a mask to a box plus padding; returns (w, h, flat alpha)."""
    min_x, min_y, max_x, max_y = box
    w = max_x - min_x + 1
    h = max_y - min_y + 1
    pad = round(max(w, h) * pad_ratio)
    out_w, out_h = w + pad * 2, h + pad * 2
    out = [0.0] * (out_w * out_h)
    for y in range(h):
        sy = min_y + y
        row = out_w * (y + pad)
        src = width * sy
        for x in range(w):
            out[row + x + pad] = alpha[src + min_x + x]
    return out_w, out_h, out


def resize(mask, w, h, target_w, target_h):
    """Area-average a mask to the requested size."""
    out = [0.0] * (target_w * target_h)
    sx, sy = w / target_w, h / target_h
    for ty in range(target_h):
        y0, y1 = ty * sy, (ty + 1) * sy
        iy0, iy1 = int(y0), min(h, int(y1) + 1)
        for tx in range(target_w):
            x0, x1 = tx * sx, (tx + 1) * sx
            ix0, ix1 = int(x0), min(w, int(x1) + 1)
            total, weight = 0.0, 0.0
            for y in range(iy0, iy1):
                wy = min(y1, y + 1) - max(y0, y)
                for x in range(ix0, ix1):
                    wx = min(x1, x + 1) - max(x0, x)
                    weight += wy * wx
                    total += mask[y * w + x] * wy * wx
            out[ty * target_w + tx] = total / weight if weight else 0.0
    return out


def place(mask, w, h, size, color, background=None, inset=0.0):
    """Centre a mask inside a square RGBA canvas."""
    inner = round(size * (1 - 2 * inset))
    scale = min(inner / w, inner / h)
    draw_w, draw_h = max(1, round(w * scale)), max(1, round(h * scale))
    offset_x, offset_y = (size - draw_w) // 2, (size - draw_h) // 2

    rgba = bytearray(size * size * 4)
    for ty in range(draw_h):
        sy = min(h - 1, int(ty * h / draw_h))
        py = ty + offset_y
        for tx in range(draw_w):
            sx = min(w - 1, int(tx * w / draw_w))
            a = mask[sy * w + sx]
            i = (py * size + tx + offset_x) * 4
            if background is None:
                rgba[i:i + 4] = bytes((color[0], color[1], color[2], round(a * 255)))
            else:
                rgba[i:i + 4] = bytes((
                    round(color[0] * a + background[0] * (1 - a)),
                    round(color[1] * a + background[1] * (1 - a)),
                    round(color[2] * a + background[2] * (1 - a)),
                    255,
                ))
    return rgba


def write(path, size, rgba):
    with open(path, "wb") as handle:
        handle.write(encode_png(size, size, rgba))
    print(f"  {path}  {size}x{size}  {os.path.getsize(path) // 1024} KB")


def main(source):
    assets = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
    os.makedirs(assets, exist_ok=True)

    width, height, channels, pixels = decode_png(source)
    alpha, box, sampled = build_alpha(width, height, channels, pixels)
    print(f"source {width}x{height} box {box} sampled #%02x%02x%02x" % sampled)
    # Paint with the unified brand ink; alpha unmixing above still uses the true
    # source colour, so the cut-out stays exact.
    brand = BRAND_INK
    print("painting #%02x%02x%02x" % brand)

    with open(source, "rb") as src, open(os.path.join(assets, "logo-source.png"), "wb") as dst:
        dst.write(src.read())

    bands = split_bands(alpha, width, box)
    glyph_box = band_box(alpha, width, box, bands[0])
    print(f"bands {bands} glyph {glyph_box}")

    lw, lh, lockup = crop(alpha, width, box)
    # Non-square lockup for the splash.
    lock_w = 720
    lock_h = round(lh * lock_w / lw)
    lock_mask = resize(lockup, lw, lh, lock_w, lock_h)
    rgba = bytearray(lock_w * lock_h * 4)
    for y in range(lock_h):
        for x in range(lock_w):
            i = (y * lock_w + x) * 4
            rgba[i:i + 4] = bytes((brand[0], brand[1], brand[2],
                                   round(lock_mask[y * lock_w + x] * 255)))
    with open(os.path.join(assets, "logo-lockup.png"), "wb") as handle:
        handle.write(encode_png(lock_w, lock_h, rgba))
    print(f"  assets/logo-lockup.png  {lock_w}x{lock_h}  {os.path.getsize(os.path.join(assets, 'logo-lockup.png')) // 1024} KB")

    gw, gh, glyph = crop(alpha, width, glyph_box)
    print(f"glyph crop {gw}x{gh}")
    print("writing:")
    write(os.path.join(assets, "logo-mark.png"), 512,
          place(glyph, gw, gh, 512, brand, inset=0.04))
    write(os.path.join(assets, "icon.png"), 1024,
          place(glyph, gw, gh, 1024, brand, background=BRAND_BG, inset=0.18))
    write(os.path.join(assets, "favicon.png"), 64,
          place(glyph, gw, gh, 64, brand, background=BRAND_BG, inset=0.06))
    write(os.path.join(assets, "android-icon-foreground.png"), 1024,
          place(glyph, gw, gh, 1024, brand, inset=0.26))
    write(os.path.join(assets, "android-icon-background.png"), 1024,
          bytearray(bytes((*BRAND_BG, 255)) * (1024 * 1024)))
    write(os.path.join(assets, "android-icon-monochrome.png"), 1024,
          place(glyph, gw, gh, 1024, (255, 255, 255), inset=0.26))


if __name__ == "__main__":
    main(sys.argv[1])