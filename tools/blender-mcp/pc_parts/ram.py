"""4 moduli DDR5 RGB (133.35 x 42.2 x 7.1 mm, come i kit RGB in commercio).

Radici RAM_1..RAM_4 al centro di ogni slot (layout.DIMM_Y, DIMM_Z) sulla faccia della
scheda madre; i figli sono in coordinate locali e sporgono verso -X (il vetro).
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
    box,
    box_uv,
    cube_bm,
    empty,
    grain_height,
    material,
    mesh_object,
    normal_from_height,
    prism_bm,
    reset_collection,
    roughness_map,
    save_image,
    srgb,
    text_object,
    triangle_count,
    use_textures,
)

import bmesh  # noqa: E402
import bpy  # noqa: E402
import layout  # noqa: E402
from mathutils import Matrix  # noqa: E402

importlib.reload(layout)

M = {
    "spreader": material("RAM_Spreader", srgb("#1a1c21"), metallic=0.85, roughness=0.32),
    "accent": material("RAM_Accent", srgb("#c4c8d0"), metallic=1.0, roughness=0.25),
    "pcb": material("RAM_PCB", srgb("#0f2a1c"), metallic=0.1, roughness=0.6),
    "chip": material("RAM_Chip", srgb("#111214"), metallic=0.2, roughness=0.5),
    "rgb": material("RGB_RAM", srgb("#e8e8ee"), metallic=0.0, roughness=0.35, emission=(1, 1, 1), strength=3.0),
    "sticker": material("Sticker", srgb("#e9e9e4"), metallic=0.0, roughness=0.6),
    "ink": material("Ink", srgb("#111111"), metallic=0.0, roughness=0.7),
}

coll = reset_collection("RAM")
LEN = 1.3335  # 133.35 mm
H = 0.422  # 42.2 mm dalla base del modulo
T = 0.071  # 7.1 mm di spessore
BASE = -0.015  # il modulo entra di 1.5 mm nello slot

# profilo del dissipatore (piano X/Z, X verso il vetro): angoli superiori smussati
SPREADER = [
    (BASE - 0.03, -LEN / 2 + 0.005),
    (BASE - 0.03, LEN / 2 - 0.005),
    (BASE - H + 0.035, LEN / 2 - 0.005),
    (BASE - H + 0.005, LEN / 2 - 0.04),
    (BASE - H + 0.005, -LEN / 2 + 0.04),
    (BASE - H + 0.035, -LEN / 2 + 0.005),
]
# fascia diagonale argento sulle facce del dissipatore
STRIPE = [(BASE - 0.12, -0.55), (BASE - 0.12, -0.42), (BASE - 0.3, 0.1), (BASE - 0.3, -0.03)]

# testo sul lato -Y: legge lungo +Z, con la parte alta verso il vetro (-X)
LABEL_ROT = Matrix(((0, -1, 0), (0, 0, -1), (1, 0, 0))).to_euler("XYZ")

for i, y in enumerate(layout.DIMM_Y):
    root = empty(f"RAM_{i + 1}", coll, location=(layout.FACE, y, layout.DIMM_Z))
    box(f"RAM_{i + 1}_PCB", (0.33, 0.012, LEN), (BASE - 0.165, 0, 0), coll, M["pcb"], root, bevel=0.002, segments=1)
    bm = bmesh.new()
    for k in range(8):
        for s in (-1, 1):
            cube_bm((0.11, 0.006, 0.12), (BASE - 0.16, s * 0.009, -0.56 + k * 0.16), bm)
    mesh_object(f"RAM_{i + 1}_Chips", bm, coll, [M["chip"]], root, smooth_angle=None)
    for s in (-1, 1):
        side = "A" if s < 0 else "B"
        plate = mesh_object(f"RAM_{i + 1}_Spreader_{side}", prism_bm(SPREADER, 0.02, (0, s * 0.0255, 0), plane="XZ"), coll, [M["spreader"]], root, smooth_angle=30)
        mesh_object(f"RAM_{i + 1}_Stripe_{side}", prism_bm(STRIPE, 0.001, (0, s * 0.0362, 0), plane="XZ"), coll, [M["accent"]], root, smooth_angle=None)
    # barra RGB diffusa in cima, tra i due dissipatori
    box(f"RAM_{i + 1}_RGB", (0.06, 0.034, LEN - 0.1), (BASE - H + 0.04, 0, 0), coll, M["rgb"], root, bevel=0.008, segments=2)
    # etichetta sul lato verso il fronte
    box(f"RAM_{i + 1}_Label", (0.12, 0.001, 0.36), (BASE - 0.2, -0.0365, 0.35), coll, M["sticker"], root, bevel=0)
    for k, (line, size) in enumerate((("DDR5-6400  16GB", 0.026), ("CL32-39-39-102  1.40V", 0.017))):
        text_object(
            f"RAM_{i + 1}_Label_Text_{k + 1}",
            line,
            coll,
            M["ink"],
            size=size,
            extrude=0.0,
            parent=root,
            location=(BASE - 0.23 + k * 0.05, -0.0372, 0.35),
            rotation=LABEL_ROT,
            font=FONT_DIN,
            resolution=3,
        )

height, mid, coarse = grain_height(512, seed=17)
grain_n = bpy.data.images.get("tex_grain_normal") or save_image("tex_grain_normal", normal_from_height(height, 2.2))
rough_metal = bpy.data.images.get("tex_rough_metal") or save_image("tex_rough_metal", roughness_map(mid, coarse, 0.27, 0.06))
rough_spreader = save_image("tex_rough_ram", roughness_map(mid, coarse, 0.34, 0.06))
use_textures(M["spreader"], rough_spreader, grain_n, 0.25)
use_textures(M["accent"], rough_metal, grain_n, 0.1)

for obj in coll.all_objects:
    box_uv(obj, 0.25)

parts = list(coll.all_objects)
per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result = {"objects": len(parts), "triangles": sum(per_object.values())}
