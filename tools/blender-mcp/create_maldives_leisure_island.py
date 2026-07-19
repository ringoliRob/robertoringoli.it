import bpy
import math
import os
import random
from mathutils import Vector


random.seed(84)

ROOT_DIR = r"C:\Users\rober\Documents\GitHub\robertoringoli.it"
BLEND_PATH = os.path.join(ROOT_DIR, "assets", "blender", "maldives_leisure_island.blend")


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


def collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to(obj, target):
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    target.objects.link(obj)


def material(
    name,
    color,
    roughness=0.65,
    metallic=0.0,
    alpha=1.0,
    emission=None,
    emission_strength=0.0,
):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, alpha)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*emission, 1.0)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission_strength
    if alpha < 1:
        result.surface_render_method = "DITHERED"
        result.use_transparency_overlap = False
    return result


def assign(obj, mat):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)


def smooth(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def empty(name, location=(0, 0, 0), parent=None, target=None):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    obj.parent = parent
    (target or bpy.context.scene.collection).objects.link(obj)
    return obj


def cube(name, location, scale, mat, parent, target, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel:
        modifier = obj.modifiers.new("Rounded_Edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    obj.parent = parent
    move_to(obj, target)
    return obj


def cylinder(
    name,
    location,
    radius,
    depth,
    mat,
    parent,
    target,
    vertices=24,
    scale=(1, 1, 1),
    rotation=(0, 0, 0),
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    smooth(obj)
    obj.parent = parent
    move_to(obj, target)
    return obj


def cone(
    name,
    location,
    radius1,
    radius2,
    depth,
    mat,
    parent,
    target,
    vertices=24,
    scale=(1, 1, 1),
    rotation=(0, 0, 0),
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
    assign(obj, mat)
    smooth(obj)
    obj.parent = parent
    move_to(obj, target)
    return obj


def sphere(name, location, scale, mat, parent, target, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=1,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    smooth(obj)
    obj.parent = parent
    move_to(obj, target)
    return obj


def torus(
    name,
    location,
    major_radius,
    minor_radius,
    mat,
    parent,
    target,
    rotation=(0, 0, 0),
    major_segments=64,
    minor_segments=12,
    scale=(1, 1, 1),
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
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    smooth(obj)
    obj.parent = parent
    move_to(obj, target)
    return obj


def radial_layer(name, rings, mat, parent, target, segments=96, seed=0, offset=(0, 0)):
    rng = random.Random(seed)
    phase_a = rng.random() * math.tau
    phase_b = rng.random() * math.tau
    vertices = []
    for z, rx, ry in rings:
        for index in range(segments):
            angle = index / segments * math.tau
            variation = (
                1
                + math.sin(angle * 3 + phase_a) * 0.025
                + math.sin(angle * 7 + phase_b) * 0.014
                + math.sin(angle * 13 + seed) * 0.006
            )
            vertices.append(
                (
                    offset[0] + math.cos(angle) * rx * variation,
                    offset[1] + math.sin(angle) * ry * variation,
                    z,
                )
            )
    faces = []
    for ring_index in range(len(rings) - 1):
        a = ring_index * segments
        b = (ring_index + 1) * segments
        for index in range(segments):
            following = (index + 1) % segments
            faces.append((a + index, a + following, b + following, b + index))
    top = len(vertices)
    vertices.append((offset[0], offset[1], rings[0][0]))
    bottom = len(vertices)
    vertices.append((offset[0], offset[1], rings[-1][0]))
    lower = (len(rings) - 1) * segments
    for index in range(segments):
        following = (index + 1) % segments
        faces.append((top, index, following))
        faces.append((bottom, lower + following, lower + index))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    assign(obj, mat)
    smooth(obj)
    obj.parent = parent
    return obj


def curve(name, points, bevel, mat, parent, target, cyclic=False, resolution=4):
    data = bpy.data.curves.new(name + "_Curve", "CURVE")
    data.dimensions = "3D"
    data.resolution_u = resolution
    data.bevel_depth = bevel
    data.bevel_resolution = 3
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    target.objects.link(obj)
    assign(obj, mat)
    obj.parent = parent
    return obj


def poly_curve(name, points, bevel, mat, parent, target, cyclic=False):
    data = bpy.data.curves.new(name + "_Curve", "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 1
    data.bevel_depth = bevel
    data.bevel_resolution = 3
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    target.objects.link(obj)
    assign(obj, mat)
    obj.parent = parent
    return obj


def catmull_rom_loop(points, samples_per_segment=14):
    vectors = [Vector(point) for point in points]
    sampled = []
    count = len(vectors)
    for index in range(count):
        p0 = vectors[(index - 1) % count]
        p1 = vectors[index]
        p2 = vectors[(index + 1) % count]
        p3 = vectors[(index + 2) % count]
        for step in range(samples_per_segment):
            t = step / samples_per_segment
            t2 = t * t
            t3 = t2 * t
            point = 0.5 * (
                2 * p1
                + (-p0 + p2) * t
                + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            )
            sampled.append(tuple(point))
    return sampled


def cylinder_between(name, start, end, radius, mat, parent, target, vertices=16):
    start_vector = Vector(start)
    end_vector = Vector(end)
    middle = (start_vector + end_vector) * 0.5
    direction = end_vector - start_vector
    obj = cylinder(
        name,
        middle,
        radius,
        direction.length,
        mat,
        parent,
        target,
        vertices=vertices,
    )
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


clear_scene()

base_col = collection("00_Floating_Island")
water_col = collection("01_Lagoon_And_Waterfalls")
beach_col = collection("02_Beach")
green_col = collection("03_Vegetation")
waterpark_col = collection("04_Waterpark")
park_col = collection("05_Amusement_Park")
props_col = collection("06_Architecture_And_Props")
light_col = collection("90_Lighting")

root = empty("Maldives_Leisure_Island")
root["asset_type"] = "floating_tropical_leisure_island"
root["dimensions_m"] = "approximately 84 x 58 x 22"
root["zones"] = "Beach, Waterpark, AmusementPark"

# Natural, slightly desaturated palette.
mat_rock = material("MAT_Rock_Limestone", (0.28, 0.31, 0.31), roughness=0.92)
mat_rock_dark = material("MAT_Rock_Shadow", (0.12, 0.15, 0.17), roughness=0.95)
mat_rock_warm = material("MAT_Rock_Warm", (0.39, 0.36, 0.31), roughness=0.90)
mat_sand = material("MAT_Coral_Sand", (0.88, 0.78, 0.61), roughness=0.94)
mat_sand_dry = material("MAT_Dry_Sand", (0.96, 0.87, 0.70), roughness=0.95)
mat_grass = material("MAT_Tropical_Grass", (0.16, 0.39, 0.20), roughness=0.90)
mat_grass_light = material("MAT_Fresh_Grass", (0.25, 0.52, 0.27), roughness=0.88)
mat_leaf = material("MAT_Palm_Leaf", (0.06, 0.31, 0.16), roughness=0.82)
mat_leaf_light = material("MAT_Leaf_Highlight", (0.12, 0.48, 0.22), roughness=0.80)
mat_trunk = material("MAT_Palm_Trunk", (0.38, 0.24, 0.14), roughness=0.88)
mat_wood = material("MAT_Teak_Wood", (0.42, 0.25, 0.13), roughness=0.82)
mat_wood_light = material("MAT_Light_Wood", (0.64, 0.42, 0.23), roughness=0.80)
mat_water = material(
    "MAT_Lagoon_Water",
    (0.03, 0.50, 0.55),
    roughness=0.12,
    alpha=0.72,
    emission=(0.02, 0.18, 0.20),
    emission_strength=0.14,
)
mat_shallow = material(
    "MAT_Shallow_Water",
    (0.08, 0.72, 0.70),
    roughness=0.10,
    alpha=0.67,
    emission=(0.03, 0.28, 0.26),
    emission_strength=0.18,
)
mat_foam = material(
    "MAT_Sea_Foam",
    (0.78, 0.96, 0.93),
    roughness=0.18,
    alpha=0.82,
    emission=(0.15, 0.45, 0.45),
    emission_strength=0.20,
)
mat_white = material("MAT_Warm_White", (0.92, 0.91, 0.86), roughness=0.52)
mat_dark = material("MAT_Structure_Dark", (0.055, 0.075, 0.085), roughness=0.48)
mat_metal = material("MAT_Steel", (0.38, 0.42, 0.44), roughness=0.28, metallic=0.72)
mat_red = material("MAT_Park_Red", (0.68, 0.08, 0.07), roughness=0.46)
mat_blue = material("MAT_Park_Blue", (0.05, 0.25, 0.55), roughness=0.42)
mat_teal = material("MAT_Park_Teal", (0.02, 0.48, 0.45), roughness=0.38)
mat_yellow = material("MAT_Park_Yellow", (0.92, 0.55, 0.05), roughness=0.44)
mat_coral = material("MAT_Park_Coral", (0.86, 0.19, 0.16), roughness=0.45)
mat_pink = material("MAT_Park_Pink", (0.78, 0.16, 0.38), roughness=0.44)
mat_pool = material(
    "MAT_Pool_Water",
    (0.02, 0.50, 0.66),
    roughness=0.08,
    alpha=0.78,
    emission=(0.02, 0.24, 0.35),
    emission_strength=0.20,
)
mat_glass = material("MAT_Glass", (0.20, 0.55, 0.62), roughness=0.08, alpha=0.48)

# 84 x 58 meter floating island with a rounded, detailed underside.
radial_layer(
    "Floating_Cliff_Main",
    [
        (0.58, 41.5, 28.8),
        (-2.0, 40.8, 28.1),
        (-6.0, 36.0, 24.6),
        (-11.0, 28.0, 19.0),
        (-16.5, 17.0, 11.5),
        (-20.5, 4.0, 2.8),
    ],
    mat_rock,
    root,
    base_col,
    segments=128,
    seed=14,
)
radial_layer(
    "Floating_Cliff_Deep_Core",
    [(-7.0, 34.0, 23.0), (-13.0, 25.0, 16.5), (-19.5, 5.5, 3.5)],
    mat_rock_dark,
    root,
    base_col,
    segments=96,
    seed=33,
)
radial_layer(
    "Wide_Beach_Shelf",
    [(1.18, 37.2, 24.8), (0.55, 38.6, 26.0)],
    mat_sand,
    root,
    base_col,
    segments=128,
    seed=22,
    offset=(-2.8, -1.7),
)
radial_layer(
    "Lush_Interior",
    [(1.76, 24.0, 14.5), (1.05, 25.0, 15.5)],
    mat_grass,
    root,
    base_col,
    segments=112,
    seed=47,
    offset=(3.0, 5.0),
)

# Rock shelves, cavities and long hanging formations.
for index in range(56):
    angle = index / 56 * math.tau + random.uniform(-0.055, 0.055)
    rx = random.uniform(33.0, 40.2)
    ry_scale = 0.69
    z = random.uniform(-2.5, -12.5)
    size = random.uniform(0.9, 2.5)
    sphere(
        f"Cliff_Detail_{index:02d}",
        (math.cos(angle) * rx, math.sin(angle) * rx * ry_scale, z),
        (size * 1.25, size * 0.72, size),
        mat_rock_warm if index % 5 == 0 else mat_rock_dark,
        root,
        base_col,
        segments=16,
        rings=10,
    )
for index in range(18):
    angle = index / 18 * math.tau + random.uniform(-0.12, 0.12)
    radius = random.uniform(9.0, 25.0)
    length = random.uniform(3.0, 7.5)
    cone(
        f"Hanging_Stone_{index:02d}",
        (math.cos(angle) * radius, math.sin(angle) * radius * 0.68, -15.8),
        random.uniform(0.9, 2.2),
        0.12,
        length,
        mat_rock_dark,
        root,
        base_col,
        vertices=20,
    )

# Large turquoise rim and two shallow lagoons cut visually into the beach.
cylinder(
    "Lagoon_Surface",
    (0, 0, 0.78),
    41.0,
    0.22,
    mat_water,
    root,
    water_col,
    vertices=128,
    scale=(1.0, 0.70, 1.0),
)
sphere(
    "South_Shallow_Lagoon",
    (-7.0, -14.8, 1.24),
    (20.0, 7.8, 0.13),
    mat_shallow,
    root,
    water_col,
    segments=64,
    rings=16,
)
sphere(
    "West_Shallow_Lagoon",
    (-27.0, -1.5, 1.24),
    (8.0, 11.0, 0.13),
    mat_shallow,
    root,
    water_col,
    segments=56,
    rings=14,
)

# Subtle partial wave lines along the southern beach.
for index, (rx, ry) in enumerate([(31.8, 18.8), (34.0, 20.5), (36.0, 22.0)]):
    wave_points = []
    for point_index in range(15):
        angle = math.radians(202 + point_index / 14 * 136)
        wave_points.append(
            (
                -2.0 + math.cos(angle) * rx,
                -1.2 + math.sin(angle) * ry,
                1.34 + index * 0.015,
            )
        )
    curve(
        f"Shore_Wave_{index}",
        wave_points,
        0.07,
        mat_foam,
        root,
        water_col,
        cyclic=False,
        resolution=5,
    )


def waterfall(name, angle, width, height):
    group = empty(name, parent=root, target=water_col)
    radius_x = 40.6
    radius_y = 28.0
    group.location = (math.cos(angle) * radius_x, math.sin(angle) * radius_y, 0.82)
    group.rotation_euler.z = angle - math.pi / 2
    for ribbon in range(4):
        columns = 10
        rows = 26
        vertices = []
        faces = []
        for row in range(rows):
            t = row / (rows - 1)
            for column_index in range(columns):
                u = column_index / (columns - 1)
                x = (u - 0.5) * width * (1 - ribbon * 0.055)
                y = t * t * 2.4 + math.sin(u * math.pi * 4 + t * 10 + ribbon) * 0.18
                z = -t * height
                vertices.append((x, y + ribbon * 0.035, z))
        for row in range(rows - 1):
            for column_index in range(columns - 1):
                a = row * columns + column_index
                faces.append((a, a + 1, a + columns + 1, a + columns))
        mesh = bpy.data.meshes.new(f"{name}_Sheet_{ribbon}_Mesh")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(f"{name}_Sheet_{ribbon}", mesh)
        water_col.objects.link(obj)
        assign(obj, mat_shallow if ribbon < 3 else mat_foam)
        smooth(obj)
        obj.parent = group
    for index in range(22):
        sphere(
            f"{name}_Foam_{index:02d}",
            (
                random.uniform(-width * 0.55, width * 0.55),
                random.uniform(-0.2, 1.0),
                random.uniform(-0.05, 0.34),
            ),
            (
                random.uniform(0.18, 0.55),
                random.uniform(0.14, 0.42),
                random.uniform(0.12, 0.34),
            ),
            mat_foam,
            group,
            water_col,
            segments=12,
            rings=8,
        )


waterfall("Waterfall_East", math.radians(7), 6.0, 20.0)
waterfall("Waterfall_West", math.radians(196), 5.0, 18.5)
waterfall("Waterfall_North", math.radians(98), 7.0, 21.0)

def palm(index, x, y, scale=1.0, lean=0.0):
    group = empty(f"Palm_{index:02d}", (x, y, 1.38), root, green_col)
    trunk = cone(
        f"Palm_{index:02d}_Trunk",
        (0, 0, 3.3 * scale),
        0.42 * scale,
        0.22 * scale,
        6.6 * scale,
        mat_trunk,
        group,
        green_col,
        vertices=18,
        rotation=(0, lean, 0),
    )
    crown_x = math.sin(lean) * 5.8 * scale
    crown_z = 6.55 * scale
    for leaf_index in range(9):
        angle = leaf_index / 9 * math.tau
        leaf_obj = sphere(
            f"Palm_{index:02d}_Leaf_{leaf_index}",
            (
                crown_x + math.cos(angle) * 1.55 * scale,
                math.sin(angle) * 1.55 * scale,
                crown_z + math.sin(leaf_index * 1.7) * 0.18 * scale,
            ),
            (2.2 * scale, 0.36 * scale, 0.15 * scale),
            mat_leaf_light if leaf_index % 4 == 0 else mat_leaf,
            group,
            green_col,
            segments=20,
            rings=10,
        )
        leaf_obj.rotation_euler.z = angle
        leaf_obj.rotation_euler.y = math.radians(-12)
    for coconut_index in range(4):
        sphere(
            f"Palm_{index:02d}_Coconut_{coconut_index}",
            (
                crown_x + math.cos(coconut_index * 1.57) * 0.38,
                math.sin(coconut_index * 1.57) * 0.38,
                crown_z - 0.42,
            ),
            (0.27, 0.27, 0.30),
            mat_trunk,
            group,
            green_col,
            segments=14,
            rings=10,
        )


palm_positions = [
    (-36, -8, 1.02, -0.06),
    (-31, -12, 0.92, 0.07),
    (-18, -7, 0.96, -0.08),
    (-8, -6, 0.88, 0.05),
    (2, -7, 0.94, -0.05),
    (11, -7, 1.02, 0.07),
    (20, -7, 0.96, -0.06),
    (30, -6, 1.06, 0.08),
    (33, 2, 0.92, -0.06),
    (31, 11, 1.02, 0.07),
    (24, 18, 0.94, -0.08),
    (14, 21, 1.08, 0.05),
    (4, 22, 1.02, -0.06),
    (-6, 20, 0.92, 0.07),
    (-15, 18, 1.04, -0.06),
    (-24, 16, 0.95, 0.08),
    (-32, 12, 1.00, -0.05),
    (-36, 5, 0.90, 0.05),
    (-36, -3, 0.96, -0.04),
]
for palm_index, data in enumerate(palm_positions):
    palm(palm_index, *data)

# BEACH: large open area with cabanas, loungers, umbrellas, volleyball and a long pier.
beach_zone = empty("Zone_Beach", (0, 0, 0), root, beach_col)
beach_zone["zone_id"] = "beach"
for row in range(2):
    for column_index in range(6):
        x = -18 + column_index * 6.2 + row * 1.0
        y = -16.5 + row * 3.3
        color = [mat_white, mat_teal, mat_coral][(row + column_index) % 3]
        umbrella = empty(f"Beach_Umbrella_{row}_{column_index}", (x, y, 1.4), beach_zone, beach_col)
        cylinder("Pole", (0, 0, 1.45), 0.075, 2.9, mat_white, umbrella, beach_col, vertices=16)
        cone("Canopy", (0, 0, 2.92), 1.75, 0.12, 0.65, color, umbrella, beach_col, vertices=32)
        for side in (-1, 1):
            lounger = cube(
                f"Lounger_{side}",
                (side * 1.25, 1.55, 0.26),
                (0.47, 1.25, 0.11),
                mat_wood_light,
                umbrella,
                beach_col,
                bevel=0.10,
                rotation=(math.radians(-8), 0, side * 0.06),
            )
for index, x in enumerate([-28, -19, -10, -1]):
    cabana = empty(f"Beach_Cabana_{index}", (x, -8.2, 1.4), beach_zone, beach_col)
    cube("Cabana_Deck", (0, 0, 0.18), (2.3, 2.0, 0.18), mat_wood_light, cabana, beach_col, bevel=0.10)
    for sx in (-1.85, 1.85):
        for sy in (-1.55, 1.55):
            cylinder("Cabana_Post", (sx, sy, 1.75), 0.11, 3.5, mat_wood, cabana, beach_col, vertices=16)
    cone("Cabana_Roof", (0, 0, 3.75), 3.15, 0.45, 1.25, mat_trunk, cabana, beach_col, vertices=4, rotation=(0, 0, math.radians(45)), scale=(1.0, 0.78, 1.0))
    cube("Cabana_Bed", (0, 0, 0.65), (1.35, 1.15, 0.24), mat_white, cabana, beach_col, bevel=0.22)

volley = empty("Beach_Volleyball", (19, -12, 1.4), beach_zone, beach_col)
for x in (-3.2, 3.2):
    cylinder("Volley_Post", (x, 0, 1.6), 0.08, 3.2, mat_white, volley, beach_col, vertices=16)
for index in range(7):
    cylinder_between(
        f"Volley_Net_V_{index}",
        (-3.1 + index * 1.03, 0, 0.25),
        (-3.1 + index * 1.03, 0, 2.9),
        0.018,
        mat_white,
        volley,
        beach_col,
        vertices=8,
    )
for index in range(5):
    cylinder_between(
        f"Volley_Net_H_{index}",
        (-3.1, 0, 0.35 + index * 0.62),
        (3.1, 0, 0.35 + index * 0.62),
        0.018,
        mat_white,
        volley,
        beach_col,
        vertices=8,
    )
sphere("Volleyball", (20.3, -10.5, 1.75), (0.34, 0.34, 0.34), mat_coral, beach_zone, beach_col, segments=24, rings=16)

for index in range(24):
    y = -21.2 - index * 0.55
    cube(
        f"Pier_Plank_{index:02d}",
        (8.5, y, 1.35),
        (2.0, 0.23, 0.14),
        mat_wood_light,
        beach_zone,
        props_col,
        bevel=0.035,
    )
for index in range(7):
    y = -21.0 - index * 2.1
    for x in (6.8, 10.2):
        cylinder(f"Pier_Post_{index}_{x}", (x, y, 0.25), 0.13, 2.8, mat_wood, beach_zone, props_col, vertices=18)

# WATERPARK: pools, lazy river, slide tower and four long smooth slides.
waterpark = empty("Zone_Waterpark", (-16.5, 7.0, 1.75), root, waterpark_col)
waterpark["zone_id"] = "waterpark"
sphere(
    "Waterpark_Main_Pool_Basin",
    (0, -2.0, 0.28),
    (9.0, 6.45, 0.44),
    mat_white,
    waterpark,
    waterpark_col,
    segments=64,
    rings=20,
)
sphere(
    "Waterpark_Main_Pool",
    (0, -2.0, 0.66),
    (8.35, 5.78, 0.16),
    mat_pool,
    waterpark,
    waterpark_col,
    segments=64,
    rings=18,
)
torus(
    "Waterpark_Main_Pool_Coping",
    (0, -2.0, 0.76),
    7.1,
    0.18,
    mat_white,
    waterpark,
    waterpark_col,
    major_segments=96,
    minor_segments=12,
    scale=(1.25, 0.82, 1.0),
)
sphere(
    "Kids_Splash_Pool_Basin",
    (8.0, -4.0, 0.26),
    (5.7, 3.9, 0.36),
    mat_white,
    waterpark,
    waterpark_col,
    segments=56,
    rings=18,
)
sphere(
    "Kids_Splash_Pool",
    (8.0, -4.0, 0.56),
    (5.15, 3.35, 0.14),
    mat_shallow,
    waterpark,
    waterpark_col,
    segments=56,
    rings=16,
)
torus(
    "Kids_Splash_Pool_Coping",
    (8.0, -4.0, 0.64),
    4.35,
    0.16,
    mat_white,
    waterpark,
    waterpark_col,
    major_segments=80,
    minor_segments=10,
    scale=(1.20, 0.78, 1.0),
)

tower = empty("Waterslide_Tower", (-5.0, 8.0, 0), waterpark, waterpark_col)
for level in range(4):
    cube(f"Slide_Platform_{level}", (0, 0, 2.8 + level * 3.3), (2.1, 2.1, 0.18), mat_white, tower, waterpark_col, bevel=0.16)
for x in (-1.65, 1.65):
    for y in (-1.65, 1.65):
        cylinder("Slide_Tower_Post", (x, y, 6.9), 0.14, 13.8, mat_metal, tower, waterpark_col, vertices=18)
for level in range(3):
    for step in range(9):
        z = 2.4 + level * 3.3 + step * 0.36
        cube(
            f"Tower_Stair_{level}_{step}",
            (-2.55 + step * 0.32, -2.1, z),
            (0.30, 0.75, 0.08),
            mat_metal,
            tower,
            waterpark_col,
            bevel=0.04,
        )
slide_specs = [
    ("Aqua", mat_teal, [(-5, 8, 12.8), (-8, 5, 11), (-8, 0, 8), (-5, -4, 4), (-2, -5.5, 1.2)]),
    ("Yellow", mat_yellow, [(-3.8, 8, 9.5), (0, 8, 8.2), (3, 4, 6.2), (1, -1, 3.6), (2, -5, 1.2)]),
    ("Coral", mat_coral, [(-6.2, 8, 6.3), (-10, 10, 5.5), (-12, 6, 4.5), (-9, 0, 2.5), (-6, -5, 1.2)]),
    ("Blue", mat_blue, [(-5, 6.8, 12.8), (-2, 4, 10.5), (-4, 1, 7.5), (0, -2, 4.0), (6, -4.5, 1.2)]),
]
for slide_name, slide_mat, points in slide_specs:
    curve(f"Waterslide_{slide_name}", points, 0.72, slide_mat, waterpark, waterpark_col, cyclic=False, resolution=6)
    for support_index, point in enumerate(points[1:-1]):
        cylinder(
            f"Waterslide_{slide_name}_Support_{support_index}",
            (point[0], point[1], point[2] * 0.5),
            0.10,
            point[2],
            mat_metal,
            waterpark,
            waterpark_col,
            vertices=16,
        )
for index in range(14):
    angle = index / 14 * math.tau
    torus(
        f"Pool_Float_{index:02d}",
        (
            math.cos(angle) * 6.2,
            -2.0 + math.sin(angle) * 4.2,
            0.98,
        ),
        0.48,
        0.15,
        [mat_yellow, mat_coral, mat_teal][index % 3],
        waterpark,
        waterpark_col,
        major_segments=32,
        minor_segments=10,
    )

# AMUSEMENT PARK: large roller coaster, Ferris wheel, carousel and bumper-car pavilion.
amusement = empty("Zone_AmusementPark", (15.0, 6.0, 1.75), root, park_col)
amusement["zone_id"] = "amusement_park"

coaster_points = [
    (-19, -7, 3.0),
    (-14, -11, 5.0),
    (-6, -12, 11.0),
    (3, -9, 5.0),
    (7, -2, 15.0),
    (5, 6, 8.0),
    (-2, 9, 4.0),
    (-9, 8, 9.0),
    (-16, 5, 5.0),
    (-20, 0, 3.2),
]


coaster_samples = catmull_rom_loop(coaster_points, samples_per_segment=14)


def offset_track(points, distance):
    output = []
    for index, point in enumerate(points):
        previous = Vector(points[index - 1])
        following = Vector(points[(index + 1) % len(points)])
        tangent = (following - previous).normalized()
        normal = Vector((-tangent.y, tangent.x, 0)).normalized()
        output.append(tuple(Vector(point) + normal * distance))
    return output


rail_left = offset_track(coaster_samples, 0.56)
rail_right = offset_track(coaster_samples, -0.56)
poly_curve("Coaster_Rail_Left", rail_left, 0.19, mat_red, amusement, park_col, cyclic=True)
poly_curve("Coaster_Rail_Right", rail_right, 0.19, mat_red, amusement, park_col, cyclic=True)
poly_curve("Coaster_Spine", coaster_samples, 0.13, mat_metal, amusement, park_col, cyclic=True)

for index in range(0, len(coaster_samples), 14):
    point = coaster_samples[index]
    cylinder(
        f"Coaster_Support_{index:03d}",
        (point[0], point[1], point[2] * 0.5),
        0.22,
        point[2],
        mat_metal,
        amusement,
        park_col,
        vertices=20,
    )
    cylinder_between(
        f"Coaster_Support_Beam_{index:03d}",
        rail_left[index],
        rail_right[index],
        0.12,
        mat_metal,
        amusement,
        park_col,
        vertices=14,
    )

for index in range(0, len(coaster_samples), 5):
    cylinder_between(
        f"Coaster_Tie_{index:03d}",
        rail_left[index],
        rail_right[index],
        0.10,
        mat_dark,
        amusement,
        park_col,
        vertices=12,
    )

# Detailed animated train. Every carriage follows the exact same sampled path as the rails.
train = empty("Coaster_Train_Animated", parent=amusement, target=park_col)
train["animation_clip"] = "CoasterLoop"
train["duration_frames"] = 360
car_materials = [mat_yellow, mat_coral, mat_teal, mat_blue, mat_pink]
for car_index in range(5):
    car = empty(f"Coaster_Carriage_{car_index:02d}", parent=train, target=park_col)
    car["carriage_index"] = car_index
    car["animated"] = True
    car_mat = car_materials[car_index % len(car_materials)]
    cube(
        "Chassis",
        (0, 0, 0.02),
        (0.78, 1.12, 0.18),
        mat_dark,
        car,
        park_col,
        bevel=0.16,
    )
    sphere(
        "Rounded_Shell",
        (0, 0, 0.42),
        (0.86, 1.24, 0.50),
        car_mat,
        car,
        park_col,
        segments=32,
        rings=18,
    )
    if car_index == 0:
        sphere(
            "Aerodynamic_Nose",
            (0, -1.02, 0.39),
            (0.73, 0.58, 0.40),
            car_mat,
            car,
            park_col,
            segments=28,
            rings=16,
        )
        for side in (-1, 1):
            sphere(
                f"Headlight_{side}",
                (side * 0.34, -1.48, 0.48),
                (0.11, 0.07, 0.11),
                mat_white,
                car,
                park_col,
                segments=16,
                rings=10,
            )
    for row_index, y in enumerate((-0.25, 0.48)):
        cube(
            f"Seat_Back_{row_index}",
            (0, y, 0.82),
            (0.62, 0.18, 0.48),
            mat_dark,
            car,
            park_col,
            bevel=0.16,
        )
        cylinder_between(
            f"Safety_Bar_{row_index}",
            (-0.58, y - 0.18, 0.96),
            (0.58, y - 0.18, 0.96),
            0.065,
            mat_metal,
            car,
            park_col,
            vertices=14,
        )
    for side in (-1, 1):
        for y in (-0.72, 0.72):
            cylinder(
                f"Wheel_{side}_{y}",
                (side * 0.78, y, -0.18),
                0.22,
                0.16,
                mat_dark,
                car,
                park_col,
                vertices=20,
                rotation=(0, math.radians(90), 0),
            )
            cylinder(
                f"Wheel_Hub_{side}_{y}",
                (side * 0.87, y, -0.18),
                0.09,
                0.05,
                mat_metal,
                car,
                park_col,
                vertices=16,
                rotation=(0, math.radians(90), 0),
            )
    for frame in range(1, 362, 12):
        path_fraction = ((frame - 1) / 360.0 - car_index * 0.021) % 1.0
        sample_position = path_fraction * len(coaster_samples)
        sample_index = int(sample_position) % len(coaster_samples)
        following_index = (sample_index + 1) % len(coaster_samples)
        blend = sample_position - int(sample_position)
        point = Vector(coaster_samples[sample_index]).lerp(
            Vector(coaster_samples[following_index]), blend
        )
        previous_point = Vector(coaster_samples[(sample_index - 1) % len(coaster_samples)])
        next_point = Vector(coaster_samples[(sample_index + 1) % len(coaster_samples)])
        tangent = (next_point - previous_point).normalized()
        yaw = math.atan2(tangent.y, tangent.x) - math.pi / 2
        pitch = math.atan2(tangent.z, math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y))
        car.location = point + Vector((0, 0, 0.48))
        car.rotation_euler = (pitch, 0, yaw)
        car.keyframe_insert(data_path="location", frame=frame)
        car.keyframe_insert(data_path="rotation_euler", frame=frame)

# Ferris wheel facing the hero camera.
ferris = empty("FerrisWheel", (17.0, 5.5, 0), amusement, park_col)
ferris["interactive_part"] = "rotor"
for x in (-2.0, 2.0):
    cylinder_between("Ferris_Leg", (x, 0.9, 0), (0, 0.9, 8.0), 0.24, mat_metal, ferris, park_col, vertices=20)
    cylinder_between("Ferris_Leg", (x, -0.9, 0), (0, -0.9, 8.0), 0.24, mat_metal, ferris, park_col, vertices=20)
rotor = empty("FerrisWheel_Rotor", (0, 0, 8.0), ferris, park_col)
torus("Ferris_Rim_Outer", (0, 0, 0), 7.0, 0.22, mat_white, rotor, park_col, rotation=(math.radians(90), 0, 0), major_segments=96, minor_segments=14)
torus("Ferris_Rim_Inner", (0, 0, 0), 6.55, 0.12, mat_teal, rotor, park_col, rotation=(math.radians(90), 0, 0), major_segments=96, minor_segments=12)
cylinder("Ferris_Axle", (0, 0, 0), 0.55, 2.6, mat_metal, rotor, park_col, vertices=32, rotation=(math.radians(90), 0, 0))
for index in range(16):
    angle = index / 16 * math.tau
    rim_point = (math.cos(angle) * 6.8, 0, math.sin(angle) * 6.8)
    cylinder_between(f"Ferris_Spoke_{index:02d}", (0, 0, 0), rim_point, 0.09, mat_metal, rotor, park_col, vertices=12)
    gondola = empty(f"Ferris_Gondola_{index:02d}", rim_point, rotor, park_col)
    if index == 0:
        ferris_gondolas = []
    ferris_gondolas.append(gondola)
    cylinder("Gondola_Hanger", (0, 0, -0.55), 0.06, 1.1, mat_metal, gondola, park_col, vertices=12)
    cube("Gondola_Cabin", (0, 0, -1.25), (0.70, 0.75, 0.52), [mat_coral, mat_yellow, mat_teal, mat_blue][index % 4], gondola, park_col, bevel=0.24)
    cube("Gondola_Glass", (0, -0.76, -1.12), (0.52, 0.035, 0.26), mat_glass, gondola, park_col, bevel=0.08)

# The wheel rotates once per 12-second loop; gondolas counter-rotate to remain vertical.
rotor["animation_clip"] = "FerrisWheelLoop"
for step in range(13):
    frame = 1 + step * 30
    angle = step / 12 * math.tau
    rotor.rotation_euler = (0, angle, 0)
    rotor.keyframe_insert(data_path="rotation_euler", frame=frame)
    for gondola in ferris_gondolas:
        gondola.rotation_euler = (0, -angle, 0)
        gondola.keyframe_insert(data_path="rotation_euler", frame=frame)

# Carousel with a readable tent canopy and an open-air bumper-car arena.
carousel = empty("Carousel", (12.0, -8.0, -0.5), amusement, park_col)
cylinder("Carousel_Base", (0, 0, 0.30), 4.2, 0.60, mat_white, carousel, park_col, vertices=64)
carousel_rotor = empty("Carousel_Rotor", parent=carousel, target=park_col)
carousel_rotor["animation_clip"] = "CarouselLoop"
cylinder("Carousel_Center", (0, 0, 2.1), 0.38, 4.2, mat_yellow, carousel_rotor, park_col, vertices=24)
canopy_vertices = [(0, 0, 5.65)]
canopy_segments = 16
for index in range(canopy_segments):
    angle = index / canopy_segments * math.tau
    canopy_vertices.append((math.cos(angle) * 4.55, math.sin(angle) * 4.55, 4.10))
canopy_faces = []
for index in range(canopy_segments):
    canopy_faces.append((0, index + 1, (index + 1) % canopy_segments + 1))
canopy_mesh = bpy.data.meshes.new("Carousel_Canopy_Mesh")
canopy_mesh.from_pydata(canopy_vertices, [], canopy_faces)
canopy_mesh.update()
canopy = bpy.data.objects.new("Carousel_Striped_Canopy", canopy_mesh)
park_col.objects.link(canopy)
canopy.data.materials.append(mat_white)
canopy.data.materials.append(mat_coral)
for index, polygon in enumerate(canopy.data.polygons):
    polygon.material_index = index % 2
canopy.parent = carousel
for index in range(8):
    angle = index / 8 * math.tau
    cylinder_between(
        f"Carousel_Canopy_Rib_{index:02d}",
        (0, 0, 5.67),
        (math.cos(angle) * 4.5, math.sin(angle) * 4.5, 4.12),
        0.055,
        mat_metal,
        carousel,
        park_col,
        vertices=12,
    )
for index in range(12):
    angle = index / 12 * math.tau
    x = math.cos(angle) * 2.9
    y = math.sin(angle) * 2.9
    cylinder(f"Carousel_Pole_{index:02d}", (x, y, 2.0), 0.055, 3.8, mat_metal, carousel_rotor, park_col, vertices=12)
    horse = sphere(f"Carousel_Horse_{index:02d}", (x, y, 1.35), (0.62, 1.0, 0.48), [mat_white, mat_teal, mat_yellow][index % 3], carousel_rotor, park_col, segments=24, rings=14)
    for step in range(13):
        frame = 1 + step * 30
        horse.location.z = 1.35 + math.sin(step / 12 * math.tau * 2 + index * 0.7) * 0.22
        horse.keyframe_insert(data_path="location", frame=frame)
for step in range(13):
    frame = 1 + step * 30
    carousel_rotor.rotation_euler = (0, 0, step / 12 * math.tau)
    carousel_rotor.keyframe_insert(data_path="rotation_euler", frame=frame)

bumper = empty("Bumper_Cars_Open_Arena", (7.0, -19.0, 0.0), amusement, park_col)
cylinder("Bumper_Terrace", (0, 0, -0.15), 5.25, 0.90, mat_white, bumper, park_col, vertices=64)
cylinder("Bumper_Platform", (0, 0, 0.35), 4.8, 0.44, mat_dark, bumper, park_col, vertices=64)
torus(
    "Bumper_Safety_Rail",
    (0, 0, 0.82),
    4.55,
    0.13,
    mat_metal,
    bumper,
    park_col,
    major_segments=80,
    minor_segments=10,
)
for index in range(8):
    angle = index / 8 * math.tau
    x = math.cos(angle) * 4.65
    y = math.sin(angle) * 4.65
    cylinder(
        f"Bumper_Light_Post_{index:02d}",
        (x, y, 2.15),
        0.07,
        3.7,
        mat_metal,
        bumper,
        park_col,
        vertices=14,
    )
    sphere(
        f"Bumper_Light_{index:02d}",
        (x, y, 4.02),
        (0.18, 0.18, 0.18),
        [mat_yellow, mat_teal, mat_coral][index % 3],
        bumper,
        park_col,
        segments=16,
        rings=10,
    )
bumper_canopy_vertices = [(0, 0, 6.75)]
bumper_canopy_segments = 16
for index in range(bumper_canopy_segments):
    angle = index / bumper_canopy_segments * math.tau
    bumper_canopy_vertices.append(
        (math.cos(angle) * 5.55, math.sin(angle) * 5.55, 4.20)
    )
bumper_canopy_faces = []
for index in range(bumper_canopy_segments):
    bumper_canopy_faces.append(
        (0, index + 1, (index + 1) % bumper_canopy_segments + 1)
    )
bumper_canopy_mesh = bpy.data.meshes.new("Bumper_Canopy_Mesh")
bumper_canopy_mesh.from_pydata(
    bumper_canopy_vertices,
    [],
    bumper_canopy_faces,
)
bumper_canopy_mesh.update()
bumper_canopy = bpy.data.objects.new("Bumper_Striped_Canopy", bumper_canopy_mesh)
park_col.objects.link(bumper_canopy)
bumper_canopy.data.materials.append(mat_blue)
bumper_canopy.data.materials.append(mat_white)
for index, polygon in enumerate(bumper_canopy.data.polygons):
    polygon.material_index = index % 2
bumper_canopy.parent = bumper
cylinder(
    "Bumper_Canopy_Cap",
    (0, 0, 6.78),
    0.34,
    0.42,
    mat_yellow,
    bumper,
    park_col,
    vertices=24,
)
bumper_lanes = [
    ((-2.9, -2.4), (2.9, -2.4), -math.pi / 2),
    ((2.7, -1.2), (-2.7, -1.2), math.pi / 2),
    ((-2.8, 0.0), (2.8, 0.0), -math.pi / 2),
    ((2.6, 1.2), (-2.6, 1.2), math.pi / 2),
    ((-2.7, 2.4), (2.7, 2.4), -math.pi / 2),
]
for index, (start, end, heading) in enumerate(bumper_lanes):
    car_root = empty(f"Bumper_Car_Root_{index:02d}", parent=bumper, target=park_col)
    car_root["animated"] = True
    car_root["animation_clip"] = "BumperCarsLoop"
    car_material = [mat_coral, mat_yellow, mat_teal, mat_pink][index % 4]
    cube(
        f"Bumper_Car_Body_{index:02d}",
        (0, 0, 0),
        (0.72, 1.0, 0.42),
        car_material,
        car_root,
        park_col,
        bevel=0.28,
    )
    torus(
        f"Bumper_Car_Rubber_{index:02d}",
        (0, 0, -0.18),
        0.88,
        0.11,
        mat_dark,
        car_root,
        park_col,
        major_segments=32,
        minor_segments=10,
        scale=(0.90, 1.18, 1.0),
    )
    cube(
        f"Bumper_Car_Seat_{index:02d}",
        (0, 0.22, 0.42),
        (0.44, 0.22, 0.38),
        mat_dark,
        car_root,
        park_col,
        bevel=0.12,
    )
    for step in range(13):
        frame = 1 + step * 30
        cycle = step / 12
        blend = 1.0 - abs(2.0 * cycle - 1.0)
        car_root.location = (
            start[0] + (end[0] - start[0]) * blend,
            start[1] + (end[1] - start[1]) * blend,
            0.78,
        )
        car_root.rotation_euler = (
            0,
            0,
            heading,
        )
        car_root.keyframe_insert(data_path="location", frame=frame)
        car_root.keyframe_insert(data_path="rotation_euler", frame=frame)

# Curving pedestrian paths connect all leisure zones.
curve(
    "Main_Promenade",
    [
        (-28, -8, 1.55),
        (-20, -2, 1.7),
        (-16, 7, 1.85),
        (-4, 8, 2.0),
        (4, 3, 1.9),
        (15, 6, 1.9),
        (24, 14, 1.85),
        (31, 5, 1.65),
        (24, -7, 1.55),
        (10, -10, 1.5),
        (-4, -8, 1.5),
    ],
    0.55,
    mat_sand_dry,
    root,
    props_col,
    cyclic=True,
    resolution=5,
)

# Natural beach rocks and driftwood.
for index in range(34):
    angle = random.uniform(math.radians(185), math.radians(355))
    radius = random.uniform(26, 38)
    x = -2.5 + math.cos(angle) * radius
    y = -1.5 + math.sin(angle) * radius * 0.66
    sphere(
        f"Beach_Stone_{index:02d}",
        (x, y, random.uniform(1.25, 1.65)),
        (
            random.uniform(0.35, 1.15),
            random.uniform(0.28, 0.85),
            random.uniform(0.22, 0.72),
        ),
        mat_rock_warm,
        root,
        beach_col,
        segments=18,
        rings=12,
    )

# Lighting and hero camera.
world = bpy.context.scene.world
world.use_nodes = True
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.008, 0.018, 0.032, 1.0)
background.inputs["Strength"].default_value = 0.34

bpy.ops.object.light_add(type="SUN", location=(25, -35, 60))
sun = bpy.context.object
sun.name = "Sun_Warm"
sun.data.energy = 2.7
sun.data.color = (1.0, 0.79, 0.62)
sun.rotation_euler = (math.radians(28), math.radians(-20), math.radians(-32))
move_to(sun, light_col)

bpy.ops.object.light_add(type="AREA", location=(-45, -35, 52))
fill = bpy.context.object
fill.name = "Sky_Fill"
fill.data.energy = 5200
fill.data.shape = "DISK"
fill.data.size = 34
fill.data.color = (0.48, 0.72, 1.0)
look_at(fill, (0, 0, 0))
move_to(fill, light_col)

bpy.ops.object.light_add(type="AREA", location=(38, 24, 30))
rim = bpy.context.object
rim.name = "Lagoon_Rim_Light"
rim.data.energy = 3600
rim.data.size = 24
rim.data.color = (0.18, 0.88, 0.78)
look_at(rim, (0, 0, -2))
move_to(rim, light_col)

bpy.ops.object.light_add(type="AREA", location=(10, -28, -15))
under = bpy.context.object
under.name = "Floating_Underside_Fill"
under.data.energy = 3200
under.data.size = 28
under.data.color = (0.18, 0.26, 0.58)
look_at(under, (0, 0, -8))
move_to(under, light_col)

bpy.ops.object.camera_add(location=(93, -112, 78))
camera = bpy.context.object
camera.name = "Camera_Leisure_Island_Hero"
camera.data.lens = 58
look_at(camera, (0, 0, -2.5))
move_to(camera, light_col)

scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.frame_start = 1
scene.frame_end = 361
scene.render.fps = 30
scene.frame_set(1)
scene.render.resolution_x = 1440
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = os.path.join(ROOT_DIR, "tmp", "blender-previews", "maldives_leisure_island.png")
scene["asset_name"] = "Maldives Leisure Island"
scene["scale"] = "1 Blender unit = 1 meter"
scene["web_zones"] = "Zone_Beach, Zone_Waterpark, Zone_AmusementPark"
scene["animation_clips"] = (
    "CoasterLoop, FerrisWheelLoop, CarouselLoop, BumperCarsLoop: "
    "frames 1-361, 30 fps, 12 seconds"
)

os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

_result = {
    "blend_file": BLEND_PATH,
    "objects": len(scene.objects),
    "dimensions_m": [84, 58, 22],
    "zones": ["Beach", "Waterpark", "AmusementPark"],
}
