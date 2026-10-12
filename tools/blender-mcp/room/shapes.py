"""Forme morbide per arredi e tessuti (cuscini, materasso, sedia, piumone)."""

import math

import bmesh
from mathutils import Vector


def _spow(v, e):
    return math.copysign(abs(v) ** e, v)


def superellipsoid_bm(size, e_vert=0.3, e_horiz=0.3, seg_u=24, seg_v=12, center=(0, 0, 0), bm=None, flat_bottom=None, squash=None):
    """Superellissoide: e piccoli = scatola arrotondata, 1 = ellissoide, >1 = pizzicato (cuscino).

    flat_bottom: frazione [0..1] dell'altezza sotto la quale i vertici vengono schiacciati sul fondo.
    squash: funzione (x, y, z) -> (x, y, z) applicata in coordinate normalizzate [-1, 1].
    """
    bm = bm or bmesh.new()
    sx, sy, sz = (s / 2 for s in size)
    c = Vector(center)
    rings = []
    for i in range(1, seg_v):
        phi = -math.pi / 2 + math.pi * i / seg_v
        ring = []
        for j in range(seg_u):
            th = -math.pi + 2 * math.pi * j / seg_u
            cp = math.cos(phi)
            x = _spow(cp, e_vert) * _spow(math.cos(th), e_horiz)
            y = _spow(cp, e_vert) * _spow(math.sin(th), e_horiz)
            z = _spow(math.sin(phi), e_vert)
            if flat_bottom is not None:
                z = max(z, -1 + 2 * flat_bottom)
            if squash:
                x, y, z = squash(x, y, z)
            ring.append(bm.verts.new(c + Vector((x * sx, y * sy, z * sz))))
        rings.append(ring)
    bottom = bm.verts.new(c + Vector((0, 0, (-1 + 2 * flat_bottom if flat_bottom is not None else -1) * sz)))
    tx, ty, tz = squash(0.0, 0.0, 1.0) if squash else (0.0, 0.0, 1.0)
    top = bm.verts.new(c + Vector((tx * sx, ty * sy, tz * sz)))
    n = seg_u
    for r in range(len(rings) - 1):
        a, b = rings[r], rings[r + 1]
        for j in range(n):
            bm.faces.new((a[j], a[(j + 1) % n], b[(j + 1) % n], b[j]))
    for j in range(n):
        bm.faces.new((bottom, rings[0][(j + 1) % n], rings[0][j]))
        bm.faces.new((top, rings[-1][j], rings[-1][(j + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def draped_bm(top_w, top_d, top_z, overhang, drop, res=(48, 40), thickness=0.15, wrinkle=None, open_sides=("x0", "x1", "y0"), center=(0, 0)):
    """Telo appoggiato su un piano rettangolare che ricade lungo i lati in `open_sides`.

    top_w x top_d: piano su cui appoggia (X, Y); overhang: quanto sborda in pianta prima di cadere;
    drop: quanto scende in verticale. wrinkle(u, v) -> spostamento in Z per le pieghe.
    """
    bm = bmesh.new()
    cx, cy = center
    hw, hd = top_w / 2, top_d / 2
    ex = {k: (overhang + drop if k in open_sides else 0.0) for k in ("x0", "x1", "y0", "y1")}
    nu, nv = res
    grid = []
    for i in range(nu + 1):
        u = i / nu
        px = -hw - ex["x0"] + (top_w + ex["x0"] + ex["x1"]) * u
        row = []
        for j in range(nv + 1):
            v = j / nv
            py = -hd - ex["y0"] + (top_d + ex["y0"] + ex["y1"]) * v
            # distanza oltre il bordo del piano, per ciascun asse
            dx = max(0.0, abs(px) - hw)
            dy = max(0.0, (-py - hd) if py < 0 else (py - hd))
            fall_x = max(0.0, dx - overhang)
            fall_y = max(0.0, dy - overhang)
            x = math.copysign(min(abs(px), hw + min(dx, overhang) + 0.15 * math.tanh(fall_x)), px)
            y = math.copysign(min(abs(py), hd + min(dy, overhang) + 0.15 * math.tanh(fall_y)), py)
            # il bordo si arrotonda sul piano, poi scende
            roll = 0.0
            for d in (dx, dy):
                if d > 0:
                    t = min(d, overhang) / max(overhang, 1e-6)
                    roll += 0.35 * (1 - math.cos(t * math.pi / 2)) * overhang
            z = top_z - roll - fall_x - fall_y
            if wrinkle:
                z += wrinkle(u, v) * (1.0 if (dx == 0 and dy == 0) else 0.4)
                if fall_x > 0 or fall_y > 0:
                    w = wrinkle(v, u) * 2.0
                    x += w if fall_x > 0 and px > 0 else (-w if fall_x > 0 else 0)
                    y += w if fall_y > 0 and py > 0 else (-w if fall_y > 0 else 0)
            row.append(bm.verts.new((cx + x, cy + y, z)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    # spessore lungo le normali (anche sui lati che ricadono in verticale)
    bm.normal_update()
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=thickness)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm
