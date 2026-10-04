"""CPU nel socket + raffreddamento a liquido AIO da 360 mm con radiatore sotto il tetto.

Coordinate del case (vedi case.py). Radici, entrambe all'origine con figli in coordinate assolute:
  "CPU"    — processore (substrato, IHS, scritte incise)
  "Cooler" — pompa con display, staffa, tubi, radiatore e 3 ventole da 120 mm
Il socket è nella scheda madre (motherboard.py) con centro in Y 0.75, Z 4.0.
"""

import importlib
import math
import sys

ROOT = r"C:\Users\rober\Documents\GitHub\robertoringoli.it\tools\blender-mcp\pc_parts"
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
import common  # noqa: E402

importlib.reload(common)
from common import (  # noqa: E402
    FONT_DIN,
    _blur,
    _norm01,
    add_bevel,
    box,
    box_uv,
    build_fan,
    circle,
    cube_bm,
    cylinder_bm,
    empty,
    grain_height,
    material,
    mesh_object,
    normal_from_height,
    prism_bm,
    reset_collection,
    ring_prism_bm,
    rounded_rect,
    roughness_map,
    save_image,
    srgb,
    text_object,
    triangle_count,
    use_textures,
)

import bmesh  # noqa: E402
import layout  # noqa: E402

importlib.reload(layout)
import bpy  # noqa: E402
import numpy as np  # noqa: E402


def glow(name, color, strength, base="#0a0a0c"):
    return material(name, srgb(base), roughness=0.3, emission=color, strength=strength)


M = {
    "substrate": material("CPU_Substrate", srgb("#1f5a2c"), metallic=0.1, roughness=0.5),
    "ihs": material("CPU_IHS", srgb("#c9ccd1"), metallic=1.0, roughness=0.3),
    "etch": material("CPU_Etch", srgb("#5d6066"), metallic=0.6, roughness=0.65),
    "smd": material("SMD_Cap", srgb("#8a6a3c"), metallic=0.4, roughness=0.45),
    "copper": material("Copper", srgb("#c27a45"), metallic=1.0, roughness=0.3),
    "body": material("AIO_Body", srgb("#121317"), metallic=0.25, roughness=0.42),
    "accent": material("AIO_Accent", srgb("#2a2d33"), metallic=0.9, roughness=0.3),
    "screen": material("Pump_Screen", srgb("#040506"), metallic=0.0, roughness=0.06),
    "screen_text": glow("LED_Pump", (1, 1, 1), 2.5),
    "gauge": glow("LED_Pump_Gauge", (0.2, 0.85, 1.0), 3.0),
    "gauge_bg": material("Pump_Gauge_Bg", srgb("#1b1e24"), metallic=0.0, roughness=0.4),
    "rgb_pump": glow("RGB_Pump", (1, 1, 1), 3.0, base="#e8e8ee"),
    "tube": material("AIO_Tube", srgb("#0d0d0f"), metallic=0.0, roughness=0.75),
    "tank": material("AIO_Tank", srgb("#121317"), metallic=0.1, roughness=0.5),
    "rad": material("Rad_Core", srgb("#1a1c20"), metallic=0.8, roughness=0.45),
    "chrome": material("Screw_Silver", srgb("#c9ccd2"), metallic=1.0, roughness=0.22),
    # stessi materiali delle ventole del case
    "fan_frame": material("Fan_Frame", srgb("#101114"), metallic=0.0, roughness=0.5),
    "fan_blade": material("RGB_Fan_Blade", srgb("#d9dbe2"), metallic=0.0, roughness=0.35, emission=(1, 1, 1), strength=0.6),
    "fan_ring": material("RGB_Fan_Ring", srgb("#e8e8ee"), metallic=0.0, roughness=0.3, emission=(1, 1, 1), strength=3.0),
    "rubber": material("Rubber", srgb("#0d0d0f"), metallic=0.0, roughness=0.85),
}

SOCKET = layout.SOCKET  # centro del socket LGA1700 (Y, Z)
SIDE = (math.pi / 2, 0, -math.pi / 2)  # testo rivolto al vetro (-X)

# ================================================================== CPU
coll_cpu = reset_collection("CPU")
cpu = empty("CPU", coll_cpu)
# misure LGA1700: package 37.5 x 45 mm, IHS ~33 x 40 mm con il pianoro centrale
box("CPU_Substrate", (0.012, 0.375, 0.45), (0.909, *SOCKET), coll_cpu, M["substrate"], cpu, bevel=0.002, segments=1)
box("CPU_IHS_Flange", (0.01, 0.33, 0.4), (0.898, *SOCKET), coll_cpu, M["ihs"], cpu, bevel=0.003, segments=1)
box("CPU_IHS", (0.022, 0.29, 0.34), (0.882, *SOCKET), coll_cpu, M["ihs"], cpu, bevel=0.005, segments=2)
bm = bmesh.new()
for k in range(11):
    for sz in (-1, 1):
        cube_bm((0.005, 0.01, 0.014), (0.9005, SOCKET[0] - 0.13 + k * 0.026, SOCKET[1] + sz * 0.212), bm)
mesh_object("CPU_SMD", bm, coll_cpu, [M["smd"]], cpu, smooth_angle=None)
for i, (line, size, z, offset) in enumerate(
    (
        ("CORE R-05", 0.036, 0.075, 0.0009),
        ("2005-01-29", 0.025, 0.035, 0.0),
        ("SRL0R  3.4GHZ", 0.02, 0.003, 0.0),
        ("X501R029 · L.ABRUZZO", 0.016, -0.025, 0.0),
    )
):
    text_object(
        f"CPU_Etch_{i + 1}",
        line,
        coll_cpu,
        M["etch"],
        size=size,
        extrude=0.0,
        parent=cpu,
        location=(0.8705, SOCKET[0], SOCKET[1] + z),
        rotation=SIDE,
        font=FONT_DIN,
        offset=offset,
        resolution=3,
    )
# codice 2D inciso
rng = np.random.default_rng(29)
bm = bmesh.new()
for r in range(10):
    for c in range(10):
        if rng.random() < 0.5 or r in (0, 9) or c in (0, 9):
            cube_bm((0.001, 0.005, 0.005), (0.8706, SOCKET[0] + 0.025 - c * 0.005, SOCKET[1] - 0.115 + r * 0.005), bm)
mesh_object("CPU_Etch_Matrix", bm, coll_cpu, [M["etch"]], cpu, smooth_angle=None)

# ================================================================== AIO
coll = reset_collection("Cooler")
cooler = empty("Cooler", coll)

# ------------------------------------------------------------------ pompa
PX0, PX1 = 0.496, 0.856  # davanti (verso il vetro) / dietro (sulla base in rame)
PCX = (PX0 + PX1) / 2
box("AIO_Coldplate", (0.015, 0.34, 0.34), (0.8635, *SOCKET), coll, M["copper"], cooler, bevel=0.003, segments=1)
body = mesh_object("AIO_Pump", prism_bm(rounded_rect(0.72, 0.72, 0.16, 8), PX1 - PX0, (PCX, *SOCKET), plane="YZ"), coll, [M["body"]], cooler, smooth_angle=35)
add_bevel(body, 0.02, 3, 40)
mesh_object(
    "AIO_Pump_Bezel",
    ring_prism_bm(rounded_rect(0.7, 0.7, 0.15, 8), rounded_rect(0.64, 0.64, 0.12, 8), 0.012, (PX0 - 0.002, *SOCKET), "YZ"),
    coll,
    [M["accent"]],
    cooler,
    smooth_angle=35,
)
mesh_object("AIO_Pump_RGB", ring_prism_bm(circle(0.315, 72), circle(0.297, 72), 0.012, (PX0 - 0.003, *SOCKET), "YZ"), coll, [M["rgb_pump"]], cooler, smooth_angle=60)
mesh_object("AIO_Pump_Screen", prism_bm(circle(0.294, 72), 0.006, (PX0 - 0.004, *SOCKET), plane="YZ"), coll, [M["screen"]], cooler, smooth_angle=None)

# display: indicatore ad arco (270°) e temperatura
SX = PX0 - 0.0075


def arc(r0, r1, a0, a1, steps):
    outer = [(r1 * math.cos(math.radians(a0 + (a1 - a0) * k / steps)), r1 * math.sin(math.radians(a0 + (a1 - a0) * k / steps))) for k in range(steps + 1)]
    inner = [(r0 * math.cos(math.radians(a1 - (a1 - a0) * k / steps)), r0 * math.sin(math.radians(a1 - (a1 - a0) * k / steps))) for k in range(steps + 1)]
    return outer + inner


gauge_bg = [(SOCKET[0] + u, SOCKET[1] + v) for u, v in arc(0.235, 0.26, -45, 225, 48)]
mesh_object("AIO_Gauge_Bg", prism_bm(gauge_bg, 0.002, (SX, 0, 0), plane="YZ"), coll, [M["gauge_bg"]], cooler, smooth_angle=None)
# 34% di riempimento: da sinistra in basso in senso orario visto dal vetro
gauge = [(SOCKET[0] + u, SOCKET[1] + v) for u, v in arc(0.235, 0.26, -45, -45 + 270 * 0.34, 20)]
mesh_object("AIO_Gauge", prism_bm(gauge, 0.002, (SX - 0.0005, 0, 0), plane="YZ"), coll, [M["gauge"]], cooler, smooth_angle=None)
text_object("AIO_Screen_Temp", "34°C", coll, M["screen_text"], size=0.17, extrude=0.0, parent=cooler, location=(SX - 0.001, SOCKET[0], SOCKET[1] - 0.01), rotation=SIDE, font=FONT_DIN, offset=0.002, resolution=4)
text_object("AIO_Screen_Label", "CPU", coll, M["gauge"], size=0.055, extrude=0.0, parent=cooler, location=(SX - 0.001, SOCKET[0], SOCKET[1] + 0.12), rotation=SIDE, font=FONT_DIN, resolution=3)
text_object("AIO_Screen_RPM", "2150 RPM", coll, M["screen_text"], size=0.04, extrude=0.0, parent=cooler, location=(SX - 0.001, SOCKET[0], SOCKET[1] - 0.13), rotation=SIDE, font=FONT_DIN, resolution=3)

# staffa a croce con dadi zigrinati sui fori del socket
bm = bmesh.new()
for k in range(4):
    a = math.radians(45 + 90 * k)
    d = (math.cos(a), math.sin(a))
    n = (-d[1], d[0])
    c = (SOCKET[0] + d[0] * 0.3, SOCKET[1] + d[1] * 0.3)
    arm = [(c[0] + sx * d[0] * 0.25 + sy * n[0] * 0.035, c[1] + sx * d[1] * 0.25 + sy * n[1] * 0.035) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    prism_bm(arm, 0.02, (0.85, 0, 0), plane="YZ", bm=bm)
mesh_object("AIO_Bracket", bm, coll, [M["accent"]], cooler, smooth_angle=None)
bm = bmesh.new()
for k in range(4):
    a = math.radians(45 + 90 * k)
    r = layout.COOLER_HOLES * math.sqrt(2)  # fori a 78 x 78 mm
    cy, cz = SOCKET[0] + math.cos(a) * r, SOCKET[1] + math.sin(a) * r
    cylinder_bm(0.05, 0.06, 24, (0.83, cy, cz), axis="X", bm=bm)
    for n in range(16):
        b = n * 2 * math.pi / 16
        cube_bm((0.05, 0.012, 0.012), (0.83, cy + math.cos(b) * 0.051, cz + math.sin(b) * 0.051), bm)
mesh_object("AIO_Thumbnuts", bm, coll, [M["chrome"]], cooler, smooth_angle=40)

# radiatore da 280 mm (2 ventole da 140) sotto il tetto, spostato verso il vetro:
# così non tocca RAM, VRM e connettore EPS, e sta tra le ventole frontali e quella posteriore
RAD_FAN = 1.4
RAD_W = 1.43
RAD_X = 0.5 - RAD_W / 2  # bordo destro a X 0.5, prima della RAM
RAD_Y = 0.45
RAD_CORE = 2 * RAD_FAN
RAD_TANK = 0.18
RAD_Z1 = layout.CASE_H - 0.06  # sotto il pannello superiore
RAD_Z0 = RAD_Z1 - 0.27
REAR_TANK_Y = RAD_Y + RAD_CORE / 2 + RAD_TANK / 2

# raccordi a gomito sul fianco della pompa
TUBES = [
    # inizio (sulla pompa), fine (sotto il serbatoio posteriore del radiatore)
    ((0.54, SOCKET[0] + 0.42, SOCKET[1] + 0.06), (0.0, REAR_TANK_Y, RAD_Z0 - 0.06)),
    ((0.54, SOCKET[0] + 0.42, SOCKET[1] + 0.22), (0.2, REAR_TANK_Y, RAD_Z0 - 0.06)),
]
bm = bmesh.new()
for (x, y, z), _ in TUBES:
    cylinder_bm(0.052, 0.07, 24, (x, y - 0.035, z), axis="Y", bm=bm)
    cylinder_bm(0.06, 0.02, 24, (x, y - 0.06, z), axis="Y", bm=bm)
mesh_object("AIO_Fittings_Pump", bm, coll, [M["accent"]], cooler, smooth_angle=40)

# ------------------------------------------------------------------ tubi


def tube(name, start, end, radius=0.042):
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    curve.resolution_u = 18
    curve.use_fill_caps = True
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(1)
    p0, p1 = spline.bezier_points
    p0.co = start
    p0.handle_left_type = p0.handle_right_type = "FREE"
    p0.handle_right = (start[0], start[1] + 0.5, start[2])
    p0.handle_left = (start[0], start[1] - 0.1, start[2])
    p1.co = end
    p1.handle_left_type = p1.handle_right_type = "FREE"
    p1.handle_left = (end[0], end[1], end[2] - 0.45)
    p1.handle_right = (end[0], end[1], end[2] + 0.1)
    tmp = bpy.data.objects.new(name + "_tmp", curve)
    coll.objects.link(tmp)
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(curve)
    me.name = name
    me.materials.append(M["tube"])
    obj = bpy.data.objects.new(name, me)
    obj.parent = cooler
    coll.objects.link(obj)
    me.shade_smooth()
    return obj


for i, (start, end) in enumerate(TUBES):
    tube(f"AIO_Tube_{i + 1}", start, end)

# ------------------------------------------------------------------ radiatore 280 mm sotto il tetto
RAD_ZC = (RAD_Z0 + RAD_Z1) / 2
core = box("AIO_Rad_Core", (RAD_W - 0.04, RAD_CORE, RAD_Z1 - RAD_Z0), (RAD_X, RAD_Y, RAD_ZC), coll, M["rad"], cooler, bevel=0)
for name, s in (("Front", -1), ("Rear", 1)):
    box(f"AIO_Rad_Tank_{name}", (RAD_W, RAD_TANK, 0.3), (RAD_X, RAD_Y + s * (RAD_CORE / 2 + RAD_TANK / 2), RAD_ZC), coll, M["tank"], cooler, bevel=0.025, segments=3)
bm = bmesh.new()
for (_, (x, y, z)) in TUBES:
    cylinder_bm(0.056, 0.06, 24, (x, y, z + 0.02), axis="Z", bm=bm)
    cylinder_bm(0.064, 0.015, 24, (x, y, z + 0.045), axis="Z", bm=bm)
mesh_object("AIO_Fittings_Rad", bm, coll, [M["accent"]], cooler, smooth_angle=40)
# piastre laterali del radiatore
for side in (-1, 1):
    box(f"AIO_Rad_Side_{'L' if side < 0 else 'R'}", (0.02, RAD_CORE, 0.27), (RAD_X + side * (RAD_W / 2 - 0.01), RAD_Y, RAD_ZC), coll, M["tank"], cooler, bevel=0.004, segments=1)

# due ventole da 140 mm sotto il radiatore, rivolte verso l'interno
FAN_Z = RAD_Z0 - 0.125
bm = bmesh.new()
for k in range(2):
    y = RAD_Y + (k - 0.5) * RAD_FAN
    build_fan(f"Top_{k + 1}", coll, cooler, M, (RAD_X, y, FAN_Z), (math.pi, 0, 0), size=RAD_FAN)
    a = 0.415 * RAD_FAN
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder_bm(0.026, 0.012, 16, (RAD_X + sx * a, y + sy * a, RAD_Z0 - 0.256), axis="Z", bm=bm)
mesh_object("AIO_Fan_Screws", bm, coll, [M["chrome"]], cooler, smooth_angle=40)

# ------------------------------------------------------------------ texture
height, mid, coarse = grain_height(512, seed=13)
grain_n = bpy.data.images.get("tex_grain_normal") or save_image("tex_grain_normal", normal_from_height(height, 2.2))
rough_metal = bpy.data.images.get("tex_rough_metal") or save_image("tex_rough_metal", roughness_map(mid, coarse, 0.27, 0.06))
rough_plastic = bpy.data.images.get("tex_rough_plastic") or save_image("tex_rough_plastic", roughness_map(mid, coarse, 0.55, 0.08))
rough_body = save_image("tex_rough_aio_body", roughness_map(mid, coarse, 0.42, 0.06))

# alette del radiatore: tubi piatti ogni 1/8 di tile, alette a zig-zag in mezzo
size = 512
yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
band = (xx % 64) / 64.0
tube_mask = band < 0.22
zig = np.abs(((yy / 6.0) % 2.0) - 1.0)
rad_height = np.where(tube_mask, 0.9, 0.35 + 0.4 * zig)
rad_height = _blur(rad_height, 0.8)
rad_n = save_image("tex_rad_normal", normal_from_height(_norm01(rad_height), 6.0))
rad_rough = save_image("tex_rad_rough", np.repeat(np.where(tube_mask, 0.35, 0.55)[..., None], 3, axis=-1))

use_textures(M["ihs"], rough_metal, grain_n, 0.12)
use_textures(M["body"], rough_body, grain_n, 0.2)
use_textures(M["accent"], rough_metal, grain_n, 0.15)
use_textures(M["tube"], rough_plastic, grain_n, 0.6)
use_textures(M["tank"], rough_plastic, grain_n, 0.15)
use_textures(M["rad"], rad_rough, rad_n, 1.0)

for obj in list(coll.all_objects) + list(coll_cpu.all_objects):
    box_uv(obj, 0.5 if obj.name == "AIO_Rad_Core" else 0.25)

parts = list(coll.all_objects) + list(coll_cpu.all_objects)
per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result = {
    "objects": len(parts),
    "triangles": sum(per_object.values()),
    "top": sorted(per_object.items(), key=lambda kv: -kv[1])[:6],
}
