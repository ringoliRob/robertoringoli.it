"""Cablaggio completo: alimentazione (24 pin, EPS CPU, 12V-2x6 GPU) con cavi sleevati e
pettinini, più i cavi di segnale (pannello frontale, USB, ventole, pompa).

Coordinate del case. Radice "Cables" all'origine: nel sito i cavi restano fermi e
spariscono quando il PC si smonta. I percorsi passano dai passacavi del vassoio
(X ~1.06, dietro il vassoio i cavi finiscono nascosti).
"""

import importlib
import sys

ROOT = r"C:\Users\rober\Documents\GitHub\robertoringoli.it\tools\blender-mcp\pc_parts"
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
import common  # noqa: E402

importlib.reload(common)
from common import (  # noqa: E402
    box,
    box_uv,
    braid_normal,
    bundle_bm,
    empty,
    grain_height,
    grid_offsets,
    material,
    mesh_object,
    oriented_box_bm,
    reset_collection,
    roughness_map,
    save_image,
    srgb,
    triangle_count,
    use_textures,
)

import bmesh  # noqa: E402
import bpy  # noqa: E402
import layout  # noqa: E402

importlib.reload(layout)

M = {
    "sleeve": material("Cable_Sleeve", srgb("#141518"), metallic=0.0, roughness=0.62),
    "thin": material("Cable_Thin", srgb("#0c0c0e"), metallic=0.0, roughness=0.55),
    "plug": material("Cable_Plug", srgb("#0b0b0d"), metallic=0.0, roughness=0.3),
    "comb": material("Cable_Comb", srgb("#1d1f24"), metallic=0.0, roughness=0.45),
}


coll = reset_collection("Cables")
cables = empty("Cables", coll)
WIRE = 0.019  # filo sleevato da ~3.8 mm
FACE = layout.FACE
BZ0 = layout.BOARD_Z[0]


def plug(name, x0, x1, y, z, sy, sz):
    """Spina inserita: da x0 (lato cavo) a x1 (contro il connettore)."""
    return box(name, (x1 - x0, sy, sz), ((x0 + x1) / 2, y, z), coll, M["plug"], cables, bevel=0.006, segments=2)


def wires(name, keys, offsets, radius=WIRE, normal0=(0, 0, 1), mat="sleeve", per_segment=7, combs=(), comb_size=None):
    bm, pts, frames = bundle_bm(keys, offsets, radius, normal0, sides=6, per_segment=per_segment)
    mesh_object(name, bm, coll, [M[mat]], cables, smooth_angle=80)
    if combs:
        cb = bmesh.new()
        for f in combs:
            i = int(f * (len(pts) - 1))
            oriented_box_bm(comb_size, pts[i], frames[i], cb)
        mesh_object(f"{name}_Combs", cb, coll, [M["comb"]], cables, smooth_angle=None)


# ------------------------------------------------------------------ 24 pin scheda madre
ATX_Y, ATX_Z = layout.BOARD_Y[0] + 0.075, layout.ATX24_Z
GROMMET_Y = -0.52
plug("Cable_ATX24_Plug", 0.70, FACE - 0.15, ATX_Y, ATX_Z, 0.11, 0.6)
box("Cable_ATX24_Latch", (0.05, 0.03, 0.06), (0.75, ATX_Y + 0.07, ATX_Z + 0.12), coll, M["plug"], cables, bevel=0.005, segments=1)
wires(
    "Cable_ATX24",
    [(0.70, ATX_Y, ATX_Z), (0.6, ATX_Y - 0.005, ATX_Z), (0.5, ATX_Y - 0.09, ATX_Z), (0.53, GROMMET_Y + 0.07, ATX_Z), (0.72, GROMMET_Y, ATX_Z), (1.08, GROMMET_Y, ATX_Z)],
    grid_offsets(12, 2, 0.048, 0.046),
    combs=(0.12, 0.62),
    comb_size=(0.022, 0.62, 0.11),
)

# ------------------------------------------------------------------ 8 pin CPU (EPS) dall'apertura in alto
EPS_Y, EPS_Z = layout.EPS_Y, 4.33
plug("Cable_EPS8_Plug", 0.73, FACE - 0.12, EPS_Y, EPS_Z, 0.21, 0.095)
wires(
    "Cable_EPS8",
    [(0.73, EPS_Y, EPS_Z), (0.62, EPS_Y, EPS_Z + 0.01), (0.58, EPS_Y, EPS_Z + 0.12), (0.7, EPS_Y, 4.52), (1.08, EPS_Y, 4.52)],
    grid_offsets(2, 4, 0.046, 0.046),
    combs=(0.15,),
    comb_size=(0.022, 0.11, 0.21),
)

# ------------------------------------------------------------------ GPU 12V-2x6 dal passacavi della copertura
gx, gy, gz = layout.GPU_ROOT
GPU_PIN_X = gx - 0.70  # pin del connettore della GPU (X locale -0.70)
GPU_Y, GPU_Z = gy + layout.GPU_POWER_Y, gz + 0.17
SGX, SGY = layout.SHROUD_GROMMET
plug("Cable_GPU_Plug", GPU_PIN_X - 0.1, GPU_PIN_X - 0.005, GPU_Y, GPU_Z, 0.26, 0.085)
gpu_path = [
    (GPU_PIN_X - 0.1, GPU_Y, GPU_Z),
    (GPU_PIN_X - 0.2, GPU_Y, GPU_Z - 0.01),
    (GPU_PIN_X - 0.28, GPU_Y, GPU_Z - 0.17),
    (GPU_PIN_X - 0.26, GPU_Y + 0.01, 2.0),
    (SGX - 0.02, SGY, 1.45),
    (SGX, SGY, 1.1),
]
wires("Cable_GPU", gpu_path, grid_offsets(2, 6, 0.035, 0.04), radius=0.016, combs=(0.45, 0.75), comb_size=(0.02, 0.09, 0.27))
# i 4 fili di controllo, più sottili, sopra i 12 di potenza
wires("Cable_GPU_Sense", gpu_path, [(0.06, (c - 1.5) * 0.03) for c in range(4)], radius=0.008, mat="thin")

# ------------------------------------------------------------------ lato alimentatore (dentro la copertura)
px = (layout.PSU_X[0] + layout.PSU_X[1]) / 2
pz = (layout.PSU_Z[0] + layout.PSU_Z[1]) / 2
PY = layout.PSU_Y[0] - 0.04  # davanti al pannello modulare
for name, cx, cz, sx, sz in (("MB", px - 0.42, pz + 0.06, 0.12, 0.54), ("CPU", px - 0.12, pz + 0.22, 0.2, 0.11), ("GPU", px + 0.42, pz + 0.22, 0.22, 0.09)):
    box(f"Cable_PSU_{name}_Plug", (sx, 0.09, sz), (cx, PY - 0.045, cz), coll, M["plug"], cables, bevel=0.006, segments=2)
wires(
    "Cable_PSU_MB",
    [(px - 0.42, PY - 0.09, pz + 0.06), (px - 0.42, PY - 0.25, pz + 0.06), (px - 0.1, PY - 0.42, pz + 0.1), (0.6, PY - 0.5, pz + 0.12), (1.0, PY - 0.5, pz + 0.12)],
    grid_offsets(12, 2, 0.045, 0.046),
    radius=0.018,
    per_segment=5,
)
wires(
    "Cable_PSU_CPU",
    [(px - 0.12, PY - 0.09, pz + 0.22), (px - 0.12, PY - 0.2, pz + 0.26), (0.2, PY - 0.3, pz + 0.38), (1.0, PY - 0.3, pz + 0.38)],
    grid_offsets(2, 4, 0.046, 0.046),
    radius=0.018,
    per_segment=5,
)
wires(
    "Cable_PSU_GPU",
    [(px + 0.42, PY - 0.09, pz + 0.22), (px + 0.42, PY - 0.2, pz + 0.3), (0.0, PY - 0.05, 1.02), (-0.4, SGY - 0.45, 1.04), (SGX, SGY, 1.1)],
    grid_offsets(2, 6, 0.035, 0.04),
    radius=0.016,
    per_segment=5,
)

# ------------------------------------------------------------------ pannello frontale, USB 2.0 e USB 3.0
HEADER_Z = BZ0 + 0.06
for name, y in layout.BOTTOM_HEADERS.items():
    plug(f"Cable_{name}_Plug", 0.8, FACE - 0.07, y, HEADER_Z, 0.245, 0.05)
wires(
    "Cable_F_PANEL",
    [(0.8, layout.BOTTOM_HEADERS["F_PANEL"], HEADER_Z), (0.7, -0.1, HEADER_Z + 0.04), (0.66, -0.3, 1.7), (0.8, GROMMET_Y, 1.86), (1.08, GROMMET_Y, 1.86)],
    [(0.0, (c - 3) * 0.02) for c in range(7)],
    radius=0.008,
    mat="thin",
)
wires(
    "Cable_F_USB2",
    [(0.8, layout.BOTTOM_HEADERS["F_USB2"], HEADER_Z), (0.7, 0.25, HEADER_Z + 0.04), (0.62, 0.0, 1.6), (0.7, -0.4, 1.8), (1.08, GROMMET_Y, 1.82)],
    [(0.0, (c - 2) * 0.02) for c in range(5)],
    radius=0.008,
    mat="thin",
)
uy, uz = layout.USB3_HEADER
plug("Cable_USB3_Plug", 0.79, FACE - 0.08, uy, uz, 0.075, 0.2)
wires("Cable_USB3", [(0.79, uy, uz), (0.66, uy - 0.06, uz - 0.05), (0.68, GROMMET_Y + 0.07, 2.1), (0.85, GROMMET_Y, 1.96), (1.08, GROMMET_Y, 1.96)], [(0, 0)], radius=0.03)

# ------------------------------------------------------------------ ventole e pompa
FAN_Z = 4.36
for name, y in layout.FAN_HEADERS.items():
    plug(f"Cable_{name}_Plug", FACE - 0.085, FACE - 0.045, y, FAN_Z, 0.07, 0.035)
fan_wire = dict(radius=0.012, mat="thin")
H = layout.FAN_HEADERS
wires("Cable_CPU_FAN", [(0.86, H["CPU_FAN"], FAN_Z), (0.75, H["CPU_FAN"] - 0.02, FAN_Z), (0.55, 0.06, 4.25), (0.49, 0.05, 4.2)], [(0, 0)], **fan_wire)
wires("Cable_Rad_Daisy", [(0.49, 0.62, 4.2), (0.5, 0.45, 4.21), (0.49, 0.08, 4.2)], [(0, 0)], **fan_wire)
wires("Cable_AIO_PUMP", [(0.86, H["AIO_PUMP"], FAN_Z), (0.75, H["AIO_PUMP"] + 0.03, 4.385), (0.66, 0.6, 4.39), (0.62, 0.85, 4.2), (0.6, 0.9, 4.02)], [(0, 0)], **fan_wire)
wires("Cable_SYS_FAN", [(0.86, H["SYS_FAN"], FAN_Z), (0.75, H["SYS_FAN"] - 0.03, 4.3), (0.75, -0.4, 4.15), (1.08, GROMMET_Y, 4.12)], [(0, 0)], **fan_wire)
wires("Cable_Rear_Fan", [(0.37, 2.13, 4.5), (0.6, 2.05, 4.53), (0.85, 1.85, 4.52), (1.08, 1.8, 4.51)], [(0, 0)], **fan_wire)
# ventole frontali: fascio verticale dietro le ventole, verso la copertura dell'alimentatore
front = [(0.6, -1.72, 4.35), (0.7, -1.7, 4.2), (0.7, -1.7, 2.5), (0.7, -1.68, 1.25), (0.7, -1.6, 1.1)]
wires("Cable_Front_Fans", front, [(0, -0.013), (0, 0.013)], **fan_wire)
for k in range(3):
    zc = 0.14 + 0.7 + k * 1.45
    wires(f"Cable_Front_Fan_{k + 1}", [(0.6, -1.74, zc + 0.5), (0.66, -1.72, zc + 0.45), (0.7, -1.7, zc + 0.38)], [(0, 0)], **fan_wire)

# ------------------------------------------------------------------ texture della calza intrecciata
braid = save_image("tex_cable_braid", braid_normal(256, 6))
height, mid, coarse = grain_height(512, seed=23)
rough_plastic = bpy.data.images.get("tex_rough_plastic") or save_image("tex_rough_plastic", roughness_map(mid, coarse, 0.55, 0.08))
use_textures(M["sleeve"], None, braid, 0.8)
for obj in coll.all_objects:
    if obj.name.endswith(("_Plug", "_Latch", "_Combs")):  # i fasci hanno già le UV lungo il filo
        box_uv(obj, 0.25)

parts = list(coll.all_objects)
per_object = {o.name: triangle_count([o]) for o in parts if o.type == "MESH"}
_result = {
    "objects": len(parts),
    "triangles": sum(per_object.values()),
    "top": sorted(per_object.items(), key=lambda kv: -kv[1])[:6],
}
