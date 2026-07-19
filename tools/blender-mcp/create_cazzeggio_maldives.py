import bpy
import math
import os
import random
from mathutils import Vector


random.seed(42)

ROOT_DIR = r"C:\Users\rober\Documents\GitHub\robertoringoli.it"
BLEND_PATH = os.path.join(ROOT_DIR, "assets", "blender", "cazzeggio_maldives_island.blend")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, collection):
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    collection.objects.link(obj)


def make_material(
    name,
    color,
    metallic=0.0,
    roughness=0.72,
    alpha=1.0,
    emission=None,
    emission_strength=0.0,
):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, alpha)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    if emission is not None:
        emission_socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emission_socket:
            emission_socket.default_value = (*emission, 1.0)
        strength_socket = bsdf.inputs.get("Emission Strength")
        if strength_socket:
            strength_socket.default_value = emission_strength
    if alpha < 1.0:
        material.surface_render_method = "DITHERED"
        material.use_transparency_overlap = False
    return material


def assign_material(obj, material):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)


def set_smooth(obj, smooth=True):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = smooth


def add_empty(name, location=(0, 0, 0), parent=None, collection=None):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    if parent:
        obj.parent = parent
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def add_cube(name, location, scale, material, parent, collection, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft_Edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    assign_material(obj, material)
    obj.parent = parent
    move_to_collection(obj, collection)
    return obj


def add_cylinder(
    name,
    location,
    radius,
    depth,
    material,
    parent,
    collection,
    vertices=12,
    scale=(1, 1, 1),
    rotation=(0, 0, 0),
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    obj.parent = parent
    move_to_collection(obj, collection)
    return obj


def add_cone(
    name,
    location,
    radius1,
    radius2,
    depth,
    material,
    parent,
    collection,
    vertices=10,
    rotation=(0, 0, 0),
    scale=(1, 1, 1),
):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    obj.parent = parent
    move_to_collection(obj, collection)
    return obj


def add_sphere(
    name,
    location,
    scale,
    material,
    parent,
    collection,
    segments=16,
    rings=10,
):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    set_smooth(obj)
    obj.parent = parent
    move_to_collection(obj, collection)
    return obj


def add_torus(
    name,
    location,
    major_radius,
    minor_radius,
    material,
    parent,
    collection,
    rotation=(0, 0, 0),
    major_segments=32,
    minor_segments=8,
):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    set_smooth(obj)
    obj.parent = parent
    move_to_collection(obj, collection)
    return obj


def add_curve(name, points, bevel_depth, material, parent, collection, cyclic=False):
    curve = bpy.data.curves.new(name + "_Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 1
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    assign_material(obj, material)
    obj.parent = parent
    return obj


def add_radial_layer(name, rings, squash, material, parent, collection, segments=48, seed=0):
    rng = random.Random(seed)
    phase_a = rng.random() * math.tau
    phase_b = rng.random() * math.tau
    vertices = []
    for z, radius in rings:
        for index in range(segments):
            angle = index / segments * math.tau
            variation = (
                1.0
                + math.sin(angle * 3 + phase_a) * 0.045
                + math.sin(angle * 7 + phase_b) * 0.025
                + math.sin(angle * 11 + seed) * 0.012
            )
            vertices.append(
                (
                    math.cos(angle) * radius * variation,
                    math.sin(angle) * radius * squash * variation,
                    z,
                )
            )
    faces = []
    for ring_index in range(len(rings) - 1):
        current = ring_index * segments
        following = (ring_index + 1) * segments
        for index in range(segments):
            next_index = (index + 1) % segments
            faces.append(
                (
                    current + index,
                    current + next_index,
                    following + next_index,
                    following + index,
                )
            )
    top_center = len(vertices)
    vertices.append((0, 0, rings[0][0]))
    bottom_center = len(vertices)
    vertices.append((0, 0, rings[-1][0]))
    for index in range(segments):
        next_index = (index + 1) % segments
        faces.append((top_center, index, next_index))
        lower = (len(rings) - 1) * segments
        faces.append((bottom_center, lower + next_index, lower + index))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    obj.parent = parent
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_text(name, body, location, size, material, parent, collection):
    bpy.ops.object.text_add(location=location, rotation=(math.radians(90), 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.025
    obj.data.bevel_depth = 0.012
    assign_material(obj, material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.parent = parent
    move_to_collection(obj, collection)
    return obj


clear_scene()

base_collection = make_collection("00_Island_Base")
water_collection = make_collection("01_Water")
vegetation_collection = make_collection("02_Vegetation")
attraction_collection = make_collection("03_Attractions")
people_collection = make_collection("04_People")
props_collection = make_collection("05_Props")
lighting_collection = make_collection("90_Lighting")

root = add_empty("Cazzeggio_Maldives_Island")
root["asset_type"] = "interactive_portfolio_island"
root["units"] = "meters"
root["theme"] = "Maldives casual gaming"

rock = make_material("MAT_Cliff_Rock", (0.23, 0.29, 0.35), roughness=0.92)
rock_dark = make_material("MAT_Cliff_Deep", (0.11, 0.15, 0.22), roughness=0.94)
rock_light = make_material("MAT_Cliff_Highlight", (0.35, 0.40, 0.43), roughness=0.9)
sand = make_material("MAT_Sand", (0.93, 0.69, 0.38), roughness=0.92)
sand_light = make_material("MAT_Sand_Light", (1.0, 0.82, 0.52), roughness=0.9)
grass = make_material("MAT_Grass", (0.16, 0.55, 0.35), roughness=0.9)
grass_light = make_material("MAT_Grass_Light", (0.29, 0.72, 0.43), roughness=0.88)
water = make_material(
    "MAT_Lagoon_Water",
    (0.04, 0.76, 0.78),
    roughness=0.18,
    alpha=0.72,
    emission=(0.02, 0.28, 0.32),
    emission_strength=0.16,
)
water_light = make_material(
    "MAT_Waterfall",
    (0.22, 0.91, 0.94),
    roughness=0.12,
    alpha=0.68,
    emission=(0.10, 0.55, 0.65),
    emission_strength=0.38,
)
foam = make_material(
    "MAT_Water_Foam",
    (0.75, 1.0, 0.98),
    roughness=0.22,
    alpha=0.84,
    emission=(0.25, 0.75, 0.78),
    emission_strength=0.25,
)
wood = make_material("MAT_Wood", (0.43, 0.23, 0.12), roughness=0.86)
wood_light = make_material("MAT_Wood_Light", (0.67, 0.39, 0.20), roughness=0.83)
leaf = make_material("MAT_Palm_Leaf", (0.07, 0.48, 0.25), roughness=0.84)
leaf_light = make_material("MAT_Palm_Leaf_Light", (0.16, 0.68, 0.33), roughness=0.82)
white = make_material("MAT_White", (0.94, 0.95, 0.90), roughness=0.6)
dark = make_material("MAT_Dark", (0.035, 0.055, 0.09), roughness=0.55)
purple = make_material(
    "MAT_Cazzeggio_Purple",
    (0.44, 0.08, 0.78),
    roughness=0.35,
    emission=(0.22, 0.02, 0.42),
    emission_strength=0.24,
)
aqua = make_material(
    "MAT_Cazzeggio_Aqua",
    (0.08, 0.78, 0.70),
    roughness=0.32,
    emission=(0.02, 0.34, 0.28),
    emission_strength=0.18,
)
coral = make_material("MAT_Coral", (0.95, 0.18, 0.25), roughness=0.5)
orange = make_material("MAT_Orange", (1.0, 0.35, 0.08), roughness=0.52)
yellow = make_material("MAT_Yellow", (1.0, 0.72, 0.08), roughness=0.5)
blue = make_material("MAT_Blue", (0.08, 0.36, 0.95), roughness=0.48)
pink = make_material("MAT_Pink", (0.95, 0.16, 0.55), roughness=0.5)
metal = make_material("MAT_Metal", (0.35, 0.40, 0.48), metallic=0.68, roughness=0.28)
glass = make_material(
    "MAT_Dark_Glass",
    (0.025, 0.12, 0.20),
    metallic=0.1,
    roughness=0.12,
    alpha=0.72,
    emission=(0.02, 0.15, 0.25),
    emission_strength=0.25,
)

# Floating rock base and layered tropical top.
cliff = add_radial_layer(
    "Island_Cliff_Core",
    [(0.48, 10.7), (-1.0, 10.0), (-3.3, 7.2), (-5.7, 4.1), (-7.7, 0.8)],
    0.80,
    rock,
    root,
    base_collection,
    segments=56,
    seed=11,
)
add_radial_layer(
    "Island_Cliff_Lower",
    [(-3.0, 6.9), (-5.8, 4.0), (-7.5, 0.65)],
    0.79,
    rock_dark,
    root,
    base_collection,
    segments=36,
    seed=21,
)
add_radial_layer(
    "Island_Sand_Shelf",
    [(0.82, 9.35), (0.42, 9.7)],
    0.80,
    sand,
    root,
    base_collection,
    segments=56,
    seed=9,
)
add_radial_layer(
    "Island_Grass_Crown",
    [(1.18, 7.10), (0.78, 7.45)],
    0.78,
    grass,
    root,
    base_collection,
    segments=48,
    seed=17,
)

# Rock strata and hanging crystals add scale to the underside.
for index in range(22):
    angle = index / 22 * math.tau + random.uniform(-0.12, 0.12)
    radius = random.uniform(6.4, 9.8)
    z = random.uniform(-1.5, -4.2)
    size = random.uniform(0.35, 0.9)
    material = rock_light if index % 4 == 0 else rock_dark
    add_sphere(
        f"Cliff_Rock_{index:02d}",
        (math.cos(angle) * radius, math.sin(angle) * radius * 0.8, z),
        (size, size * 0.65, size * 1.2),
        material,
        root,
        base_collection,
        segments=10,
        rings=6,
    )
for index in range(9):
    angle = index / 9 * math.tau + 0.18
    radius = random.uniform(3.2, 6.4)
    depth = random.uniform(1.3, 3.0)
    add_cone(
        f"Hanging_Rock_{index:02d}",
        (math.cos(angle) * radius, math.sin(angle) * radius * 0.8, -5.2),
        random.uniform(0.45, 0.85),
        0.08,
        depth,
        rock_dark,
        root,
        base_collection,
        vertices=8,
    )

# Lagoon rim and shallow inner pools.
add_cylinder(
    "Lagoon_Rim",
    (0, 0, 0.67),
    10.45,
    0.16,
    water,
    root,
    water_collection,
    vertices=64,
    scale=(1.0, 0.80, 1.0),
)
for index, (x, y, sx, sy) in enumerate(
    [(-6.7, -1.7, 2.35, 1.35), (5.8, 2.3, 2.5, 1.25), (4.8, -4.0, 1.55, 0.85)]
):
    add_sphere(
        f"Shallow_Pool_{index:02d}",
        (x, y, 0.94),
        (sx, sy, 0.065),
        water,
        root,
        water_collection,
        segments=28,
        rings=8,
    )

# Main path and secondary stepping-stone route.
path_points = []
for index in range(14):
    angle = index / 14 * math.tau
    path_points.append((math.cos(angle) * 6.25, math.sin(angle) * 4.65, 1.36))
add_curve("Main_Walking_Path", path_points, 0.13, sand_light, root, props_collection, cyclic=True)
for index in range(11):
    angle = index / 11 * math.tau + 0.22
    add_cylinder(
        f"Path_Stone_{index:02d}",
        (math.cos(angle) * 4.0, math.sin(angle) * 2.9, 1.27),
        0.28,
        0.10,
        sand_light,
        root,
        props_collection,
        vertices=8,
        scale=(1.2, 0.8, 1.0),
        rotation=(0, 0, angle),
    )


def create_waterfall(name, angle, width, height):
    parent = add_empty(name, parent=root, collection=water_collection)
    parent["effect"] = "waterfall"
    top_radius = 9.6
    parent.location = (
        math.cos(angle) * top_radius,
        math.sin(angle) * top_radius * 0.8,
        0.72,
    )
    parent.rotation_euler.z = angle - math.pi / 2
    for ribbon in range(3):
        columns = 7
        rows = 15
        vertices = []
        faces = []
        ribbon_width = width * (0.94 - ribbon * 0.10)
        for row in range(rows):
            t = row / (rows - 1)
            for column in range(columns):
                u = column / (columns - 1)
                x = (u - 0.5) * ribbon_width
                y = 0.10 + math.sin(u * math.pi * 3 + t * 8 + ribbon) * 0.08
                y += t * t * 0.85 + ribbon * 0.025
                z = -t * height
                vertices.append((x, y, z))
        for row in range(rows - 1):
            for column in range(columns - 1):
                a = row * columns + column
                b = a + 1
                c = a + columns + 1
                d = a + columns
                faces.append((a, b, c, d))
        mesh = bpy.data.meshes.new(f"{name}_Ribbon_{ribbon}_Mesh")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(f"{name}_Ribbon_{ribbon}", mesh)
        water_collection.objects.link(obj)
        assign_material(obj, water_light if ribbon < 2 else foam)
        obj.parent = parent
    for index in range(10):
        add_sphere(
            f"{name}_Foam_{index:02d}",
            (
                random.uniform(-width * 0.52, width * 0.52),
                random.uniform(-0.15, 0.45),
                random.uniform(-0.02, 0.24),
            ),
            (random.uniform(0.10, 0.28),) * 3,
            foam,
            parent,
            water_collection,
            segments=8,
            rings=5,
        )
    for index in range(7):
        add_sphere(
            f"{name}_Mist_{index:02d}",
            (
                random.uniform(-width * 0.65, width * 0.65),
                random.uniform(0.3, 1.15),
                -height + random.uniform(-0.2, 0.35),
            ),
            (
                random.uniform(0.16, 0.38),
                random.uniform(0.12, 0.30),
                random.uniform(0.10, 0.24),
            ),
            foam,
            parent,
            water_collection,
            segments=8,
            rings=5,
        )


create_waterfall("Waterfall_East", 0.10, 2.6, 7.4)
create_waterfall("Waterfall_SouthWest", math.radians(220), 2.2, 6.8)
create_waterfall("Waterfall_North", math.radians(92), 3.0, 7.8)


def create_palm(index, x, y, scale=1.0, lean=0.0):
    palm = add_empty(f"Palm_{index:02d}", (x, y, 1.1), root, vegetation_collection)
    trunk = add_cone(
        f"Palm_{index:02d}_Trunk",
        (0, 0, 1.35 * scale),
        0.20 * scale,
        0.11 * scale,
        2.7 * scale,
        wood_light,
        palm,
        vegetation_collection,
        vertices=9,
        rotation=(0, lean, 0),
    )
    crown_x = math.sin(lean) * 2.5 * scale
    crown_z = 2.65 * scale
    for leaf_index in range(7):
        angle = leaf_index / 7 * math.tau
        leaf_obj = add_cone(
            f"Palm_{index:02d}_Leaf_{leaf_index}",
            (
                crown_x + math.cos(angle) * 0.72 * scale,
                math.sin(angle) * 0.72 * scale,
                crown_z + random.uniform(-0.08, 0.12) * scale,
            ),
            0.26 * scale,
            0.035 * scale,
            1.85 * scale,
            leaf_light if leaf_index % 3 == 0 else leaf,
            palm,
            vegetation_collection,
            vertices=6,
            rotation=(0, math.radians(70), angle),
            scale=(1.0, 0.48, 1.0),
        )
    for coconut_index in range(3):
        add_sphere(
            f"Palm_{index:02d}_Coconut_{coconut_index}",
            (
                crown_x + math.cos(coconut_index * 2.1) * 0.18,
                math.sin(coconut_index * 2.1) * 0.18,
                crown_z - 0.18,
            ),
            (0.14, 0.14, 0.14),
            wood,
            palm,
            vegetation_collection,
            segments=8,
            rings=5,
        )


palm_positions = [
    (-7.8, -3.6, 1.05, -0.10),
    (-8.2, 1.5, 0.95, 0.12),
    (-6.4, 4.5, 0.90, -0.08),
    (-2.6, 5.7, 0.82, 0.10),
    (1.1, 5.8, 0.95, -0.12),
    (6.8, 4.2, 0.92, 0.08),
    (8.0, 1.1, 1.10, -0.10),
    (7.7, -2.4, 1.00, 0.10),
    (5.5, -4.9, 0.86, -0.08),
    (0.7, -5.7, 1.0, 0.07),
    (-3.6, -5.2, 0.82, -0.10),
    (3.3, 4.3, 0.72, 0.07),
]
for palm_index, palm_data in enumerate(palm_positions):
    create_palm(palm_index, *palm_data)

# Central pavilion / project hub.
hub = add_empty("Attraction_Hub", (0, -0.15, 1.22), root, attraction_collection)
hub["attraction_id"] = "hub"
add_cylinder("Hub_Platform", (0, 0, 0.22), 2.15, 0.42, white, hub, attraction_collection, vertices=20)
add_cylinder("Hub_Building", (0, 0, 1.18), 1.65, 1.55, purple, hub, attraction_collection, vertices=16)
add_cylinder("Hub_Glass", (0, -0.02, 1.28), 1.35, 1.10, glass, hub, attraction_collection, vertices=16)
add_cone("Hub_Roof", (0, 0, 2.35), 2.05, 0.18, 0.92, white, hub, attraction_collection, vertices=16)
add_torus(
    "Hub_Portal",
    (0, -1.56, 0.98),
    0.68,
    0.11,
    aqua,
    hub,
    attraction_collection,
    rotation=(math.radians(90), 0, 0),
)
add_cylinder("Hub_Antenna", (0, 0, 3.12), 0.06, 1.45, metal, hub, attraction_collection, vertices=8)
for ring_index in range(3):
    add_torus(
        f"Hub_Signal_{ring_index}",
        (0, 0, 3.55 + ring_index * 0.30),
        0.30 + ring_index * 0.18,
        0.026,
        purple,
        hub,
        attraction_collection,
        rotation=(math.radians(90), 0, 0),
        major_segments=24,
        minor_segments=6,
    )
create_text("Hub_Title", "CAZZEGGIO", (0, -1.76, 3.08), 0.46, white, hub, attraction_collection)

# Puzzle monument.
blast = add_empty("Attraction_Blast", (-4.7, -2.6, 1.25), root, attraction_collection)
blast["attraction_id"] = "blast"
add_cylinder("Blast_Platform", (0, 0, 0.16), 1.85, 0.32, dark, blast, attraction_collection, vertices=14)
block_colors = [aqua, blue, purple, coral, yellow, grass_light]
block_layout = [
    (-0.8, 0, 0.65),
    (0, 0, 0.65),
    (0.8, 0, 0.65),
    (-0.8, 0, 1.45),
    (0, 0, 1.45),
    (0, 0, 2.25),
    (0.8, 0, 2.25),
    (0.8, 0, 3.05),
    (0, 0.72, 0.65),
    (0, 0.72, 1.45),
]
for index, (x, y, z) in enumerate(block_layout):
    add_cube(
        f"Blast_Block_{index:02d}",
        (x, y, z),
        (0.36, 0.36, 0.36),
        block_colors[index % len(block_colors)],
        blast,
        attraction_collection,
        bevel=0.08,
    )
add_cone("Blast_Crown", (0.80, 0, 3.80), 0.62, 0.0, 0.9, yellow, blast, attraction_collection, vertices=5)
create_text("Blast_Title", "BLAST", (0, -0.62, 4.15), 0.44, aqua, blast, attraction_collection)

# Kebab Smash booth and oversized arcade prop.
kebab = add_empty("Attraction_Kebab", (4.65, -2.65, 1.18), root, attraction_collection)
kebab["attraction_id"] = "kebab"
add_cube("Kebab_Booth", (0, 0, 0.62), (1.35, 0.82, 0.62), wood_light, kebab, attraction_collection, bevel=0.10)
add_cube("Kebab_Awning", (0, -0.04, 1.42), (1.55, 1.02, 0.12), orange, kebab, attraction_collection, bevel=0.06)
add_cylinder("Kebab_Skewer", (0.35, 0, 2.48), 0.035, 3.2, metal, kebab, attraction_collection, vertices=8)
for layer_index in range(8):
    add_cylinder(
        f"Kebab_Meat_{layer_index:02d}",
        (0.35, 0, 1.15 + layer_index * 0.31),
        0.58 - layer_index * 0.035,
        0.28,
        orange if layer_index % 2 == 0 else coral,
        kebab,
        attraction_collection,
        vertices=9,
        rotation=(0, 0, layer_index * 0.25),
    )
hammer = add_empty("Kebab_Hammer", (-0.95, -0.45, 1.15), kebab, attraction_collection)
hammer.rotation_euler = (0, math.radians(-30), math.radians(-28))
add_cylinder("Hammer_Handle", (0, 0, 0.66), 0.08, 1.32, wood, hammer, attraction_collection, vertices=8)
add_cube("Hammer_Head", (0, 0, 1.36), (0.48, 0.26, 0.24), dark, hammer, attraction_collection, bevel=0.06)
create_text("Kebab_Title", "KEBAB SMASH", (0, -1.04, 3.78), 0.34, orange, kebab, attraction_collection)

# Mini GP track, start arch and three stylised cars.
gp = add_empty("Attraction_GP", (-2.65, 3.55, 1.22), root, attraction_collection)
gp["attraction_id"] = "gp"
track_points = [
    (-2.2, -0.6, 0.18),
    (-1.2, -1.45, 0.18),
    (0.8, -1.40, 0.18),
    (2.15, -0.45, 0.18),
    (1.65, 1.10, 0.18),
    (-0.2, 1.45, 0.18),
    (-2.0, 0.85, 0.18),
]
add_curve("GP_Track", track_points, 0.42, dark, gp, attraction_collection, cyclic=True)
add_curve("GP_Curb_Outer", [(x * 1.08, y * 1.08, z + 0.05) for x, y, z in track_points], 0.08, coral, gp, attraction_collection, cyclic=True)
add_cube("GP_Arch_Left", (-1.0, -1.18, 0.70), (0.12, 0.12, 0.70), white, gp, attraction_collection)
add_cube("GP_Arch_Right", (1.0, -1.18, 0.70), (0.12, 0.12, 0.70), white, gp, attraction_collection)
add_cube("GP_Arch_Top", (0, -1.18, 1.38), (1.12, 0.12, 0.12), coral, gp, attraction_collection)
for car_index, (x, y, angle, car_material) in enumerate(
    [(-1.55, -0.90, 0.3, coral), (1.45, -0.65, 2.0, yellow), (0.45, 1.20, 3.8, aqua)]
):
    car = add_empty(f"GP_Car_{car_index}", (x, y, 0.42), gp, attraction_collection)
    car.rotation_euler.z = angle
    add_cube("Car_Body", (0, 0, 0.10), (0.22, 0.46, 0.12), car_material, car, attraction_collection, bevel=0.08)
    add_cube("Car_Nose", (0, -0.48, 0.06), (0.12, 0.22, 0.07), car_material, car, attraction_collection, bevel=0.04)
    add_cube("Car_Wing", (0, 0.48, 0.15), (0.38, 0.07, 0.04), dark, car, attraction_collection)
create_text("GP_Title", "CAZZEGGIO GP", (0, -1.52, 2.04), 0.34, coral, gp, attraction_collection)

# AFK beach club, umbrellas, loungers and beach toys.
beach = add_empty("Attraction_Beach_Club", (5.25, 3.35, 1.02), root, attraction_collection)
beach["attraction_id"] = "beach"
add_cube("Beach_Tiki_Bar", (0, 0, 0.62), (1.25, 0.70, 0.62), wood_light, beach, attraction_collection, bevel=0.08)
add_cone("Beach_Tiki_Roof", (0, 0, 1.62), 1.75, 0.25, 0.70, wood, beach, attraction_collection, vertices=4, rotation=(0, 0, math.radians(45)))
create_text("Beach_Title", "AFK CLUB", (0, -0.82, 2.25), 0.36, aqua, beach, attraction_collection)
for umbrella_index, (x, y, umbrella_material) in enumerate(
    [(-2.05, 0.9, aqua), (1.9, 1.2, pink), (0.6, 2.35, yellow)]
):
    umbrella = add_empty(f"Beach_Umbrella_{umbrella_index}", (x, y, 0), beach, attraction_collection)
    add_cylinder("Umbrella_Pole", (0, 0, 0.80), 0.035, 1.60, white, umbrella, attraction_collection, vertices=8)
    add_cone("Umbrella_Canopy", (0, 0, 1.62), 0.82, 0.05, 0.36, umbrella_material, umbrella, attraction_collection, vertices=12)
for lounger_index, (x, y, rotation, lounger_material) in enumerate(
    [(-1.9, 2.0, -0.2, white), (1.8, 2.15, 0.18, white), (0.0, 2.8, 0.0, coral)]
):
    lounger = add_cube(
        f"Beach_Lounger_{lounger_index}",
        (x, y, 0.22),
        (0.32, 0.78, 0.07),
        lounger_material,
        beach,
        attraction_collection,
        bevel=0.04,
    )
    lounger.rotation_euler.z = rotation
add_sphere("Beach_Ball", (1.0, 2.55, 0.32), (0.28, 0.28, 0.28), white, beach, attraction_collection, segments=12, rings=7)
add_torus("Beach_Float", (-0.8, 2.7, 0.35), 0.45, 0.13, pink, beach, attraction_collection, rotation=(0, 0, 0), major_segments=24, minor_segments=7)

# Small jetty and boat reinforce the Maldives setting.
for plank_index in range(9):
    add_cube(
        f"Jetty_Plank_{plank_index:02d}",
        (7.3 + plank_index * 0.38, -0.2, 0.98 - plank_index * 0.012),
        (0.17, 0.82, 0.08),
        wood_light,
        root,
        props_collection,
        bevel=0.025,
    )
for post_index, x in enumerate([7.0, 8.3, 9.6, 10.45]):
    for y in (-0.72, 0.72):
        add_cylinder(f"Jetty_Post_{post_index}_{y}", (x, y, 0.55), 0.07, 1.05, wood, root, props_collection, vertices=8)
boat = add_empty("Lagoon_Boat", (7.8, 1.8, 0.95), root, props_collection)
boat.rotation_euler.z = math.radians(-18)
add_sphere("Boat_Hull", (0, 0, 0), (0.65, 1.55, 0.28), white, boat, props_collection, segments=16, rings=8)
add_cube("Boat_Seat", (0, 0.05, 0.28), (0.48, 0.55, 0.10), wood_light, boat, props_collection, bevel=0.05)
add_cylinder("Boat_Mast", (0, 0.2, 1.20), 0.035, 2.1, metal, boat, props_collection, vertices=8)
add_cone("Boat_Sail", (0.08, 0.2, 1.35), 0.75, 0.05, 1.65, aqua, boat, props_collection, vertices=3, rotation=(math.radians(90), 0, 0))

# Decorative rocks, flowers, arcade tokens and signs.
for index in range(14):
    angle = index / 14 * math.tau + random.uniform(-0.16, 0.16)
    radius = random.uniform(7.5, 9.0)
    add_sphere(
        f"Beach_Rock_{index:02d}",
        (math.cos(angle) * radius, math.sin(angle) * radius * 0.8, 0.98),
        (
            random.uniform(0.28, 0.65),
            random.uniform(0.22, 0.52),
            random.uniform(0.25, 0.58),
        ),
        rock_light if index % 3 == 0 else rock,
        root,
        props_collection,
        segments=10,
        rings=6,
    )
for index in range(18):
    angle = random.random() * math.tau
    radius = random.uniform(2.4, 6.8)
    flower_material = [pink, yellow, aqua][index % 3]
    add_sphere(
        f"Tropical_Flower_{index:02d}",
        (math.cos(angle) * radius, math.sin(angle) * radius * 0.76, 1.32),
        (0.10, 0.10, 0.10),
        flower_material,
        root,
        vegetation_collection,
        segments=8,
        rings=5,
    )

# Rounded inhabitants, split into named roots and animated around two walking loops.
skin_materials = [
    make_material("MAT_Skin_01", (0.91, 0.58, 0.40), roughness=0.72),
    make_material("MAT_Skin_02", (0.65, 0.36, 0.23), roughness=0.72),
    make_material("MAT_Skin_03", (0.38, 0.19, 0.12), roughness=0.72),
    make_material("MAT_Skin_04", (0.96, 0.72, 0.54), roughness=0.72),
]
shirt_materials = [purple, aqua, coral, yellow, blue, pink, grass_light]
hair_materials = [dark, wood, rock_dark]


def create_person(index):
    person = add_empty(f"Walker_{index:02d}", parent=root, collection=people_collection)
    person["animation_role"] = "island_walker"
    skin_mat = skin_materials[index % len(skin_materials)]
    shirt_mat = shirt_materials[index % len(shirt_materials)]
    hair_mat = hair_materials[index % len(hair_materials)]
    scale = 0.74 + (index % 4) * 0.035
    add_sphere("Body", (0, 0, 0.86 * scale), (0.29 * scale, 0.25 * scale, 0.46 * scale), shirt_mat, person, people_collection, segments=12, rings=8)
    add_sphere("Head", (0, 0, 1.48 * scale), (0.25 * scale, 0.24 * scale, 0.26 * scale), skin_mat, person, people_collection, segments=12, rings=8)
    add_sphere("Hair", (0, 0.01, 1.66 * scale), (0.255 * scale, 0.245 * scale, 0.12 * scale), hair_mat, person, people_collection, segments=12, rings=6)
    for side in (-1, 1):
        add_sphere(
            f"Leg_{side}",
            (side * 0.13 * scale, 0, 0.35 * scale),
            (0.085 * scale, 0.085 * scale, 0.30 * scale),
            dark,
            person,
            people_collection,
            segments=8,
            rings=6,
        )
        arm = add_sphere(
            f"Arm_{side}",
            (side * 0.34 * scale, -0.03, 0.92 * scale),
            (0.075 * scale, 0.075 * scale, 0.28 * scale),
            skin_mat,
            person,
            people_collection,
            segments=8,
            rings=6,
        )
        arm.rotation_euler.y = side * math.radians(16)
    if index % 3 == 0:
        add_cube("Phone", (0, -0.29 * scale, 1.02 * scale), (0.12, 0.025, 0.19), dark, person, people_collection, bevel=0.025)
    phase = index / 16 * math.tau
    radius_x = 6.15 if index < 11 else 3.75
    radius_y = 4.55 if index < 11 else 2.65
    frames = [1, 81, 161, 241, 321]
    for key_index, frame in enumerate(frames):
        angle = phase + key_index / 4 * math.tau
        person.location = (math.cos(angle) * radius_x, math.sin(angle) * radius_y, 1.30)
        person.rotation_euler = (0, 0, angle + math.pi / 2)
        person.keyframe_insert(data_path="location", frame=frame)
        person.keyframe_insert(data_path="rotation_euler", frame=frame)
    # Blender 5.x stores layered actions differently from legacy F-curves.
    # The exported keyframes remain cyclic and use Blender's default smooth interpolation.


for person_index in range(16):
    create_person(person_index)

# Lighting and presentation camera.
world = bpy.context.scene.world
world.use_nodes = True
world.color = (0.005, 0.012, 0.028)
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.006, 0.015, 0.035, 1.0)
background.inputs["Strength"].default_value = 0.28

bpy.ops.object.light_add(type="SUN", location=(8, -10, 18))
sun = bpy.context.object
sun.name = "Sun_Key"
sun.data.energy = 3.0
sun.data.color = (1.0, 0.72, 0.50)
sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-28))
move_to_collection(sun, lighting_collection)

bpy.ops.object.light_add(type="AREA", location=(-10, -9, 14))
fill = bpy.context.object
fill.name = "Sky_Fill"
fill.data.energy = 1700
fill.data.shape = "DISK"
fill.data.size = 10
fill.data.color = (0.35, 0.68, 1.0)
look_at(fill, (0, 0, 0))
move_to_collection(fill, lighting_collection)

bpy.ops.object.light_add(type="AREA", location=(10, 7, 7))
rim = bpy.context.object
rim.name = "Aqua_Rim"
rim.data.energy = 1100
rim.data.size = 7
rim.data.color = (0.15, 1.0, 0.85)
look_at(rim, (0, 0, -1))
move_to_collection(rim, lighting_collection)

bpy.ops.object.light_add(type="AREA", location=(4, -8, -6))
underside = bpy.context.object
underside.name = "Underside_Fill"
underside.data.energy = 1250
underside.data.size = 8
underside.data.color = (0.18, 0.28, 0.75)
look_at(underside, (0, 0, -3.6))
move_to_collection(underside, lighting_collection)

bpy.ops.object.camera_add(location=(24.5, -29.5, 22.0))
camera = bpy.context.object
camera.name = "Camera_Hero"
camera.data.lens = 52
look_at(camera, (0, 0, -1.2))
move_to_collection(camera, lighting_collection)
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = os.path.join(ROOT_DIR, "tmp", "blender-previews", "cazzeggio_maldives_hero.png")
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 320
scene.frame_set(1)

# Metadata for the web integration.
scene["asset_name"] = "Cazzeggio Maldives Island"
scene["recommended_scale"] = "1 Blender unit = 1 meter"
scene["animation_clip"] = "Walkers loop frames 1-320 at 30fps"
scene["threejs_up_axis"] = "GLB exporter converts Blender Z-up to glTF Y-up"

os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

_result = {
    "blend_file": BLEND_PATH,
    "objects": len(bpy.context.scene.objects),
    "collections": [collection.name for collection in bpy.context.scene.collection.children],
    "frame_range": [scene.frame_start, scene.frame_end],
}
