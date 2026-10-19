"""Oggetti della stanza: monitor, tastiera, mouse, tappetino, light bar, neon, pannelli acustici,
poster, Nintendo 3DS XL, console + controller, pianta, lampada da comodino.

Radici interattive (Empty): "Monitor" (con "Monitor_Screen", UV 0..1), "DS" (3DS XL aperto, con
"DS_Top_Screen" / "DS_Bottom_Screen", UV 0..1), "Neon", "Console", "Poster_*", "Bed_Lamp",
"Safe" (anta "Safe_Door"), "Thesis" (la tesi nella libreria), e gli oggetti da raccogliere "DS", "Key", "Light_Remote", "TV_Remote".
Materiali "RGB_*" animati dal sito.
"""

import importlib
import math
import random
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
import shapes  # noqa: E402
import textures  # noqa: E402

for mod in (L, shapes, textures):
    importlib.reload(mod)
from common import (  # noqa: E402
    FONT_DIN,
    add_bevel,
    box,
    box_uv,
    circle,
    cube_bm,
    cylinder_bm,
    empty,
    load_font,
    material,
    mesh_object,
    prism_bm,
    reset_collection,
    rounded_rect,
    srgb,
    text_object,
    torus_bm,
)
from shapes import superellipsoid_bm  # noqa: E402

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

coll = reset_collection("Room_Props")
rng = random.Random(11)
root = empty("Props", coll)


def emissive(name, color, strength):
    return material(name, (0, 0, 0), roughness=0.5, emission=color, strength=strength)


M = {
    "black": material("Prop_Black_Plastic", srgb("#111215"), roughness=0.5),
    "gloss_black": material("Prop_Gloss_Black", srgb("#0b0b0d"), roughness=0.12),
    "alu_dark": material("Prop_Alu_Dark", srgb("#2a2c31"), metallic=1.0, roughness=0.38),
    "alu": material("Prop_Alu", srgb("#a7aab0"), metallic=1.0, roughness=0.3),
    "keycap": material("Prop_Keycap", srgb("#1b1c20"), roughness=0.6),
    "keycap_accent": material("Prop_Keycap_Accent", srgb("#7c6cff"), roughness=0.6),
    "screen": material("Prop_Screen_Off", srgb("#040506"), roughness=0.06),
    "mat": material("Prop_Desk_Mat", srgb("#141518"), roughness=0.95),
    "white": material("Prop_White_Plastic", srgb("#ecebe7"), roughness=0.4),
    "ds_shell": material("Prop_3DS_Red", srgb("#b0141c"), metallic=0.6, roughness=0.25),
    "ds_inner": material("Prop_3DS_Inner", srgb("#16171a"), roughness=0.45),
    "ds_button": material("Prop_3DS_Button", srgb("#2a2b30"), roughness=0.3),
    "ds_grey": material("Prop_3DS_Grey", srgb("#8b8e94"), roughness=0.35),
    "ceramic": material("Prop_Ceramic", srgb("#d9d4ca"), roughness=0.35),
    "leaf": material("Prop_Leaf", srgb("#2f5b2c"), roughness=0.55),
    "soil": material("Prop_Soil", srgb("#2a1d14"), roughness=1.0),
    "frame": material("Prop_Frame_Black", srgb("#141416"), roughness=0.4),
    "felt_a": material("Prop_Felt_Graphite", srgb("#2c2f36"), roughness=0.95),
    "felt_b": material("Prop_Felt_Slate", srgb("#3d4656"), roughness=0.95),
    "felt_c": material("Prop_Felt_Violet", srgb("#4a3b7a"), roughness=0.95),
    "acrylic": material("Prop_Acrylic", srgb("#0d0e12"), roughness=0.1),
    "rgb_kb": emissive("RGB_Keyboard", (0.5, 0.3, 1.0), 4.0),
    "rgb_mouse": emissive("RGB_Mouse", (0.5, 0.3, 1.0), 4.0),
    "lightbar": emissive("Prop_Lightbar_Glow", (1.0, 0.9, 0.78), 6.0),
    "neon": emissive("Neon_Tube", (1.0, 0.12, 0.55), 3.5),
    "lamp_shade": material("Prop_Lamp_Shade", srgb("#efe6d6"), roughness=0.8, emission=(1.0, 0.75, 0.45), strength=1.5),
    "power_led": emissive("Prop_Power_LED", (0.2, 0.6, 1.0), 4.0),
}


def soft(name, size, center, mat, parent, e_vert=0.3, e_horiz=0.3, seg=(24, 12), **kw):
    obj = mesh_object(name, superellipsoid_bm(size, e_vert, e_horiz, seg[0], seg[1], center, **kw), coll, [mat], parent, smooth_angle=60)
    box_uv(obj, 2.0)
    return obj


def screen_plane(name, w, h, center, mat, parent, normal="-Y"):
    """Piano con UV 0..1 orientato verso chi guarda (u da sinistra a destra)."""
    bm = bmesh.new()
    if normal == "-Y":
        pts = [(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)]
    else:  # "+Z"
        pts = [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]
    verts = [bm.verts.new(Vector(p) + Vector(center)) for p in pts]
    face = bm.faces.new(verts)
    uvl = bm.loops.layers.uv.new("UVMap")
    for loop, uv in zip(face.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uvl].uv = uv
    bmesh.ops.recalc_face_normals(bm, faces=[face])
    obj = mesh_object(name, bm, coll, [mat], parent, smooth_angle=None)
    # la normale deve guardare verso chi osserva
    n = obj.data.polygons[0].normal
    want = Vector((0, -1, 0)) if normal == "-Y" else Vector((0, 0, 1))
    if n.dot(want) < 0:
        obj.data.flip_normals()
    return obj


# ================================================================== monitor 32" sulla scrivania
mon = empty("Monitor", coll, L.MONITOR_ANCHOR, root)
sw, sh, sz = L.SCREEN_W, L.SCREEN_H, L.SCREEN_Z
# base ovale e collo
base = mesh_object("Monitor_Base", prism_bm(rounded_rect(3.0, 2.0, 0.9, 6), 0.12, (0, 0.25, 0.06), plane="XY"), coll, [M["alu_dark"]], mon, smooth_angle=40)
add_bevel(base, 0.03, 2)
box("Monitor_Neck", (0.5, 0.32, 3.0), (0, 0.75, 1.55), coll, M["alu_dark"], mon, bevel=0.08)
box("Monitor_Hinge", (1.2, 0.5, 0.55), (0, 0.55, sz - 0.3), coll, M["black"], mon, bevel=0.06)
panel = box("Monitor_Panel", (sw + 0.16, 0.12, sh + 0.16), (0, 0.06, sz), coll, M["black"], mon, bevel=0.03)
back = soft("Monitor_Back", (sw * 0.55, 0.45, sh * 0.6), (0, 0.3, sz - 0.2), M["black"], mon, 0.25, 0.25)
box("Monitor_Chin", (sw + 0.16, 0.18, 0.3), (0, 0.04, sz - sh / 2 - 0.1), coll, M["black"], mon, bevel=0.03)
screen_plane("Monitor_Screen", sw, sh, (0, -0.005, sz), M["screen"], mon)
box("Monitor_LED", (0.06, 0.03, 0.03), (sw / 2 - 0.3, -0.04, sz - sh / 2 - 0.12), coll, M["power_led"], mon, bevel=0)
# light bar sopra il monitor
mesh_object("Monitor_Lightbar", cylinder_bm(0.14, 4.6, 24, (0, -0.1, sz + sh / 2 + 0.28), axis="X"), coll, [M["alu_dark"]], mon)
box("Monitor_Lightbar_Glow", (4.4, 0.12, 0.03), (0, -0.16, sz + sh / 2 + 0.14), coll, M["lightbar"], mon, bevel=0)
box("Monitor_Lightbar_Clip", (0.6, 0.5, 0.3), (0, 0.12, sz + sh / 2 + 0.15), coll, M["black"], mon, bevel=0.04)

# ================================================================== tappetino, tastiera TKL, mouse
desk_front = L.DESK_Y[0]
mx = L.MONITOR_ANCHOR[0] + 0.6
top = L.DESK_TOP
mat_obj = mesh_object("Desk_Mat", prism_bm(rounded_rect(9.0, 4.0, 0.3, 4), 0.03, (mx + 0.5, desk_front + 2.6, top + 0.015), plane="XY"), coll, [M["mat"]], root, smooth_angle=None)

kb = empty("Keyboard", coll, (mx - 0.6, desk_front + 2.4, top + 0.03), root)
kb.rotation_euler = (0, 0, math.radians(1.5))
U = 0.19  # 1u = 19 mm
rows = [  # (larghezze in unità) dalla fila in basso
    [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
    [2.25] + [1] * 10 + [2.75],
    [1.75] + [1] * 11 + [2.25],
    [1.5] + [1] * 12 + [1.5],
    [1] * 13 + [2],
    [1, 0.5] + [1] * 4 + [0.25] + [1] * 4 + [0.25] + [1] * 4,
]
case_w, case_d = 15.6 * U + 0.3, 6.5 * U + 0.3
box("Keyboard_Case", (case_w, case_d, 0.22), (0, 0, 0.13), coll, M["alu_dark"], kb, bevel=0.03)
box("Keyboard_Plate", (case_w - 0.12, case_d - 0.12, 0.02), (0, 0, 0.25), coll, M["black"], kb, bevel=0)
box("Keyboard_Underglow", (case_w - 0.2, case_d - 0.2, 0.03), (0, 0, 0.015), coll, M["rgb_kb"], kb, bevel=0)
bm = bmesh.new()
accent = bmesh.new()
x_left = -case_w / 2 + 0.15


def keycap(target, x, y, w):
    res = bmesh.ops.create_cube(target, size=1.0)
    vs = res["verts"]
    bmesh.ops.scale(target, vec=Vector((w * U - 0.025, U - 0.025, 0.11)), verts=vs)
    for v in vs:
        if v.co.z > 0:
            v.co.x *= (w * U - 0.06) / (w * U - 0.025)
            v.co.y *= 0.72
    bmesh.ops.translate(target, vec=Vector((x, y, 0.32)), verts=vs)


for r, widths in enumerate(rows):
    y = -case_d / 2 + 0.15 + U * (r + 0.5) + (0.12 if r == 5 else 0)
    x = x_left
    for k, w in enumerate(widths):
        if w in (0.5, 0.25):  # spazi tra i gruppi della fila F
            x += w * U
            continue
        target = accent if (r == 5 and k == 0) or (r == 2 and k == len(widths) - 1) else bm
        keycap(target, x + w * U / 2, y, w)
        x += w * U
    # blocco frecce / navigazione a destra
    nav_x = x_left + 15.25 * U
    if r == 0:
        for k in range(3):
            keycap(bm, nav_x + U * (k + 0.5), y, 1)
    if r == 1:
        keycap(bm, nav_x + U * 1.5, y, 1)
    if r in (3, 4):
        for k in range(3):
            keycap(bm, nav_x + U * (k + 0.5), y, 1)
    if r == 5:
        for k in range(3):
            keycap(bm, nav_x + U * (k + 0.5), y, 1)
mesh_object("Keyboard_Keycaps", bm, coll, [M["keycap"]], kb, smooth_angle=None)
mesh_object("Keyboard_Keycaps_Accent", accent, coll, [M["keycap_accent"]], kb, smooth_angle=None)
# il case è più largo: il blocco frecce sta dentro
bpy.data.objects["Keyboard_Case"].scale.x = (18.5 * U + 0.3) / case_w
bpy.data.objects["Keyboard_Case"].location.x = 1.45 * U
bpy.data.objects["Keyboard_Plate"].scale.x = (18.5 * U + 0.18) / (case_w - 0.12)
bpy.data.objects["Keyboard_Plate"].location.x = 1.45 * U
bpy.data.objects["Keyboard_Underglow"].scale.x = (18.5 * U + 0.1) / (case_w - 0.2)
bpy.data.objects["Keyboard_Underglow"].location.x = 1.45 * U
# cavo spiralato verso il monitor
mesh_object("Keyboard_Cable", cylinder_bm(0.05, 1.6, 8, (-0.2, case_d / 2 + 0.8, 0.12), axis="Y"), coll, [M["black"]], kb)

mouse = empty("Mouse", coll, (mx + 3.6, desk_front + 2.2, top + 0.03), root)
mouse.rotation_euler = (0, 0, math.radians(-6))


def mouse_shape(x, y, z):
    # dorso più alto verso il palmo, punta più stretta
    k = 0.82 + 0.18 * (1 - y) / 2
    return x * k, y, z * (0.75 + 0.25 * (1 - y) / 2) if z > 0 else z * 0.25


soft("Mouse_Shell", (0.64, 1.22, 0.78), (0, 0, 0.2), M["black"], mouse, 0.6, 0.55, seg=(28, 14), squash=mouse_shape)
mesh_object("Mouse_Wheel", cylinder_bm(0.07, 0.07, 16, (0, 0.32, 0.36), axis="X"), coll, [M["alu"]], mouse)
box("Mouse_Logo", (0.08, 0.12, 0.02), (0, -0.33, 0.39), coll, M["rgb_mouse"], mouse, bevel=0)

# ================================================================== neon "ROBERTO RINGOLI" sopra la scrivania
neon = empty("Neon", coll, (L.DESK_CENTER[0], L.Y1 - 0.25, 19.0), root)
neon.rotation_euler = (math.radians(90), 0, 0)
curve = bpy.data.curves.new("Neon_Text_Curve", type="FONT")
curve.body = "ROBERTO RINGOLI"
curve.font = load_font(FONT_DIN)
curve.size = 1.7
curve.align_x = "CENTER"
curve.align_y = "CENTER"
curve.space_character = 1.12
curve.fill_mode = "NONE"
curve.bevel_depth = 0.045
curve.bevel_resolution = 1
curve.resolution_u = 3
curve.offset = -0.06  # il tubo segue la mezzeria del tratto
tmp = bpy.data.objects.new("Neon_tmp", curve)
coll.objects.link(tmp)
dg = bpy.context.evaluated_depsgraph_get()
me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
bpy.data.objects.remove(tmp, do_unlink=True)
bpy.data.curves.remove(curve)
me.name = "Neon_Tubes"
me.materials.append(M["neon"])
tubes = bpy.data.objects.new("Neon_Tubes", me)
tubes.parent = neon
tubes.location = (0, 0, 0.12)
coll.objects.link(tubes)
text_w = max(v.co.x for v in me.vertices) - min(v.co.x for v in me.vertices)
board = mesh_object("Neon_Backboard", prism_bm(rounded_rect(text_w + 1.0, 2.6, 0.4, 5), 0.06, (0, 0, 0.0), plane="XY"), coll, [M["acrylic"]], neon, smooth_angle=None)
for x in (-text_w / 2 - 0.2, text_w / 2 + 0.2):
    mesh_object(f"Neon_Standoff_{x:.0f}", cylinder_bm(0.08, 0.25, 12, (x, 0.9, -0.12)), coll, [M["alu"]], neon)
    mesh_object(f"Neon_Standoff_{x:.0f}b", cylinder_bm(0.08, 0.25, 12, (x, -0.9, -0.12)), coll, [M["alu"]], neon)

# ================================================================== pannelli acustici esagonali (parete ovest, sopra la TV)
hex_r = 1.45
hex_pts = [(hex_r * math.cos(math.radians(60 * k + 30)), hex_r * math.sin(math.radians(60 * k + 30))) for k in range(6)]
hex_layout = [(-0.5, 1, "b"), (0.5, 1, "a"), (-1, 0, "a"), (0, 0, "c"), (1, 0, "b"), (-0.5, -1, "c"), (0.5, -1, "a"), (2, 0, "a"), (-1.5, 1, "a")]
hexes = empty("Hex_Panels", coll, (L.X0 + 0.05, L.TV_Y, 20.8), root)
hexes.rotation_euler = (math.radians(90), 0, math.radians(-90))
for k, (cx, cy, tone) in enumerate(hex_layout):
    w = hex_r * math.sqrt(3) + 0.15
    center = (cx * w, cy * hex_r * 1.5 + 0.05, 0.2)
    pts = [(center[0] + px, center[1] + py) for px, py in hex_pts]
    obj = mesh_object(f"Hex_Panel_{k}", prism_bm([(px - center[0], py - center[1]) for px, py in pts], 0.35, (0, 0, 0), plane="XY"), coll, [M[f"felt_{tone}"]], hexes, smooth_angle=None)
    obj.location = center
    add_bevel(obj, 0.12, 2)

# ================================================================== poster
syn = textures.poster_synthwave()
pix = textures.poster_pixel()


def poster(name, img, w, h, loc, rot_z):
    mat = material(f"Prop_{name}", (1, 1, 1), roughness=0.7)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.get("RR_color") or nt.nodes.new("ShaderNodeTexImage")
    tex.name = "RR_color"
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    p = empty(name, coll, loc, root)
    p.rotation_euler = (0, 0, rot_z)
    frame = 0.25
    for side, size, c in (
        ("T", (w + 2 * frame, 0.3, frame), (0, 0, h / 2 + frame / 2)),
        ("B", (w + 2 * frame, 0.3, frame), (0, 0, -h / 2 - frame / 2)),
        ("L", (frame, 0.3, h), (-w / 2 - frame / 2, 0, 0)),
        ("R", (frame, 0.3, h), (w / 2 + frame / 2, 0, 0)),
    ):
        box(f"{name}_Frame_{side}", size, c, coll, M["frame"], p, bevel=0.03)
    box(f"{name}_Back", (w, 0.1, h), (0, 0.08, 0), coll, M["frame"], p, bevel=0)
    screen_plane(f"{name}_Print", w, h, (0, 0.0, 0), mat, p)
    return p


# sopra il letto (parete nord) e accanto alla porta (parete sud, guarda verso nord)
poster("Poster_Synthwave", syn, 5.4, 7.2, ((L.BED_X[0] + L.BED_X[1]) / 2, L.Y1 - 0.2, 17.6), 0.0)
poster("Poster_Pixel", pix, 4.8, 6.4, (3.0, L.Y0 + 0.2, 15.0), math.pi)

# ================================================================== Nintendo 3DS XL aperto sul comodino
# misure reali: 156 x 93 x 22 mm da chiuso; schermo superiore 4.88", inferiore 4.18"
ds_w, ds_d = 1.56, 0.93
t_bot, t_top = 0.12, 0.10
ds = empty("DS", coll, ((L.NIGHT_X[0] + L.NIGHT_X[1]) / 2 - 0.35, L.NIGHT_Y[0] + 1.3, L.NIGHT_H), root)
ds.rotation_euler = (0, 0, math.radians(-20))  # girato verso chi entra dalla stanza
outline = rounded_rect(ds_w, ds_d, 0.16, 6)
bottom = mesh_object("DS_Bottom_Shell", prism_bm(outline, t_bot, (0, 0, t_bot / 2), plane="XY"), coll, [M["ds_shell"]], ds, smooth_angle=40)
add_bevel(bottom, 0.025, 2)
inner = mesh_object("DS_Bottom_Face", prism_bm(rounded_rect(ds_w - 0.06, ds_d - 0.06, 0.13, 6), 0.01, (0, 0, t_bot + 0.004), plane="XY"), coll, [M["ds_inner"]], ds, smooth_angle=None)
screen_plane("DS_Bottom_Screen", 0.85, 0.51, (0, 0.06, t_bot + 0.011), M["screen"], ds, normal="+Z")
box("DS_Bottom_Bezel", (0.93, 0.59, 0.006), (0, 0.06, t_bot + 0.008), coll, M["gloss_black"], ds, bevel=0)
# circle pad, croce direzionale, ABXY, start/select/home, power
mesh_object("DS_Circle_Pad_Base", cylinder_bm(0.11, 0.02, 24, (-0.6, 0.17, t_bot + 0.015)), coll, [M["ds_grey"]], ds)
mesh_object("DS_Circle_Pad", cylinder_bm(0.085, 0.04, 24, (-0.6, 0.17, t_bot + 0.035), radius2=0.075), coll, [M["ds_button"]], ds)
box("DS_Dpad_H", (0.17, 0.055, 0.025), (-0.6, -0.17, t_bot + 0.02), coll, M["ds_button"], ds, bevel=0.008, segments=2)
box("DS_Dpad_V", (0.055, 0.17, 0.025), (-0.6, -0.17, t_bot + 0.02), coll, M["ds_button"], ds, bevel=0.008, segments=2)
for k, (bx, by) in enumerate(((0.6, 0.27), (0.6, 0.07), (0.5, 0.17), (0.7, 0.17))):
    mesh_object(f"DS_Button_{'XBYA'[k]}", cylinder_bm(0.042, 0.03, 20, (bx, by, t_bot + 0.02)), coll, [M["ds_button"]], ds)
for k, x in enumerate((-0.25, 0.0, 0.25)):
    box(f"DS_Menu_Button_{k}", (0.16, 0.04, 0.012), (x, -0.36, t_bot + 0.012), coll, M["ds_grey"], ds, bevel=0.005, segments=1)
mesh_object("DS_Power_Button", cylinder_bm(0.03, 0.015, 16, (0.6, -0.17, t_bot + 0.012)), coll, [M["ds_grey"]], ds)
mesh_object("DS_Hinge", cylinder_bm(0.07, ds_w - 0.5, 24, (0, ds_d / 2 - 0.02, t_bot + 0.02), axis="X"), coll, [M["ds_inner"]], ds)
for k, x in enumerate((-ds_w / 2 + 0.2, ds_w / 2 - 0.2)):
    mesh_object(f"DS_Hinge_Knuckle_{k}", cylinder_bm(0.075, 0.3, 24, (x, ds_d / 2 - 0.02, t_bot + 0.02), axis="X"), coll, [M["ds_shell"]], ds)
# coperchio: modellato chiuso sopra la base, poi ruotato sul cardine (aperto a ~110°)
lid = empty("DS_Lid", coll, (0, ds_d / 2 - 0.02, t_bot + 0.02), ds)
lid.rotation_euler = (math.radians(-110), 0, 0)
lid_outline = [(x, y - ds_d / 2 + 0.02) for x, y in outline]
top_shell = mesh_object("DS_Top_Shell", prism_bm(lid_outline, t_top, (0, 0, t_top / 2 + 0.005), plane="XY"), coll, [M["ds_shell"]], lid, smooth_angle=40)
add_bevel(top_shell, 0.025, 2)
mesh_object("DS_Top_Face", prism_bm([(x, y - ds_d / 2 + 0.02) for x, y in rounded_rect(ds_w - 0.06, ds_d - 0.06, 0.13, 6)], 0.01, (0, 0, 0.0), plane="XY"), coll, [M["ds_inner"]], lid, smooth_angle=None)
box("DS_Top_Bezel", (1.12, 0.68, 0.006), (0, -ds_d / 2 + 0.04, -0.004), coll, M["gloss_black"], lid, bevel=0)
top_screen = screen_plane("DS_Top_Screen", 0.99, 0.595, (0, -ds_d / 2 + 0.04, -0.008), M["screen"], lid, normal="+Z")
# lo schermo superiore guarda verso la base quando è chiuso: normale verso -Z locale
top_screen.data.flip_normals()
for x in (-0.68, 0.68):
    for j in range(3):
        mesh_object(f"DS_Speaker_{x:+.0f}_{j}", cylinder_bm(0.008, 0.004, 8, (x, -ds_d / 2 + 0.12 + j * 0.05, -0.006)), coll, [M["black"]], lid)
mesh_object("DS_Camera", cylinder_bm(0.012, 0.004, 12, (0, -0.06, -0.006)), coll, [M["black"]], lid)
# lato esterno del coperchio: righe lucide decorative
box("DS_Lid_Stripe", (ds_w - 0.5, 0.012, 0.004), (0, -ds_d / 2 + 0.02, t_top + 0.007), coll, M["ds_grey"], lid, bevel=0)

# lampada da comodino
lamp = empty("Bed_Lamp", coll, (L.NIGHT_X[0] + 0.9, L.NIGHT_Y[1] - 1.0, L.NIGHT_H), root)
mesh_object("Bed_Lamp_Base", cylinder_bm(0.5, 0.12, 32, (0, 0, 0.06)), coll, [M["alu_dark"]], lamp)
mesh_object("Bed_Lamp_Stem", cylinder_bm(0.05, 2.4, 12, (0, 0, 1.3)), coll, [M["alu_dark"]], lamp)
mesh_object("Bed_Lamp_Shade", cylinder_bm(0.75, 1.2, 40, (0, 0, 2.6), radius2=0.55), coll, [M["lamp_shade"]], lamp)

# ================================================================== console e controller sul mobile TV
tx0, tx1, ty0, ty1, th = L.TV_STAND
console = empty("Console", coll, ((tx0 + tx1) / 2 + 0.2, ty1 - 3.2, th + 0.2), root)
body = box("Console_Body", (2.6, 3.0, 0.75), (0, 0, 0.42), coll, M["white"], console, bevel=0.12, segments=3)
box("Console_Core", (2.4, 2.6, 0.2), (0, 0, 0.42), coll, M["gloss_black"], console, bevel=0.04)
box("Console_Feet", (2.2, 2.6, 0.06), (0, 0, 0.03), coll, M["black"], console, bevel=0)
box("Console_Power_LED", (0.04, 0.4, 0.03), (1.31, 0.6, 0.42), coll, M["power_led"], console, bevel=0)
pad = empty("Controller", coll, ((tx0 + tx1) / 2 + 0.6, ty0 + 4.0, th + 0.2), root)
pad.rotation_euler = (0, 0, math.radians(75))
soft("Controller_Body", (1.55, 0.7, 0.36), (0, 0.05, 0.2), M["black"], pad, 0.6, 0.45, seg=(28, 12))
for s in (-1, 1):
    g = soft(f"Controller_Grip_{'L' if s < 0 else 'R'}", (0.5, 0.95, 0.42), (0, 0, 0), M["black"], pad, 0.6, 0.7, seg=(20, 10))
    g.location = (s * 0.55, -0.3, 0.2)
    g.rotation_euler = (0, 0, math.radians(-14 * s))
    mesh_object(f"Controller_Stick_{'L' if s < 0 else 'R'}", cylinder_bm(0.09, 0.1, 16, (s * 0.24, -0.1, 0.4)), coll, [M["keycap"]], pad)
for k, (bx, by) in enumerate(((0.5, 0.2), (0.5, 0.0), (0.4, 0.1), (0.6, 0.1))):
    mesh_object(f"Controller_Button_{k}", cylinder_bm(0.04, 0.04, 12, (bx, by, 0.39)), coll, [M["keycap_accent"]], pad)

# ================================================================== pianta tra mobile TV e libreria
plant = empty("Plant", coll, (L.X0 + 1.8, (L.TV_STAND[3] + L.SHELF[2]) / 2, 0), root)
pot = mesh_object("Plant_Pot", cylinder_bm(1.25, 3.4, 40, (0, 0, 1.7), radius2=1.45), coll, [M["ceramic"]], plant)
add_bevel(pot, 0.06, 2)
mesh_object("Plant_Soil", cylinder_bm(1.33, 0.05, 32, (0, 0, 3.2)), coll, [M["soil"]], plant)
bm = bmesh.new()
for k in range(24):
    a = math.radians(k * 137.5)
    tilt = math.radians(rng.uniform(15, 55))
    length = rng.uniform(3.0, 6.0)
    # stelo
    stem_top = Vector((math.cos(a) * math.sin(tilt) * length * 0.7, math.sin(a) * math.sin(tilt) * length * 0.7, 3.2 + math.cos(tilt) * length * 0.7))
    res = bmesh.ops.create_cone(bm, cap_ends=False, segments=5, radius1=0.05, radius2=0.03, depth=stem_top.length)
    mid = (Vector((0, 0, 3.2)) + stem_top) / 2
    rot = Vector((0, 0, 1)).rotation_difference((stem_top - Vector((0, 0, 3.2))).normalized()).to_matrix()
    bmesh.ops.rotate(bm, verts=res["verts"], matrix=rot)
    bmesh.ops.translate(bm, vec=mid, verts=res["verts"])
    # foglia: ellisse curvata
    leaf_len, leaf_w = rng.uniform(2.4, 3.4), rng.uniform(1.5, 2.1)
    seg = 8
    rows_v = []
    direction = Vector((math.cos(a), math.sin(a), 0))
    side = Vector((-math.sin(a), math.cos(a), 0))
    for i in range(seg + 1):
        t = i / seg
        half = leaf_w / 2 * math.sin(math.pi * t) ** 0.8
        droop = -0.9 * t * t
        center = stem_top + direction * (t * leaf_len) + Vector((0, 0, droop + 0.3 * t))
        rows_v.append([bm.verts.new(center + side * (s * half) + Vector((0, 0, -abs(s) * half * 0.25))) for s in (-1, 0, 1)])
    for i in range(seg):
        for j in range(2):
            bm.faces.new((rows_v[i][j], rows_v[i + 1][j], rows_v[i + 1][j + 1], rows_v[i][j + 1]))
leaves = mesh_object("Plant_Leaves", bm, coll, [M["leaf"]], plant, smooth_angle=80)
leaves.data.materials[0].use_backface_culling = False

# ================================================================== oggetti da raccogliere
# Ogni radice sta nel baricentro dell'oggetto (il sito la usa per tenerlo in mano e lanciarlo).
M["chrome"] = material("Prop_Chrome", srgb("#d6d8db"), metallic=1.0, roughness=0.14)
M["brass"] = material("Prop_Brass", srgb("#c9a24a"), metallic=1.0, roughness=0.28)
M["safe"] = material("Prop_Safe_Steel", srgb("#3b4048"), metallic=0.25, roughness=0.42)  # acciaio verniciato
M["safe_felt"] = material("Prop_Safe_Felt", srgb("#5a1418"), roughness=1.0)
M["remote_white"] = material("Prop_Remote_White", srgb("#f2f1ee"), roughness=0.35)
M["rubber"] = material("Prop_Rubber_Button", srgb("#2b2c31"), roughness=0.7)
M["power_red"] = material("Prop_Power_Red", srgb("#c4161c"), roughness=0.4)

# ------------------------------------------------------------------ cassaforte nel vano basso della libreria (apertura verso +X)
sx0, sx1, sy0, sy1, sh = L.SHELF
safe_w, safe_d, safe_h, wt = 3.2, 3.0, 2.8, 0.28
safe = empty("Safe", coll, (sx1 - 0.8 - safe_d / 2, sy0 + 0.25 + 0.3 + safe_w / 2, 0.6 + 0.125), root)
for name, size, c in (
    ("Back", (wt, safe_w, safe_h), (-safe_d / 2 + wt / 2, 0, safe_h / 2)),
    ("Bottom", (safe_d, safe_w, wt), (0, 0, wt / 2)),
    ("Top", (safe_d, safe_w, wt), (0, 0, safe_h - wt / 2)),
    ("Side_L", (safe_d, wt, safe_h), (0, -safe_w / 2 + wt / 2, safe_h / 2)),
    ("Side_R", (safe_d, wt, safe_h), (0, safe_w / 2 - wt / 2, safe_h / 2)),
):
    box(f"Safe_{name}", size, c, coll, M["safe"], safe, bevel=0.04, segments=2)
box("Safe_Lining", (0.04, safe_w - 2 * wt, safe_h - 2 * wt), (-safe_d / 2 + wt + 0.02, 0, safe_h / 2), coll, M["safe_felt"], safe, bevel=0)
box("Safe_Lining_Floor", (safe_d - wt - 0.2, safe_w - 2 * wt, 0.04), (wt / 2 - 0.1, 0, wt + 0.02), coll, M["safe_felt"], safe, bevel=0)
# anta: cardine sul lato sinistro guardando la cassaforte (-Y), il sito la ruota attorno a Z
door = empty("Safe_Door", coll, (safe_d / 2, -safe_w / 2 + 0.05, 0), safe)
box("Safe_Door_Plate", (0.3, safe_w - 0.1, safe_h - 0.1), (0.15, safe_w / 2 - 0.05, safe_h / 2), coll, M["safe"], door, bevel=0.05, segments=2)
box("Safe_Door_Bevel", (0.05, safe_w - 0.7, safe_h - 0.7), (0.32, safe_w / 2 - 0.05, safe_h / 2), coll, M["safe"], door, bevel=0.03)
mesh_object("Safe_Keyhole_Plate", cylinder_bm(0.22, 0.06, 32, (0.37, safe_w / 2 + 0.6, safe_h / 2 + 0.45), axis="X"), coll, [M["brass"]], door)
box("Safe_Keyhole", (0.03, 0.06, 0.2), (0.405, safe_w / 2 + 0.6, safe_h / 2 + 0.43), coll, M["black"], door, bevel=0)
mesh_object("Safe_Keyhole_Dot", cylinder_bm(0.05, 0.03, 16, (0.405, safe_w / 2 + 0.6, safe_h / 2 + 0.53), axis="X"), coll, [M["black"]], door)
# maniglia a tre razze
hub_c = (0.42, safe_w / 2 + 0.6, safe_h / 2 - 0.45)
mesh_object("Safe_Handle_Hub", cylinder_bm(0.16, 0.18, 24, hub_c, axis="X"), coll, [M["chrome"]], door)
bm = bmesh.new()
for k in range(3):
    a = math.radians(90 + 120 * k)
    d = Vector((0, math.cos(a), math.sin(a)))
    res = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((0.07, 0.07, 0.55)), verts=res["verts"])
    # il raggio parte lungo Z: lo si porta nella direzione `a` nel piano YZ dell'anta
    bmesh.ops.rotate(bm, verts=res["verts"], matrix=Matrix.Rotation(a - math.pi / 2, 3, "X"))
    bmesh.ops.translate(bm, vec=Vector(hub_c) + Vector((0.05, 0, 0)) + d * 0.3, verts=res["verts"])
    cylinder_bm(0.07, 0.07, 12, tuple(Vector(hub_c) + Vector((0.05, 0, 0)) + d * 0.58), bm=bm, axis="X")
mesh_object("Safe_Handle_Spokes", bm, coll, [M["chrome"]], door)
for z in (0.5, safe_h - 0.5):
    mesh_object(f"Safe_Hinge_{z:.0f}", cylinder_bm(0.07, 0.5, 12, (0.05, -0.02, z)), coll, [M["safe"]], door)

# ------------------------------------------------------------------ telecomando della lampadina (dentro la cassaforte)
remote = empty("Light_Remote", coll, (safe.location.x + 0.1, safe.location.y, safe.location.z + wt + 0.04 + 0.07), root)
remote.rotation_euler = (0, 0, math.radians(80))
soft("Light_Remote_Body", (0.55, 1.35, 0.14), (0, 0, 0), M["remote_white"], remote, 0.35, 0.25, seg=(24, 8))
mesh_object("Light_Remote_Power", cylinder_bm(0.08, 0.03, 20, (0, 0.45, 0.075)), coll, [M["power_red"]], remote)
bulb_colors = ["#ff3b30", "#34c759", "#0a84ff", "#ffd60a", "#bf5af2", "#ff9f0a", "#64d2ff", "#ffffff", "#ff2d92"]
for k, color in enumerate(bulb_colors):
    cx = (k % 3 - 1) * 0.15
    cy = 0.15 - (k // 3) * 0.17
    mesh_object(f"Light_Remote_Color_{k}", cylinder_bm(0.055, 0.03, 16, (cx, cy, 0.075)), coll, [material(f"Prop_Remote_Dot_{k}", srgb(color), roughness=0.4, emission=srgb(color), strength=0.4)], remote)
for k, y in enumerate((-0.42, -0.55)):
    box(f"Light_Remote_Dim_{k}", (0.3, 0.08, 0.03), (0, y, 0.075), coll, M["rubber"], remote, bevel=0.01)

# ------------------------------------------------------------------ telecomando della TV (sul mobile TV)
tx0, tx1, ty0, ty1, th = L.TV_STAND
tvr = empty("TV_Remote", coll, ((tx0 + tx1) / 2 + 0.9, ty0 + 7.5, th + 0.2 + 0.1), root)
tvr.rotation_euler = (0, 0, math.radians(-25))
soft("TV_Remote_Body", (0.45, 1.85, 0.2), (0, 0, 0), M["black"], tvr, 0.4, 0.2, seg=(24, 8))
mesh_object("TV_Remote_Power", cylinder_bm(0.06, 0.03, 16, (0.12, 0.72, 0.1)), coll, [M["power_red"]], tvr)
mesh_object("TV_Remote_Dpad", cylinder_bm(0.15, 0.03, 24, (0, 0.3, 0.1)), coll, [M["rubber"]], tvr)
for k in range(12):
    box(f"TV_Remote_Key_{k}", (0.08, 0.06, 0.03), ((k % 3 - 1) * 0.12, -0.05 - (k // 3) * 0.12, 0.1), coll, M["rubber"], tvr, bevel=0.01)
box("TV_Remote_IR", (0.2, 0.05, 0.08), (0, 0.92, 0.02), coll, M["gloss_black"], tvr, bevel=0)

# ------------------------------------------------------------------ chiave della cassaforte (premio del gioco sul 3DS)
key = empty("Key", coll, (ds.location.x + 1.0, ds.location.y - 0.6, L.NIGHT_H + 0.04), root)
key.rotation_euler = (0, 0, math.radians(30))
mesh_object("Key_Bow", torus_bm(0.13, 0.04, 32, 8, (-0.3, 0, 0)), coll, [M["brass"]], key)
mesh_object("Key_Shank", cylinder_bm(0.035, 0.5, 12, (0.05, 0, 0), axis="X"), coll, [M["brass"]], key)
mesh_object("Key_Collar", cylinder_bm(0.055, 0.04, 16, (-0.15, 0, 0), axis="X"), coll, [M["brass"]], key)
for k, (x, h) in enumerate(((0.18, 0.12), (0.24, 0.07), (0.3, 0.14))):
    box(f"Key_Bit_{k}", (0.05, 0.03, h), (x, 0, -h / 2 - 0.02), coll, M["brass"], key, bevel=0.005, segments=1)

# ------------------------------------------------------------------ tesi di laurea esposta di copertina nella libreria
# rilegatura rigida blu con scritte in oro; nel vano a sinistra del 5° ripiano, all'altezza degli occhi.
# Radice "Thesis": il sito la rende un bersaglio che apre il PDF.
M["thesis_cover"] = material("Prop_Thesis_Cover", srgb("#1f3563"), roughness=0.55)
M["thesis_pages"] = material("Prop_Thesis_Pages", srgb("#f1ede3"), roughness=0.85)
# un filo di emissione: dentro la libreria arriva poca luce e le scritte devono leggersi
M["gold"] = material("Prop_Thesis_Gold", srgb("#d4af55"), metallic=0.8, roughness=0.35, emission=srgb("#d4af55"), strength=0.35)
shelf_cx, shelf_cy = (sx0 + sx1) / 2, (sy0 + sy1) / 2
TH_W, TH_H, TH_T = 2.0, 2.9, 0.16  # A4 rilegato, ~70 pagine
thesis = empty("Thesis", coll, (shelf_cx + 0.4, shelf_cy - 1.13, 14.1 + 0.125), root)
thesis.rotation_euler = (0, math.radians(-10), 0)  # appoggiata indietro, contro il fondo
board = 0.03
box("Thesis_Pages", (TH_T - 2 * board, TH_W - 0.06, TH_H - 0.06), (0, 0, TH_H / 2), coll, M["thesis_pages"], thesis, bevel=0.005, segments=1)
for side, x in (("Front", TH_T / 2 - board / 2), ("Back", -TH_T / 2 + board / 2)):
    box(f"Thesis_Cover_{side}", (board, TH_W, TH_H), (x, 0.03, TH_H / 2), coll, M["thesis_cover"], thesis, bevel=0.01, segments=2)
box("Thesis_Spine", (TH_T, 0.06, TH_H), (0, -TH_W / 2 + 0.03, TH_H / 2), coll, M["thesis_cover"], thesis, bevel=0.015, segments=2)
# scritte in oro sulla copertina (rivolta verso +X, la stanza)
FACE = (math.radians(90), 0, math.radians(90))
fx = TH_T / 2 + 0.003
lines = [
    ("UNIVERSITÀ DEGLI STUDI DELL'AQUILA", 0.075, 2.62),
    ("Corso di Laurea in Informatica", 0.065, 2.48),
    ("Modellazione e rilevamento", 0.115, 1.98),
    ("di eventi complessi in sistemi", 0.115, 1.83),
    ("di videosorveglianza multimodale", 0.115, 1.68),
    ("Roberto Ringoli", 0.1, 0.95),
    ("Anno Accademico 2025/2026", 0.065, 0.32),
]
for k, (body, size, z) in enumerate(lines):
    text_object(f"Thesis_Text_{k}", body, coll, M["gold"], size, 0.0, parent=thesis, location=(fx, 0.03, z), rotation=FACE, font=FONT_DIN, resolution=3)
for k, z in enumerate((2.3, 1.38, 0.5)):
    box(f"Thesis_Rule_{k}", (0.004, 1.3 if k == 1 else 1.6, 0.012), (fx, 0.03, z), coll, M["gold"], thesis, bevel=0)

_result = {"objects": len(coll.objects)}
