"""Camera e luci per le anteprime (non vengono esportate nel GLB).

Prima di eseguire, definire CAM = (x, y, z) e TARGET = (x, y, z), ad esempio
anteponendo due righe al codice.
"""

import math

import bpy

scene = bpy.context.scene

# il cubo/luce/camera di default non devono finire nell'export
for name in ("Cube", "Light", "Camera"):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)

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
cam.data.lens = globals().get("LENS", 50)
if not cam.constraints:
    c = cam.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
scene.camera = cam


def light(name, kind, energy, loc, color=(1, 1, 1), size=2.0):
    obj = get(name, lambda: bpy.data.objects.new(name, bpy.data.lights.new(name, kind)))
    obj.data.energy = energy
    obj.data.color = color
    if kind == "AREA":
        obj.data.size = size
    obj.location = loc
    look = obj.constraints.get("Look") or obj.constraints.new("TRACK_TO")
    look.name = "Look"
    look.target = target
    look.track_axis = "TRACK_NEGATIVE_Z"
    look.up_axis = "UP_Y"
    return obj


light("Preview_Key", "AREA", 900, (-6, -5, 8), (1.0, 0.86, 0.72), 4)
light("Preview_Fill", "AREA", 350, (-6, 5, 2), (0.6, 0.7, 1.0), 4)
light("Preview_Rim", "AREA", 600, (5, 3, 6), (0.75, 0.6, 1.0), 3)

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
try:
    world.use_nodes = True
except Exception:
    pass
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.012, 0.014, 0.02, 1)
bg.inputs["Strength"].default_value = 1.0

for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
scene.view_settings.view_transform = "AgX"
scene.render.film_transparent = False

_result = {"camera": list(cam.location), "engine": scene.render.engine}
