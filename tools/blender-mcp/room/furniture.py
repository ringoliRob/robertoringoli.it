"""Arredi della stanza: scrivania, sedia gaming, letto, comodino, mobile TV + TV, libreria, armadio,
tappeto e pouf.

Radici interattive (Empty): "Desk", "Chair", "Bed", "TV" (con "TV_Screen", UV 0..1 per il video),
"Bookshelf", "Wardrobe", "Beanbag".
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
    add_bevel,
    box,
    box_uv,
    cube_bm,
    cylinder_bm,
    empty,
    material,
    mesh_object,
    reset_collection,
    rounded_rect,
    prism_bm,
    srgb,
    use_textures,
)
from shapes import draped_bm, superellipsoid_bm  # noqa: E402

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

coll = reset_collection("Room_Furniture")
rng = random.Random(7)

# ------------------------------------------------------------------ materiali
walnut = textures.wood("walnut", (0.36, 0.22, 0.13), seed=21)
oak = textures.wood("oak", (0.72, 0.56, 0.38), seed=22, contrast=0.25)
fab_n, fab_r = textures.fabric()
lea_n, lea_r = textures.leather()
rug_c, rug_n = textures.rug()


def textured(name, color, wood=None, fabric=False, leather=False, roughness=0.5, metallic=0.0, ns=0.4):
    mat = material(name, srgb(color), metallic=metallic, roughness=roughness)
    if wood:
        use_textures(mat, rough=wood[2], normal=wood[1], normal_strength=ns, color=wood[0])
    elif fabric:
        use_textures(mat, rough=fab_r, normal=fab_n, normal_strength=ns)
    elif leather:
        use_textures(mat, rough=lea_r, normal=lea_n, normal_strength=ns)
    return mat


M = {
    "walnut": textured("Room_Walnut", "#5c3a22", wood=walnut),
    "oak": textured("Room_Oak", "#b48c60", wood=oak, ns=0.3),
    "steel_black": material("Room_Steel_Black", srgb("#17181b"), metallic=0.85, roughness=0.42),
    "plastic_black": material("Room_Plastic_Black", srgb("#121316"), roughness=0.55),
    "chrome": material("Room_Chrome", srgb("#d6d8db"), metallic=1.0, roughness=0.14),
    "leather": textured("Room_Leather_Black", "#16171a", leather=True, roughness=0.5, ns=0.5),
    "leather_red": textured("Room_Leather_Red", "#a3141f", leather=True, roughness=0.5, ns=0.5),
    "bed_fabric": textured("Room_Bed_Fabric", "#5d6168", fabric=True, roughness=0.9, ns=0.6),
    "mattress": textured("Room_Mattress", "#e9e7e2", fabric=True, roughness=0.9, ns=0.4),
    "duvet": textured("Room_Duvet", "#2f3f5c", fabric=True, roughness=0.92, ns=0.7),
    "sheet": textured("Room_Sheet", "#e4e2dd", fabric=True, roughness=0.9, ns=0.5),
    "throw": textured("Room_Throw", "#b8b2a6", fabric=True, roughness=0.95, ns=1.0),
    "beanbag": textured("Room_Beanbag", "#37304f", fabric=True, roughness=0.85, ns=0.8),
    "matte_black": material("Room_Matte_Black", srgb("#1a1b1f"), roughness=0.6),
    "white": material("Room_Furniture_White", srgb("#e7e6e2"), roughness=0.55),
    "tv_bezel": material("Room_TV_Bezel", srgb("#0c0c0e"), metallic=0.3, roughness=0.35),
    "tv_screen": material("Room_TV_Screen", srgb("#050608"), roughness=0.08),
}
rug_mat = material("Room_Rug", srgb("#3a3b40"), roughness=0.95)
use_textures(rug_mat, normal=rug_n, normal_strength=0.8, color=rug_c)

root = empty("Furniture", coll)


def uv(obj, tile=10.0):
    box_uv(obj, tile)
    return obj


def soft(name, size, center, mat, parent, e_vert=0.25, e_horiz=0.25, seg=(28, 14), **kw):
    obj = mesh_object(name, superellipsoid_bm(size, e_vert, e_horiz, seg[0], seg[1], center, **kw), coll, [mat], parent, smooth_angle=70)
    return uv(obj, 4.0)


# ================================================================== scrivania
dx0, dx1 = L.DESK_X
dy0, dy1 = L.DESK_Y
desk = empty("Desk", coll, (L.DESK_CENTER[0], L.DESK_CENTER[1], 0), root)
dw, dd = dx1 - dx0, dy1 - dy0
top = box("Desk_Top", (dw, dd, L.DESK_T), (0, 0, L.DESK_TOP - L.DESK_T / 2), coll, M["walnut"], desk, bevel=0.06, segments=3)
uv(top, 12.0)
# telaio a T in acciaio nero (tipo scrivania regolabile)
leg_h = L.DESK_TOP - L.DESK_T - 0.45
for side, x in (("L", -dw / 2 + 1.6), ("R", dw / 2 - 1.6)):
    box(f"Desk_Leg_{side}_Outer", (0.75, 0.55, leg_h * 0.55), (x, 0.4, 0.45 + leg_h * 0.275), coll, M["steel_black"], desk, bevel=0.04)
    box(f"Desk_Leg_{side}_Inner", (0.62, 0.44, leg_h * 0.5), (x, 0.4, 0.45 + leg_h * 0.75), coll, M["steel_black"], desk, bevel=0.03)
    box(f"Desk_Foot_{side}", (0.75, dd - 1.0, 0.45), (x, 0, 0.225), coll, M["steel_black"], desk, bevel=0.08)
    for k, y in enumerate((-dd / 2 + 0.9, dd / 2 - 0.9)):
        mesh_object(f"Desk_Glide_{side}{k}", cylinder_bm(0.22, 0.08, 20, (x, y, 0.04)), coll, [M["plastic_black"]], desk)
    box(f"Desk_Bracket_{side}", (0.6, dd - 1.4, 0.3), (x, 0, L.DESK_TOP - L.DESK_T - 0.15), coll, M["steel_black"], desk, bevel=0.03)
box("Desk_Crossbar", (dw - 3.8, 0.5, 0.5), (0, 0.4, L.DESK_TOP - L.DESK_T - 0.4), coll, M["steel_black"], desk, bevel=0.04)
# canalina passacavi sotto il piano, verso il muro
tray = box("Desk_Cable_Tray", (dw - 5.0, 1.4, 0.9), (0, dd / 2 - 1.2, L.DESK_TOP - L.DESK_T - 0.75), coll, M["steel_black"], desk, bevel=0.02)

# ================================================================== sedia gaming
# sedia spinta sotto la scrivania: lascia libero il passaggio verso libreria e cassaforte
chair = empty("Chair", coll, (L.DESK_CENTER[0] - 0.8, L.DESK_Y[0] - 1.6, 0), root)
chair.rotation_euler = (0, 0, math.radians(-12))
# base a 5 razze con ruote
bm = bmesh.new()
for k in range(5):
    a = math.radians(90 + 72 * k)
    d = Vector((math.cos(a), math.sin(a), 0))
    p = d * 1.65
    cube_bm((3.3, 0.48, 0.32), (p.x, p.y, 1.15), bm, rot_z=a)
    cylinder_bm(0.2, 0.55, 16, (d.x * 3.2, d.y * 3.2, 0.95), bm=bm)
mesh_object("Chair_Base", bm, coll, [M["plastic_black"]], chair, smooth_angle=40)
add_bevel(bpy.data.objects["Chair_Base"], 0.08, 2)
bm = bmesh.new()
for k in range(5):
    a = math.radians(90 + 72 * k)
    c = Vector((math.cos(a), math.sin(a), 0)) * 3.2
    cylinder_bm(0.34, 0.34, 20, (c.x, c.y, 0.36), axis="X", bm=bm)
mesh_object("Chair_Casters", bm, coll, [M["plastic_black"]], chair)
mesh_object("Chair_Hub", cylinder_bm(0.55, 0.6, 24, (0, 0, 1.25), radius2=0.42), coll, [M["plastic_black"]], chair)
mesh_object("Chair_Gas_Cover", cylinder_bm(0.36, 1.6, 24, (0, 0, 2.3), radius2=0.32), coll, [M["plastic_black"]], chair)
mesh_object("Chair_Gas_Lift", cylinder_bm(0.2, 1.2, 20, (0, 0, 3.6)), coll, [M["chrome"]], chair)
box("Chair_Mechanism", (2.6, 2.8, 0.45), (0, 0.1, 4.2), coll, M["steel_black"], chair, bevel=0.05)
# seduta con bolster laterali
soft("Chair_Seat", (4.6, 5.0, 1.0), (0, 0.15, 4.95), M["leather"], chair, 0.35, 0.22)
soft("Chair_Seat_Insert", (2.6, 4.2, 0.4), (0, 0.25, 5.36), M["leather_red"], chair, 0.4, 0.2)
for s in (-1, 1):
    soft(f"Chair_Seat_Bolster_{'L' if s < 0 else 'R'}", (1.0, 5.0, 1.45), (s * 2.35, 0.15, 5.15), M["leather"], chair, 0.55, 0.3)
# schienale reclinato di 12°: pivot sul retro della seduta
back = empty("Chair_Back", coll, (0, -2.2, 5.1), chair)
back.rotation_euler = (math.radians(-12), 0, 0)
soft("Chair_Backrest", (5.0, 1.1, 8.8), (0, 0, 4.4), M["leather"], back, 0.3, 0.25)
soft("Chair_Back_Insert", (2.6, 0.4, 6.6), (0, 0.52, 3.9), M["leather_red"], back, 0.35, 0.2)
for s in (-1, 1):
    side = "L" if s < 0 else "R"
    soft(f"Chair_Back_Wing_{side}", (1.0, 1.35, 6.4), (s * 2.25, 0.25, 3.6), M["leather"], back, 0.55, 0.35)
    soft(f"Chair_Shoulder_{side}", (1.4, 1.2, 2.0), (s * 2.0, 0.15, 7.6), M["leather"], back, 0.5, 0.35)
# fessure per le cinture tipiche delle sedie da corsa
for s in (-1, 1):
    soft(f"Chair_Belt_Slot_{'L' if s < 0 else 'R'}", (0.8, 0.3, 1.6), (s * 1.3, 0.5, 7.8), M["plastic_black"], back, 0.4, 0.2)
soft("Chair_Head_Pillow", (2.8, 0.9, 1.5), (0, 0.85, 7.0), M["leather"], back, 0.7, 0.35)
soft("Chair_Lumbar_Pillow", (3.0, 1.0, 1.9), (0, 0.8, 1.6), M["leather"], back, 0.7, 0.35)
# braccioli 4D
for s in (-1, 1):
    side = "L" if s < 0 else "R"
    box(f"Chair_Arm_Bracket_{side}", (0.4, 2.2, 0.35), (s * 2.6, -0.2, 4.4), coll, M["steel_black"], chair, bevel=0.04)
    box(f"Chair_Arm_Post_{side}", (0.4, 0.7, 2.5), (s * 2.95, -0.5, 5.6), coll, M["plastic_black"], chair, bevel=0.1)
    soft(f"Chair_Arm_Pad_{side}", (0.95, 2.8, 0.4), (s * 2.95, -0.1, 6.95), M["plastic_black"], chair, 0.4, 0.3)

# ================================================================== letto
bx0, bx1 = L.BED_X
by0, by1 = L.BED_Y
bed = empty("Bed", coll, ((bx0 + bx1) / 2, (by0 + by1) / 2, 0), root)
bw, bl = bx1 - bx0, by1 - by0
frame_top = 2.9
uv(box("Bed_Frame", (bw, bl - 0.8, frame_top - 0.6), (0, -0.4, 0.6 + (frame_top - 0.6) / 2), coll, M["bed_fabric"], bed, bevel=0.25, segments=4), 3.0)
for sx in (-1, 1):
    for sy in (-1, 1):
        mesh_object(f"Bed_Foot_{sx}{sy}", cylinder_bm(0.28, 0.6, 16, (sx * (bw / 2 - 0.9), sy * (bl / 2 - 1.6), 0.3), radius2=0.22), coll, [M["walnut"]], bed)
# testiera imbottita contro la parete nord, a pannelli verticali
head_h = 11.5
uv(box("Bed_Headboard_Base", (bw + 0.4, 0.6, head_h), (0, bl / 2 - 0.3, head_h / 2), coll, M["bed_fabric"], bed, bevel=0.15, segments=3), 3.0)
n_pan = 7
pw = (bw + 0.2) / n_pan
for k in range(n_pan):
    x = -bw / 2 - 0.1 + pw * (k + 0.5)
    soft(f"Bed_Headboard_Panel_{k}", (pw - 0.08, 0.6, head_h - 3.6), (x, bl / 2 - 0.75, 3.4 + (head_h - 3.6) / 2), M["bed_fabric"], bed, 0.12, 0.35, seg=(20, 12))
# materasso
mat_top = frame_top + 2.4
soft("Bed_Mattress", (bw - 0.6, bl - 1.6, 2.4), (0, -0.4, frame_top + 1.2), M["mattress"], bed, 0.12, 0.08, seg=(40, 16))
# lenzuolo e piumone che ricadono sui lati e ai piedi
duvet_d = bl - 5.2  # lascia scoperta la zona dei cuscini


def wrinkle(u, v):
    return 0.08 * math.sin(u * 23 + v * 7) * math.sin(v * 17) + 0.05 * math.sin(u * 51 + 1.3)


sheet = mesh_object(
    "Bed_Sheet",
    draped_bm(bw - 0.6, bl - 1.6, mat_top + 0.03, 0.35, 1.1, res=(30, 40), thickness=0.04, open_sides=("x0", "x1"), center=(0, -0.4)),
    coll,
    [M["sheet"]],
    bed,
    smooth_angle=70,
)
uv(sheet, 4.0)
duvet = mesh_object(
    "Bed_Duvet",
    draped_bm(bw - 0.6, duvet_d, mat_top + 0.35, 0.7, 2.6, res=(44, 52), thickness=0.35, wrinkle=wrinkle, open_sides=("x0", "x1", "y0"), center=(0, -bl / 2 + 0.8 + duvet_d / 2)),
    coll,
    [M["duvet"]],
    bed,
    smooth_angle=80,
)
uv(duvet, 4.0)
# risvolto del piumone verso i cuscini
soft("Bed_Duvet_Fold", (bw - 0.4, 1.4, 0.6), (0, -bl / 2 + 0.8 + duvet_d - 0.3, mat_top + 0.55), M["sheet"], bed, 0.7, 0.12, seg=(36, 10))
# cuscini (forma a cuscino: profilo pizzicato sui bordi)
for k, x in enumerate((-bw / 4 + 0.1, bw / 4 - 0.1)):
    p = soft(f"Bed_Pillow_{k}", (bw / 2 - 1.0, 4.2, 1.9), (0, 0, 0), M["sheet"], bed, 0.75, 0.3, seg=(32, 14))
    p.location = (x, bl / 2 - 3.0, mat_top + 1.05)  # ruota attorno al proprio centro
    p.rotation_euler = (math.radians(-22), 0, math.radians(rng.uniform(-3, 3)))
# plaid piegato ai piedi del letto
throw = mesh_object(
    "Bed_Throw",
    draped_bm(bw - 0.6, 3.4, mat_top + 0.74, 1.0, 2.0, res=(48, 10), thickness=0.12, wrinkle=lambda u, v: 0.05 * math.sin(u * 40), open_sides=("x0", "x1"), center=(0, -bl / 2 + 3.2)),
    coll,
    [M["throw"]],
    bed,
    smooth_angle=80,
)
uv(throw, 3.0)

# ================================================================== comodino
nx0, nx1 = L.NIGHT_X
ny0, ny1 = L.NIGHT_Y
night = empty("Nightstand", coll, ((nx0 + nx1) / 2, (ny0 + ny1) / 2, 0), root)
nw, nd = nx1 - nx0, ny1 - ny0
uv(box("Nightstand_Top", (nw, nd, 0.25), (0, 0, L.NIGHT_H - 0.125), coll, M["oak"], night, bevel=0.03), 6.0)
uv(box("Nightstand_Body", (nw - 0.1, nd - 0.1, 3.4), (0, 0, L.NIGHT_H - 0.25 - 1.7), coll, M["oak"], night, bevel=0.02), 6.0)
drawer = box("Nightstand_Drawer", (nw - 0.4, 0.12, 1.5), (0, -nd / 2, L.NIGHT_H - 1.2), coll, M["oak"], night, bevel=0.02)
uv(drawer, 6.0)
box("Nightstand_Handle", (1.2, 0.18, 0.12), (0, -nd / 2 - 0.12, L.NIGHT_H - 1.0), coll, M["steel_black"], night, bevel=0.03)
box("Nightstand_Shelf_Shadow", (nw - 0.5, 0.05, 1.3), (0, -nd / 2 + 0.06, L.NIGHT_H - 3.0), coll, M["matte_black"], night, bevel=0)
for sx in (-1, 1):
    for sy in (-1, 1):
        leg = mesh_object(f"Nightstand_Leg_{sx}{sy}", cylinder_bm(0.16, 1.6, 12, (sx * (nw / 2 - 0.4), sy * (nd / 2 - 0.4), 0.8), radius2=0.1), coll, [M["walnut"]], night)

# ================================================================== mobile TV + TV a parete
tx0, tx1, ty0, ty1, th = L.TV_STAND
stand = empty("TV_Stand", coll, ((tx0 + tx1) / 2, (ty0 + ty1) / 2, 0), root)
sw, sd = ty1 - ty0, tx1 - tx0
uv(box("TV_Stand_Body", (sd, sw, th - 0.9), (0, 0, 0.9 + (th - 0.9) / 2), coll, M["matte_black"], stand, bevel=0.04), 8.0)
uv(box("TV_Stand_Top", (sd + 0.1, sw + 0.1, 0.2), (0, 0, th + 0.1), coll, M["walnut"], stand, bevel=0.03), 12.0)
# ante a doghe verticali (fronte verso +X)
for k in range(3):
    y = -sw / 2 + sw / 3 * (k + 0.5)
    for j in range(14):
        yy = y - sw / 6 + 0.35 + j * (sw / 3 - 0.7) / 13
        box(f"TV_Stand_Slat_{k}_{j}", (0.15, 0.22, th - 1.5), (sd / 2 + 0.05, yy, 0.9 + (th - 0.9) / 2), coll, M["walnut"], stand, bevel=0)
for sy in (-1, 1):
    for sx in (-1, 1):
        mesh_object(f"TV_Stand_Leg_{sx}{sy}", cylinder_bm(0.14, 0.9, 12, (sx * (sd / 2 - 0.5), sy * (sw / 2 - 0.8), 0.45), radius2=0.1), coll, [M["steel_black"]], stand)

tv_w, tv_h = 12.18, 6.85  # 55" 16:9
tv = empty("TV", coll, (L.X0 + 0.55, L.TV_Y, 12.0), root)
box("TV_Body", (0.25, tv_w, tv_h), (0.08, 0, 0), coll, M["tv_bezel"], tv, bevel=0.03)
box("TV_Back_Bump", (0.5, tv_w * 0.6, tv_h * 0.55), (-0.25, 0, -0.6), coll, M["tv_bezel"], tv, bevel=0.1)
box("TV_Wall_Mount", (0.5, 3.0, 2.0), (-0.45, 0, 0), coll, M["steel_black"], tv, bevel=0.02)
screen = mesh_object("TV_Screen", cube_bm((0.01, tv_w - 0.12, tv_h - 0.12), (0.215, 0, 0)), coll, [M["tv_screen"]], tv, smooth_angle=None)
uvl = screen.data.uv_layers.new(name="UVMap")
for poly in screen.data.polygons:
    for li in poly.loop_indices:
        co = screen.data.vertices[screen.data.loops[li].vertex_index].co
        uvl.data[li].uv = (0.5 + co.y / (tv_w - 0.12), 0.5 + co.z / (tv_h - 0.12))
box("TV_Logo_Strip", (0.04, 0.6, 0.06), (0.22, 0, -tv_h / 2 + 0.2), coll, M["chrome"], tv, bevel=0)
box("TV_LED", (0.04, 0.08, 0.04), (0.22, tv_w / 2 - 0.6, -tv_h / 2 + 0.1), coll, material("Room_TV_Standby", (0.2, 0, 0), emission=(1, 0.05, 0.02), strength=2.0), tv, bevel=0)

# ================================================================== libreria (angolo nord-ovest)
sx0, sx1, sy0, sy1, sh = L.SHELF
shelf = empty("Bookshelf", coll, ((sx0 + sx1) / 2, (sy0 + sy1) / 2, 0), root)
swid, sdep = sy1 - sy0, sx1 - sx0
t = 0.25
for side, y in (("A", -swid / 2 + t / 2), ("B", swid / 2 - t / 2), ("Mid", 0)):
    uv(box(f"Bookshelf_Side_{side}", (sdep, t, sh), (0, y, sh / 2), coll, M["oak"], shelf, bevel=0.02), 6.0)
levels = [0.6, 3.9, 7.3, 10.7, 14.1, sh - t / 2]
for k, z in enumerate(levels):
    uv(box(f"Bookshelf_Board_{k}", (sdep, swid, t), (0, 0, z), coll, M["oak"], shelf, bevel=0.02), 6.0)
box("Bookshelf_Back", (0.1, swid, sh), (-sdep / 2 + 0.05, 0, sh / 2), coll, M["white"], shelf, bevel=0)
box("Bookshelf_Plinth", (sdep - 0.3, swid - 0.3, 0.5), (0, 0, 0.25), coll, M["matte_black"], shelf, bevel=0)
# libri: un'unica mesh con più materiali
palette = ["#8c1c22", "#1d3a6b", "#2c5e3f", "#d8c8a8", "#20232a", "#c7792b", "#5b2a6e", "#e9e6df", "#2f6f86"]
book_mats = [material(f"Room_Book_{i}", srgb(c), roughness=0.6) for i, c in enumerate(palette)]
bm = bmesh.new()
mat_index = []
for k in range(len(levels) - 1):
    z0 = levels[k] + t / 2
    gap = levels[k + 1] - levels[k] - t
    for half in (-1, 1):
        y = (-swid / 2 + t) if half < 0 else t / 2
        y_end = -t / 2 if half < 0 else swid / 2 - t
        # una sezione su tre resta mezza vuota per i props
        if k == 0 and half < 0:
            continue  # vano della cassaforte (props.py)
        fill = 1.0 if (k + (half > 0)) % 3 else 0.55
        limit = y + (y_end - y) * fill
        while y < limit - 0.3:
            if rng.random() < 0.1:
                # pila orizzontale
                n = rng.randint(2, 4)
                w = rng.uniform(2.0, 2.6)
                zz = z0
                for _ in range(n):
                    hh = rng.uniform(0.22, 0.4)
                    d = rng.uniform(1.6, 2.4)
                    before = len(bm.faces)
                    cube_bm((d, w - rng.uniform(0, 0.3), hh), (-sdep / 2 + 0.2 + d / 2, y + w / 2, zz + hh / 2), bm)
                    mat_index.append((before, len(bm.faces), rng.randrange(len(book_mats))))
                    zz += hh
                y += w + 0.15
                continue
            bw_ = rng.uniform(0.22, 0.55)
            bh = min(gap - 0.25, rng.uniform(1.9, 2.9))
            bd = rng.uniform(1.7, 2.6)
            tilt = math.radians(rng.uniform(5, 14)) if rng.random() < 0.06 and y > -swid / 2 + 1 else 0.0
            before = len(bm.faces)
            res = bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=Vector((bd, bw_, bh)), verts=res["verts"])
            if tilt:
                bmesh.ops.translate(bm, vec=Vector((0, bw_ / 2, bh / 2)), verts=res["verts"])
                bmesh.ops.rotate(bm, verts=res["verts"], matrix=Matrix.Rotation(tilt, 3, "X"))
                bmesh.ops.translate(bm, vec=Vector((-sdep / 2 + 0.2 + bd / 2, y, z0)), verts=res["verts"])
                y += bh * math.sin(tilt)
            else:
                bmesh.ops.translate(bm, vec=Vector((-sdep / 2 + 0.2 + bd / 2, y + bw_ / 2, z0 + bh / 2)), verts=res["verts"])
            mat_index.append((before, len(bm.faces), rng.randrange(len(book_mats))))
            y += bw_ + rng.uniform(0.0, 0.04)
bm.faces.ensure_lookup_table()
for a, b, m in mat_index:
    for f in bm.faces[a:b]:
        f.material_index = m
books = mesh_object("Bookshelf_Books", bm, coll, book_mats, shelf, smooth_angle=None)
add_bevel(books, 0.02, 1)

# ================================================================== armadio (angolo sud-ovest)
wx0, wx1, wy0, wy1, wh = L.WARDROBE
ward = empty("Wardrobe", coll, ((wx0 + wx1) / 2, (wy0 + wy1) / 2, 0), root)
ww, wd = wx1 - wx0, wy1 - wy0
box("Wardrobe_Carcass", (ww, wd - 0.25, wh - 0.8), (0, -0.125, 0.8 + (wh - 0.8) / 2), coll, M["white"], ward, bevel=0.02)
box("Wardrobe_Plinth", (ww - 0.4, wd - 0.6, 0.8), (0, -0.4, 0.4), coll, M["matte_black"], ward, bevel=0)
n_doors = 3
dwid = (ww - 0.1) / n_doors
for k in range(n_doors):
    x = -ww / 2 + 0.05 + dwid * (k + 0.5)
    box(f"Wardrobe_Door_{k}", (dwid - 0.06, 0.22, wh - 0.9), (x, wd / 2 - 0.11, 0.85 + (wh - 0.9) / 2), coll, M["white"], ward, bevel=0.03)
    hx = x + (dwid / 2 - 0.5) * (1 if k % 2 == 0 else -1)
    box(f"Wardrobe_Handle_{k}", (0.14, 0.3, 5.0), (hx, wd / 2 + 0.12, 10.5), coll, M["steel_black"], ward, bevel=0.05)
    for z in (9.0, 12.0):
        box(f"Wardrobe_Handle_{k}_Foot{z:.0f}", (0.12, 0.25, 0.14), (hx, wd / 2 + 0.02, z), coll, M["steel_black"], ward, bevel=0.02)

# ================================================================== tappeto e pouf
rug = mesh_object("Rug", prism_bm(rounded_rect(17.0, 11.5, 0.25, 4), 0.08, (0, 0, 0.04), plane="XY"), coll, [rug_mat], root, smooth_angle=None)
rug.location = (0.5, -3.5, 0)
uvr = rug.data.uv_layers.new(name="UVMap")
for poly in rug.data.polygons:
    for li in poly.loop_indices:
        co = rug.data.vertices[rug.data.loops[li].vertex_index].co
        uvr.data[li].uv = (co.x / 17.0 + 0.5, co.y / 11.5 + 0.5)

bean = empty("Beanbag", coll, (L.X0 + 13.0, L.TV_Y + 1.0, 0), root)


def bean_squash(x, y, z):
    r2 = x * x + y * y
    # seduta incavata in alto e base che si allarga a terra
    z = z - 0.35 * max(0.0, 1 - r2) * (z > 0)
    k = 1 + 0.12 * max(0.0, -z)
    return x * k, y * k, z


soft("Beanbag_Body", (7.4, 7.0, 5.6), (0, 0, 2.8), M["beanbag"], bean, 0.9, 1.0, seg=(36, 18), flat_bottom=0.04, squash=bean_squash)

_result = {"objects": len(coll.objects)}
