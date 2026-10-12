"""Texture della stanza generate con numpy (ripetibili ai bordi), salvate in assets/blender/textures."""

import numpy as np
from common import _blur, _norm01, normal_from_height, save_image


def blur_xy(a, sx, sy):
    """Sfocatura gaussiana anisotropa via FFT (venature lunghe lungo X)."""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    k = np.exp(-2 * (np.pi**2) * ((sx * fx) ** 2 + (sy * fy) ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * k))


def parquet(size=2048, rows=16, seed=3):
    """Listoni di rovere 15 x 120 cm a giunti sfalsati; la texture copre 2.4 x 2.4 m."""
    rng = np.random.default_rng(seed)
    row_h = size // rows
    plank_l = size // 2
    yy, xx = np.mgrid[0:size, 0:size]
    row = yy // row_h
    offsets = rng.integers(0, plank_l, rows)
    shifted = (xx + offsets[row]) % size
    plank = row * 4 + shifted // plank_l  # id univoco del listone
    n_planks = rows * 4

    # venatura: rumore stirato lungo X, diversa per ogni listone (fase verticale casuale)
    grain_a = _norm01(blur_xy(rng.standard_normal((size, size)), 60, 1.2))
    grain_b = _norm01(blur_xy(rng.standard_normal((size, size)), 220, 4.0))
    rings = np.sin((yy + rng.uniform(0, 400, n_planks)[plank] + grain_b * 90) * (2 * np.pi / rng.uniform(18, 34, n_planks)[plank]))
    figure = grain_a * 0.55 + (rings * 0.5 + 0.5) * 0.3 + grain_b * 0.15
    knots = np.zeros((size, size))
    for _ in range(14):
        cx, cy = rng.integers(0, size, 2)
        r = rng.uniform(5, 11)
        d = np.hypot(((xx - cx + size / 2) % size - size / 2) / 2.2, (yy - cy + size / 2) % size - size / 2)
        knots = np.maximum(knots, np.clip(1 - d / r, 0, 1) ** 1.5)

    # tono per listone: rovere naturale con variazioni calde/chiare
    base = np.array([0.66, 0.53, 0.40])
    tone = rng.uniform(0.88, 1.08, n_planks)[plank]
    warm = rng.uniform(-0.025, 0.025, n_planks)[plank]
    color = base[None, None, :] * tone[..., None]
    color[..., 0] += warm
    color[..., 2] -= warm * 0.6
    color *= (0.78 + figure * 0.32)[..., None]
    color *= (1 - knots * 0.55)[..., None]

    # fughe tra i listoni (smussate)
    gap_y = np.minimum(yy % row_h, row_h - 1 - yy % row_h)
    gap_x = np.minimum(shifted % plank_l, plank_l - 1 - shifted % plank_l)
    gap = np.clip(1 - np.minimum(gap_y, gap_x) / 2.5, 0, 1)
    color *= (1 - gap * 0.7)[..., None]
    color = np.clip(color, 0, 1)  # valori sRGB: l'immagine è marcata sRGB

    height = figure * 0.25 - gap * 1.0
    rough = 0.42 + (grain_a - 0.5) * 0.12 + rng.uniform(-0.05, 0.05, n_planks)[plank] + gap * 0.35
    return color, normal_from_height(height, 3.0), np.repeat(np.clip(rough, 0, 1)[..., None], 3, axis=-1)


def paint(size=512, seed=11):
    """Pittura murale a buccia d'arancia leggera."""
    rng = np.random.default_rng(seed)
    fine = _norm01(_blur(rng.standard_normal((size, size)), 1.6))
    mid = _norm01(_blur(rng.standard_normal((size, size)), 9))
    height = fine * 0.7 + mid * 0.3
    rough = 0.82 + (mid - 0.5) * 0.08
    return normal_from_height(height, 1.6), np.repeat(rough[..., None], 3, axis=-1)


def save_parquet():
    color, normal, rough = parquet()
    return (
        save_image("room_parquet_color", color, non_color=False),
        save_image("room_parquet_normal", normal),
        save_image("room_parquet_rough", rough),
    )


def save_paint():
    normal, rough = paint()
    return save_image("room_paint_normal", normal), save_image("room_paint_rough", rough)


def wood(name, base, size=1024, seed=21, contrast=0.32):
    """Impiallacciatura a venatura continua lungo X (piani, ante, mensole)."""
    rng = np.random.default_rng(seed)
    yy, _ = np.mgrid[0:size, 0:size]
    grain_a = _norm01(blur_xy(rng.standard_normal((size, size)), 80, 1.0))
    grain_b = _norm01(blur_xy(rng.standard_normal((size, size)), 300, 6.0))
    rings = np.sin((yy + grain_b * 140) * (2 * np.pi / 26)) * 0.5 + 0.5
    figure = grain_a * 0.55 + rings * 0.3 + grain_b * 0.15
    color = np.array(base)[None, None, :] * (1 - contrast + figure * contrast * 1.4)[..., None]
    rough = 0.48 + (grain_a - 0.5) * 0.14
    return (
        save_image(f"room_{name}_color", np.clip(color, 0, 1), non_color=False),
        save_image(f"room_{name}_normal", normal_from_height(figure * 0.3, 2.0)),
        save_image(f"room_{name}_rough", np.repeat(rough[..., None], 3, axis=-1)),
    )


def fabric(name="fabric", size=512, threads=96, seed=31):
    """Trama di tessuto (normale + rugosità), ripetibile."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size]
    p = size / threads
    warp = np.sin(xx * 2 * np.pi / p) * 0.5 + 0.5
    weft = np.sin(yy * 2 * np.pi / p) * 0.5 + 0.5
    checker = ((xx // p + yy // p) % 2).astype(float)
    weave = np.where(checker > 0, warp, weft)
    fuzz = _norm01(_blur(rng.standard_normal((size, size)), 1.2))
    slub = _norm01(_blur(rng.standard_normal((size, size)), 18))
    height = weave * 0.7 + fuzz * 0.2 + slub * 0.1
    rough = 0.88 + (fuzz - 0.5) * 0.1
    return (
        save_image(f"room_{name}_normal", normal_from_height(height, 2.5)),
        save_image(f"room_{name}_rough", np.repeat(rough[..., None], 3, axis=-1)),
    )


def leather(size=512, seed=41):
    """Similpelle a grana fine per la sedia gaming."""
    rng = np.random.default_rng(seed)
    cells = _norm01(_blur(rng.standard_normal((size, size)), 2.2))
    pores = _norm01(_blur(rng.standard_normal((size, size)), 0.8))
    height = np.abs(cells - 0.5) * 1.4 + pores * 0.2
    rough = 0.55 + (cells - 0.5) * 0.12
    return (
        save_image("room_leather_normal", normal_from_height(height, 2.0)),
        save_image("room_leather_rough", np.repeat(rough[..., None], 3, axis=-1)),
    )


def rug(size=1024, seed=51):
    """Tappeto a pelo corto: grigio antracite con bordo e motivo geometrico tenue."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size] / size
    base = np.array([0.23, 0.24, 0.27])
    border = ((np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy)) > 0.05) & (np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy)) < 0.075))
    diag = (np.abs(((xx * 8 + yy * 8) % 2) - 1) < 0.06) | (np.abs(((xx * 8 - yy * 8) % 2) - 1) < 0.06)
    inner = np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy)) > 0.11
    color = np.ones((size, size, 3)) * base
    color[border] = (0.62, 0.6, 0.56)
    color[diag & inner] = (0.31, 0.32, 0.36)
    pile = _norm01(_blur(rng.standard_normal((size, size)), 1.0))
    color *= (0.9 + pile * 0.2)[..., None]
    return (
        save_image("room_rug_color", np.clip(color, 0, 1), non_color=False),
        save_image("room_rug_normal", normal_from_height(pile, 3.0)),
    )


def poster_synthwave(w=768, h=1024):
    """Poster retrowave: sole a strisce, montagne e griglia prospettica."""
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    u, v = xx / w, yy / h  # v = 0 in alto
    horizon = 0.62
    sky = np.stack([0.08 + 0.75 * v**1.6, 0.02 + 0.12 * v**2, 0.22 + 0.25 * v], axis=-1)
    img = sky.copy()
    # sole
    d = np.hypot(u - 0.5, (v - 0.42) * h / w)
    sun = d < 0.27
    t = np.clip((v - 0.15) / 0.47, 0, 1)
    sun_col = np.stack([np.ones_like(t), 0.85 - 0.6 * t, 0.25 + 0.25 * t], axis=-1)
    stripes = (v > 0.42) & (((v - 0.42) * 60) % 3 < (0.6 + (v - 0.42) * 10))
    img[sun & ~stripes] = sun_col[sun & ~stripes]
    # montagne
    ridge = horizon - 0.07 - 0.06 * np.abs(np.sin(u * 9.0)) - 0.04 * np.abs(np.sin(u * 23.0 + 1))
    img[v > ridge] = (0.12, 0.03, 0.22)
    # pavimento a griglia
    floor = v > horizon
    img[floor] = (0.05, 0.0, 0.1)
    z = 1.0 / np.maximum(v - horizon, 1e-3)
    gx = np.abs(((u - 0.5) * z * 0.9) % 1 - 0.5) < 0.02 * z**0.6
    gy = np.abs((z * 0.6 + 0.0) % 1 - 0.5) < 0.04
    grid = floor & (gx | gy)
    img[grid] = (1.0, 0.2, 0.75)
    img = np.clip(img, 0, 1)
    return save_image("room_poster_synthwave", img[::-1], non_color=False)


def poster_pixel(w=768, h=1024, seed=61):
    """Poster pixel-art: notte con luna, montagne a gradini e lucciole, griglia 48x64."""
    rng = np.random.default_rng(seed)
    gw, gh = 48, 64
    g = np.zeros((gh, gw, 3))
    for y in range(gh):
        g[y, :] = (0.06 + 0.1 * y / gh, 0.08 + 0.18 * y / gh, 0.2 + 0.25 * y / gh)
    for _ in range(40):
        g[rng.integers(0, 30), rng.integers(0, gw)] = (0.9, 0.9, 1.0)
    yy, xx = np.mgrid[0:gh, 0:gw]
    g[np.hypot(xx - 34, yy - 12) < 5] = (0.98, 0.94, 0.7)
    for layer, (base, col) in enumerate(((36, (0.14, 0.2, 0.36)), (44, (0.08, 0.13, 0.22)), (52, (0.04, 0.07, 0.1)))):
        hgt = base
        for x in range(gw):
            hgt = int(np.clip(hgt + rng.integers(-2, 3), base - 8, base + 4))
            g[hgt:, x] = col
    for _ in range(14):
        g[rng.integers(44, 62), rng.integers(0, gw)] = (0.9, 1.0, 0.4)
    img = np.repeat(np.repeat(g, h // gh, axis=0), w // gw, axis=1)
    return save_image("room_poster_pixel", np.clip(img[::-1], 0, 1), non_color=False)


def night_pano(w=4096, h=2048, seed=9):
    """Panorama equirettangolare (360 x 180) della città di notte, visto da un piano alto.

    u = 0.5 guarda verso est (+X Blender, dove c'è la finestra); v = 0.5 è l'orizzonte.
    """
    rng = np.random.default_rng(seed)
    rows = (np.arange(h) + 0.5) / h
    cols = (np.arange(w) + 0.5) / w
    lat = np.broadcast_to((0.5 - rows)[:, None] * 180.0, (h, w))  # gradi, +90 in alto
    lon = np.broadcast_to((cols - 0.5)[None, :] * 360.0, (h, w))
    deg = w / 360.0  # pixel per grado

    # cielo: inquinamento luminoso caldo all'orizzonte, blu notte in alto
    t = np.clip(lat / 60.0, 0, 1)
    img = np.zeros((h, w, 3))
    img[..., 0] = 0.16 * (1 - t) ** 3 + 0.02
    img[..., 1] = 0.10 * (1 - t) ** 3 + 0.03
    img[..., 2] = 0.20 * (1 - t) ** 2 + 0.07
    stars = (rng.random((h, w)) > 0.9995) & (lat > 12)
    img[stars] = rng.uniform(0.5, 1.0, (int(stars.sum()), 1)) * np.array([0.85, 0.88, 1.0])
    d = np.hypot((lon - 10) * np.cos(np.radians(28)), lat - 28)
    img += (np.clip(1 - d / 2.2, 0, 1) ** 0.3)[..., None] * np.array([0.95, 0.92, 0.8])
    img += (np.exp(-d / 9) * 0.06)[..., None] * np.array([0.6, 0.7, 1.0])

    # strada e quartiere sotto l'orizzonte: buio con lampioni sempre più fitti verso l'orizzonte
    ground = lat < 0
    g = np.clip(-lat / 40.0, 0, 1)
    img[ground] = (np.stack([0.05 + 0.04 * (1 - g), 0.045 + 0.03 * (1 - g), 0.06 + 0.03 * (1 - g)], -1))[ground]
    n_lamps = 9000
    ly = rng.uniform(0, 1, n_lamps) ** 0.35 * 40  # gradi sotto l'orizzonte, addensati in alto
    lx = rng.uniform(0, w, n_lamps)
    for x, y in zip(lx, ly):
        r = int(h * (0.5 + y / 180.0))
        c = int(x)
        size = max(1, int(3 - y / 15))
        warm = rng.random() < 0.8
        img[r : r + size, c : c + size] = (1.0, 0.72, 0.38) if warm else (0.8, 0.9, 1.0)

    # palazzi: tre file, i più vicini partono sotto l'orizzonte (siamo a un piano alto)
    def row_of_buildings(base_lat, h_range, w_range, shade, win_deg, lit):
        x = 0.0
        while x < w:
            bw = rng.uniform(*w_range) * deg
            top_lat = base_lat + rng.uniform(*h_range)
            r0 = int(h * (0.5 - top_lat / 180.0))
            r1 = int(h * (0.5 - base_lat / 180.0))
            c0, c1 = int(x), int(min(w, x + bw))
            if c1 > c0 and r1 > r0:
                img[r0:r1, c0:c1] = shade
                wx, wy = max(3, int(win_deg[0] * deg)), max(3, int(win_deg[1] * deg))
                yy, xx = np.mgrid[r0:r1, c0:c1]
                grid = (((xx - c0) % wx) < wx * 0.55) & (((yy - r0) % wy) < wy * 0.5) & (xx - c0 > 2) & (c1 - xx > 2) & (yy - r0 > 3)
                cell = ((yy - r0) // wy) * 997 + ((xx - c0) // wx)
                on = (np.sin(cell * 12.9898 + c0 * 0.37) * 43758.5453) % 1.0 < lit
                tint = np.where(((cell * 7) % 10 < 7)[..., None], np.array([1.0, 0.74, 0.42]), np.array([0.7, 0.85, 1.0]))
                bright = 0.35 + 0.55 * ((np.sin(cell * 3.1) * 0.5 + 0.5))[..., None]
                img[r0:r1, c0:c1] = np.where((grid & on)[..., None], tint * bright, img[r0:r1, c0:c1])
                # luce rossa di segnalazione sui palazzi più alti
                if top_lat - base_lat > h_range[1] * 0.8:
                    img[max(0, r0 - 3) : r0, (c0 + c1) // 2 : (c0 + c1) // 2 + 3] = (1.0, 0.1, 0.05)
            x += bw + rng.uniform(0, 0.6) * deg

    row_of_buildings(-1.0, (2, 7), (1.5, 4), (0.05, 0.055, 0.08), (0.35, 0.5), 0.12)
    row_of_buildings(-5.0, (5, 14), (3, 7), (0.03, 0.033, 0.05), (0.55, 0.8), 0.2)
    row_of_buildings(-14.0, (10, 28), (6, 14), (0.018, 0.02, 0.03), (0.9, 1.3), 0.3)
    return save_image("room_night_pano", np.clip(img[::-1], 0, 1), non_color=False)


def pizza_top(size=1024, seed=71):
    """Pizza vista dall'alto (diametro = texture intera): pomodoro, mozzarella, salame piccante, basilico, cornicione."""
    rng = np.random.default_rng(seed)
    yy, xx = (np.mgrid[0:size, 0:size] + 0.5) / size * 2 - 1
    r = np.hypot(xx, yy)
    img = np.zeros((size, size, 3))
    sauce = np.array([0.72, 0.16, 0.06])
    img[:] = sauce
    melt = _norm01(_blur(rng.standard_normal((size, size)), 10))
    cheese = melt > 0.42
    img[cheese] = (np.array([0.98, 0.86, 0.52]) * (0.85 + 0.15 * melt[cheese, None]))
    # bruciacchiature dorate sul formaggio
    spots = _norm01(_blur(rng.standard_normal((size, size)), 3)) > 0.78
    img[cheese & spots] *= np.array([0.86, 0.66, 0.38])
    for _ in range(16):
        a = rng.uniform(0, 2 * np.pi)
        d = np.sqrt(rng.uniform(0.02, 0.62))
        cx, cy, pr = np.cos(a) * d, np.sin(a) * d, rng.uniform(0.085, 0.11)
        m = np.hypot(xx - cx, yy - cy) < pr
        img[m] = np.array([0.6, 0.08, 0.06]) * (0.9 + 0.2 * melt[m, None])
        dots = m & (_norm01(_blur(rng.standard_normal((size, size)), 1.5)) > 0.72)
        img[dots] = (0.38, 0.04, 0.03)
    for _ in range(7):
        a = rng.uniform(0, 2 * np.pi)
        d = np.sqrt(rng.uniform(0.05, 0.5))
        cx, cy = np.cos(a) * d, np.sin(a) * d
        m = (((xx - cx) * 1.8) ** 2 + (yy - cy) ** 2) < 0.045**2 * 3
        img[m] = (0.14, 0.42, 0.12)
    # cornicione
    crust = r > 0.86
    tone = 0.75 + 0.25 * _norm01(_blur(rng.standard_normal((size, size)), 4))
    img[crust] = (np.array([0.86, 0.58, 0.3]) * tone[crust, None])
    img[(r > 0.84) & (r < 0.88)] *= 0.8
    return save_image("room_pizza_top", np.clip(img[::-1], 0, 1), non_color=False)


def can_label(w=512, h=512):
    """Etichetta della lattina energetica: nero opaco, fascia verde acido, fulmine (niente scritte/loghi)."""
    yy, xx = (np.mgrid[0:h, 0:w] + 0.5) / np.array([h, w])[:, None, None]
    img = np.ones((h, w, 3)) * 0.06
    band = np.abs(yy - 0.5) < 0.2
    img[band] = (0.55, 0.95, 0.12)
    img[np.abs(yy - 0.3) < 0.012] = (0.9, 0.9, 0.9)
    img[np.abs(yy - 0.7) < 0.012] = (0.9, 0.9, 0.9)
    # due fulmini sul giro della lattina
    for cx in (0.25, 0.75):
        u = (xx - cx) * 6
        v = (yy - 0.5) * 3
        bolt = (np.abs(u - np.where(v < 0, -0.4 - v * 0.8, 0.4 - v * 0.8)) < 0.22) & (np.abs(v) < 0.55)
        img[bolt] = (0.05, 0.05, 0.05)
    return save_image("room_can_label", np.clip(img[::-1], 0, 1), non_color=False)
