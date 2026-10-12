"""Cibo per la barra della fame: cartone della pizza aperto (8 fette separate) e lattina energetica.

Radici: "Pizza_Box" (fisso: il sito ne stacca una fetta alla volta, "Pizza_Slice_0..7"),
"Energy_Drink" (oggetto da raccogliere e bere).
"""

import importlib
import math
import sys

for path in (
    r"C:\Users\rober\Documents\GitHub\robertoringoli.it\tools\blender-mcp\pc_parts",
    r"C:\Users\rober\Documents\GitHub\robertoringoli.it\tools\blender-mcp\room",
):
    if path not in sys.path:
        sys.path.insert(0, path)

import common  # noqa: E402

importlib.reload(common)
import room_layout as L  # noqa: E402
import textures  # noqa: E402

for mod in (L, textures):
    importlib.reload(mod)
from common import FONT_DIN, box, cylinder_bm, empty, material, mesh_object, reset_collection, srgb, text_object, torus_bm, use_textures  # noqa: E402

import bmesh  # noqa: E402

coll = reset_collection("Room_Food")
root = empty("Food", coll)

pizza_img = textures.pizza_top()
label_img = textures.can_label()

M = {
    "cardboard": material("Food_Cardboard", srgb("#b88a55"), roughness=0.9),
    "cardboard_in": material("Food_Cardboard_Inside", srgb("#d8c3a0"), roughness=0.95),
    "print": material("Food_Box_Print", srgb("#c4161c"), roughness=0.8),
    "pizza": material("Food_Pizza_Top", (1, 1, 1), roughness=0.55),
    "dough": material("Food_Pizza_Dough", srgb("#e2b97a"), roughness=0.8),
    "can": material("Food_Can_Label", (1, 1, 1), metallic=0.6, roughness=0.3),
    "alu": material("Food_Can_Alu", srgb("#c9ccd1"), metallic=1.0, roughness=0.25),
}
use_textures(M["pizza"], color=pizza_img)
use_textures(M["can"], color=label_img)

# ------------------------------------------------------------------ cartone della pizza (34 cm) sulla scrivania, a sinistra
BOX = 3.5
BOX_H = 0.42
# a sinistra del monitor ma fuori dall'inquadratura dello zoom sullo schermo
pizza_box = empty("Pizza_Box", coll, (L.DESK_X[0] + 1.85, L.DESK_Y[0] + 2.6, L.DESK_TOP), root)
pizza_box.rotation_euler = (0, 0, math.radians(3))
t = 0.03
box("Pizza_Box_Bottom", (BOX, BOX, t), (0, 0, t / 2), coll, M["cardboard_in"], pizza_box, bevel=0)
for name, size, c in (
    ("Front", (BOX, t, BOX_H), (0, -BOX / 2 + t / 2, BOX_H / 2)),
    ("Back", (BOX, t, BOX_H), (0, BOX / 2 - t / 2, BOX_H / 2)),
    ("Left", (t, BOX, BOX_H), (-BOX / 2 + t / 2, 0, BOX_H / 2)),
    ("Right", (t, BOX, BOX_H), (BOX / 2 - t / 2, 0, BOX_H / 2)),
):
    box(f"Pizza_Box_{name}", size, c, coll, M["cardboard"], pizza_box, bevel=0)
# coperchio aperto a ~105° sul lato posteriore
lid = empty("Pizza_Box_Lid", coll, (0, BOX / 2, BOX_H), pizza_box)
lid.rotation_euler = (math.radians(-105), 0, 0)
box("Pizza_Box_Lid_Panel", (BOX, BOX, t), (0, -BOX / 2, t / 2), coll, M["cardboard"], lid, bevel=0)
box("Pizza_Box_Lid_Lip", (BOX, t, 0.25), (0, -BOX + t / 2, -0.12), coll, M["cardboard"], lid, bevel=0)
# scritta stampata sul coperchio (visibile da sopra quando è aperto: faccia interna verso -Z)
label = text_object("Pizza_Box_Print", "PIZZA", coll, M["print"], 0.55, 0.0, parent=lid, location=(0, -BOX / 2, -0.002), rotation=(math.pi, 0, 0), font=FONT_DIN, resolution=4)

# 8 fette: spicchi con cornicione rialzato, UV planari sulla pizza intera
R = 1.58
profile = [(0.0, 0.10), (1.30, 0.10), (1.40, 0.16), (1.50, 0.19), (1.56, 0.15), (R, 0.06)]
for k in range(8):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    a0 = 2 * math.pi * k / 8 + 0.01
    a1 = 2 * math.pi * (k + 1) / 8 - 0.01
    steps = 6
    top = []
    bottom = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        top.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z + t)) for r, z in profile])
        bottom.append([bm.verts.new((r * math.cos(a), r * math.sin(a), t + 0.005)) for r, _ in profile])
    faces_top = []
    for i in range(steps):
        for j in range(len(profile) - 1):
            faces_top.append(bm.faces.new((top[i][j], top[i][j + 1], top[i + 1][j + 1], top[i + 1][j])))
            f = bm.faces.new((bottom[i][j], bottom[i + 1][j], bottom[i + 1][j + 1], bottom[i][j + 1]))
            f.material_index = 1
        # bordo esterno
        f = bm.faces.new((top[i][-1], bottom[i][-1], bottom[i + 1][-1], top[i + 1][-1]))
        f.material_index = 1
    # facce del taglio
    for col, flip in ((0, False), (steps, True)):
        for j in range(len(profile) - 1):
            quad = (bottom[col][j], bottom[col][j + 1], top[col][j + 1], top[col][j])
            f = bm.faces.new(tuple(reversed(quad)) if flip else quad)
            f.material_index = 1
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        for loop in f.loops:
            loop[uvl].uv = (0.5 + loop.vert.co.x / (2 * R), 0.5 + loop.vert.co.y / (2 * R))
    mesh_object(f"Pizza_Slice_{k}", bm, coll, [M["pizza"], M["dough"]], pizza_box, smooth_angle=40)

# ------------------------------------------------------------------ lattina energetica 330 ml sulla scrivania, accanto al PC
can = empty("Energy_Drink", coll, (L.DESK_X[1] - 1.0, L.DESK_Y[0] + 1.6, L.DESK_TOP), root)
can.rotation_euler = (0, 0, math.radians(-30))
body = mesh_object("Energy_Drink_Body", cylinder_bm(0.33, 1.0, 40, (0, 0, 0.58)), coll, [M["can"]], can, smooth_angle=40)
uv = body.data.uv_layers.new(name="UVMap")
for poly in body.data.polygons:
    for li in poly.loop_indices:
        co = body.data.vertices[body.data.loops[li].vertex_index].co
        uv.data[li].uv = ((math.atan2(co.y, co.x) / (2 * math.pi)) % 1.0, (co.z - 0.08) / 1.0)
mesh_object("Energy_Drink_Bottom", cylinder_bm(0.33, 0.08, 40, (0, 0, 0.04), radius2=0.3), coll, [M["alu"]], can)
mesh_object("Energy_Drink_Shoulder", cylinder_bm(0.33, 0.1, 40, (0, 0, 1.13), radius2=0.28), coll, [M["alu"]], can)
mesh_object("Energy_Drink_Rim", torus_bm(0.275, 0.025, 40, 6, (0, 0, 1.19)), coll, [M["alu"]], can)
mesh_object("Energy_Drink_Lid", cylinder_bm(0.26, 0.02, 32, (0, 0, 1.17)), coll, [M["alu"]], can)
box("Energy_Drink_Tab", (0.12, 0.2, 0.012), (0, 0.06, 1.19), coll, M["alu"], can, bevel=0)

_result = {"objects": len(coll.objects)}
