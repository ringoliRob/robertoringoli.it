"""Guscio della stanza: pavimento in parquet, muri, soffitto, porta, finestra, battiscopa, LED.

Radici interattive (Empty): "Door" (porta d'uscita, cardine sul lato +X),
"Ceiling_Lamp" (lampadario, lampadina "Ceiling_Lamp_Bulb"),
"Light_Switch" (porta -> lampadario), "Light_Switch_LED" (comodino -> striscia LED). Materiali "RGB_*": striscia LED animata dal sito.
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

importlib.reload(L)
importlib.reload(textures)
from common import (  # noqa: E402
    add_bevel,
    box,
    box_uv,
    cube_bm,
    cylinder_bm,
    empty,
    glass_material,
    material,
    mesh_object,
    reset_collection,
    srgb,
    torus_bm,
    use_textures,
)

import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

import bpy  # noqa: E402

coll = reset_collection("Room_Shell")
W = L.WALL

# ------------------------------------------------------------------ materiali
parquet_c, parquet_n, parquet_r = textures.save_parquet()
paint_n, paint_r = textures.save_paint()
night = textures.night_pano()

M = {
    "floor": material("Room_Parquet", (0.5, 0.36, 0.22), roughness=0.45),
    "wall": material("Room_Wall_Paint", srgb("#525a69"), roughness=0.85),
    "accent": material("Room_Wall_Accent", srgb("#2a2f3b"), roughness=0.85),
    "ceiling": material("Room_Ceiling", srgb("#d9d9d6"), roughness=0.9),
    "skirt": material("Room_Skirting", srgb("#202329"), roughness=0.5),
    "door": material("Room_Door_Lacquer", srgb("#e8e6e1"), roughness=0.35),
    "frame": material("Room_Door_Frame", srgb("#dcdad4"), roughness=0.4),
    "steel": material("Room_Brushed_Steel", srgb("#b9bcc0"), metallic=1.0, roughness=0.32),
    "pvc": material("Room_Window_PVC", srgb("#2b2e33"), roughness=0.45),
    "sill": material("Room_Sill_Stone", srgb("#cfccc4"), roughness=0.3),
    "glass": glass_material("Room_Window_Glass", tint="#9fb3c8", alpha=0.08),
    "plastic": material("Room_Switch_Plastic", srgb("#efeeea"), roughness=0.45),
    "led": material("RGB_Room_Strip", (0.2, 0.3, 1.0), emission=(0.25, 0.35, 1.0), strength=6.0),
    "night": material("Room_Night_View", (0, 0, 0), roughness=1.0),
}
use_textures(M["floor"], rough=parquet_r, normal=parquet_n, normal_strength=0.6, color=parquet_c)
for key in ("wall", "accent", "ceiling"):
    use_textures(M[key], rough=paint_r, normal=paint_n, normal_strength=0.25)
# la vista notturna è solo emissiva: niente luce riflessa sull'immagine
nt = M["night"].node_tree
bsdf = nt.nodes["Principled BSDF"]
tex = nt.nodes.get("RR_night") or nt.nodes.new("ShaderNodeTexImage")
tex.name = "RR_night"
tex.image = night
tex.location = (bsdf.location.x - 400, 0)
nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = 1.0
bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)

root = empty("Room", coll)


def wall_box(name, x0, x1, y0, y1, z0, z1, mat, tile=10.0):
    obj = box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), coll, mat, root, bevel=0)
    # UV in coordinate mondo, così le texture combaciano tra i pezzi
    loc = obj.location.copy()
    for v in obj.data.vertices:
        v.co += loc
    obj.location = (0, 0, 0)
    box_uv(obj, tile)
    return obj


# ------------------------------------------------------------------ pavimento e soffitto
wall_box("Floor", L.X0 - W, L.X1 + W, L.Y0 - W, L.Y1 + W, -0.5, 0, M["floor"], tile=24.0)
wall_box("Ceiling", L.X0 - W, L.X1 + W, L.Y0 - W, L.Y1 + W, L.H, L.H + 0.5, M["ceiling"])

# ------------------------------------------------------------------ muri
# nord (scrivania): colore d'accento più scuro
wall_box("Wall_North", L.X0 - W, L.X1 + W, L.Y1, L.Y1 + W, 0, L.H, M["accent"])
wall_box("Wall_West", L.X0 - W, L.X0, L.Y0 - W, L.Y1, 0, L.H, M["wall"])
# sud con la porta
dx0, dx1 = L.DOOR_X
wall_box("Wall_South_A", L.X0, dx0, L.Y0 - W, L.Y0, 0, L.H, M["wall"])
wall_box("Wall_South_B", dx1, L.X1 + W, L.Y0 - W, L.Y0, 0, L.H, M["wall"])
wall_box("Wall_South_Top", dx0, dx1, L.Y0 - W, L.Y0, L.DOOR_H, L.H, M["wall"])
# est con la finestra
wy0, wy1 = L.WIN_Y
wz0, wz1 = L.WIN_Z
wall_box("Wall_East_A", L.X1, L.X1 + W, L.Y0, wy0, 0, L.H, M["wall"])
wall_box("Wall_East_B", L.X1, L.X1 + W, wy1, L.Y1, 0, L.H, M["wall"])
wall_box("Wall_East_Low", L.X1, L.X1 + W, wy0, wy1, 0, wz0, M["wall"])
wall_box("Wall_East_High", L.X1, L.X1 + W, wy0, wy1, wz1, L.H, M["wall"])

# ------------------------------------------------------------------ battiscopa
sh, sd = L.SKIRT_H, L.SKIRT_D
skirts = [
    ("Skirting_North", L.X0, L.X1, L.Y1 - sd, L.Y1),
    ("Skirting_West", L.X0, L.X0 + sd, L.Y0, L.Y1 - sd),
    ("Skirting_East", L.X1 - sd, L.X1, L.Y0, L.Y1 - sd),
    ("Skirting_South_A", L.X0 + sd, dx0 - 0.7, L.Y0, L.Y0 + sd),
    ("Skirting_South_B", dx1 + 0.7, L.X1 - sd, L.Y0, L.Y0 + sd),
]
for name, x0, x1, y0, y1 in skirts:
    obj = box(name, (x1 - x0, y1 - y0, sh), ((x0 + x1) / 2, (y0 + y1) / 2, sh / 2), coll, M["skirt"], root, bevel=0.03, segments=2)

# ------------------------------------------------------------------ striscia LED nella gola del soffitto
# profilo in alluminio con diffusore emissivo, 8 cm sotto il soffitto lungo tutto il perimetro
led_z = L.H - 0.8
inset = 0.15
strips = [
    ("North", (L.X1 - L.X0 - 0.6, 0.12, 0.12), ((L.X0 + L.X1) / 2, L.Y1 - inset, led_z)),
    ("South", (L.X1 - L.X0 - 0.6, 0.12, 0.12), ((L.X0 + L.X1) / 2, L.Y0 + inset, led_z)),
    ("West", (0.12, L.Y1 - L.Y0 - 0.6, 0.12), (L.X0 + inset, (L.Y0 + L.Y1) / 2, led_z)),
    ("East", (0.12, L.Y1 - L.Y0 - 0.6, 0.12), (L.X1 - inset, (L.Y0 + L.Y1) / 2, led_z)),
]
for name, size, center in strips:
    box(f"LED_Strip_{name}", size, center, coll, M["led"], root, bevel=0)
# cornice che nasconde la striscia: si vede solo il bagliore sul soffitto
cove_d = 1.2
for name, size, center in (
    ("North", (L.X1 - L.X0, cove_d, 0.25), ((L.X0 + L.X1) / 2, L.Y1 - cove_d / 2, led_z - 0.25)),
    ("South", (L.X1 - L.X0, cove_d, 0.25), ((L.X0 + L.X1) / 2, L.Y0 + cove_d / 2, led_z - 0.25)),
    ("West", (cove_d, L.Y1 - L.Y0 - 2 * cove_d, 0.25), (L.X0 + cove_d / 2, (L.Y0 + L.Y1) / 2, led_z - 0.25)),
    ("East", (cove_d, L.Y1 - L.Y0 - 2 * cove_d, 0.25), (L.X1 - cove_d / 2, (L.Y0 + L.Y1) / 2, led_z - 0.25)),
):
    box(f"Cove_{name}", size, center, coll, M["ceiling"], root, bevel=0.03, segments=2)

# ------------------------------------------------------------------ lampadario a sospensione (luce principale)
# paralume conico in metallo (nero fuori, bianco dentro) e lampadina a globo G125:
# il sito accende/spegne la luce e ne cambia il colore tramite il materiale "Light_Bulb".
M["shade_out"] = material("Room_Lamp_Shade_Out", srgb("#17181b"), metallic=0.7, roughness=0.4)
M["shade_in"] = material("Room_Lamp_Shade_In", srgb("#f1efe9"), roughness=0.5)
M["bulb"] = material("Light_Bulb", (1, 1, 1), roughness=0.1, emission=(1.0, 0.82, 0.6), strength=8.0)
lamp = empty("Ceiling_Lamp", coll, ((L.X0 + L.X1) / 2, (L.Y0 + L.Y1) / 2, L.H), root)
mesh_object("Ceiling_Lamp_Canopy", cylinder_bm(0.6, 0.25, 40, (0, 0, -0.125), radius2=0.5), coll, [M["shade_out"]], lamp)
mesh_object("Ceiling_Lamp_Cord", cylinder_bm(0.035, 4.2, 8, (0, 0, -0.25 - 2.1)), coll, [M["shade_out"]], lamp)
mesh_object("Ceiling_Lamp_Socket", cylinder_bm(0.2, 0.6, 24, (0, 0, -4.6)), coll, [M["shade_out"]], lamp)


def lathe(name, profile, mat, parent, segments=48):
    """Solido di rivoluzione attorno a Z da un profilo [(r, z), ...]."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / segments), r * math.sin(2 * math.pi * k / segments), z)) for k in range(segments)])
    for a, b in zip(rings, rings[1:]):
        for k in range(segments):
            bm.faces.new((a[k], a[(k + 1) % segments], b[(k + 1) % segments], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, coll, [mat], parent, smooth_angle=50)


# paralume: profilo esterno e interno (spessore 6 mm) uniti dal bordo inferiore arrotondato
outer = [(0.32, -4.3), (0.55, -4.45), (1.25, -5.1), (1.95, -5.9), (2.25, -6.45)]
lathe("Ceiling_Lamp_Shade", outer, M["shade_out"], lamp)
inner = [(r - 0.06, z - 0.03) for r, z in outer]
shade_in = lathe("Ceiling_Lamp_Shade_Inner", inner, M["shade_in"], lamp)
shade_in.data.flip_normals()
# tappo sopra il paralume: senza, la luce sfugge dalla fessura attorno al portalampada
mesh_object("Ceiling_Lamp_Shade_Cap", cylinder_bm(0.42, 0.08, 32, (0, 0, -4.32)), coll, [M["shade_out"]], lamp)
mesh_object("Ceiling_Lamp_Rim", torus_bm(2.22, 0.045, 64, 8, (0, 0, -6.46)), coll, [M["shade_out"]], lamp)
bulb_bm = bmesh.new()
bmesh.ops.create_uvsphere(bulb_bm, u_segments=32, v_segments=16, radius=0.62)
bmesh.ops.translate(bulb_bm, vec=Vector((0, 0, -5.45)), verts=bulb_bm.verts)
bulb = mesh_object("Ceiling_Lamp_Bulb", bulb_bm, coll, [M["bulb"]], lamp, smooth_angle=80)
bulb.visible_shadow = False  # la luce sta dentro il globo
mesh_object("Ceiling_Lamp_Bulb_Neck", cylinder_bm(0.2, 0.35, 20, (0, 0, -4.95), radius2=0.22), coll, [M["steel"]], lamp)

# ------------------------------------------------------------------ porta (cardine sul lato +X, si apre verso l'interno)
door_t = 0.42
hinge = (dx1 - 0.4, L.Y0 - 0.65, 0)  # dentro la battuta del telaio
door = empty("Door", coll, hinge, root)
leaf_w, leaf_h = dx1 - dx0 - 0.8, L.DOOR_H - 0.45
leaf = box("Door_Leaf", (leaf_w, door_t, leaf_h), (-leaf_w / 2, 0, 0.05 + leaf_h / 2), coll, M["door"], door, bevel=0.03, segments=3)
# scuretti decorativi (doghe orizzontali leggere)
for k, z in enumerate((6.0, 14.0)):
    box(f"Door_Groove_{k}", (leaf_w - 1.6, 0.02, 0.06), (-leaf_w / 2, door_t / 2 + 0.005, z), coll, M["frame"], door, bevel=0)
# maniglia a leva con rosetta + bocchetta della chiave, lato interno (+Y)
hx = -leaf_w + 0.65
hz = 10.5
hy = door_t / 2
rosette = mesh_object("Door_Handle_Rosette", cylinder_bm(0.26, 0.08, 40, (hx, hy + 0.04, hz), axis="Y"), coll, [M["steel"]], door)
add_bevel(rosette, 0.02, 2)
neck = mesh_object("Door_Handle_Neck", cylinder_bm(0.09, 0.55, 24, (hx, hy + 0.3, hz), axis="Y"), coll, [M["steel"]], door)
lever = box("Door_Handle_Lever", (1.25, 0.2, 0.17), (hx + 0.6, hy + 0.55, hz), coll, M["steel"], door, bevel=0.06, segments=3)
mesh_object("Door_Key_Plate", cylinder_bm(0.18, 0.05, 32, (hx, hy + 0.03, hz - 1.0), axis="Y"), coll, [M["steel"]], door)
box("Door_Keyhole", (0.06, 0.02, 0.18), (hx, hy + 0.06, hz - 1.0), coll, M["skirt"], door, bevel=0)
# telaio e coprifili sul lato interno
frame_w, frame_t = 0.75, 0.15
box("Door_Jamb_L", (0.35, W + 0.1, L.DOOR_H), (dx0 + 0.175, L.Y0 - W / 2, L.DOOR_H / 2), coll, M["frame"], root, bevel=0.01)
box("Door_Jamb_R", (0.35, W + 0.1, L.DOOR_H), (dx1 - 0.175, L.Y0 - W / 2, L.DOOR_H / 2), coll, M["frame"], root, bevel=0.01)
box("Door_Jamb_Top", (dx1 - dx0, W + 0.1, 0.35), ((dx0 + dx1) / 2, L.Y0 - W / 2, L.DOOR_H - 0.175), coll, M["frame"], root, bevel=0.01)
box("Door_Casing_L", (frame_w, frame_t, L.DOOR_H + frame_w), (dx0 - frame_w / 2 + 0.05, L.Y0 + frame_t / 2, (L.DOOR_H + frame_w) / 2), coll, M["frame"], root, bevel=0.04)
box("Door_Casing_R", (frame_w, frame_t, L.DOOR_H + frame_w), (dx1 + frame_w / 2 - 0.05, L.Y0 + frame_t / 2, (L.DOOR_H + frame_w) / 2), coll, M["frame"], root, bevel=0.04)
box("Door_Casing_Top", (dx1 - dx0 + 2 * frame_w - 0.1, frame_t, frame_w), ((dx0 + dx1) / 2, L.Y0 + frame_t / 2, L.DOOR_H + frame_w / 2), coll, M["frame"], root, bevel=0.04)
# dietro la porta: corridoio buio (una parete chiusa, nel caso la porta si socchiuda)
wall_box("Hallway_Back", dx0 - 2, dx1 + 2, L.Y0 - W - 6.2, L.Y0 - W - 6, 0, L.H, M["accent"])

# ------------------------------------------------------------------ finestra (parete est), anta in PVC antracite
win = empty("Window", coll, (L.X1, (wy0 + wy1) / 2, (wz0 + wz1) / 2), root)
ww, wh = wy1 - wy0, wz1 - wz0
fx = W * 0.55  # telaio a metà spessore del muro
pvc = M["pvc"]
for name, size, c in (
    ("Window_Frame_Top", (0.7, ww, 0.7), (fx, 0, wh / 2 - 0.35)),
    ("Window_Frame_Bottom", (0.7, ww, 0.7), (fx, 0, -wh / 2 + 0.35)),
    ("Window_Frame_L", (0.7, 0.7, wh), (fx, -ww / 2 + 0.35, 0)),
    ("Window_Frame_R", (0.7, 0.7, wh), (fx, ww / 2 - 0.35, 0)),
    ("Window_Mullion", (0.8, 0.9, wh - 1.4), (fx - 0.05, 0, 0)),
):
    box(name, size, c, coll, pvc, win, bevel=0.05, segments=2)
for side, cy in (("L", -ww / 4 - 0.1), ("R", ww / 4 + 0.1)):
    sw, shh = ww / 2 - 1.15, wh - 2.0
    box(f"Window_Sash_{side}_Top", (0.6, sw, 0.55), (fx - 0.1, cy, shh / 2), coll, pvc, win, bevel=0.04, segments=2)
    box(f"Window_Sash_{side}_Bottom", (0.6, sw, 0.55), (fx - 0.1, cy, -shh / 2), coll, pvc, win, bevel=0.04, segments=2)
    box(f"Window_Sash_{side}_Out", (0.6, 0.55, shh + 0.55), (fx - 0.1, cy - sw / 2 + 0.275 if side == "L" else cy + sw / 2 - 0.275, 0), coll, pvc, win, bevel=0.04, segments=2)
    box(f"Window_Glass_{side}", (0.06, sw - 0.5, shh - 0.5), (fx - 0.1, cy, 0), coll, M["glass"], win, bevel=0)
    # maniglia della finestra sull'anta destra
    if side == "R":
        hy_ = cy - sw / 2 + 0.3
        box("Window_Handle_Base", (0.12, 0.22, 0.6), (fx - 0.46, hy_, 0.0), coll, M["steel"], win, bevel=0.04)
        box("Window_Handle_Lever", (0.14, 0.14, 1.2), (fx - 0.58, hy_, -0.55), coll, M["steel"], win, bevel=0.05)
# davanzale interno in pietra
box("Window_Sill", (1.9, ww + 1.6, 0.3), (-0.25, 0, -wh / 2 - 0.15), coll, M["sill"], win, bevel=0.04)
# vista notturna: sfera panoramica di 40 m attorno alla stanza (emissiva, normali verso l'interno),
# così dalla finestra si vede la città da qualsiasi angolazione

R_SKY = 400.0
sky_center = Vector(((L.X0 + L.X1) / 2, (L.Y0 + L.Y1) / 2, L.EYE_HEIGHT))
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=R_SKY)
uvl = bm.loops.layers.uv.new("UVMap")
for face in bm.faces:
    coords = []
    for loop in face.loops:
        p = loop.vert.co
        lon = math.atan2(p.y, p.x)
        lat = math.asin(max(-1.0, min(1.0, p.z / R_SKY)))
        coords.append([0.5 + lon / (2 * math.pi), 0.5 + lat / math.pi, abs(p.z) > R_SKY * 0.999])
    us = [c[0] for c in coords if not c[2]]
    if us and max(us) - min(us) > 0.5:  # faccia a cavallo della cucitura
        for c in coords:
            if c[0] < 0.5:
                c[0] += 1.0
    mid = sum(c[0] for c in coords if not c[2]) / max(1, sum(1 for c in coords if not c[2]))
    for loop, c in zip(face.loops, coords):
        loop[uvl].uv = (mid if c[2] else c[0], c[1])
bmesh.ops.reverse_faces(bm, faces=bm.faces)
bmesh.ops.translate(bm, vec=sky_center, verts=bm.verts)
view = mesh_object("Window_View", bm, coll, [M["night"]], root, smooth_angle=None)

# ------------------------------------------------------------------ interruttori: accanto alla porta (lampadario)
# e sopra il comodino (striscia LED). Il sito fa scattare "*_Rocker" ruotandolo sul suo asse X.


def light_switch(name, location, rot_z):
    sw = empty(name, coll, location, root)
    sw.rotation_euler = (0, 0, rot_z)
    box(f"{name}_Plate", (0.85, 0.08, 1.2), (0, 0.04, 0), coll, M["plastic"], sw, bevel=0.03)
    rocker = box(f"{name}_Rocker", (0.45, 0.08, 0.65), (0, 0, 0), coll, M["plastic"], sw, bevel=0.03)
    rocker.location = (0, 0.11, 0)
    rocker.rotation_euler = (math.radians(6), 0, 0)
    return sw


light_switch("Light_Switch", (dx0 - 1.6, L.Y0, 11.0), 0.0)
light_switch("Light_Switch_LED", ((L.NIGHT_X[0] + L.NIGHT_X[1]) / 2, L.Y1, 9.5), math.pi)

_result = {"objects": len(coll.objects)}
