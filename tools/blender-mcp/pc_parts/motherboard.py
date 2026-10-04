"""Scheda madre ATX nera: socket, VRM alettati, slot RAM/PCIe, connettori e I/O posteriore.

Coordinate del case (vedi case.py). La scheda sta sul vassoio, faccia rivolta al vetro (-X):
  ATX reale 305 x 244 mm: PCB da X 0.945 (faccia) a 0.995, posizioni in layout.py.
Le posizioni di socket, slot RAM, slot PCIe e M.2 coincidono con CPU, RAM, GPU e SSD.
Radice: "Motherboard" (non cliccabile da sola: fa parte della scocca).
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
    circle,
    cube_bm,
    cylinder_bm,
    empty,
    grain_height,
    material,
    mesh_object,
    normal_from_height,
    offset_polygon,
    pcb_texture,
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
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

importlib.reload(layout)
from layout import BOARD_Y, BOARD_Z, DIMM_LEN, DIMM_Y, DIMM_Z, FACE, IO_CUT, SLOT_Z, SOCKET, STANDOFFS  # noqa: E402

coll = reset_collection("Motherboard")


def glow(name, color, strength):
    return material(name, srgb("#0a0a0c"), roughness=0.3, emission=color, strength=strength)


M = {
    "pcb": material("MB_PCB", srgb("#0b0c0e"), metallic=0.1, roughness=0.6),
    "hs": material("MB_Heatsink", srgb("#1a1c21"), metallic=0.8, roughness=0.35),
    "accent": material("MB_Accent", srgb("#b9bec8"), metallic=1.0, roughness=0.28),
    "socket": material("MB_Socket", srgb("#141518"), metallic=0.2, roughness=0.5),
    "socket_metal": material("MB_Socket_Metal", srgb("#c8cbd1"), metallic=1.0, roughness=0.3),
    "slot_grey": material("MB_Slot_Grey", srgb("#3a3d44"), metallic=0.0, roughness=0.5),
    "slot_black": material("MB_Slot_Black", srgb("#121316"), metallic=0.0, roughness=0.5),
    "latch": material("MB_Latch", srgb("#8d929c"), metallic=0.0, roughness=0.45),
    "conn": material("Connector_Black", srgb("#0d0e10"), metallic=0.0, roughness=0.55),
    "hole": material("Pin_Hole", srgb("#020203"), metallic=0.0, roughness=0.8),
    "white": material("Header_White", srgb("#e6e6e2"), metallic=0.0, roughness=0.5),
    "choke": material("MB_Choke", srgb("#2b2d31"), metallic=0.6, roughness=0.45),
    "cap": material("MB_Cap", srgb("#1b1c1f"), metallic=0.7, roughness=0.35),
    "gold": material("Gold", srgb("#d4a84a"), metallic=1.0, roughness=0.25),
    "nickel": material("Port_Nickel", srgb("#d9dce2"), metallic=1.0, roughness=0.18),
    "chrome": material("Screw_Silver", srgb("#c9ccd2"), metallic=1.0, roughness=0.22),
    "io": material("MB_IO_Plate", srgb("#101114"), metallic=0.6, roughness=0.45),
    "usb_blue": material("USB_Blue", srgb("#1f4fd8"), metallic=0.0, roughness=0.45),
    "usb_red": material("USB_Red", srgb("#c8262b"), metallic=0.0, roughness=0.45),
    "lime": material("Jack_Lime", srgb("#9be03a"), metallic=0.0, roughness=0.45),
    "pink": material("Jack_Pink", srgb("#ef6aa8"), metallic=0.0, roughness=0.45),
    "rgb": glow("RGB_MB", (1, 1, 1), 2.5),
    "rgb_chipset": glow("RGB_MB_Chipset", (1, 1, 1), 2.0),
    "debug": glow("LED_Debug", (1.0, 0.12, 0.08), 4.0),
    "led_green": glow("LED_Green", (0.2, 1.0, 0.3), 3.0),
    "led_orange": glow("LED_Orange", (1.0, 0.55, 0.1), 3.0),
}

mb = empty("Motherboard", coll)


def on(name, out, sy, sz, y, z, mat, bevel=0.004, segments=1, lift=0.0):
    """Blocco appoggiato sulla scheda: sporge di `out` verso -X."""
    return box(name, (out, sy, sz), (FACE - lift - out / 2, y, z), coll, mat, mb, bevel=bevel, segments=segments)


def rotated_cube(size, center, axis, angle, bm):
    res = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=res["verts"])
    bmesh.ops.rotate(bm, verts=res["verts"], matrix=Matrix.Rotation(angle, 3, axis))
    bmesh.ops.translate(bm, vec=Vector(center), verts=res["verts"])
    return bm


# ------------------------------------------------------------------ PCB e viti (ATX 305 x 244 mm)
BY0, BY1 = BOARD_Y
BZ0, BZ1 = BOARD_Z
box("MB_PCB", (0.05, BY1 - BY0, BZ1 - BZ0), (0.97, (BY0 + BY1) / 2, (BZ0 + BZ1) / 2), coll, M["pcb"], mb, bevel=0.004, segments=1)
bm = bmesh.new()
pads = bmesh.new()
slots = bmesh.new()
for y, z in STANDOFFS:
    cylinder_bm(0.03, 0.012, 20, (FACE - 0.006, y, z), axis="X", bm=bm)
    ring_prism_bm(circle(0.045, 24), circle(0.032, 24), 0.002, (FACE - 0.001, y, z), "YZ", pads)
    for a in (0.0, math.pi / 2):
        rotated_cube((0.004, 0.036, 0.007), (FACE - 0.0125, y, z), "X", a + math.pi / 4, slots)
mesh_object("MB_Screws", bm, coll, [M["chrome"]], mb, smooth_angle=40)
mesh_object("MB_Screw_Pads", pads, coll, [M["gold"]], mb, smooth_angle=None)
mesh_object("MB_Screw_Slots", slots, coll, [M["hole"]], mb, smooth_angle=None)

# ------------------------------------------------------------------ socket LGA1700
SY, SZ = SOCKET
on("MB_Socket", 0.03, 0.52, 0.6, SY, SZ, M["socket"], bevel=0.004)
plate_out = [(-0.28, -0.33), (0.28, -0.33), (0.28, 0.33), (-0.28, 0.33)]
plate_in = [(-0.2, -0.24), (0.2, -0.24), (0.2, 0.24), (-0.2, 0.24)]
mesh_object("MB_Socket_LoadPlate", ring_prism_bm(plate_out, plate_in, 0.01, (FACE - 0.035, SY, SZ), "YZ"), coll, [M["socket_metal"]], mb, smooth_angle=None)
bm = bmesh.new()
for sy in (-1, 1):
    for sz in (-1, 1):
        cylinder_bm(0.022, 0.016, 16, (FACE - 0.04, SY + sy * 0.25, SZ + sz * 0.3), axis="X", bm=bm)
mesh_object("MB_Socket_Screws", bm, coll, [M["chrome"]], mb, smooth_angle=40)
# leva di blocco sul lato verso la RAM
lever = bmesh.new()
cylinder_bm(0.01, 0.62, 12, (FACE - 0.03, SY - 0.32, SZ), axis="Z", bm=lever)
cube_bm((0.016, 0.07, 0.018), (FACE - 0.03, SY - 0.29, SZ + 0.31), lever)
cube_bm((0.024, 0.024, 0.09), (FACE - 0.03, SY - 0.32, SZ - 0.34), lever)
mesh_object("MB_Socket_Lever", lever, coll, [M["socket_metal"]], mb, smooth_angle=40)

# ------------------------------------------------------------------ VRM e copertura I/O
# dissipatore sopra il socket (lascia spazio ai tubi della pompa e al connettore EPS)
vrm_top = on("MB_VRM_Top", 0.28, 0.7, 0.3, 1.1, 4.18, M["hs"], bevel=0)
bm = bmesh.new()
for k in range(9):
    cube_bm((0.22, 0.032, 0.36), (FACE - 0.28, 0.79 + k * 0.078, 4.18), bm)
cut = mesh_object("_vrm_top_cut", bm, coll, [M["hs"]], mb, smooth_angle=None)
boolean_cut(vrm_top, [cut])
add_bevel(vrm_top, 0.005, 1, 40)

vrm_left = on("MB_VRM_Left", 0.28, 0.22, 1.1, 1.63, SZ, M["hs"], bevel=0)
bm = bmesh.new()
for k in range(13):
    cube_bm((0.22, 0.28, 0.032), (FACE - 0.28, 1.63, SZ - 0.48 + k * 0.08), bm)
cut = mesh_object("_vrm_left_cut", bm, coll, [M["hs"]], mb, smooth_angle=None)
boolean_cut(vrm_left, [cut])
add_bevel(vrm_left, 0.005, 1, 40)

IO_Z0 = IO_CUT[2]
io_cover = on("MB_IO_Cover", 0.34, 0.41, 1.55, 1.985, IO_Z0 + 0.005 + 0.775, M["hs"], bevel=0)
bm = rotated_cube((0.28, 0.6, 0.28), (FACE - 0.34, 1.985, IO_Z0 + 0.005), "Y", math.pi / 4, bmesh.new())
cut = mesh_object("_io_cover_cut", bm, coll, [M["hs"]], mb, smooth_angle=None)
boolean_cut(io_cover, [cut])
add_bevel(io_cover, 0.008, 2, 40)
box("MB_IO_Cover_Inlay", (0.006, 0.24, 0.9), (FACE - 0.343, 2.025, IO_Z0 + 0.95), coll, M["accent"], mb, bevel=0)
box("MB_IO_Cover_RGB", (0.008, 0.022, 1.15), (FACE - 0.344, 1.805, IO_Z0 + 0.85), coll, M["rgb"], mb, bevel=0.003)

# induttanze tra socket e VRM posteriore, condensatori sopra il VRM superiore
bm = bmesh.new()
for k in range(7):
    cube_bm((0.08, 0.07, 0.07), (FACE - 0.04, 1.47, SZ - 0.36 + k * 0.12), bm)
chokes = mesh_object("MB_Chokes", bm, coll, [M["choke"]], mb, smooth_angle=None)
add_bevel(chokes, 0.005, 1, 40)
bm = bmesh.new()
for k in range(6):
    cylinder_bm(0.02, 0.06, 16, (FACE - 0.03, 0.82 + k * 0.11, 4.36), axis="X", bm=bm)
mesh_object("MB_Caps", bm, coll, [M["cap"]], mb, smooth_angle=40)

# ------------------------------------------------------------------ slot DDR5 con levette
for i, y in enumerate(DIMM_Y):
    on(f"MB_DIMM_{i + 1}", 0.07, 0.065, DIMM_LEN, y, DIMM_Z, M["slot_grey" if i % 2 == 0 else "slot_black"], bevel=0.003)
    box(f"MB_DIMM_{i + 1}_Groove", (0.004, 0.018, DIMM_LEN - 0.08), (FACE - 0.072, y, DIMM_Z), coll, M["hole"], mb, bevel=0)
    for s in (-1, 1):
        on(f"MB_DIMM_{i + 1}_Latch_{'T' if s > 0 else 'B'}", 0.1, 0.06, 0.05, y, DIMM_Z + s * (DIMM_LEN / 2 + 0.025), M["latch"], bevel=0.007, segments=2)

# ------------------------------------------------------------------ connettori
ATX_Y, ATX_Z = BY0 + 0.075, layout.ATX24_Z
on("MB_ATX24", 0.15, 0.12, 0.6, ATX_Y, ATX_Z, M["conn"], bevel=0.006, segments=2)
bm = bmesh.new()
for c in range(2):
    for r in range(12):
        cube_bm((0.006, 0.04, 0.034), (FACE - 0.151, ATX_Y - 0.023 + c * 0.046, ATX_Z - 0.264 + r * 0.048), bm)
mesh_object("MB_ATX24_Pins", bm, coll, [M["hole"]], mb, smooth_angle=None)

on("MB_EPS8", 0.12, 0.22, 0.1, layout.EPS_Y, 4.33, M["conn"], bevel=0.005, segments=2)
bm = bmesh.new()
for c in range(4):
    for r in range(2):
        cube_bm((0.006, 0.04, 0.034), (FACE - 0.121, layout.EPS_Y - 0.069 + c * 0.046, 4.33 - 0.023 + r * 0.046), bm)
mesh_object("MB_EPS8_Pins", bm, coll, [M["hole"]], mb, smooth_angle=None)

on("MB_USB3_Header", 0.08, 0.07, 0.2, BY0 + 0.06, 2.6, M["conn"], bevel=0.004)
# display dei codici di debug: "40" = avvio completato
on("MB_QCode", 0.02, 0.12, 0.07, -0.03, 4.27, M["conn"], bevel=0.002)
text_object(
    "MB_QCode_Digits",
    "40",
    coll,
    M["debug"],
    size=0.058,
    extrude=0.0,
    parent=mb,
    location=(FACE - 0.0215, -0.03, 4.27),
    rotation=(math.pi / 2, 0, -math.pi / 2),
    font=FONT_DIN,
    offset=0.002,
    resolution=4,
)

# SATA ad angolo retto sul bordo anteriore
on("MB_SATA", 0.12, 0.1, 0.56, BY0 + 0.05, 1.82, M["conn"], bevel=0.004)
bm = bmesh.new()
for x in (FACE - 0.032, FACE - 0.088):
    for z in (1.68, 1.96):
        cube_bm((0.03, 0.006, 0.1), (x, BY0 - 0.001, z), bm)
mesh_object("MB_SATA_Ports", bm, coll, [M["hole"]], mb, smooth_angle=None)

# header lungo il bordo inferiore (pannello frontale, USB 2.0, ARGB, ventole)
bm = bmesh.new()
pins = bmesh.new()
for y, n in ((-0.08, 9), (0.28, 9), (0.6, 3), (1.0, 4), (1.3, 4)):
    w = n * 0.025 + 0.02
    cube_bm((0.05, w, 0.05), (FACE - 0.025, y, BZ0 + 0.06), bm)
    for p in range(n):
        for r in (-1, 1):
            cube_bm((0.03, 0.008, 0.008), (FACE - 0.06, y - w / 2 + 0.022 + p * 0.025, BZ0 + 0.06 + r * 0.012), pins)
mesh_object("MB_Headers", bm, coll, [M["conn"]], mb, smooth_angle=None)
mesh_object("MB_Header_Pins", pins, coll, [M["gold"]], mb, smooth_angle=None)
on("MB_FanHeader_CPU", 0.045, 0.09, 0.04, layout.FAN_HEADERS["CPU_FAN"], 4.36, M["white"], bevel=0.003)
on("MB_FanHeader_Pump", 0.045, 0.09, 0.04, layout.FAN_HEADERS["AIO_PUMP"], 4.36, M["white"], bevel=0.003)
on("MB_FanHeader_Sys", 0.045, 0.09, 0.04, layout.FAN_HEADERS["SYS_FAN"], 4.36, M["white"], bevel=0.003)

# ------------------------------------------------------------------ slot PCIe (passo 20.32 mm, allineati al case)


def pcie(name, z, y0, length, armored):
    mat = M["socket_metal"] if armored else M["slot_black"]
    on(name, 0.11, length, 0.075, y0 + length / 2, z, mat, bevel=0.004)
    box(f"{name}_Groove", (0.004, length - 0.04, 0.018), (FACE - 0.112, y0 + length / 2, z), coll, M["hole"], mb, bevel=0)
    on(f"{name}_Latch", 0.12, 0.05, 0.065, y0 - 0.03, z, M["slot_black"], bevel=0.006)


pcie("MB_PCIe_1", SLOT_Z[0], 0.825, 0.95, True)  # x16 della GPU
pcie("MB_PCIe_2", SLOT_Z[3], 1.55, 0.25, False)  # x1
pcie("MB_PCIe_3", SLOT_Z[4], 0.825, 0.95, True)  # x16
pcie("MB_PCIe_4", SLOT_Z[6], 1.4, 0.375, False)  # x4

# ------------------------------------------------------------------ M.2, chipset, batteria
on("MB_M2_Connector", 0.03, 0.06, 0.24, layout.M2_Y1, layout.M2_Z, M["conn"], bevel=0.003)
on("MB_M2_Standoff", 0.012, 0.03, 0.03, layout.M2_Y0, layout.M2_Z, M["chrome"], bevel=0.003)
on("MB_M2_Heatsink", 0.035, 1.05, 0.2, 0.85, SLOT_Z[1] - 0.04, M["hs"], bevel=0.006, segments=2)
bm = bmesh.new()
for k in range(4):
    cube_bm((0.004, 0.9, 0.012), (FACE - 0.037, 0.85, SLOT_Z[1] - 0.1 + k * 0.04), bm)
mesh_object("MB_M2_Heatsink_Lines", bm, coll, [M["accent"]], mb, smooth_angle=None)

CH_Y, CH_Z = 0.25, 1.8
on("MB_Chipset", 0.04, 0.8, 0.62, CH_Y, CH_Z, M["hs"], bevel=0.008, segments=2)
stripe = [(-0.3, -0.22), (-0.22, -0.22), (0.26, 0.22), (0.18, 0.22)]
mesh_object("MB_Chipset_Inlay", prism_bm([(u + CH_Y, v + CH_Z) for u, v in stripe], 0.006, (FACE - 0.043, 0, 0), plane="YZ"), coll, [M["accent"]], mb, smooth_angle=None)
glow_line = [(-0.37, -0.26), (-0.345, -0.26), (0.15, 0.22), (0.125, 0.22)]
mesh_object("MB_Chipset_RGB", prism_bm([(u + CH_Y, v + CH_Z) for u, v in glow_line], 0.006, (FACE - 0.043, 0, 0), plane="YZ"), coll, [M["rgb_chipset"]], mb, smooth_angle=None)

battery = mesh_object("MB_CMOS_Battery", cylinder_bm(0.1, 0.03, 36, axis="X"), coll, [M["chrome"]], mb, smooth_angle=30)
battery.location = (FACE - 0.025, 1.3, 2.17)
mesh_object("MB_CMOS_Holder", ring_prism_bm(circle(0.12, 36), circle(0.1, 36), 0.02, (FACE - 0.01, 1.3, 2.17), "YZ"), coll, [M["conn"]], mb, smooth_angle=30)

# ------------------------------------------------------------------ I/O posteriore (nell'apertura del case)
IO_Y = 2.385
IO_X0, IO_X1, IO_Z0, IO_Z1 = IO_CUT
box("MB_IO_Plate", (IO_X1 - IO_X0, 0.02, IO_Z1 - IO_Z0), ((IO_X0 + IO_X1) / 2, IO_Y, (IO_Z0 + IO_Z1) / 2), coll, M["io"], mb, bevel=0)
FRONT = IO_Y + 0.02  # faccia esterna delle porte
DZ = (IO_Z0 + IO_Z1) / 2 - 3.81  # le porte erano disegnate per un'apertura centrata a Z 3.81


def port(name, outline, cx, cz, tongue=None, tongue_mat=None, depth=0.06):
    """Porta con guscio metallico, fondo scuro e linguetta colorata (profilo in X/Z)."""
    cz += DZ
    mesh_object(name, ring_prism_bm(offset_polygon(outline, 0.004), outline, depth, (cx, FRONT - depth / 2, cz), "XZ"), coll, [M["nickel"]], mb, smooth_angle=None)
    mesh_object(f"{name}_Back", prism_bm(outline, 0.004, (cx, FRONT - depth + 0.002, cz)), coll, [M["hole"]], mb, smooth_angle=None)
    if tongue:
        tx, tz, tw, th = tongue
        mesh_object(f"{name}_Tongue", cube_bm((tw, depth * 0.8, th), (cx + tx, FRONT - depth / 2 - 0.004, cz + tz)), coll, [tongue_mat], mb, smooth_angle=None)


USB_A = [(-0.0225, -0.06), (0.0225, -0.06), (0.0225, 0.06), (-0.0225, 0.06)]
USB_C = rounded_rect(0.026, 0.084, 0.012, 4)
HDMI_V = [(0.023, 0.07), (0.005, 0.07), (-0.023, 0.052), (-0.023, -0.052), (0.005, -0.07), (0.023, -0.07)]
RJ45 = [(-0.065, -0.07), (0.065, -0.07), (0.065, 0.07), (-0.065, 0.07)]

for c, x in enumerate((0.56, 0.66, 0.76, 0.86)):
    port(f"MB_IO_USB_Red_{c + 1}", USB_A, x, 4.1, (0.008, 0, 0.016, 0.1), M["usb_red"])
    port(f"MB_IO_USB_Blue_{c + 1}", USB_A, x, 3.92, (0.008, 0, 0.016, 0.1), M["usb_blue"])
for c, x in enumerate((0.56, 0.66)):
    port(f"MB_IO_USBC_{c + 1}", USB_C, x, 3.72, (0, 0, 0.006, 0.06), M["conn"])
port("MB_IO_HDMI", HDMI_V, 0.82, 3.72, (0.004, 0, 0.011, 0.1), M["conn"])
port("MB_IO_RJ45", RJ45, 0.62, 3.46, None, None, depth=0.08)
for name, x, mat in (("Link", 0.575, M["led_green"]), ("Act", 0.665, M["led_orange"])):
    mesh_object(f"MB_IO_RJ45_LED_{name}", cube_bm((0.02, 0.004, 0.02), (x, FRONT + 0.001, 3.51 + DZ)), coll, [mat], mb, smooth_angle=None)
bm = bmesh.new()
for k in range(8):
    cube_bm((0.006, 0.05, 0.03), (0.585 + k * 0.01, FRONT - 0.045, 3.52 + DZ), bm)
mesh_object("MB_IO_RJ45_Contacts", bm, coll, [M["gold"]], mb, smooth_angle=None)
port("MB_IO_Optical", [(-0.025, -0.025), (0.025, -0.025), (0.025, 0.025), (-0.025, 0.025)], 0.84, 3.46, None, None, depth=0.04)
for c, (x, mat) in enumerate(((0.6, M["lime"]), (0.78, M["pink"]))):
    mesh_object(f"MB_IO_Jack_{c + 1}", ring_prism_bm(circle(0.042, 28), circle(0.022, 28), 0.04, (x, FRONT - 0.02, 3.18 + DZ), "XZ"), coll, [mat], mb, smooth_angle=40)
    mesh_object(f"MB_IO_Jack_{c + 1}_Hole", prism_bm(circle(0.022, 20), 0.004, (x, FRONT - 0.035, 3.18 + DZ)), coll, [M["hole"]], mb, smooth_angle=None)
# connettori antenna Wi-Fi e pulsanti BIOS / CMOS
bm = bmesh.new()
for x in (0.58, 0.82):
    cylinder_bm(0.026, 0.07, 20, (x, FRONT + 0.015, 4.48 + DZ), axis="Y", bm=bm)
mesh_object("MB_IO_WiFi", bm, coll, [M["gold"]], mb, smooth_angle=40)
bm = bmesh.new()
for x in (0.58, 0.82):
    hexagon = [(x + 0.04 * math.cos(math.radians(60 * k)), 4.48 + DZ + 0.04 * math.sin(math.radians(60 * k))) for k in range(6)]
    prism_bm(hexagon, 0.015, (0, FRONT - 0.005, 0), plane="XZ", bm=bm)
mesh_object("MB_IO_WiFi_Nuts", bm, coll, [M["chrome"]], mb, smooth_angle=None)
bm = bmesh.new()
for x in (0.6, 0.8):
    cylinder_bm(0.025, 0.012, 20, (x, FRONT + 0.002, 4.3 + DZ), axis="Y", bm=bm)
mesh_object("MB_IO_Buttons", bm, coll, [M["conn"]], mb, smooth_angle=40)

# ------------------------------------------------------------------ texture
# nero opaco: piste appena più chiare, poche piazzole e serigrafie discrete
pcb_color = save_image(
    "tex_mb_pcb_color",
    pcb_texture(
        1024,
        seed=21,
        base=(0.022, 0.024, 0.028),
        trace=(0.04, 0.044, 0.05),
        traces=260,
        widths=(1, 3),
        pad_prob=0.12,
        pad_color=(0.3, 0.26, 0.16),
        silk=10,
        silk_color=0.5,
    ),
    non_color=False,
)
height, mid, coarse = grain_height(512, seed=5)
grain_n = bpy.data.images.get("tex_grain_normal") or save_image("tex_grain_normal", normal_from_height(height, 2.2))
rough_metal = bpy.data.images.get("tex_rough_metal") or save_image("tex_rough_metal", roughness_map(mid, coarse, 0.27, 0.06))
rough_plastic = bpy.data.images.get("tex_rough_plastic") or save_image("tex_rough_plastic", roughness_map(mid, coarse, 0.55, 0.08))
rough_hs = save_image("tex_rough_mb_heatsink", roughness_map(mid, coarse, 0.38, 0.07))

use_textures(M["pcb"], rough_plastic, grain_n, 0.08, color=pcb_color)
use_textures(M["hs"], rough_hs, grain_n, 0.25)
use_textures(M["io"], rough_hs, grain_n, 0.2)
use_textures(M["accent"], rough_metal, grain_n, 0.12)
use_textures(M["socket_metal"], rough_metal, grain_n, 0.1)
for key in ("socket", "slot_grey", "slot_black", "conn", "latch"):
    use_textures(M[key], rough_plastic)

for obj in coll.all_objects:
    box_uv(obj, 1.75 if obj.name == "MB_PCB" else 0.25)

parts = [o for o in coll.all_objects]
per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result = {
    "objects": len(parts),
    "triangles": sum(per_object.values()),
    "top": sorted(per_object.items(), key=lambda kv: -kv[1])[:6],
}
