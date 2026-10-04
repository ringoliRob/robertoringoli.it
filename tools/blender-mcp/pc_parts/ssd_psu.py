"""SSD NVMe M.2 2280 con dissipatore e alimentatore ATX RGB completamente modulare.

Radici:
  "SSD" — al centro dello slot M.2 (layout.M2_*), figli in locale; sporge verso -X.
  "PSU" — al centro dell'alimentatore (layout.PSU_*), figli in locale.
    -X fianco visibile dalla finestrella del vano, -Y pannello modulare (fronte),
    +Y retro con griglia e presa, -Z ventola da 140 mm con anello RGB.
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
    add_bevel,
    boolean_cut,
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
    offset_polygon,
    prism_bm,
    reset_collection,
    ring_prism_bm,
    rounded_rect,
    roughness_map,
    save_image,
    srgb,
    text_object,
    torus_bm,
    triangle_count,
    use_alpha_mask,
    use_textures,
)

import bmesh  # noqa: E402
import bpy  # noqa: E402
import layout  # noqa: E402

importlib.reload(layout)


def glow(name, strength, base="#e8e8ee"):
    return material(name, srgb(base), metallic=0.0, roughness=0.35, emission=(1, 1, 1), strength=strength)


M = {
    "ssd_hs": material("SSD_Heatsink", srgb("#1b1d22"), metallic=0.85, roughness=0.35),
    "ssd_pcb": material("SSD_PCB", srgb("#0b0c0e"), metallic=0.1, roughness=0.6),
    "gold": material("Gold", srgb("#d4a84a"), metallic=1.0, roughness=0.25),
    "chrome": material("Screw_Silver", srgb("#c9ccd2"), metallic=1.0, roughness=0.22),
    "etch": material("SSD_Etch", srgb("#7a7e86"), metallic=0.7, roughness=0.5),
    "rgb_ssd": glow("RGB_SSD", 2.5),
    "body": material("PSU_Body", srgb("#121317"), metallic=0.7, roughness=0.45),
    "panel": material("PSU_Panel", srgb("#0b0c0f"), metallic=0.3, roughness=0.5),
    "conn": material("Connector_Black", srgb("#0d0e10"), metallic=0.0, roughness=0.55),
    "hole": material("Pin_Hole", srgb("#020203"), metallic=0.0, roughness=0.8),
    "white": material("PSU_Print", srgb("#e6e8ee"), metallic=0.2, roughness=0.4),
    "gold_badge": material("PSU_Gold_Badge", srgb("#c9a24a"), metallic=0.9, roughness=0.3),
    "accent": material("PSU_Accent", srgb("#b9bec8"), metallic=1.0, roughness=0.28),
    "mesh": material("Case_Mesh", srgb("#0b0c0e"), metallic=0.6, roughness=0.5),
    "grill": material("PSU_Grill", srgb("#1c1e23"), metallic=0.8, roughness=0.35),
    "sticker": material("Sticker", srgb("#e9e9e4"), metallic=0.0, roughness=0.6),
    "ink": material("Ink", srgb("#111111"), metallic=0.0, roughness=0.7),
    "rgb_psu": glow("RGB_PSU", 3.0),
    # ventola: stesso telaio e pale delle altre, anello su un materiale RGB proprio
    "fan_frame": material("Fan_Frame", srgb("#101114"), metallic=0.0, roughness=0.5),
    "fan_blade": material("RGB_Fan_Blade", srgb("#d9dbe2"), metallic=0.0, roughness=0.35, emission=(1, 1, 1), strength=0.6),
    "fan_ring": glow("RGB_PSU_Ring", 3.0),
    "rubber": material("Rubber", srgb("#0d0d0f"), metallic=0.0, roughness=0.85),
}

SIDE = (math.pi / 2, 0, -math.pi / 2)  # testo su una faccia rivolta a -X

# ================================================================== SSD
coll = reset_collection("SSD")
L = layout.M2_Y1 - layout.M2_Y0  # 80 mm
ssd = empty("SSD", coll, location=(layout.FACE, (layout.M2_Y0 + layout.M2_Y1) / 2, layout.M2_Z))
box("SSD_PCB", (0.008, L, 0.22), (-0.022, 0, 0), coll, M["ssd_pcb"], ssd, bevel=0.002, segments=1)
# contatti M.2 (chiave M) verso il connettore
bm = bmesh.new()
for k in range(30):
    z = -0.1 + k * 0.0068
    if 0.03 < z < 0.05:
        continue  # tacca della chiave M
    cube_bm((0.009, 0.04, 0.0045), (-0.022, L / 2 - 0.025, z), bm)
mesh_object("SSD_Fingers", bm, coll, [M["gold"]], ssd, smooth_angle=None)
# dissipatore: zona liscia con le scritte, alette trasversali verso il connettore
HS_Y0, HS_Y1 = -L / 2 + 0.045, L / 2 - 0.06
hs = box("SSD_Heatsink", (0.06, HS_Y1 - HS_Y0, 0.23), (-0.056, (HS_Y0 + HS_Y1) / 2, 0), coll, M["ssd_hs"], ssd, bevel=0)
bm = bmesh.new()
for k in range(9):
    cube_bm((0.04, 0.014, 0.3), (-0.086, 0.0 + k * 0.035, 0), bm)
cut = mesh_object("_ssd_fins", bm, coll, [M["ssd_hs"]], ssd, smooth_angle=None)
boolean_cut(hs, [cut])
add_bevel(hs, 0.004, 2, 40)
box("SSD_RGB", (0.006, HS_Y1 - HS_Y0 - 0.04, 0.012), (-0.089, (HS_Y0 + HS_Y1) / 2, 0.1), coll, M["rgb_ssd"], ssd, bevel=0.002)
for i, (line, size, z) in enumerate((("NVMe  M.2", 0.032, 0.03), ("2TB · PCIe 5.0", 0.02, -0.025))):
    text_object(
        f"SSD_Etch_{i + 1}",
        line,
        coll,
        M["etch"],
        size=size,
        extrude=0.0,
        parent=ssd,
        location=(-0.0865, -0.19, z),
        rotation=SIDE,
        font=FONT_DIN,
        offset=0.0006 if i == 0 else 0.0,
        resolution=3,
    )
screw = mesh_object("SSD_Screw", cylinder_bm(0.022, 0.012, 20, axis="X"), coll, [M["chrome"]], ssd, smooth_angle=40)
screw.location = (-0.032, -L / 2 + 0.01, 0)

# ================================================================== PSU
coll_psu = reset_collection("PSU")
X0, X1 = layout.PSU_X
Y0, Y1 = layout.PSU_Y
Z0, Z1 = layout.PSU_Z
PW, PD, PH = X1 - X0, Y1 - Y0, Z1 - Z0  # 150 x 160 x 86 mm
psu = empty("PSU", coll_psu, location=((X0 + X1) / 2, (Y0 + Y1) / 2, (Z0 + Z1) / 2))
hx, hy, hz = PW / 2, PD / 2, PH / 2

body = box("PSU_Body", (PW, PD, PH), (0, 0, 0), coll_psu, M["body"], psu, bevel=0)
fan_hole = mesh_object("_psu_fan_hole", prism_bm(circle(0.64, 72), 0.12, (0, 0, -hz), plane="XY"), coll_psu, [M["body"]], psu, smooth_angle=None)
boolean_cut(body, [fan_hole])
add_bevel(body, 0.02, 3, 40)

# ventola da 140 mm sul fondo, con griglia a cerchi concentrici
build_fan("PSU", coll_psu, psu, M, (0, 0, -hz + 0.13), (math.pi, 0, 0), size=1.32, depth=0.2)
bm = bmesh.new()
for r in (0.2, 0.32, 0.44, 0.56):
    torus_bm(r, 0.006, 72, 6, (0, 0, -hz - 0.006), bm)
for k in range(4):
    a = k * math.pi / 4
    cube_bm((1.24, 0.012, 0.012), (0, 0, -hz - 0.006), bm, rot_z=a)
mesh_object("PSU_Fan_Grill", bm, coll_psu, [M["grill"]], psu, smooth_angle=40)

# ------------------------------------------------------------------ fianco verso il vetro
box("PSU_Side_RGB", (0.01, PD - 0.3, 0.035), (-hx - 0.004, 0, -0.2), coll_psu, M["rgb_psu"], psu, bevel=0.004, segments=2)
box("PSU_Side_RGB_Vertical", (0.01, 0.035, PH - 0.3), (-hx - 0.004, -hy + 0.12, 0.03), coll_psu, M["rgb_psu"], psu, bevel=0.004, segments=2)
stripe = [(0.25, -0.33), (0.38, -0.33), (0.62, 0.33), (0.49, 0.33)]
mesh_object("PSU_Side_Stripe", prism_bm(stripe, 0.004, (-hx - 0.002, 0, 0), plane="YZ"), coll_psu, [M["accent"]], psu, smooth_angle=None)
text_object("PSU_Side_Watts", "850W", coll_psu, M["white"], size=0.26, extrude=0.003, parent=psu, location=(-hx - 0.004, -0.05, 0.08), rotation=SIDE, font=FONT_DIN, offset=0.004, resolution=4)
text_object("PSU_Side_Modular", "FULLY MODULAR  ·  ATX 3.1", coll_psu, M["white"], size=0.05, extrude=0.0, parent=psu, location=(-hx - 0.004, -0.05, -0.12), rotation=SIDE, font=FONT_DIN, resolution=3)
# bollino 80 PLUS GOLD
badge = mesh_object("PSU_Badge", prism_bm(rounded_rect(0.22, 0.22, 0.03, 4, -0.55, 0.12), 0.004, (-hx - 0.003, 0, 0), plane="YZ"), coll_psu, [M["gold_badge"]], psu, smooth_angle=None)
text_object("PSU_Badge_80", "80", coll_psu, M["ink"], size=0.08, extrude=0.0, parent=psu, location=(-hx - 0.0055, -0.55, 0.15), rotation=SIDE, font=FONT_DIN, offset=0.002, resolution=3)
text_object("PSU_Badge_Plus", "PLUS  GOLD", coll_psu, M["ink"], size=0.03, extrude=0.0, parent=psu, location=(-hx - 0.0055, -0.55, 0.07), rotation=SIDE, font=FONT_DIN, resolution=3)

# ------------------------------------------------------------------ pannello modulare (fronte)
box("PSU_Modular_Plate", (PW - 0.12, 0.008, PH - 0.12), (0, -hy - 0.004, 0), coll_psu, M["panel"], psu, bevel=0)
housings = bmesh.new()
holes = bmesh.new()


def socket(cx, cz, cols, rows, pitch=0.042, hole=0.03):
    """Presa modulare: corpo nero sporgente e fori quadrati."""
    w, h = cols * pitch + 0.03, rows * pitch + 0.03
    cube_bm((w, 0.03, h), (cx, -hy - 0.023, cz), housings)
    for c in range(cols):
        for r in range(rows):
            cube_bm((hole, 0.006, hole), (cx - (cols - 1) * pitch / 2 + c * pitch, -hy - 0.039, cz - (rows - 1) * pitch / 2 + r * pitch), holes)


socket(-0.42, 0.06, 2, 12)  # 24 pin scheda madre (in verticale)
for k, cx in enumerate((-0.12, 0.12)):
    socket(cx, 0.22, 4, 2)  # CPU EPS 8 pin
socket(0.42, 0.22, 6, 2, pitch=0.03, hole=0.02)  # 12VHPWR
for k, cx in enumerate((-0.12, 0.12, 0.42)):
    socket(cx, -0.02, 4, 2)  # PCIe 8 pin
for k, cx in enumerate((-0.15, 0.05, 0.25, 0.45)):
    socket(cx, -0.25, 3, 2, pitch=0.04, hole=0.026)  # SATA / periferiche
mesh_object("PSU_Sockets", housings, coll_psu, [M["conn"]], psu, smooth_angle=None)
mesh_object("PSU_Socket_Holes", holes, coll_psu, [M["hole"]], psu, smooth_angle=None)
for i, (label, cx, cz) in enumerate((("MB", -0.42, 0.37), ("CPU", 0.0, 0.32), ("12V-2x6", 0.42, 0.32), ("PCIe", 0.15, 0.09), ("SATA", 0.15, -0.36))):
    text_object(
        f"PSU_Label_{i + 1}",
        label,
        coll_psu,
        M["white"],
        size=0.032,
        extrude=0.0,
        parent=psu,
        location=(cx, -hy - 0.0085, cz),
        rotation=(math.pi / 2, 0, 0),
        font=FONT_DIN,
        resolution=3,
    )

# ------------------------------------------------------------------ retro: griglia, presa IEC C14, interruttore
box("PSU_Rear_Grill", (PW - 0.62, 0.008, PH - 0.12), (-hx + 0.06 + (PW - 0.62) / 2, hy + 0.004, 0), coll_psu, M["mesh"], psu, bevel=0)
C14 = [(-0.075, -0.06), (0.075, -0.06), (0.075, 0.035), (0.05, 0.06), (-0.05, 0.06), (-0.075, 0.035)]
cx_iec, cz_iec = hx - 0.25, 0.12
mesh_object("PSU_IEC", ring_prism_bm(offset_polygon(C14, 0.02), C14, 0.03, (cx_iec, hy + 0.015, cz_iec), "XZ"), coll_psu, [M["conn"]], psu, smooth_angle=None)
mesh_object("PSU_IEC_Back", prism_bm(C14, 0.004, (cx_iec, hy + 0.002, cz_iec)), coll_psu, [M["hole"]], psu, smooth_angle=None)
bm = bmesh.new()
for dx, dz in ((-0.035, 0.0), (0.035, 0.0), (0.0, 0.035)):
    cube_bm((0.012, 0.03, 0.022), (cx_iec + dx, hy + 0.015, cz_iec + dz), bm)
mesh_object("PSU_IEC_Pins", bm, coll_psu, [M["chrome"]], psu, smooth_angle=None)
switch = box("PSU_Switch", (0.1, 0.03, 0.14), (cx_iec, hy + 0.015, -0.17), coll_psu, M["conn"], psu, bevel=0.01, segments=2)
rocker = box("PSU_Switch_Rocker", (0.07, 0.02, 0.11), (cx_iec, hy + 0.035, -0.17), coll_psu, M["panel"], psu, bevel=0.008, segments=2)
rocker.rotation_euler = (math.radians(8), 0, 0)
text_object("PSU_Switch_I", "I", coll_psu, M["white"], size=0.04, extrude=0.0, parent=psu, location=(cx_iec, hy + 0.046, -0.14), rotation=(math.pi / 2, 0, math.pi), font=FONT_DIN, resolution=3)
text_object("PSU_Switch_O", "O", coll_psu, M["white"], size=0.04, extrude=0.0, parent=psu, location=(cx_iec, hy + 0.046, -0.2), rotation=(math.pi / 2, 0, math.pi), font=FONT_DIN, resolution=3)
bm = bmesh.new()
for sx in (-1, 1):
    for sz in (-1, 1):
        cylinder_bm(0.022, 0.012, 16, (sx * (hx - 0.05), hy + 0.006, sz * (hz - 0.05)), axis="Y", bm=bm)
mesh_object("PSU_Rear_Screws", bm, coll_psu, [M["chrome"]], psu, smooth_angle=40)

# ------------------------------------------------------------------ etichetta tecnica sul lato superiore
box("PSU_Spec_Sticker", (0.9, 1.0, 0.002), (0.1, 0.1, hz + 0.001), coll_psu, M["sticker"], psu, bevel=0)
for i, (line, size) in enumerate(
    (
        ("850W  ATX 3.1  ·  80 PLUS GOLD", 0.045),
        ("AC INPUT 100-240V ~ 10A  50/60Hz", 0.03),
        ("+12V  70.8A  850W", 0.03),
        ("+5V 20A  ·  +3.3V 20A  ·  -12V 0.3A", 0.03),
    )
):
    text_object(f"PSU_Spec_Text_{i + 1}", line, coll_psu, M["ink"], size=size, extrude=0.0, parent=psu, location=(0.1, 0.42 - i * 0.12, hz + 0.0025), rotation=(0, 0, 0), font=FONT_DIN, resolution=3)

# ------------------------------------------------------------------ texture
height, mid, coarse = grain_height(512, seed=19)
grain_n = bpy.data.images.get("tex_grain_normal") or save_image("tex_grain_normal", normal_from_height(height, 2.2))
rough_metal = bpy.data.images.get("tex_rough_metal") or save_image("tex_rough_metal", roughness_map(mid, coarse, 0.27, 0.06))
rough_body = save_image("tex_rough_psu", roughness_map(mid, coarse, 0.5, 0.07))
mesh_mask = bpy.data.images.get("tex_hex_mesh")
use_textures(M["body"], rough_body, grain_n, 0.3)
use_textures(M["ssd_hs"], rough_metal, grain_n, 0.2)
use_textures(M["accent"], rough_metal, grain_n, 0.1)
if mesh_mask is not None:
    use_alpha_mask(M["mesh"], mesh_mask)

for obj in list(coll.all_objects) + list(coll_psu.all_objects):
    box_uv(obj, 0.12 if obj.name == "PSU_Rear_Grill" else 0.25)

parts = list(coll.all_objects) + list(coll_psu.all_objects)
per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result = {
    "objects": len(parts),
    "triangles": sum(per_object.values()),
    "top": sorted(per_object.items(), key=lambda kv: -kv[1])[:6],
}
