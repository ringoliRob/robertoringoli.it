"""Case mid-tower nero in vetro temperato panoramico (fronte + lato senza montante).

Coordinate del case (Blender, Z-up); origine = punto di riferimento comune a tutte le parti
(il case è più largo verso il vetro, quindi non è centrato in X):
  X: -1.15 (vetro laterale) .. +1.15 (pannello destro)   — misure in layout.py
  Y: -2.10 (fronte in vetro) .. +2.40 (retro)
  Z:  0 .. 4.66 (piedini sotto lo zero)
Radici: "Case" (scocca, ventole, I/O), "Glass_Panel" (vetro laterale, si smonta),
"Power_Button" (tasto di accensione, cliccabile dal sito).
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
    build_fan,
    box,
    box_uv,
    circle,
    cube_bm,
    cylinder_bm,
    empty,
    fan_rotor_bm,
    glass_material,
    grain_height,
    hex_mesh_mask,
    material,
    mesh_object,
    normal_from_height,
    prism_bm,
    reset_collection,
    ring_prism_bm,
    rounded_rect,
    roughness_map,
    save_image,
    save_rgba,
    srgb,
    torus_bm,
    triangle_count,
    use_alpha_mask,
    use_textures,
)

import bmesh  # noqa: E402
import layout  # noqa: E402

importlib.reload(layout)

coll = reset_collection("Case")

M = {
    "steel": material("Case_Steel", srgb("#121317"), metallic=0.7, roughness=0.45),
    "alu": material("Case_Frame", srgb("#17181c"), metallic=0.85, roughness=0.32),
    "mesh": material("Case_Mesh", srgb("#0b0c0e"), metallic=0.6, roughness=0.5),
    "glass": glass_material("Glass_Front", "#0b0d12", 0.16),
    "glass_side": glass_material("Glass_Side", "#0b0d12", 0.16),
    "frit": material("Glass_Frit", srgb("#050506"), metallic=0.0, roughness=0.12),
    "rubber": material("Rubber", srgb("#0d0d0f"), metallic=0.0, roughness=0.85),
    "plastic": material("Case_Plastic", srgb("#0a0b0d"), metallic=0.0, roughness=0.55),
    "fan_frame": material("Fan_Frame", srgb("#101114"), metallic=0.0, roughness=0.5),
    "fan_blade": material("RGB_Fan_Blade", srgb("#d9dbe2"), metallic=0.0, roughness=0.35, emission=(1, 1, 1), strength=0.6),
    "fan_ring": material("RGB_Fan_Ring", srgb("#e8e8ee"), metallic=0.0, roughness=0.3, emission=(1, 1, 1), strength=3.0),
    "brass": material("Brass", srgb("#b08d57"), metallic=1.0, roughness=0.3),
    "chrome": material("Screw_Silver", srgb("#c9ccd2"), metallic=1.0, roughness=0.22),
    "port": material("Port_Nickel", srgb("#d9dce2"), metallic=1.0, roughness=0.18),
    "usb_blue": material("USB_Blue", srgb("#1f4fd8"), metallic=0.0, roughness=0.45),
    "led": material("LED_Power", srgb("#0a0a0c"), roughness=0.3, emission=(0.56, 0.83, 1.0), strength=2.0),
}

# misure in layout.py: mid-tower compatto 450 x 230 x 466 mm (come un Corsair 4000D)
XL, XR = layout.CASE_XL, layout.CASE_XR
YF, YB = layout.CASE_YF, layout.CASE_YB
H = layout.CASE_H
W, D = XR - XL, YB - YF
CX, CY = (XL + XR) / 2, (YF + YB) / 2
GLASS = 0.04
FAN = 1.4  # ventole da 140 mm

case = empty("Case", coll)

# ------------------------------------------------------------------ scocca
box("Case_Bottom", (W, D, 0.06), (CX, CY, 0.03), coll, M["steel"], case, bevel=0.01)
for x in (CX - 0.75, CX + 0.75):
    for y in (YF + 0.55, YB - 0.55):
        box(f"Case_Foot_{'L' if x < 0 else 'R'}{'F' if y < 0 else 'B'}", (0.34, 0.58, 0.1), (x, y, -0.05), coll, M["rubber"], case, bevel=0.025)

# pannello superiore con apertura per il filtro antipolvere (sopra il radiatore)
TOP_OPEN = (W - 0.4, YF + 0.45, YB - 0.3)  # larghezza, inizio, fine in Y
top_len, top_cy = TOP_OPEN[2] - TOP_OPEN[1], (TOP_OPEN[1] + TOP_OPEN[2]) / 2
top = box("Case_Top", (W, D, 0.06), (CX, CY, H - 0.03), coll, M["steel"], case, bevel=0)
cut = mesh_object("_top_cut", cube_bm((TOP_OPEN[0], top_len, 0.3), (CX, top_cy, H - 0.03)), coll, [M["steel"]], case, smooth_angle=None)
boolean_cut(top, [cut])
add_bevel(top, 0.01, 2)
box("Case_Top_Filter", (TOP_OPEN[0] + 0.02, top_len + 0.02, 0.012), (CX, top_cy, H - 0.012), coll, M["mesh"], case, bevel=0)
hw, hl = TOP_OPEN[0] / 2, top_len / 2
rim_outer = [(CX - hw - 0.04, top_cy - hl - 0.04), (CX + hw + 0.04, top_cy - hl - 0.04), (CX + hw + 0.04, top_cy + hl + 0.04), (CX - hw - 0.04, top_cy + hl + 0.04)]
rim_inner = [(CX - hw, top_cy - hl), (CX + hw, top_cy - hl), (CX + hw, top_cy + hl), (CX - hw, top_cy + hl)]
mesh_object("Case_Top_Filter_Rim", ring_prism_bm(rim_outer, rim_inner, 0.008, (0, 0, H - 0.002), "XY"), coll, [M["alu"]], case, smooth_angle=None)

# pannello destro pieno, lato scheda madre
box("Case_Right", (0.06, D - 0.12, H - 0.12), (XR - 0.03, CY, H / 2), coll, M["steel"], case, bevel=0.008)

# montanti in alluminio: niente montante nell'angolo anteriore sinistro (vetro su vetro)
for name, x, y in (("Pillar_FR", XR - 0.03, YF + 0.03), ("Pillar_BL", XL + 0.03, YB - 0.03), ("Pillar_BR", XR - 0.03, YB - 0.03)):
    box(f"Case_{name}", (0.06, 0.06, H - 0.12), (x, y, H / 2), coll, M["alu"], case, bevel=0.01)

# ------------------------------------------------------------------ retro
REAR_Y = YB - 0.0275  # pannello posteriore 2.345..2.40
SLOT_Z = layout.SLOT_Z  # passo 20.32 mm, allineati agli slot PCIe della scheda madre
SLOT_X = (-0.33, 0.88)
IO = layout.IO_CUT  # I/O posteriore ATX 158.75 x 44.45 mm
REAR_FAN = ((XL + 0.06 + IO[0]) / 2, H - 0.06 - FAN / 2 - 0.03)  # 140 mm, tra il bordo e l'I/O
PSU_CUT = (*layout.PSU_X, *layout.PSU_Z)  # apertura per il retro dell'alimentatore

rear = box("Case_Rear", (W - 0.12, 0.055, H - 0.12), (CX, REAR_Y, H / 2), coll, M["steel"], case, bevel=0)
bm = bmesh.new()
for z in SLOT_Z:
    cube_bm((SLOT_X[1] - SLOT_X[0], 0.3, 0.15), ((SLOT_X[0] + SLOT_X[1]) / 2, REAR_Y, z), bm)
cube_bm((IO[1] - IO[0], 0.3, IO[3] - IO[2]), ((IO[0] + IO[1]) / 2, REAR_Y, (IO[2] + IO[3]) / 2), bm)
cube_bm((PSU_CUT[1] - PSU_CUT[0], 0.3, PSU_CUT[3] - PSU_CUT[2]), ((PSU_CUT[0] + PSU_CUT[1]) / 2, REAR_Y, (PSU_CUT[2] + PSU_CUT[3]) / 2), bm)
prism_bm(circle(FAN / 2 - 0.03, 72, REAR_FAN[0], REAR_FAN[1]), 0.3, (0, REAR_Y, 0), bm=bm)
cut = mesh_object("_rear_cut", bm, coll, [M["steel"]], case, smooth_angle=None)
boolean_cut(rear, [cut])
add_bevel(rear, 0.004, 1, 40)

# griglia esagonale della ventola posteriore
box("Case_Rear_Fan_Grill", (FAN, 0.008, FAN), (REAR_FAN[0], YB - 0.004, REAR_FAN[1]), coll, M["mesh"], case, bevel=0)

# copri-slot forati (gli slot 1-2 li chiude la staffa della GPU)
for k, z in enumerate(SLOT_Z[2:], start=3):
    cover = box(f"Case_Slot_Cover_{k}", (SLOT_X[1] - SLOT_X[0] + 0.06, 0.012, 0.18), ((SLOT_X[0] + SLOT_X[1]) / 2 + 0.01, YB + 0.008, z), coll, M["steel"], case, bevel=0)
    bm = bmesh.new()
    for s in range(7):
        bm = cube_bm((0.11, 0.1, 0.03), (-0.05 + s * 0.15, YB + 0.008, z), bm)
    vent = mesh_object(f"_slot_vent_{k}", bm, coll, [M["steel"]], case, smooth_angle=None)
    boolean_cut(cover, [vent])
bm = bmesh.new()
for z in SLOT_Z[2:]:
    cylinder_bm(0.024, 0.02, 20, (-0.37, YB + 0.024, z), axis="Y", bm=bm)
mesh_object("Case_Slot_Screws", bm, coll, [M["chrome"]], case, smooth_angle=40)
# viti a testa zigrinata che tengono il pannello destro
bm = bmesh.new()
for z in (1.0, H - 0.8):
    cylinder_bm(0.032, 0.03, 24, (XR - 0.09, YB + 0.02, z), axis="Y", bm=bm)
    for k in range(18):
        a = k * 2 * math.pi / 18
        cube_bm((0.008, 0.026, 0.008), (XR - 0.09 + math.cos(a) * 0.033, YB + 0.02, z + math.sin(a) * 0.033), bm)
mesh_object("Case_Thumbscrews", bm, coll, [M["chrome"]], case, smooth_angle=40)

# ------------------------------------------------------------------ fronte: vetro + presa d'aria laterale
front_w = W - 0.2  # il vetro si ferma prima del montante destro
front = box("Case_Front_Glass", (front_w, GLASS, H - 0.16), (XL + front_w / 2, YF + GLASS / 2, H / 2), coll, M["glass"], case, bevel=0.004, segments=1)
box("Case_Front_Intake", (0.15, 0.03, H - 0.16), (XR - 0.135, YF + 0.02, H / 2), coll, M["mesh"], case, bevel=0)


def frit(name, w, h, band, center, plane, parent):
    """Bordo nero serigrafato sul lato interno del vetro."""
    outer = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    inner = [(-w / 2 + band, -h / 2 + band), (w / 2 - band, -h / 2 + band), (w / 2 - band, h / 2 - band), (-w / 2 + band, h / 2 - band)]
    return mesh_object(name, ring_prism_bm(outer, inner, 0.002, center, plane), coll, [M["frit"]], parent, smooth_angle=None)


frit("Case_Front_Frit", front_w, H - 0.16, 0.11, (XL + front_w / 2, YF + GLASS + 0.001, H / 2), "XZ", case)

# ------------------------------------------------------------------ vetro laterale (si smonta)
glass_root = empty("Glass_Panel", coll, location=(XL + GLASS / 2, 0, H / 2))
# dal retro del vetro frontale al montante posteriore
side_d = (YB - 0.06) - (YF + GLASS)
side_cy = ((YB - 0.06) + (YF + GLASS)) / 2
box("Glass_Side", (GLASS, side_d, H - 0.16), (0, side_cy, 0), coll, M["glass_side"], glass_root, bevel=0.004, segments=1)
frit("Glass_Side_Frit", side_d, H - 0.16, 0.11, (GLASS / 2 + 0.001, side_cy, 0), "YZ", glass_root)

# ------------------------------------------------------------------ interno
# vassoio della scheda madre con passacavi in gomma
tray = box("Case_Tray", (0.03, D - 0.12, H - 1.24), (1.045, CY, 1.18 + (H - 1.24) / 2), coll, M["steel"], case, bevel=0)
bm = bmesh.new()
# subito davanti al bordo della scheda madre: in basso (pannello frontale, USB), al centro
# all'altezza del 24 pin, in alto per le ventole
GROMMETS = [(-0.52, 1.9), (-0.52, layout.ATX24_Z), (-0.52, 4.12)]
for y, z in GROMMETS:
    prism_bm(rounded_rect(0.24, 0.62, 0.1, 6, y, z), 0.2, (1.045, 0, 0), plane="YZ", bm=bm)
# fori per la scheda madre: 9 posizioni ATX con distanziali + fori liberi per micro-ATX / mini-ITX
STANDOFFS = layout.STANDOFFS
SPARE_HOLES = layout.SPARE_HOLES
# apertura in alto a sinistra per il cavo EPS della CPU e la ventola posteriore
prism_bm(rounded_rect(0.62, 0.1, 0.045, 6, layout.EPS_Y, 4.51), 0.2, (1.045, 0, 0), plane="YZ", bm=bm)
for y, z in STANDOFFS + SPARE_HOLES:
    prism_bm(circle(0.022, 16, y, z), 0.2, (1.045, 0, 0), plane="YZ", bm=bm)
cut = mesh_object("_tray_cut", bm, coll, [M["steel"]], case, smooth_angle=None)
boolean_cut(tray, [cut])
bm = bmesh.new()
hole = bmesh.new()
for y, z in STANDOFFS:
    hexagon = [(y + 0.032 * math.cos(math.radians(60 * k)), z + 0.032 * math.sin(math.radians(60 * k))) for k in range(6)]
    prism_bm(hexagon, 0.035, (1.0125, 0, 0), plane="YZ", bm=bm)
    cylinder_bm(0.013, 0.004, 16, (0.9935, y, z), axis="X", bm=hole)
mesh_object("Case_Standoffs", bm, coll, [M["brass"]], case, smooth_angle=None)
mesh_object("Case_Standoffs_Thread", hole, coll, [M["plastic"]], case, smooth_angle=None)
for i, (y, z) in enumerate(GROMMETS):
    outer = rounded_rect(0.27, 0.65, 0.115, 6, y, z)
    inner = rounded_rect(0.2, 0.58, 0.08, 6, y, z)
    mesh_object(f"Case_Grommet_{i + 1}", ring_prism_bm(outer, inner, 0.045, (1.04, 0, 0), "YZ"), coll, [M["rubber"]], case, smooth_angle=30)
    # membrana con il taglio centrale
    bm = bmesh.new()
    for s in (-1, 1):
        cube_bm((0.006, 0.098, 0.56), (1.035, y + s * 0.051, z), bm)
    mesh_object(f"Case_Grommet_{i + 1}_Flaps", bm, coll, [M["rubber"]], case, smooth_angle=None)

# copertura dell'alimentatore: finestrella sul logo della PSU e prese d'aria sotto le ventole
SHROUD_TOP = layout.SHROUD_TOP
FRONT_FAN_Y = YF + GLASS + 0.17
# la copertura finisce dietro le ventole frontali: così la ventola in basso arriva fino al fondo
SHROUD_FRONT = FRONT_FAN_Y + 0.125 + 0.06
SHROUD_LEN = (YB - 0.06) - SHROUD_FRONT
SHROUD_Y = (SHROUD_FRONT + YB - 0.06) / 2
shroud_top = box("Case_Shroud_Top", (1.03 - (XL + 0.06), SHROUD_LEN, 0.06), ((1.03 + XL + 0.06) / 2, SHROUD_Y, SHROUD_TOP - 0.03), coll, M["steel"], case, bevel=0)
# divisorio forato: zona in rete per due ventole extra (sotto la scheda madre) con asole 120/140 mm
FAN_ZONE = (-0.15, (SHROUD_FRONT + 0.08 + 0.45) / 2, 1.0, 0.45 - (SHROUD_FRONT + 0.08))  # x, y, larghezza, lunghezza
SHROUD_FANS = (-1.0, 0.02)
bm = cube_bm((FAN_ZONE[2], FAN_ZONE[3], 0.3), (FAN_ZONE[0], FAN_ZONE[1], SHROUD_TOP))
for cy in SHROUD_FANS:
    for sx in (-1, 1):
        for sy in (-1, 1):
            for a in (0.525, 0.62):
                prism_bm(circle(0.024, 16, FAN_ZONE[0] + sx * a, cy + sy * a), 0.3, (0, 0, SHROUD_TOP), plane="XY", bm=bm)
prism_bm(rounded_rect(0.16, 0.42, 0.07, 6, *layout.SHROUD_GROMMET), 0.3, (0, 0, SHROUD_TOP), plane="XY", bm=bm)
cut = mesh_object("_shroud_top_cut", bm, coll, [M["steel"]], case, smooth_angle=None)
boolean_cut(shroud_top, [cut])
add_bevel(shroud_top, 0.006, 1, 40)
box("Case_Shroud_Vent", (FAN_ZONE[2] + 0.02, FAN_ZONE[3] + 0.02, 0.01), (FAN_ZONE[0], FAN_ZONE[1], SHROUD_TOP - 0.012), coll, M["mesh"], case, bevel=0)
mesh_object(
    "Case_Shroud_Grommet",
    ring_prism_bm(rounded_rect(0.19, 0.45, 0.085, 6, *layout.SHROUD_GROMMET), rounded_rect(0.15, 0.41, 0.065, 6, *layout.SHROUD_GROMMET), 0.07, (0, 0, SHROUD_TOP - 0.01), "XY"),
    coll,
    [M["rubber"]],
    case,
    smooth_angle=30,
)
shroud_side = box("Case_Shroud_Side", (0.05, SHROUD_LEN, SHROUD_TOP - 0.06), (XL + 0.085, SHROUD_Y, 0.06 + (SHROUD_TOP - 0.06) / 2), coll, M["steel"], case, bevel=0)
cut = mesh_object("_shroud_window", prism_bm(rounded_rect(1.5, 0.72, 0.06, 6, 1.42, 0.6), 0.3, (XL + 0.085, 0, 0), plane="YZ"), coll, [M["steel"]], case, smooth_angle=None)
boolean_cut(shroud_side, [cut])
add_bevel(shroud_side, 0.006, 1, 40)
# parete frontale della copertura in lamiera forata, dietro la ventola in basso
box("Case_Shroud_Front_Vent", (1.03 - (XL + 0.06), 0.012, SHROUD_TOP - 0.06), ((1.03 + XL + 0.06) / 2, SHROUD_FRONT, 0.06 + (SHROUD_TOP - 0.06) / 2), coll, M["mesh"], case, bevel=0)

# ------------------------------------------------------------------ ventole RGB




# tre ventole da 140 mm su tutto il pannello frontale
FRONT_Z0 = 0.14
for i in range(3):
    z = FRONT_Z0 + FAN / 2 + i * (FAN + 0.05)
    build_fan(f"Front_{i + 1}", coll, case, M, ((XL + GLASS + 0.95) / 2, FRONT_FAN_Y, z), (math.pi / 2, 0, 0), size=FAN)
build_fan("Rear", coll, case, M, (REAR_FAN[0], YB - 0.18, REAR_FAN[1]), (-math.pi / 2, 0, 0), size=FAN)

# ------------------------------------------------------------------ I/O frontale sul pannello superiore
IO_Y = YF + 0.2
box("Case_TopIO_Plate", (1.5, 0.22, 0.008), (0.25, IO_Y, H + 0.004), coll, M["plastic"], case, bevel=0.003, segments=1)
bm = bmesh.new()
ports_inner = bmesh.new()
for x in (-0.2, 0.0):  # USB-A
    prism_bm([(u + x, v + IO_Y) for u, v in [(-0.065, -0.025), (0.065, -0.025), (0.065, 0.025), (-0.065, 0.025)]], 0.012, (0, 0, H + 0.006), plane="XY", bm=bm)
    cube_bm((0.1, 0.018, 0.004), (x, IO_Y + 0.006, H + 0.0125), ports_inner)
prism_bm([(u + 0.18, v + IO_Y) for u, v in rounded_rect(0.09, 0.034, 0.016, 6)], 0.012, (0, 0, H + 0.006), plane="XY", bm=bm)  # USB-C
cylinder_bm(0.022, 0.012, 24, (0.33, IO_Y, H + 0.006), bm=bm)  # jack audio
mesh_object("Case_TopIO_Ports", bm, coll, [M["port"]], case, smooth_angle=None)
cube_bm((0.06, 0.012, 0.004), (0.18, IO_Y, H + 0.0125), ports_inner)
cylinder_bm(0.012, 0.004, 16, (0.33, IO_Y, H + 0.0125), bm=ports_inner)
mesh_object("Case_TopIO_Ports_Inner", ports_inner, coll, [M["plastic"]], case, smooth_angle=None)
bm = bmesh.new()
for x in (-0.2, 0.0):
    cube_bm((0.1, 0.014, 0.003), (x, IO_Y - 0.008, H + 0.012), bm)
mesh_object("Case_TopIO_USB_Tongues", bm, coll, [M["usb_blue"]], case, smooth_angle=None)
reset = mesh_object("Case_Reset_Button", cylinder_bm(0.035, 0.016, 24), coll, [M["alu"]], case, smooth_angle=40)
reset.location = (0.46, IO_Y, H + 0.012)

power_root = empty("Power_Button", coll, location=(0.7, IO_Y, H + 0.008))
button = mesh_object("Power_Button_Cap", cylinder_bm(0.075, 0.02, 40, radius2=0.07), coll, [M["alu"]], power_root, smooth_angle=40)
button.location = (0, 0, 0.012)
add_bevel(button, 0.004, 2, 40)
mesh_object("Power_Button_LED", ring_prism_bm(circle(0.092, 48), circle(0.08, 48), 0.01, (0, 0, 0.004), "XY"), coll, [M["led"]], power_root, smooth_angle=60)
symbol = bmesh.new()
pts = [(0.03 * math.cos(math.radians(a)), 0.03 * math.sin(math.radians(a))) for a in range(120, 421, 15)]
for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    cube_bm((math.hypot(x1 - x0, y1 - y0) + 0.002, 0.007, 0.002), (cx, cy, 0.0235), symbol, rot_z=math.atan2(y1 - y0, x1 - x0))
cube_bm((0.007, 0.034, 0.002), (0, 0.02, 0.0235), symbol)
mesh_object("Power_Button_Symbol", symbol, coll, [M["led"]], power_root, smooth_angle=None)

# ------------------------------------------------------------------ texture
height, mid, coarse = grain_height(512, seed=11)
grain_n = save_image("tex_grain_normal", normal_from_height(height, 2.2))
rough_steel = save_image("tex_rough_case_steel", roughness_map(mid, coarse, 0.48, 0.07))
rough_metal = save_image("tex_rough_metal", roughness_map(mid, coarse, 0.27, 0.06))
rough_plastic = save_image("tex_rough_plastic", roughness_map(mid, coarse, 0.55, 0.08))
mesh_mask = save_rgba("tex_hex_mesh", hex_mesh_mask(512, 7, 0.82))

use_textures(M["steel"], rough_steel, grain_n, 0.3)
use_textures(M["alu"], rough_metal, grain_n, 0.18)
use_textures(M["fan_frame"], rough_plastic, grain_n, 0.12)
use_textures(M["plastic"], rough_plastic)
use_textures(M["rubber"], rough_plastic, grain_n, 0.2)
use_alpha_mask(M["mesh"], mesh_mask)

for obj in coll.all_objects:
    box_uv(obj, 0.12 if "Grill" in obj.name or "Filter" in obj.name or "Vent" in obj.name or "Intake" in obj.name else 0.25)

parts = [o for o in coll.all_objects]
per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result = {
    "objects": len(parts),
    "triangles": sum(per_object.values()),
    "top": sorted(per_object.items(), key=lambda kv: -kv[1])[:6],
}
