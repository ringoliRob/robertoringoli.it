"""Camera e luci di anteprima della stanza (collezione "Preview", non esportata).

Prima di eseguire definire CAM e TARGET (x, y, z); opzionali LENS e NIGHT (solo luci notturne).
"""

import bpy

scene = bpy.context.scene
coll = bpy.data.collections.get("Preview")
if coll is None:
    coll = bpy.data.collections.new("Preview")
    scene.collection.children.link(coll)


def get(name, factory):
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = factory()
        coll.objects.link(obj)
    return obj


target = get("Preview_Target", lambda: bpy.data.objects.new("Preview_Target", None))
target.location = TARGET  # noqa: F821
cam = get("Preview_Camera", lambda: bpy.data.objects.new("Preview_Camera", bpy.data.cameras.new("Preview_Camera")))
cam.location = CAM  # noqa: F821
cam.data.lens = globals().get("LENS", 18)
cam.data.clip_start = 0.1
cam.data.clip_end = 400
if not cam.constraints:
    c = cam.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
scene.camera = cam


def light(name, kind, energy, loc, color=(1, 1, 1), size=2.0, rot=None, spot=None):
    obj = get(name, lambda: bpy.data.objects.new(name, bpy.data.lights.new(name, kind)))
    obj.data.energy = energy
    obj.data.color = color
    if kind == "AREA":
        obj.data.size = size
    elif kind in ("POINT", "SPOT"):
        obj.data.shadow_soft_size = size
    if spot:
        obj.data.spot_size = spot
        obj.data.spot_blend = 0.6
    obj.location = loc
    if rot:
        obj.rotation_euler = rot
    return obj


night = globals().get("NIGHT", False)
L_BULB_Z = 27.0 - 5.45
# plafoniera (area rivolta in basso), luna dalla finestra, alone del monitor, LED
old = bpy.data.objects.get("Preview_Ceiling")
if old is not None:
    bpy.data.objects.remove(old, do_unlink=True)
# lampadina del lampadario (sotto il paralume)
light("Preview_Bulb", "POINT", 0 if night else 6000, (0, 0, L_BULB_Z), (1.0, 0.82, 0.6), 0.6)
light("Preview_Moon", "AREA", 2500, (34, 9, 26), (0.55, 0.65, 1.0), 10.0, rot=(0, -1.15, 0))
light("Preview_Monitor", "AREA", 900, (-10.0, 14.5, 11.5), (0.6, 0.55, 1.0), 6.0, rot=(-1.57, 0, 3.14159))
light("Preview_LED", "POINT", 2500, (0, 0, 24.5), (0.35, 0.45, 1.0), 18.0)

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.01, 0.012, 0.02, 1)
bg.inputs["Strength"].default_value = 1.0

scene.render.engine = "BLENDER_EEVEE"
ee = scene.eevee
for attr, value in (
    ("use_raytracing", True),
    ("ray_tracing_method", "SCREEN"),
    ("use_shadows", True),
    ("shadow_ray_count", 2),
    ("taa_render_samples", 64),
    ("fast_gi_method", "GLOBAL_ILLUMINATION"),
    ("use_fast_gi", True),
):
    try:
        setattr(ee, attr, value)
    except Exception:
        pass
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.render.film_transparent = False

_result = {"camera": list(cam.location)}

# le luci finte non devono comparire nei riflessi degli schermi
for name in ("Preview_Monitor", "Preview_Bulb", "Preview_LED"):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        obj.visible_glossy = False
