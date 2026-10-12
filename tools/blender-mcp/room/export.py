"""Esporta la stanza in public/models/room.glb (Draco + WebP), senza luci/camera/PC di anteprima."""

import os

import bpy

OUT = r"C:\Users\rober\Documents\GitHub\robertoringoli.it\public\models\room.glb"

bpy.ops.object.select_all(action="DESELECT")
objs = [o for c in ("Room_Shell", "Room_Furniture", "Room_Props", "Room_Food") for o in bpy.data.collections[c].all_objects]
for o in objs:
    o.select_set(True)
# lo stato di anteprima dell'anta non deve finire nel GLB
door = bpy.data.objects.get("Safe_Door")
if door is not None:
    door.rotation_euler = (0, 0, 0)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_image_format="WEBP",
    export_image_quality=82,
    export_lights=False,
    export_cameras=False,
    export_extras=False,
    export_animations=False,
)
bpy.ops.wm.save_mainfile()
_result = {"bytes": os.path.getsize(OUT), "objects": len(objs)}
