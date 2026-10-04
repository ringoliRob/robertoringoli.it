"""GPU "Ringoli GFX 2026": scheda video a tre ventole.

Spazio locale della radice GPU (Blender, Z-up):
  X+ verso la scheda madre (X- = bordo visibile dal vetro)
  Y+ verso la staffa posteriore, Z- = lato ventole
Ingombro ~ 1.30 x 2.90 x 0.45, come la versione procedurale.
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
    add_bevel,
    boolean_cut,
    box,
    cube_bm,
    cylinder_bm,
    empty,
    fan_rotor_bm,
    material,
    mesh_object,
    reset_collection,
    srgb,
    text_object,
    torus_bm,
    triangle_count,
    FONT_DIN,
    mesh_width,
    offset_polygon,
    prism_bm,
    ring_prism_bm,
    box_uv,
    grain_height,
    normal_from_height,
    pcb_texture,
    roughness_map,
    save_image,
    use_textures,
)

import bmesh  # noqa: E402
import layout  # noqa: E402

importlib.reload(layout)

coll = reset_collection("GPU")

M = {
    "shroud": material("GPU_Shroud", srgb("#1c1f25"), metallic=0.65, roughness=0.38),
    "accent": material("GPU_Accent", srgb("#b9bec8"), metallic=1.0, roughness=0.28),
    "back": material("GPU_Backplate", srgb("#0b0c0f"), metallic=0.8, roughness=0.42),
    "pcb": material("GPU_PCB", srgb("#0d1a14"), metallic=0.1, roughness=0.65),
    "gold": material("Gold", srgb("#d4a84a"), metallic=1.0, roughness=0.25),
    "fins": material("Fin_Alu", srgb("#a6acb6"), metallic=1.0, roughness=0.35),
    "copper": material("Copper", srgb("#c27a45"), metallic=1.0, roughness=0.3),
    "blade": material("Fan_Blade", srgb("#202228"), metallic=0.0, roughness=0.45),
    "plastic": material("Black_Plastic", srgb("#08090b"), metallic=0.0, roughness=0.6),
    "logo": material("GPU_Logo", srgb("#e8eaf0"), metallic=0.3, roughness=0.35),
    "rgb": material("RGB_GPU", srgb("#0a0a0c"), roughness=0.3, emission=(1, 1, 1), strength=1.0),
    "nickel": material("Port_Nickel", srgb("#d9dce2"), metallic=1.0, roughness=0.18),
    "screw": material("Screw_Black", srgb("#15161a"), metallic=0.9, roughness=0.35),
    "sticker": material("Sticker", srgb("#e9e9e4"), metallic=0.0, roughness=0.6),
    "ink": material("Ink", srgb("#111111"), metallic=0.0, roughness=0.7),
    "rgb_ring": material("RGB_GPU_Ring", srgb("#0a0a0c"), roughness=0.3, emission=(1, 1, 1), strength=1.0),
}

# posizione da montata dentro il case (case: origine al centro della base)
# posizione da montata: PCB centrato sullo slot PCIe x16 della scheda madre (layout.py)
gpu = empty("GPU", coll, location=layout.GPU_ROOT)

L = 2.90  # lunghezza
W = 1.30  # altezza della scheda (verso il vetro)
FAN_Y = (-0.95, 0.0, 0.95)
FAN_R = 0.405

# ---------------------------------------------------------------- carenatura
shroud = box("GPU_Shroud", (W, L, 0.22), (0, 0, -0.13), coll, M["shroud"], gpu, bevel=0)
cutters = []
for i, y in enumerate(FAN_Y):
    c = mesh_object(f"_cut{i}", cylinder_bm(FAN_R + 0.012, 1.0, segments=64), coll, [M["shroud"]], gpu, smooth_angle=None)
    c.location = (0, y, -0.13)
    cutters.append(c)
boolean_cut(shroud, cutters)
add_bevel(shroud, width=0.014, segments=3, angle=40)

# profili argentati sul lato ventole, verso il vetro e verso la scheda madre
for x in (-0.6, 0.6):
    box(f"GPU_Rail_{'out' if x < 0 else 'in'}", (0.05, L - 0.12, 0.018), (x, 0, -0.244), coll, M["accent"], gpu, bevel=0.006)
# chevron tra le ventole
for i, y in enumerate((-0.475, 0.475)):
    bm = bmesh.new()
    for s in (-1, 1):
        cube_bm((0.42, 0.035, 0.016), (s * 0.27, 0, 0), bm)
    obj = mesh_object(f"GPU_Chevron_{i}", bm, coll, [M["accent"]], gpu, smooth_angle=None)
    obj.location = (0, y, -0.246)
    add_bevel(obj, 0.005, 2)

# anelli RGB attorno alle ventole + supporti del motore
for i, y in enumerate(FAN_Y):
    ring = mesh_object(f"GPU_Fan_Ring_{i + 1}", torus_bm(FAN_R + 0.02, 0.011, 72, 10), coll, [M["rgb_ring"]], gpu, smooth_angle=None)
    ring.location = (0, y, -0.243)
    for p in ring.data.polygons:
        p.use_smooth = True
    bm = bmesh.new()
    for k in range(3):
        a = k * 2 * math.pi / 3 + math.pi / 6
        mid = (FAN_R + 0.1) / 2
        cube_bm((FAN_R - 0.1, 0.03, 0.02), (math.cos(a) * mid, math.sin(a) * mid, 0), bm, rot_z=a)
    cylinder_bm(0.1, 0.03, 32, (0, 0, 0), bm=bm)
    stator = mesh_object(f"GPU_Stator_{i + 1}", bm, coll, [M["plastic"]], gpu, smooth_angle=30)
    stator.location = (0, y, -0.065)

# ---------------------------------------------------------------- ventole
for i, y in enumerate(FAN_Y):
    rotor = mesh_object(
        f"Fan_Rotor_GPU_{i + 1}",
        fan_rotor_bm(0.1, FAN_R - 0.012, blades=9, thickness=0.012, pitch=30, sweep=0.6),
        coll,
        [M["blade"]],
        gpu,
        smooth_angle=50,
    )
    rotor.location = (0, y, -0.165)
    # tappo centrale liscio, ruota con il rotore
    cap = mesh_object(f"GPU_Fan_Cap_{i + 1}", cylinder_bm(0.082, 0.006, 40, radius2=0.076), coll, [M["shroud"]], rotor, smooth_angle=40)
    cap.location = (0, 0, -0.038)

# ---------------------------------------------------------------- dissipatore
bm = bmesh.new()
n = 58
for k in range(n):
    y = -L / 2 + 0.1 + k * (L - 0.2) / (n - 1)
    cube_bm((W - 0.08, 0.011, 0.135), (0, y, 0.05), bm)
fins = mesh_object("GPU_Fins", bm, coll, [M["fins"]], gpu, smooth_angle=None)
for p in fins.data.polygons:
    p.use_smooth = False

bm = bmesh.new()
# tre heatpipe dritte e parallele: stessa lunghezza, stesso filo, passo costante
for z in (0.0, 0.05, 0.1):
    cylinder_bm(0.022, L - 0.35, 16, (-0.632, 0.0, z), axis="Y", bm=bm)
pipes = mesh_object("GPU_Heatpipes", bm, coll, [M["copper"]], gpu, smooth_angle=60)

# ---------------------------------------------------------------- PCB, backplate, connettori
# PCB corto come le Founders Edition: sopra la prima ventola l'aria passa attraverso
box("GPU_PCB", (W - 0.04, 2.11, 0.03), (0, 0.355, 0.135), coll, M["pcb"], gpu, bevel=0.004, segments=1)
# linguetta PCIe x16: PCB che sporge e contatti singoli con la tacca di riferimento
box("GPU_PCIe_Tab", (0.07, 0.95, 0.022), (W / 2 + 0.005, 0.45, 0.135), coll, M["pcb"], gpu, bevel=0)
bm = bmesh.new()
y0 = 0.45 - 0.475 + 0.008
for k in range(90):
    y = y0 + k * 0.0102
    if 11 <= k <= 12:  # tacca tra i contatti di alimentazione e quelli dati
        continue
    cube_bm((0.058, 0.0068, 0.0245), (W / 2 + 0.012, y, 0.135), bm)
mesh_object("GPU_PCIe", bm, coll, [M["gold"]], gpu, smooth_angle=None)

backplate = box("GPU_Backplate", (W, L, 0.035), (0, 0, 0.1675), coll, M["back"], gpu, bevel=0)
bm = bmesh.new()
for k in range(11):
    cube_bm((0.95, 0.022, 0.2), (0, -1.33 + k * 0.05, 0), bm)
vent_cut = mesh_object("_vent_cut", bm, coll, [M["back"]], gpu, smooth_angle=None)
vent_cut.location = (0, 0, 0.1675)
boolean_cut(backplate, [vent_cut])
add_bevel(backplate, width=0.005, segments=2, angle=40)

bm = bmesh.new()
for x, y in [(-0.05, 0.2), (0.35, 0.2), (-0.05, 0.7), (0.35, 0.7), (-0.56, -0.6), (-0.56, 0.4), (-0.56, 1.3), (0.56, -0.6), (0.56, 0.4), (0.56, 1.3)]:
    cylinder_bm(0.014, 0.008, 16, (x, y, 0.188), bm=bm)
mesh_object("GPU_Backplate_Screws", bm, coll, [M["screw"]], gpu, smooth_angle=40)

# connettore di alimentazione a 16 pin sul bordo verso il vetro
power = box("GPU_Power", (0.09, 0.26, 0.08), (-W / 2 - 0.01, layout.GPU_POWER_Y, 0.17), coll, M["plastic"], gpu, bevel=0.006, segments=2)
bm = bmesh.new()
for r in range(2):
    for c in range(6):
        cube_bm((0.02, 0.022, 0.018), (0, -0.09 + c * 0.036, -0.016 + r * 0.032), bm)
pins = mesh_object("GPU_Power_Pins", bm, coll, [M["gold"]], gpu, smooth_angle=None)
pins.location = (-W / 2 - 0.05, layout.GPU_POWER_Y, 0.17)

# ---------------------------------------------------------------- staffa con porte vere
BRACKET_Y = L / 2 + 0.03  # centro dello spessore della staffa
FACE_Y = BRACKET_Y + 0.015  # faccia esterna
PORT_Z = 0.085

# profili reali scalati (1 unità = 10 cm): DisplayPort 16.1 x 4.8 mm con un angolo smussato, HDMI 14 x 4.55 mm
DP = [(-0.0805 + 0.022, -0.024), (0.0805, -0.024), (0.0805, 0.024), (-0.0805, 0.024), (-0.0805, -0.024 + 0.022)]
HDMI = [(-0.07, 0.023), (-0.07, 0.023 - 0.018), (-0.052, -0.023), (0.052, -0.023), (0.07, 0.023 - 0.018), (0.07, 0.023)]
PORTS = [(-0.375, DP), (-0.105, HDMI), (0.165, DP), (0.435, DP)]

bracket = box("GPU_Bracket", (W - 0.06, 0.03, 0.47), (0.03, BRACKET_Y, -0.03), coll, M["accent"], gpu, bevel=0)
bm = bmesh.new()
for x, shape in PORTS:
    prism_bm([(u + x, v + PORT_Z) for u, v in offset_polygon(shape, 0.005)], 0.2, (0, BRACKET_Y, 0), bm=bm)


def hexagon(cx, cz, r):
    return [(cx + r * math.cos(math.radians(30 + 60 * k)), cz + r * math.sin(math.radians(30 + 60 * k))) for k in range(6)]


def hex_field(x0, x1, z0, z1, r=0.019):
    dx, dz = r * 2.1, r * 1.82
    row = 0
    z = z0
    while z <= z1:
        x = x0 + (dx / 2 if row % 2 else 0)
        while x <= x1:
            prism_bm(hexagon(x, z, r), 0.2, (0, BRACKET_Y, 0), bm=bm)
            x += dx
        z += dz
        row += 1


hex_field(-0.53, 0.6, -0.235, 0.02)
cut = mesh_object("_bracket_cut", bm, coll, [M["accent"]], gpu, smooth_angle=None)
boolean_cut(bracket, [cut])
# niente bevel sulla staffa: con i fori esagonali triplicherebbe i triangoli
# linguetta per la vite, piegata verso l'esterno
box("GPU_Bracket_Tab", (0.014, 0.1, 0.44), (-0.597, FACE_Y + 0.05, -0.03), coll, M["accent"], gpu, bevel=0.003, segments=1)

for i, (x, shape) in enumerate(PORTS):
    kind = "DP" if shape is DP else "HDMI"
    depth = 0.07
    shell = mesh_object(
        f"GPU_Port_{kind}_{i + 1}",
        ring_prism_bm(offset_polygon(shape, 0.004), shape, depth, (x, FACE_Y + 0.002 - depth / 2, PORT_Z)),
        coll,
        [M["nickel"]],
        gpu,
        smooth_angle=None,
    )
    bm = prism_bm(shape, 0.004, (x, FACE_Y + 0.002 - depth + 0.002, PORT_Z))
    width = 0.161 if kind == "DP" else 0.14
    tongue_z = PORT_Z + 0.004
    cube_bm((width * 0.78, depth * 0.85, 0.011), (x, FACE_Y - depth / 2 - 0.004, tongue_z), bm)
    mesh_object(f"GPU_Port_{kind}_{i + 1}_Inner", bm, coll, [M["plastic"]], gpu, smooth_angle=None)
    # contatti dorati sopra e sotto la linguetta
    bm = bmesh.new()
    pins = 10
    for side in (-1, 1):
        for p in range(pins):
            px = x - width * 0.33 + p * (width * 0.66) / (pins - 1) + (0.004 if side > 0 else 0)
            cube_bm((0.0045, depth * 0.6, 0.0016), (px, FACE_Y - depth * 0.45, tongue_z + side * 0.0058), bm)
    mesh_object(f"GPU_Port_{kind}_{i + 1}_Pins", bm, coll, [M["gold"]], gpu, smooth_angle=None)

# ---------------------------------------------------------------- lato visibile dal vetro
# scritta unica centrata sul fianco: stesso font, dimensione e spessore
logo = text_object(
    "GPU_Logo",
    "GEFORCE  RRX 6070",
    coll,
    M["logo"],
    size=0.15,
    extrude=0.005,
    parent=gpu,
    location=(-W / 2 - 0.003, 0, -0.135),
    rotation=(math.pi / 2, 0, -math.pi / 2),
    font=FONT_DIN,
    offset=0.0032,
    spacing=1.08,
    resolution=5,
)
total = mesh_width(logo)
box("GPU_RGB_Strip", (0.014, L - 0.5, 0.026), (-W / 2 - 0.005, 0, -0.045), coll, M["rgb"], gpu, bevel=0.004, segments=2)

# ---------------------------------------------------------------- dettagli
# viti Torx sotto la carenatura
bm = bmesh.new()
heads = []
for x in (-0.53, 0.53):
    for y in (-1.4, -0.475, 0.475, 1.4):
        cylinder_bm(0.017, 0.006, 20, (x, y, -0.243), bm=bm)
        heads.append((x, y))
mesh_object("GPU_Shroud_Screws", bm, coll, [M["screw"]], gpu, smooth_angle=40)
bm = bmesh.new()
for x, y in heads:
    star = []
    for k in range(12):
        r = 0.0085 if k % 2 == 0 else 0.0052
        a = k * math.pi / 6
        star.append((x + r * math.cos(a), y + r * math.sin(a)))
    prism_bm(star, 0.0015, (0, 0, -0.2465), plane="XY", bm=bm)
mesh_object("GPU_Shroud_Screws_Torx", bm, coll, [M["plastic"]], gpu, smooth_angle=None)

# 12VHPWR: gancio di ritenzione e 4 pin di controllo sopra i 12 di potenza
box("GPU_Power_Latch", (0.03, 0.07, 0.012), (-W / 2 - 0.045, layout.GPU_POWER_Y, 0.213), coll, M["plastic"], gpu, bevel=0.003, segments=1)
bm = bmesh.new()
for c in range(4):
    cube_bm((0.012, 0.012, 0.008), (0, -0.054 + c * 0.036, 0), bm)
sense = mesh_object("GPU_Power_Sense", bm, coll, [M["gold"]], gpu, smooth_angle=None)
sense.location = (-W / 2 - 0.05, layout.GPU_POWER_Y, 0.2035)

# vite sulla linguetta della staffa
bm = cylinder_bm(0.026, 0.02, 24, (0, 0, 0), axis="X")
for k in range(16):
    a = k * math.pi / 8
    cube_bm((0.02, 0.006, 0.006), (0, math.cos(a) * 0.027, math.sin(a) * 0.027), bm)
screw = mesh_object("GPU_Bracket_Screw", bm, coll, [M["nickel"]], gpu, smooth_angle=40)
screw.location = (-0.615, FACE_Y + 0.06, 0.12)

# etichetta col numero di serie sulla backplate, vicino alla staffa
STICKER = (0.1, 1.15)
box("GPU_Sticker", (0.17, 0.34, 0.0012), (STICKER[0], STICKER[1], 0.1856), coll, M["sticker"], gpu, bevel=0)
for i, (line, size) in enumerate((("GEFORCE RRX 6070", 0.022), ("12GB GDDR7 · 192-bit", 0.016), ("S/N 2005-0129-0001", 0.016))):
    text_object(
        f"GPU_Sticker_Text_{i + 1}",
        line,
        coll,
        M["ink"],
        size=size,
        extrude=0.0,
        resolution=3,
        parent=gpu,
        location=(STICKER[0] + 0.058 - i * 0.03, STICKER[1] - 0.02, 0.1863),
        rotation=(0, 0, math.pi / 2),
        font=FONT_DIN,
        offset=0.0004 if i == 0 else 0.0,
    )
bm = bmesh.new()
rng_y = STICKER[1] - 0.14
widths = [0.002, 0.004, 0.0015, 0.003, 0.002, 0.005, 0.0015, 0.0025, 0.004, 0.002, 0.0015, 0.003,
          0.002, 0.0045, 0.0015, 0.002, 0.0035, 0.002, 0.0015, 0.004, 0.0025, 0.0015, 0.003, 0.002]
y = rng_y
for k, w in enumerate(widths * 2):
    if k % 2 == 0:
        cube_bm((0.042, w, 0.0003), (STICKER[0] - 0.045, y + w / 2, 0.1864), bm)
    y += w + 0.0018
mesh_object("GPU_Sticker_Barcode", bm, coll, [M["ink"]], gpu, smooth_angle=None)

# ---------------------------------------------------------------- texture
height, mid, coarse = grain_height(512, seed=3)
grain_n = save_image("tex_grain_normal", normal_from_height(height, 2.2))
rough = {
    "shroud": save_image("tex_rough_shroud", roughness_map(mid, coarse, 0.42, 0.07)),
    "back": save_image("tex_rough_backplate", roughness_map(mid, coarse, 0.5, 0.06)),
    "metal": save_image("tex_rough_metal", roughness_map(mid, coarse, 0.27, 0.06)),
    "plastic": save_image("tex_rough_plastic", roughness_map(mid, coarse, 0.55, 0.08)),
}
pcb_color = save_image("tex_pcb_color", pcb_texture(1024), non_color=False)

use_textures(M["shroud"], rough["shroud"], grain_n, 0.22)
use_textures(M["back"], rough["back"], grain_n, 0.3)
use_textures(M["accent"], rough["metal"], grain_n, 0.15)
use_textures(M["fins"], rough["metal"], grain_n, 0.1)
use_textures(M["nickel"], rough["metal"])
use_textures(M["blade"], rough["plastic"], grain_n, 0.12)
use_textures(M["plastic"], rough["plastic"])
use_textures(M["screw"], rough["metal"])
use_textures(M["pcb"], rough["plastic"], grain_n, 0.1, color=pcb_color)

for obj in coll.objects:
    box_uv(obj, 0.6 if obj.name == "GPU_PCB" else 0.25)

parts = [o for o in coll.objects]
_result = {
    "objects": len(parts),
    "triangles": triangle_count(parts),
    "logo_width": round(total, 3),
}

per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result["top"] = sorted(per_object.items(), key=lambda kv: -kv[1])[:6]
