import bpy
import math
import os
import random
from mathutils import Vector


random.seed(193)

ROOT_DIR = r"C:\Users\rober\Documents\GitHub\robertoringoli.it"
BLEND_PATH = os.path.join(
    ROOT_DIR, "assets", "blender", "lanciano_central_island.blend"
)


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
        bpy.data.fonts,
        bpy.data.actions,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_collection(name):
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
    roughness=0.66,
    metallic=0.0,
    emission=None,
    emission_strength=0.0,
    alpha=1.0,
):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, alpha)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*emission, 1.0)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission_strength
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        result.surface_render_method = "DITHERED"
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


def cube(
    name,
    location,
    scale,
    mat,
    parent,
    target,
    bevel=0.0,
    rotation=(0, 0, 0),
):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel:
        modifier = obj.modifiers.new("Soft_Stone_Edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
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
    rotation=(0, 0, 0),
    scale=(1, 1, 1),
    smooth_shading=True,
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
    if smooth_shading:
        smooth(obj)
    obj.parent = parent
    move_to(obj, target)
    return obj


def sphere(name, location, scale, mat, parent, target, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=1.0,
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


def dome_mesh(
    name,
    center,
    radius,
    height,
    mat,
    parent,
    target,
    segments=40,
    rings=12,
):
    cx, cy, base_z = center
    vertices = []
    for ring in range(rings):
        phi = (ring / rings) * (math.pi / 2)
        ring_radius = radius * math.cos(phi)
        z = base_z + height * math.sin(phi)
        for index in range(segments):
            angle = index / segments * math.tau
            vertices.append(
                (
                    cx + math.cos(angle) * ring_radius,
                    cy + math.sin(angle) * ring_radius,
                    z,
                )
            )
    top_index = len(vertices)
    vertices.append((cx, cy, base_z + height))
    faces = []
    for ring in range(rings - 1):
        lower = ring * segments
        upper = (ring + 1) * segments
        for index in range(segments):
            following = (index + 1) % segments
            faces.append(
                (
                    lower + index,
                    lower + following,
                    upper + following,
                    upper + index,
                )
            )
    upper = (rings - 1) * segments
    for index in range(segments):
        following = (index + 1) % segments
        faces.append((upper + index, upper + following, top_index))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    target.objects.link(obj)
    assign(obj, mat)
    smooth(obj)
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
    major_segments=40,
    minor_segments=10,
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
    assign(obj, mat)
    smooth(obj)
    obj.parent = parent
    move_to(obj, target)
    return obj


def poly_curve(
    name,
    points,
    bevel_depth,
    mat,
    parent,
    target,
    cyclic=False,
    bevel_resolution=2,
):
    curve_data = bpy.data.curves.new(name + "_Curve", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = bevel_resolution
    spline = curve_data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve_data)
    obj.parent = parent
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def triangular_prism(name, center, width, height, depth, mat, parent, target):
    x, y, z = center
    half_w = width / 2
    half_d = depth / 2
    vertices = [
        (x - half_w, y - half_d, z),
        (x + half_w, y - half_d, z),
        (x, y - half_d, z + height),
        (x - half_w, y + half_d, z),
        (x + half_w, y + half_d, z),
        (x, y + half_d, z + height),
    ]
    faces = [
        (0, 1, 2),
        (3, 5, 4),
        (0, 3, 4, 1),
        (1, 4, 5, 2),
        (2, 5, 3, 0),
    ]
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def radial_layer(name, rings, mat, parent, target, segments=112, seed=0):
    rng = random.Random(seed)
    phase_a = rng.random() * math.tau
    phase_b = rng.random() * math.tau
    vertices = []
    for z, rx, ry in rings:
        for index in range(segments):
            angle = index / segments * math.tau
            variation = (
                1.0
                + math.sin(angle * 3 + phase_a) * 0.024
                + math.sin(angle * 7 + phase_b) * 0.012
                + math.sin(angle * 13 + seed) * 0.006
            )
            vertices.append(
                (
                    math.cos(angle) * rx * variation,
                    math.sin(angle) * ry * variation,
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
    top_index = len(vertices)
    vertices.append((0, 0, rings[0][0]))
    bottom_index = len(vertices)
    vertices.append((0, 0, rings[-1][0]))
    lower = (len(rings) - 1) * segments
    for index in range(segments):
        following = (index + 1) % segments
        faces.append((top_index, following, index))
        faces.append((bottom_index, lower + index, lower + following))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def oval_ring(
    name,
    center,
    outer_radius,
    inner_radius,
    z,
    mat,
    parent,
    target,
    segments=96,
    height=0.18,
):
    cx, cy = center
    outer_x, outer_y = outer_radius
    inner_x, inner_y = inner_radius
    vertices = []
    for level_z in (z, z + height):
        for index in range(segments):
            angle = index / segments * math.tau
            vertices.append(
                (cx + math.cos(angle) * outer_x, cy + math.sin(angle) * outer_y, level_z)
            )
        for index in range(segments):
            angle = index / segments * math.tau
            vertices.append(
                (cx + math.cos(angle) * inner_x, cy + math.sin(angle) * inner_y, level_z)
            )
    faces = []
    outer_bottom = 0
    inner_bottom = segments
    outer_top = segments * 2
    inner_top = segments * 3
    for index in range(segments):
        following = (index + 1) % segments
        faces.append(
            (
                outer_top + index,
                outer_top + following,
                inner_top + following,
                inner_top + index,
            )
        )
        faces.append(
            (
                outer_bottom + index,
                outer_bottom + following,
                outer_top + following,
                outer_top + index,
            )
        )
        faces.append(
            (
                inner_bottom + following,
                inner_bottom + index,
                inner_top + index,
                inner_top + following,
            )
        )
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def paving_mesh(name, center, width, depth, stone_size, mats, parent, target):
    rng = random.Random(510)
    cx, cy, z = center
    columns = int(width / stone_size)
    rows = int(depth / stone_size)
    vertices = []
    faces = []
    material_indices = []
    gap = 0.075
    stone_h = 0.12
    for row in range(rows):
        offset = stone_size * 0.5 if row % 2 else 0.0
        for col in range(columns + 1):
            x = cx - width / 2 + col * stone_size + offset
            y = cy - depth / 2 + row * stone_size
            if x > cx + width / 2 - stone_size * 0.25:
                continue
            sx = stone_size * (0.88 + rng.random() * 0.08) - gap
            sy = stone_size * (0.78 + rng.random() * 0.1) - gap
            x += rng.uniform(-0.035, 0.035)
            y += rng.uniform(-0.025, 0.025)
            z0 = z + rng.uniform(-0.018, 0.018)
            start = len(vertices)
            vertices.extend(
                [
                    (x - sx / 2, y - sy / 2, z0),
                    (x + sx / 2, y - sy / 2, z0),
                    (x + sx / 2, y + sy / 2, z0),
                    (x - sx / 2, y + sy / 2, z0),
                    (x - sx / 2, y - sy / 2, z0 + stone_h),
                    (x + sx / 2, y - sy / 2, z0 + stone_h),
                    (x + sx / 2, y + sy / 2, z0 + stone_h),
                    (x - sx / 2, y + sy / 2, z0 + stone_h),
                ]
            )
            faces.extend(
                [
                    (start, start + 1, start + 5, start + 4),
                    (start + 1, start + 2, start + 6, start + 5),
                    (start + 2, start + 3, start + 7, start + 6),
                    (start + 3, start, start + 4, start + 7),
                    (start + 4, start + 5, start + 6, start + 7),
                ]
            )
            material_indices.extend([1, 1, 1, 1, rng.randrange(len(mats))])
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.clear()
    for mat in mats:
        mesh.materials.append(mat)
    for polygon, mat_index in zip(mesh.polygons, material_indices):
        polygon.material_index = mat_index
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    target.objects.link(obj)
    return obj


def arched_opening(
    name,
    center,
    width,
    height,
    depth,
    dark_mat,
    frame_mat,
    parent,
    target,
    frame=0.23,
):
    x, y, z = center
    radius = width / 2
    lower_h = height - radius
    cube(
        name + "_Shadow",
        (x, y, z + lower_h / 2),
        (width / 2, depth / 2, lower_h / 2),
        dark_mat,
        parent,
        target,
        bevel=0.08,
    )
    cylinder(
        name + "_ArchShadow",
        (x, y, z + lower_h),
        radius,
        depth,
        dark_mat,
        parent,
        target,
        vertices=32,
        rotation=(math.radians(90), 0, 0),
    )
    points = [(x - radius, y - depth * 0.58, z)]
    points.append((x - radius, y - depth * 0.58, z + lower_h))
    for step in range(17):
        angle = math.pi - (math.pi * step / 16)
        points.append(
            (
                x + math.cos(angle) * radius,
                y - depth * 0.58,
                z + lower_h + math.sin(angle) * radius,
            )
        )
    points.append((x + radius, y - depth * 0.58, z))
    return poly_curve(
        name + "_StoneFrame",
        points,
        frame,
        frame_mat,
        parent,
        target,
        bevel_resolution=2,
    )


def window(
    name,
    location,
    size,
    wall_y,
    glass_mat,
    frame_mat,
    shutter_mat,
    parent,
    target,
    shutters=True,
):
    x, _, z = location
    width, height = size
    cube(
        name + "_Glass",
        (x, wall_y, z),
        (width / 2, 0.08, height / 2),
        glass_mat,
        parent,
        target,
        bevel=0.05,
    )
    for sx in (-1, 1):
        cube(
            name + f"_FrameV_{sx}",
            (x + sx * width / 2, wall_y - 0.08, z),
            (0.08, 0.08, height / 2 + 0.1),
            frame_mat,
            parent,
            target,
        )
    for sz in (-1, 1):
        cube(
            name + f"_FrameH_{sz}",
            (x, wall_y - 0.08, z + sz * height / 2),
            (width / 2 + 0.08, 0.08, 0.08),
            frame_mat,
            parent,
            target,
        )
    if shutters:
        cube(
            name + "_ShutterL",
            (x - width * 0.78, wall_y + 0.01, z),
            (width * 0.24, 0.07, height / 2),
            shutter_mat,
            parent,
            target,
            bevel=0.03,
        )
        cube(
            name + "_ShutterR",
            (x + width * 0.78, wall_y + 0.01, z),
            (width * 0.24, 0.07, height / 2),
            shutter_mat,
            parent,
            target,
            bevel=0.03,
        )


def add_text(name, text, location, size, mat, parent, target):
    curve = bpy.data.curves.new(name + "_TextCurve", "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.025
    curve.bevel_depth = 0.008
    obj = bpy.data.objects.new(name, curve)
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0, 0)
    obj.parent = parent
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def create_lamp(name, location, parent, target, metal_mat, glow_mat):
    x, y, z = location
    pole = cylinder(
        name + "_Pole",
        (x, y, z + 2.0),
        0.09,
        4.0,
        metal_mat,
        parent,
        target,
        vertices=12,
    )
    cube(
        name + "_Arm",
        (x, y, z + 4.0),
        (0.55, 0.06, 0.06),
        metal_mat,
        parent,
        target,
        bevel=0.04,
    )
    sphere(
        name + "_Lantern",
        (x + 0.48, y, z + 3.88),
        (0.2, 0.2, 0.28),
        glow_mat,
        parent,
        target,
        segments=16,
        rings=10,
    )
    return pole


def create_bench(name, location, rotation_z, parent, target, wood_mat, metal_mat):
    x, y, z = location
    root = empty(name, location=(x, y, z), parent=parent, target=target)
    root.rotation_euler.z = rotation_z
    for offset in (-0.38, 0.38):
        cube(
            name + f"_Leg_{offset}",
            (0, offset, 0.28),
            (0.68, 0.05, 0.05),
            metal_mat,
            root,
            target,
            bevel=0.03,
            rotation=(0, math.radians(90), 0),
        )
    for index in range(5):
        cube(
            name + f"_Seat_{index}",
            (0, (index - 2) * 0.14, 0.48),
            (0.95, 0.055, 0.07),
            wood_mat,
            root,
            target,
            bevel=0.035,
        )
    for index in range(4):
        cube(
            name + f"_Back_{index}",
            (0, 0.36, 0.72 + index * 0.16),
            (0.95, 0.055, 0.055),
            wood_mat,
            root,
            target,
            bevel=0.03,
        )


def create_umbrella_pine(name, location, scale, parent, target, bark_mat, leaf_mats):
    x, y, z = location
    trunk_h = 6.8 * scale
    cylinder(
        name + "_Trunk",
        (x, y, z + trunk_h / 2),
        0.34 * scale,
        trunk_h,
        bark_mat,
        parent,
        target,
        vertices=14,
        scale=(0.85, 1.0, 1.0),
    )
    rng = random.Random(name)
    for index in range(5):
        angle = index / 5 * math.tau + rng.uniform(-0.2, 0.2)
        radius = 1.55 * scale
        sphere(
            name + f"_Canopy_{index:02d}",
            (
                x + math.cos(angle) * radius,
                y + math.sin(angle) * radius,
                z + trunk_h + rng.uniform(-0.15, 0.3) * scale,
            ),
            (
                rng.uniform(2.1, 2.8) * scale,
                rng.uniform(1.65, 2.15) * scale,
                rng.uniform(0.55, 0.78) * scale,
            ),
            leaf_mats[index % len(leaf_mats)],
            parent,
            target,
            segments=20,
            rings=10,
        )


def create_portal(
    index,
    angle,
    root,
    target,
    stone_mat,
    metal_mat,
    glow_mat,
    paving_mat,
):
    rx = 36.0
    ry = 27.0
    x = math.cos(angle) * rx
    y = math.sin(angle) * ry
    tangent = Vector((-math.sin(angle), math.cos(angle), 0))
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    portal_root = empty(
        f"Connection_{index:02d}_Root",
        location=(0, 0, 0),
        parent=root,
        target=target,
    )
    cube(
        f"Connection_{index:02d}_Path",
        (
            x - radial.x * 3.0,
            y - radial.y * 3.0,
            0.42,
        ),
        (3.8, 1.65, 0.18),
        paving_mat,
        portal_root,
        target,
        bevel=0.22,
        rotation=(0, 0, angle),
    )
    cylinder(
        f"Connection_{index:02d}_Platform",
        (x, y, 0.55),
        3.25,
        0.55,
        stone_mat,
        portal_root,
        target,
        vertices=32,
        scale=(1.0, 0.72, 1.0),
    )
    base_z = 0.82
    radius = 2.15
    height = 4.9
    points = []
    left = Vector((x, y, base_z)) - tangent * radius
    right = Vector((x, y, base_z)) + tangent * radius
    points.append(tuple(left))
    points.append(tuple(left + Vector((0, 0, height - radius))))
    for step in range(19):
        theta = math.pi - math.pi * step / 18
        point = (
            Vector((x, y, base_z + height - radius))
            + tangent * (math.cos(theta) * radius)
            + Vector((0, 0, math.sin(theta) * radius))
        )
        points.append(tuple(point))
    points.append(tuple(right))
    poly_curve(
        f"Connection_{index:02d}_StoneArch",
        points,
        0.34,
        stone_mat,
        portal_root,
        target,
        bevel_resolution=2,
    )
    inner_points = []
    inner_radius = radius - 0.45
    left_inner = Vector((x, y, base_z + 0.15)) - tangent * inner_radius
    right_inner = Vector((x, y, base_z + 0.15)) + tangent * inner_radius
    inner_points.append(tuple(left_inner))
    inner_points.append(tuple(left_inner + Vector((0, 0, height - radius))))
    for step in range(19):
        theta = math.pi - math.pi * step / 18
        point = (
            Vector((x, y, base_z + height - radius))
            + tangent * (math.cos(theta) * inner_radius)
            + Vector((0, 0, math.sin(theta) * inner_radius))
        )
        inner_points.append(tuple(point))
    inner_points.append(tuple(right_inner))
    poly_curve(
        f"Connection_{index:02d}_LightRing",
        inner_points,
        0.09,
        glow_mat,
        portal_root,
        target,
        bevel_resolution=3,
    )
    orb_parent = empty(
        f"Connection_{index:02d}_AnimatedBeacon",
        location=(x, y, 3.15),
        parent=portal_root,
        target=target,
    )
    sphere(
        f"Connection_{index:02d}_BeaconCore",
        (0, 0, 0),
        (0.34, 0.34, 0.34),
        glow_mat,
        orb_parent,
        target,
        segments=20,
        rings=12,
    )
    torus(
        f"Connection_{index:02d}_BeaconRing",
        (0, 0, 0),
        0.62,
        0.055,
        metal_mat,
        orb_parent,
        target,
        rotation=(math.radians(90), 0, 0),
        major_segments=28,
        minor_segments=8,
    )
    orb_parent.keyframe_insert(data_path="location", frame=1)
    orb_parent.location.z += 0.42
    orb_parent.rotation_euler.z = math.tau
    orb_parent.keyframe_insert(data_path="location", frame=90)
    orb_parent.keyframe_insert(data_path="rotation_euler", frame=90)
    orb_parent.location.z -= 0.42
    orb_parent.rotation_euler.z = math.tau * 2
    orb_parent.keyframe_insert(data_path="location", frame=180)
    orb_parent.keyframe_insert(data_path="rotation_euler", frame=180)
    if orb_parent.animation_data and orb_parent.animation_data.action:
        orb_parent.animation_data.action.name = f"Connection_{index:02d}_BeaconAction"
    anchor = empty(
        f"Connection_{index:02d}_ProjectAnchor",
        location=(
            x + radial.x * 5.0,
            y + radial.y * 5.0,
            2.7,
        ),
        parent=portal_root,
        target=target,
    )
    anchor["connection_index"] = index
    anchor["purpose"] = "Three.js project island attachment point"


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


clear_scene()

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 360
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.resolution_x = 1200
scene.render.resolution_y = 760

world = bpy.data.worlds.new("Lanciano_Twilight_World")
scene.world = world
world.use_nodes = True
world_bsdf = world.node_tree.nodes.get("Background")
world_bsdf.inputs["Color"].default_value = (0.012, 0.025, 0.055, 1.0)
world_bsdf.inputs["Strength"].default_value = 0.38

scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.9

root = empty("LANCIANO_CENTRAL_ISLAND")
root["asset_role"] = "portfolio_central_hub"
root["location_reference"] = "Piazza del Plebiscito, Lanciano (CH)"
root["units"] = "meters"

foundation = make_collection("00_ISLAND_FOUNDATION")
piazza = make_collection("01_PIAZZA_PLEBISCITO")
cathedral = make_collection("02_CATHEDRAL_MADONNA_DEL_PONTE")
civic = make_collection("03_TORRE_CIVICA")
san_francesco = make_collection("04_SAN_FRANCESCO_TOWER")
city = make_collection("05_CITY_EDGES")
greenery = make_collection("06_MEDITERRANEAN_GREENERY")
furniture = make_collection("07_STREET_FURNITURE")
connections = make_collection("08_PROJECT_CONNECTIONS")
stadium = make_collection("09_STADIO_GUIDO_BIONDI")
lighting = make_collection("10_RENDER_LIGHTING")

rock_dark = material("MAT_Rock_Dark", (0.095, 0.115, 0.14), roughness=0.94)
rock_mid = material("MAT_Rock_Mid", (0.17, 0.19, 0.2), roughness=0.92)
earth = material("MAT_Earth", (0.18, 0.115, 0.075), roughness=0.96)
grass = material("MAT_Dry_Mediterranean_Grass", (0.105, 0.285, 0.095), roughness=0.92)
grass_lawn = material("MAT_Lanciano_Lawn", (0.105, 0.36, 0.14), roughness=0.91)
grass_meadow = material("MAT_Lanciano_Meadow", (0.22, 0.39, 0.16), roughness=0.94)
gravel = material("MAT_Warm_Park_Gravel", (0.47, 0.39, 0.28), roughness=0.94)
boulevard_asphalt = material("MAT_Boulevard_Asphalt", (0.065, 0.075, 0.08), roughness=0.90)
stone = material("MAT_Lanciano_Stone", (0.48, 0.39, 0.3), roughness=0.8)
stone_light = material("MAT_Travertine_Light", (0.72, 0.63, 0.51), roughness=0.72)
stone_warm = material("MAT_Stone_Warm", (0.58, 0.45, 0.32), roughness=0.82)
stone_dark = material("MAT_Cobble_Dark", (0.16, 0.17, 0.17), roughness=0.93)
stone_dark_2 = material("MAT_Cobble_Mid", (0.22, 0.22, 0.21), roughness=0.91)
stone_dark_3 = material("MAT_Cobble_Warm", (0.26, 0.24, 0.21), roughness=0.89)
brick = material("MAT_Historic_Brick", (0.34, 0.225, 0.15), roughness=0.88)
brick_light = material("MAT_Aged_Brick_Light", (0.44, 0.31, 0.22), roughness=0.87)
plaster = material("MAT_Warm_Plaster", (0.75, 0.68, 0.56), roughness=0.8)
plaster_pale = material("MAT_Pale_Plaster", (0.83, 0.78, 0.68), roughness=0.77)
terracotta = material("MAT_Terracotta_Roof", (0.43, 0.17, 0.095), roughness=0.9)
door_wood = material("MAT_Dark_Wood", (0.10, 0.045, 0.025), roughness=0.7)
bench_wood = material("MAT_Bench_Wood", (0.28, 0.105, 0.045), roughness=0.78)
metal = material("MAT_Blackened_Metal", (0.035, 0.042, 0.052), roughness=0.34, metallic=0.72)
bronze = material("MAT_Aged_Bronze", (0.18, 0.12, 0.065), roughness=0.42, metallic=0.68)
dome_metal = material(
    "MAT_Cathedral_Dome_Metal", (0.42, 0.44, 0.42), roughness=0.48, metallic=0.58
)
glass_dark = material("MAT_Window_Glass", (0.025, 0.06, 0.075), roughness=0.18, metallic=0.08)
window_warm = material(
    "MAT_Window_Warm_Interior",
    (0.36, 0.08, 0.018),
    roughness=0.38,
    emission=(1.0, 0.18, 0.035),
    emission_strength=2.4,
)
shutter_green = material("MAT_Lanciano_Shutters", (0.035, 0.14, 0.095), roughness=0.68)
clock_white = material(
    "MAT_Clock_Face",
    (0.82, 0.88, 0.84),
    roughness=0.35,
    emission=(0.5, 0.66, 0.6),
    emission_strength=0.45,
)
lamp_glow = material(
    "MAT_Warm_Lamp_Glow",
    (1.0, 0.45, 0.11),
    roughness=0.25,
    emission=(1.0, 0.26, 0.045),
    emission_strength=7.0,
)
portal_cyan = material(
    "MAT_Connection_Cyan",
    (0.06, 0.82, 0.75),
    roughness=0.2,
    emission=(0.03, 0.78, 0.72),
    emission_strength=5.5,
)
portal_violet = material(
    "MAT_Connection_Violet",
    (0.48, 0.19, 0.95),
    roughness=0.2,
    emission=(0.38, 0.09, 0.95),
    emission_strength=5.0,
)
foliage_a = material("MAT_Umbrella_Pine_Deep", (0.035, 0.19, 0.11), roughness=0.92)
foliage_b = material("MAT_Umbrella_Pine_Light", (0.07, 0.28, 0.15), roughness=0.9)
bark = material("MAT_Pine_Bark", (0.17, 0.085, 0.045), roughness=0.95)
white = material("MAT_Painted_White", (0.78, 0.79, 0.75), roughness=0.72)
stadium_concrete = material(
    "MAT_Stadium_Concrete", (0.52, 0.53, 0.51), roughness=0.9
)
stadium_track = material(
    "MAT_Guido_Biondi_Track", (0.63, 0.61, 0.55), roughness=0.92
)
pitch_green = material("MAT_Football_Pitch", (0.075, 0.31, 0.10), roughness=0.92)
pitch_green_alt = material(
    "MAT_Football_Pitch_Stripe", (0.095, 0.38, 0.13), roughness=0.91
)
seat_turquoise = material(
    "MAT_Stadium_Seat_Turquoise", (0.10, 0.55, 0.49), roughness=0.72
)
seat_yellow = material(
    "MAT_Stadium_Seat_Yellow", (0.96, 0.60, 0.045), roughness=0.7
)
seat_blue = material("MAT_Stadium_Seat_Blue", (0.035, 0.18, 0.62), roughness=0.7)

# Floating island mass and visible historical strata.
radial_layer(
    "Lanciano_Floating_Rock",
    [
        (0.0, 82.0, 52.0),
        (-1.1, 81.0, 51.3),
        (-4.8, 72.0, 44.5),
        (-10.5, 55.0, 33.0),
        (-17.0, 31.0, 18.5),
        (-23.0, 7.0, 4.5),
    ],
    rock_mid,
    root,
    foundation,
    seed=71,
)
radial_layer(
    "Lanciano_Topsoil",
    [(0.16, 80.6, 50.7), (-0.05, 81.5, 51.5), (-0.85, 80.8, 50.8)],
    grass,
    root,
    foundation,
    segments=112,
    seed=89,
)
for index in range(52):
    angle = index / 52 * math.tau + random.uniform(-0.05, 0.05)
    radius_x = random.uniform(48.0, 77.0)
    radius_y = random.uniform(30.0, 48.0)
    x = math.cos(angle) * radius_x
    y = math.sin(angle) * radius_y
    z = random.uniform(-8.6, -5.0)
    sphere(
        f"Cliff_Boulder_{index:02d}",
        (x, y, z),
        (
            random.uniform(1.4, 3.2),
            random.uniform(1.2, 2.6),
            random.uniform(1.3, 2.8),
        ),
        rock_dark if index % 3 else rock_mid,
        root,
        foundation,
        segments=16,
        rings=10,
    )

# Exposed Ponte di Diocleziano motif in the front cliff.
cube(
    "Diocletian_Bridge_RetainingWall",
    (-28.0, -50.0, -2.0),
    (16.5, 0.65, 3.4),
    stone_warm,
    root,
    foundation,
    bevel=0.18,
)
for index, x in enumerate((-37.0, -28.0, -19.0)):
    arched_opening(
        f"Diocletian_Bridge_Arch_{index:02d}",
        (x, -50.68, -4.6),
        5.2,
        5.7,
        0.18,
        rock_dark,
        stone_light,
        root,
        foundation,
        frame=0.34,
    )
cube(
    "Diocletian_Bridge_Cornice",
    (-28.0, -50.7, 1.0),
    (17.2, 0.65, 0.35),
    stone_light,
    root,
    foundation,
    bevel=0.12,
)

# Plaza paving and perimeter sidewalks.
paving_mesh(
    "Piazza_Plebiscito_Cobblestones",
    (0, -1.5, 0.28),
    50.0,
    32.0,
    1.35,
    [stone_dark, stone_dark_2, stone_dark_3],
    root,
    piazza,
)
cube(
    "Cathedral_Sidewalk",
    (0, 9.3, 0.38),
    (13.4, 2.0, 0.18),
    stone_light,
    root,
    piazza,
    bevel=0.18,
)
cube(
    "Civic_Tower_Sidewalk",
    (-17.0, 8.9, 0.38),
    (5.3, 3.0, 0.18),
    stone_light,
    root,
    piazza,
    bevel=0.18,
)
cube(
    "SanFrancesco_Sidewalk",
    (18.2, 9.5, 0.38),
    (5.0, 3.4, 0.18),
    stone_light,
    root,
    piazza,
    bevel=0.18,
)

# Cathedral of Madonna del Ponte.
cat_root = empty("Cathedral_Root", parent=root, target=cathedral)
cube(
    "Cathedral_Nave",
    (0, 16.0, 6.0),
    (8.2, 7.6, 5.7),
    stone,
    cat_root,
    cathedral,
    bevel=0.16,
)
cube(
    "Cathedral_FacadeLower",
    (0, 8.35, 5.0),
    (9.25, 0.8, 4.7),
    stone_warm,
    cat_root,
    cathedral,
    bevel=0.13,
)
for z, width, depth in ((0.75, 9.7, 0.5), (8.7, 9.8, 0.38), (10.0, 8.7, 0.32)):
    cube(
        f"Cathedral_Cornice_{z}",
        (0, 7.48, z),
        (width, depth, 0.27),
        stone_light,
        cat_root,
        cathedral,
        bevel=0.08,
    )
for index, x in enumerate((-6.2, -2.1, 2.1, 6.2)):
    cylinder(
        f"Cathedral_Column_{index:02d}",
        (x, 7.15, 4.9),
        0.55,
        7.5,
        stone_light,
        cat_root,
        cathedral,
        vertices=20,
    )
    cylinder(
        f"Cathedral_ColumnBase_{index:02d}",
        (x, 7.15, 1.0),
        0.75,
        0.42,
        stone_light,
        cat_root,
        cathedral,
        vertices=20,
    )
    cylinder(
        f"Cathedral_ColumnCapital_{index:02d}",
        (x, 7.15, 8.8),
        0.76,
        0.48,
        stone_light,
        cat_root,
        cathedral,
        vertices=20,
    )
arched_opening(
    "Cathedral_MainPortal",
    (0, 7.42, 0.78),
    3.5,
    6.25,
    0.22,
    door_wood,
    stone_light,
    cat_root,
    cathedral,
    frame=0.3,
)
for index, x in enumerate((-6.7, 6.7)):
    cube(
        f"Cathedral_SideDoor_{index:02d}",
        (x, 7.42, 2.1),
        (1.05, 0.16, 1.8),
        door_wood,
        cat_root,
        cathedral,
        bevel=0.08,
    )
    cube(
        f"Cathedral_SideDoorFrame_{index:02d}",
        (x, 7.25, 2.1),
        (1.35, 0.18, 2.1),
        stone_light,
        cat_root,
        cathedral,
        bevel=0.06,
    )
    cube(
        f"Cathedral_SideDoorInset_{index:02d}",
        (x, 7.0, 2.1),
        (1.05, 0.12, 1.8),
        door_wood,
        cat_root,
        cathedral,
    )
triangular_prism(
    "Cathedral_Pediment",
    (0, 9.15, 10.0),
    15.6,
    4.15,
    0.9,
    stone_light,
    cat_root,
    cathedral,
)
cube(
    "Cathedral_BalconyFloor",
    (0, 7.02, 10.08),
    (7.1, 1.0, 0.22),
    stone_light,
    cat_root,
    cathedral,
    bevel=0.08,
)
for index in range(15):
    x = -6.6 + index * 0.94
    cylinder(
        f"Cathedral_Baluster_{index:02d}",
        (x, 6.25, 10.75),
        0.11,
        1.25,
        stone_light,
        cat_root,
        cathedral,
        vertices=10,
    )
cube(
    "Cathedral_BalconyRail",
    (0, 6.25, 11.42),
    (7.0, 0.16, 0.16),
    stone_light,
    cat_root,
    cathedral,
    bevel=0.05,
)
cylinder(
    "Cathedral_Pediment_Oculus",
    (0, 7.0, 12.05),
    0.48,
    0.18,
    glass_dark,
    cat_root,
    cathedral,
    vertices=32,
    rotation=(math.radians(90), 0, 0),
)
add_text(
    "Cathedral_Basilica_Text",
    "BASILICA",
    (0, 6.82, 9.28),
    0.62,
    bronze,
    cat_root,
    cathedral,
)
for index, x in enumerate((-7.7, 0.0, 7.7)):
    cylinder(
        f"Cathedral_RoofStatueBase_{index:02d}",
        (x, 7.42 if index else 14.4, 14.35),
        0.25,
        0.55,
        stone_light,
        cat_root,
        cathedral,
        vertices=12,
    )
    sphere(
        f"Cathedral_RoofStatue_{index:02d}",
        (x, 7.42 if index else 14.4, 14.9),
        (0.22, 0.18, 0.55),
        stone_light,
        cat_root,
        cathedral,
        segments=14,
        rings=8,
    )
cube(
    "Cathedral_RoofLeft",
    (-4.0, 17.2, 12.2),
    (4.4, 6.5, 0.34),
    terracotta,
    cat_root,
    cathedral,
    bevel=0.05,
    rotation=(0, math.radians(-23), 0),
)
cube(
    "Cathedral_RoofRight",
    (4.0, 17.2, 12.2),
    (4.4, 6.5, 0.34),
    terracotta,
    cat_root,
    cathedral,
    bevel=0.05,
    rotation=(0, math.radians(23), 0),
)

# The real cathedral has a recessed nave behind the lower portico and a visible dome.
for garland_index, (start_x, end_x) in enumerate(((-5.3, -2.9), (2.9, 5.3))):
    points = []
    for step in range(9):
        t = step / 8
        points.append(
            (
                start_x + (end_x - start_x) * t,
                7.37,
                7.45 - math.sin(t * math.pi) * 0.55,
            )
        )
    poly_curve(
        f"Cathedral_Facade_Garland_{garland_index:02d}",
        points,
        0.09,
        stone_light,
        cat_root,
        cathedral,
        bevel_resolution=2,
    )
cylinder(
    "Cathedral_Dome_Drum",
    (0.0, 17.2, 14.1),
    4.25,
    3.2,
    stone_light,
    cat_root,
    cathedral,
    vertices=40,
)
dome_mesh(
    "Cathedral_Main_Dome",
    (0.0, 17.2, 15.8),
    4.35,
    3.2,
    dome_metal,
    cat_root,
    cathedral,
    segments=40,
    rings=12,
)
cylinder(
    "Cathedral_Dome_Lantern",
    (0.0, 17.2, 19.55),
    0.52,
    1.25,
    stone_light,
    cat_root,
    cathedral,
    vertices=16,
)
sphere(
    "Cathedral_Dome_LanternCap",
    (0.0, 17.2, 20.3),
    (0.65, 0.65, 0.32),
    dome_metal,
    cat_root,
    cathedral,
    segments=18,
    rings=10,
)
cube(
    "Cathedral_Dome_CrossVertical",
    (0.0, 17.2, 21.18),
    (0.08, 0.08, 0.65),
    bronze,
    cat_root,
    cathedral,
)
cube(
    "Cathedral_Dome_CrossHorizontal",
    (0.0, 17.2, 21.25),
    (0.32, 0.08, 0.08),
    bronze,
    cat_root,
    cathedral,
)

# Civic clock tower.
civic_root = empty("Torre_Civica_Root", parent=root, target=civic)
for index, (z, size, height, mat) in enumerate(
    (
        (3.5, 4.4, 6.6, brick_light),
        (10.2, 4.05, 6.4, brick),
        (16.7, 3.72, 6.1, brick_light),
        (21.7, 3.45, 3.5, brick),
    )
):
    cube(
        f"Torre_Civica_Level_{index:02d}",
        (-17.0, 14.0, z),
        (size, size, height / 2),
        mat,
        civic_root,
        civic,
        bevel=0.12,
    )
    cube(
        f"Torre_Civica_Cornice_{index:02d}",
        (-17.0, 14.0, z + height / 2),
        (size + 0.35, size + 0.35, 0.28),
        stone_warm,
        civic_root,
        civic,
        bevel=0.06,
    )
for level, z in enumerate((7.8, 14.3, 20.2)):
    arched_opening(
        f"Torre_Civica_FrontOpening_{level:02d}",
        (-17.0, 9.83, z - 1.1),
        1.45,
        3.1,
        0.16,
        glass_dark,
        stone_warm,
        civic_root,
        civic,
        frame=0.16,
    )
clock_center = (-17.0, 9.7, 18.3)
cylinder(
    "Torre_Civica_ClockFace",
    clock_center,
    1.35,
    0.2,
    clock_white,
    civic_root,
    civic,
    vertices=48,
    rotation=(math.radians(90), 0, 0),
)
clock_hands = empty(
    "Torre_Civica_ClockHands_Animated",
    location=(-17.0, 9.56, 18.3),
    parent=civic_root,
    target=civic,
)
cube(
    "Torre_Civica_MinuteHand",
    (0, 0, 0.55),
    (0.075, 0.055, 0.72),
    metal,
    clock_hands,
    civic,
    bevel=0.035,
)
cube(
    "Torre_Civica_HourHand",
    (0.38, 0, 0.0),
    (0.5, 0.07, 0.075),
    metal,
    clock_hands,
    civic,
    bevel=0.035,
)
sphere(
    "Torre_Civica_ClockHub",
    (0, 0, 0),
    (0.14, 0.08, 0.14),
    bronze,
    clock_hands,
    civic,
    segments=14,
    rings=8,
)
clock_hands.rotation_mode = "XYZ"
clock_hands.keyframe_insert(data_path="rotation_euler", frame=1)
clock_hands.rotation_euler.y = -math.tau
clock_hands.keyframe_insert(data_path="rotation_euler", frame=360)
if clock_hands.animation_data and clock_hands.animation_data.action:
    clock_hands.animation_data.action.name = "Torre_Civica_ClockHands_Action"
for corner_x in (-20.25, -13.75):
    for corner_y in (10.75, 17.25):
        cylinder(
            f"Torre_Civica_RoofPost_{corner_x}_{corner_y}",
            (corner_x, corner_y, 24.1),
            0.18,
            1.5,
            stone_warm,
            civic_root,
            civic,
            vertices=10,
        )
cube(
    "Torre_Civica_TopCap",
    (-17.0, 14.0, 24.65),
    (4.0, 4.0, 0.42),
    stone_warm,
    civic_root,
    civic,
    bevel=0.08,
)

# San Francesco bell tower and dome.
sf_root = empty("San_Francesco_Root", parent=root, target=san_francesco)
for index, (z, size, height, mat) in enumerate(
    (
        (3.4, 3.7, 6.4, brick),
        (9.8, 3.45, 6.0, brick_light),
        (15.6, 3.15, 5.2, brick),
    )
):
    cube(
        f"San_Francesco_Level_{index:02d}",
        (18.0, 15.2, z),
        (size, size, height / 2),
        mat,
        sf_root,
        san_francesco,
        bevel=0.12,
    )
    cube(
        f"San_Francesco_Cornice_{index:02d}",
        (18.0, 15.2, z + height / 2),
        (size + 0.28, size + 0.28, 0.25),
        stone_warm,
        sf_root,
        san_francesco,
        bevel=0.05,
    )
for level, z in enumerate((7.8, 13.4)):
    arched_opening(
        f"San_Francesco_Opening_{level:02d}",
        (18.0, 11.67, z),
        1.35,
        2.8,
        0.16,
        glass_dark,
        stone_warm,
        sf_root,
        san_francesco,
        frame=0.15,
    )
bell_parent = empty(
    "San_Francesco_Bell_Animated",
    location=(18.0, 11.47, 14.4),
    parent=sf_root,
    target=san_francesco,
)
cone(
    "San_Francesco_Bell",
    (0, 0, 0),
    0.48,
    0.24,
    0.92,
    bronze,
    bell_parent,
    san_francesco,
    vertices=20,
)
bell_parent.keyframe_insert(data_path="rotation_euler", frame=1)
bell_parent.keyframe_insert(data_path="rotation_euler", frame=110)
bell_parent.rotation_euler.x = math.radians(16)
bell_parent.keyframe_insert(data_path="rotation_euler", frame=130)
bell_parent.rotation_euler.x = math.radians(-16)
bell_parent.keyframe_insert(data_path="rotation_euler", frame=150)
bell_parent.rotation_euler.x = math.radians(10)
bell_parent.keyframe_insert(data_path="rotation_euler", frame=165)
bell_parent.rotation_euler.x = 0
bell_parent.keyframe_insert(data_path="rotation_euler", frame=185)
bell_parent.keyframe_insert(data_path="rotation_euler", frame=360)
if bell_parent.animation_data and bell_parent.animation_data.action:
    bell_parent.animation_data.action.name = "San_Francesco_Bell_Action"
cone(
    "San_Francesco_DomeLower",
    (18.0, 15.2, 19.25),
    3.1,
    2.25,
    2.0,
    stone_dark,
    sf_root,
    san_francesco,
    vertices=16,
)
cone(
    "San_Francesco_DomeUpper",
    (18.0, 15.2, 20.65),
    2.25,
    0.35,
    1.4,
    stone_dark,
    sf_root,
    san_francesco,
    vertices=16,
)
cylinder(
    "San_Francesco_DomeLantern",
    (18.0, 15.2, 21.65),
    0.28,
    0.8,
    bronze,
    sf_root,
    san_francesco,
    vertices=12,
)
cone(
    "San_Francesco_DomeCross",
    (18.0, 15.2, 22.3),
    0.16,
    0.0,
    0.55,
    bronze,
    sf_root,
    san_francesco,
    vertices=8,
)

# Palazzo Comunale and the arcaded urban edges.
city_root = empty("Historic_City_Edges_Root", parent=root, target=city)
buildings = [
    ("Palazzo_Comunale", (-28.0, 12.4, 5.2), (7.3, 5.4, 5.0), plaster_pale),
    ("Palazzo_East", (28.5, 10.8, 5.0), (7.4, 5.8, 4.8), plaster),
    ("Corso_East_01", (29.5, 22.0, 4.4), (6.0, 4.5, 4.2), stone_warm),
    ("Corso_West_01", (-29.2, 23.0, 4.2), (5.6, 4.2, 4.0), plaster),
]
for name, location, scale_value, mat in buildings:
    cube(
        name + "_Body",
        location,
        scale_value,
        mat,
        city_root,
        city,
        bevel=0.16,
    )
    cube(
        name + "_Cornice",
        (
            location[0],
            location[1] - scale_value[1] - 0.05,
            location[2] + scale_value[2] - 0.45,
        ),
        (scale_value[0] + 0.18, 0.22, 0.24),
        stone_light,
        city_root,
        city,
        bevel=0.05,
    )
    for floor, z in enumerate((3.3, 6.4, 9.0)):
        if z > location[2] + scale_value[2] - 0.8:
            continue
        for column in range(-2, 3):
            x = location[0] + column * (scale_value[0] * 0.34)
            window(
                f"{name}_Window_{floor}_{column}",
                (x, 0, z),
                (1.05, 1.55),
                location[1] - scale_value[1] - 0.12,
                glass_dark,
                stone_light,
                shutter_green,
                city_root,
                city,
                shutters=floor > 0,
            )
    cube(
        name + "_Roof",
        (
            location[0],
            location[1],
            location[2] + scale_value[2] + 0.35,
        ),
        (scale_value[0] + 0.35, scale_value[1] + 0.35, 0.34),
        terracotta,
        city_root,
        city,
        bevel=0.08,
    )

# Arcades of the town hall.
for index, x in enumerate((-32.5, -29.5, -26.5, -23.5)):
    arched_opening(
        f"Palazzo_Comunale_Arcade_{index:02d}",
        (x, 6.88, 0.55),
        2.3,
        3.4,
        0.2,
        glass_dark,
        stone_light,
        city_root,
        city,
        frame=0.2,
    )

# Smaller buildings define the street without enclosing the island.
for index in range(5):
    side = -1 if index % 2 == 0 else 1
    x = side * (24.0 + random.uniform(0, 7.0))
    y = -10.5 + index * 5.0
    width = random.uniform(3.6, 5.2)
    depth = random.uniform(3.0, 4.6)
    height = random.uniform(5.0, 7.4)
    mat = plaster if index % 3 else stone_warm
    cube(
        f"Piazza_SideBuilding_{index:02d}",
        (x, y, height / 2 + 0.5),
        (width, depth, height / 2),
        mat,
        city_root,
        city,
        bevel=0.14,
    )
    for floor, z in enumerate((2.8, 5.4)):
        if z > height:
            continue
        for col in (-1, 0, 1):
            window(
                f"Piazza_SideBuilding_{index:02d}_Window_{floor}_{col}",
                (x + col * width * 0.46, 0, z),
                (0.85, 1.28),
                y - depth - 0.1,
                glass_dark,
                stone_light,
                shutter_green,
                city_root,
                city,
                shutters=True,
            )
    cube(
        f"Piazza_SideBuilding_{index:02d}_Roof",
        (x, y, height + 0.85),
        (width + 0.22, depth + 0.22, 0.32),
        terracotta,
        city_root,
        city,
        bevel=0.06,
    )

# Mediterranean greenery on the outer rim.
pine_positions = [
    (-34.0, -5.0, 0.4, 0.9),
    (-32.0, 2.5, 0.4, 1.0),
    (33.0, -4.0, 0.4, 0.92),
    (34.0, 3.8, 0.4, 1.05),
    (-25.0, 27.0, 0.4, 0.82),
    (26.0, 27.0, 0.4, 0.86),
]
for index, (x, y, z, scale_value) in enumerate(pine_positions):
    create_umbrella_pine(
        f"Umbrella_Pine_{index:02d}",
        (x, y, z),
        scale_value,
        root,
        greenery,
        bark,
        [foliage_a, foliage_b],
    )
# Street furniture arranged along the plaza edges.
lamp_positions = [
    (-10.0, 5.5, 0.45),
    (10.0, 5.5, 0.45),
    (-21.0, 1.5, 0.45),
    (21.0, 1.5, 0.45),
    (-18.0, -11.0, 0.45),
    (18.0, -11.0, 0.45),
]
for index, position in enumerate(lamp_positions):
    create_lamp(
        f"Piazza_Lamp_{index:02d}",
        position,
        root,
        furniture,
        metal,
        lamp_glow,
    )
for index, (position, rotation) in enumerate(
    [
        ((-13.0, -7.8, 0.45), 0),
        ((13.0, -7.8, 0.45), math.pi),
        ((-22.0, 5.0, 0.45), math.pi / 2),
        ((22.0, 5.0, 0.45), -math.pi / 2),
    ]
):
    create_bench(
        f"Piazza_Bench_{index:02d}",
        position,
        rotation,
        root,
        furniture,
        bench_wood,
        metal,
    )
for index in range(28):
    x = -20.0 + index * (40.0 / 27)
    cylinder(
        f"Piazza_Bollard_{index:02d}",
        (x, -13.6, 0.82),
        0.12,
        0.78,
        metal,
        root,
        furniture,
        vertices=12,
    )
    sphere(
        f"Piazza_BollardCap_{index:02d}",
        (x, -13.6, 1.23),
        (0.16, 0.16, 0.16),
        bronze if index % 2 else metal,
        root,
        furniture,
        segments=12,
        rings=7,
    )
for index in range(27):
    x0 = -20.0 + index * (40.0 / 27)
    x1 = -20.0 + (index + 1) * (40.0 / 27)
    middle = (x0 + x1) / 2
    points = []
    for step in range(7):
        t = step / 6
        points.append(
            (
                x0 + (x1 - x0) * t,
                -13.6,
                1.1 - math.sin(t * math.pi) * 0.28,
            )
        )
    poly_curve(
        f"Piazza_Chain_{index:02d}",
        points,
        0.025,
        metal,
        root,
        furniture,
        bevel_resolution=1,
    )

# Move the historic center to the western half of the larger island.
historic_root = empty(
    "LANCIANO_HISTORIC_CENTER",
    location=(-28.418, 2.029, 0.0),
    parent=root,
    target=piazza,
)
historic_root.rotation_euler.z = math.radians(82)
for historic_collection in (
    piazza,
    cathedral,
    civic,
    san_francesco,
    city,
    greenery,
    furniture,
):
    for obj in list(historic_collection.objects):
        if obj != historic_root and obj.parent == root:
            obj.parent = historic_root

# A broad tree-lined boulevard divides the historic center from the stadium district.
road_angle = math.radians(-8)
cube(
    "Lanciano_Central_Boulevard",
    (2.0, 1.0, 0.38),
    (5.2, 49.0, 0.18),
    boulevard_asphalt,
    root,
    piazza,
    bevel=0.32,
    rotation=(0, 0, road_angle),
)
for side in (-1, 1):
    cube(
        f"Lanciano_Central_Boulevard_Sidewalk_{side}",
        (
            2.0 + math.cos(road_angle) * side * 6.15,
            1.0 + math.sin(road_angle) * side * 6.15,
            0.5,
        ),
        (0.72, 49.0, 0.23),
        stone_light,
        root,
        piazza,
        bevel=0.18,
        rotation=(0, 0, road_angle),
    )
    cube(
        f"Lanciano_Central_Boulevard_GreenVerge_{side}",
        (
            2.0 + math.cos(road_angle) * side * 8.15,
            1.0 + math.sin(road_angle) * side * 8.15,
            0.37,
        ),
        (1.28, 47.5, 0.10),
        grass_lawn,
        root,
        greenery,
        bevel=0.24,
        rotation=(0, 0, road_angle),
    )

# A restrained central stone line and regular lamps make the boulevard read as
# a deliberate urban axis rather than a strip laid over the terrain.
for index in range(13):
    longitudinal = -43.5 + index * (87.0 / 12)
    for side in (-1, 1):
        local_x = side * 8.15
        local_y = longitudinal
        x = 2.0 + local_x * math.cos(road_angle) - local_y * math.sin(road_angle)
        y = 1.0 + local_x * math.sin(road_angle) + local_y * math.cos(road_angle)
        cylinder(
            f"Boulevard_Tree_{index:02d}_{side}_Trunk",
            (x, y, 2.25),
            0.2,
            3.7,
            bark,
            root,
            greenery,
            vertices=12,
        )
        sphere(
            f"Boulevard_Tree_{index:02d}_{side}_Canopy",
            (x, y, 4.75),
            (1.45, 1.25, 0.82),
            foliage_b if (index + side) % 2 else foliage_a,
            root,
            greenery,
            segments=18,
            rings=10,
        )
for index in range(12):
    longitudinal = -43.0 + index * (86.0 / 11)
    x = 2.0 - longitudinal * math.sin(road_angle)
    y = 1.0 + longitudinal * math.cos(road_angle)
    cube(
        f"Boulevard_Center_Marker_{index:02d}",
        (x, y, 0.58),
        (0.11, 1.45, 0.035),
        stone_light,
        root,
        piazza,
        bevel=0.05,
        rotation=(0, 0, road_angle),
    )

# The island edge is an actual promenade. It visually closes the composition
# and provides a destination for both ends of the central boulevard.
oval_ring(
    "Lanciano_Perimeter_Promenade",
    (0.0, 0.0),
    (78.2, 48.8),
    (75.1, 45.7),
    0.24,
    gravel,
    root,
    piazza,
    segments=128,
    height=0.12,
)

# Coherent landscaped pockets fill the unused ground without turning the
# surface into a field of unrelated bushes.
landscape_patches = [
    ("Southwest_Civic_Garden", (-54.0, -25.0), (15.0, 8.5), grass_lawn),
    ("North_Overlook_Meadow", (5.0, 39.0), (17.0, 7.2), grass_meadow),
    ("Northeast_Sports_Garden", (55.0, 31.0), (12.5, 7.0), grass_lawn),
    ("Southern_Linear_Park", (6.0, -39.0), (19.0, 6.8), grass_meadow),
]
for patch_name, (patch_x, patch_y), (patch_rx, patch_ry), patch_material in landscape_patches:
    cylinder(
        f"Lanciano_{patch_name}",
        (patch_x, patch_y, 0.30),
        1.0,
        0.14,
        patch_material,
        root,
        greenery,
        vertices=64,
        scale=(patch_rx, patch_ry, 1.0),
    )

park_pines = [
    ("Southwest", -61.0, -25.0, 0.92),
    ("Southwest", -52.0, -28.0, 0.78),
    ("Southwest", -46.0, -22.0, 0.84),
    ("North", -3.0, 39.0, 0.78),
    ("North", 6.0, 41.0, 0.92),
    ("North", 14.0, 38.0, 0.82),
    ("Northeast", 51.0, 32.0, 0.86),
    ("Northeast", 59.0, 29.0, 0.76),
]
for index, (park_name, x, y, tree_scale) in enumerate(park_pines):
    create_umbrella_pine(
        f"Lanciano_{park_name}_Park_Pine_{index:02d}",
        (x, y, 0.37),
        tree_scale,
        root,
        greenery,
        bark,
        [foliage_a, foliage_b],
    )

# Stadio Guido Biondi: football pitch, concrete velodrome, terracing and floodlights.
stadium_root = empty(
    "STADIO_GUIDO_BIONDI_ROOT",
    location=(36.88, -2.89, 0.2),
    parent=root,
    target=stadium,
)
stadium_root.rotation_euler.z = math.radians(82)
stadium_root["landmark"] = "Stadio Guido Biondi, Lanciano"
oval_ring(
    "Guido_Biondi_Concrete_Base",
    (0, 0),
    (36.5, 26.0),
    (24.8, 15.8),
    0.35,
    stadium_concrete,
    stadium_root,
    stadium,
    height=0.34,
)
oval_ring(
    "Guido_Biondi_Velodrome",
    (0, 0),
    (31.5, 22.0),
    (24.9, 15.9),
    0.72,
    stadium_track,
    stadium_root,
    stadium,
    height=0.22,
)
cube(
    "Guido_Biondi_Football_Pitch",
    (0, 0, 0.82),
    (24.5, 14.7, 0.15),
    pitch_green,
    stadium_root,
    stadium,
    bevel=0.45,
)
for index in range(10):
    cube(
        f"Guido_Biondi_Pitch_Stripe_{index:02d}",
        (-22.0 + index * 4.9, 0, 1.0),
        (2.45, 14.55, 0.025),
        pitch_green_alt if index % 2 else pitch_green,
        stadium_root,
        stadium,
    )
# Painted football markings.
for name, location, scale_value in (
    ("Touchline_North", (0, 14.35, 1.06), (24.0, 0.08, 0.025)),
    ("Touchline_South", (0, -14.35, 1.06), (24.0, 0.08, 0.025)),
    ("GoalLine_East", (24.0, 0, 1.06), (0.08, 14.35, 0.025)),
    ("GoalLine_West", (-24.0, 0, 1.06), (0.08, 14.35, 0.025)),
    ("Halfway_Line", (0, 0, 1.06), (0.08, 14.35, 0.025)),
):
    cube(
        "Guido_Biondi_" + name,
        location,
        scale_value,
        white,
        stadium_root,
        stadium,
    )
torus(
    "Guido_Biondi_Centre_Circle",
    (0, 0, 1.07),
    3.7,
    0.075,
    white,
    stadium_root,
    stadium,
    major_segments=48,
    minor_segments=8,
)
cylinder(
    "Guido_Biondi_Centre_Spot",
    (0, 0, 1.08),
    0.13,
    0.04,
    white,
    stadium_root,
    stadium,
    vertices=16,
)
for side in (-1, 1):
    goal_x = side * 24.1
    for y in (-3.2, 3.2):
        cylinder(
            f"Guido_Biondi_Goal_{side}_{y}_Post",
            (goal_x, y, 2.15),
            0.08,
            2.25,
            white,
            stadium_root,
            stadium,
            vertices=10,
        )
    cube(
        f"Guido_Biondi_Goal_{side}_Crossbar",
        (goal_x, 0, 3.25),
        (0.08, 3.25, 0.08),
        white,
        stadium_root,
        stadium,
        bevel=0.03,
    )

# Curved turquoise terracing with yellow access bands.
for tier in range(7):
    inner = (31.4 + tier * 0.72, 22.15 + tier * 0.46)
    outer = (32.05 + tier * 0.72, 22.58 + tier * 0.46)
    oval_ring(
        f"Guido_Biondi_Seating_Tier_{tier:02d}",
        (0, 0),
        outer,
        inner,
        1.15 + tier * 0.42,
        seat_turquoise,
        stadium_root,
        stadium,
        height=0.22,
    )
for stair_index, angle in enumerate(
    (
        math.radians(24),
        math.radians(72),
        math.radians(112),
        math.radians(158),
        math.radians(204),
        math.radians(252),
        math.radians(292),
        math.radians(338),
    )
):
    cube(
        f"Guido_Biondi_Yellow_Access_{stair_index:02d}",
        (math.cos(angle) * 34.3, math.sin(angle) * 24.4, 3.35),
        (3.0, 0.34, 0.14),
        seat_yellow,
        stadium_root,
        stadium,
        bevel=0.06,
        rotation=(0, 0, angle),
    )

# Covered main stand with Lanciano's blue and yellow seating.
cube(
    "Guido_Biondi_MainStand_Base",
    (0, -25.2, 3.1),
    (16.5, 4.3, 2.6),
    stadium_concrete,
    stadium_root,
    stadium,
    bevel=0.18,
)
for row in range(6):
    for column in range(14):
        cube(
            f"Guido_Biondi_MainStand_Seat_{row:02d}_{column:02d}",
            (-14.3 + column * 2.2, -21.7 - row * 0.63, 2.1 + row * 0.42),
            (0.82, 0.26, 0.19),
            seat_blue if (column + row) % 3 else seat_yellow,
            stadium_root,
            stadium,
            bevel=0.06,
        )
for x in (-15.0, -7.5, 0.0, 7.5, 15.0):
    cylinder(
        f"Guido_Biondi_MainStand_Column_{x}",
        (x, -28.5, 6.5),
        0.18,
        7.0,
        stadium_concrete,
        stadium_root,
        stadium,
        vertices=12,
    )
cube(
    "Guido_Biondi_MainStand_Roof",
    (0, -26.6, 10.0),
    (18.0, 6.2, 0.35),
    white,
    stadium_root,
    stadium,
    bevel=0.15,
    rotation=(math.radians(-4), 0, 0),
)
add_text(
    "Guido_Biondi_Citta_Di_Lanciano",
    "CITTA' DI LANCIANO",
    (0, -32.85, 9.55),
    0.88,
    seat_blue,
    stadium_root,
    stadium,
)

# Perimeter safety railing.
railing_points = []
for index in range(97):
    angle = index / 96 * math.tau
    railing_points.append((math.cos(angle) * 37.0, math.sin(angle) * 26.4, 5.15))
poly_curve(
    "Guido_Biondi_Perimeter_Railing",
    railing_points,
    0.085,
    metal,
    stadium_root,
    stadium,
    cyclic=True,
    bevel_resolution=1,
)
for light_index, (x, y) in enumerate(
    ((-29.0, -19.0), (-29.0, 19.0), (29.0, -19.0), (29.0, 19.0))
):
    cylinder(
        f"Guido_Biondi_Floodlight_{light_index:02d}_Pole",
        (x, y, 13.2),
        0.22,
        25.0,
        metal,
        stadium_root,
        stadium,
        vertices=12,
    )
    cube(
        f"Guido_Biondi_Floodlight_{light_index:02d}_Array",
        (x, y, 26.1),
        (2.1, 0.42, 1.25),
        metal,
        stadium_root,
        stadium,
        bevel=0.1,
        rotation=(0, math.radians(12 if x < 0 else -12), 0),
    )
    for row in range(3):
        for column in range(5):
            sphere(
                f"Guido_Biondi_Floodlight_{light_index:02d}_Lamp_{row}_{column}",
                (
                    x + (column - 2) * 0.65,
                    y - 0.45,
                    25.45 + row * 0.65,
                ),
                (0.19, 0.09, 0.19),
                lamp_glow,
                stadium_root,
                stadium,
                segments=10,
                rings=6,
            )

# Future project connections remain invisible attachment points, not fantasy portals.
connection_angles = [
    math.radians(-160),
    math.radians(-112),
    math.radians(-52),
    math.radians(12),
    math.radians(72),
    math.radians(142),
]
for index, angle in enumerate(connection_angles, start=1):
    anchor = empty(
        f"Connection_{index:02d}_ProjectAnchor",
        location=(math.cos(angle) * 78.0, math.sin(angle) * 48.0, 3.0),
        parent=root,
        target=connections,
    )
    anchor["connection_index"] = index
    anchor["purpose"] = "Three.js project island attachment point"

# Render lighting.
sun_data = bpy.data.lights.new("RENDER_Sun_Data", "SUN")
sun_data.energy = 2.15
sun_data.color = (1.0, 0.58, 0.34)
sun_data.angle = math.radians(13)
sun_obj = bpy.data.objects.new("RENDER_Sun", sun_data)
sun_obj.rotation_euler = (math.radians(32), 0, math.radians(-38))
lighting.objects.link(sun_obj)

fill_data = bpy.data.lights.new("RENDER_Sky_Fill_Data", "AREA")
fill_data.energy = 3400
fill_data.shape = "DISK"
fill_data.size = 58
fill_data.color = (0.28, 0.48, 0.82)
fill_obj = bpy.data.objects.new("RENDER_Sky_Fill", fill_data)
fill_obj.location = (-45, -55, 80)
look_at(fill_obj, (0, 3, 2))
lighting.objects.link(fill_obj)

rim_data = bpy.data.lights.new("RENDER_Rim_Data", "AREA")
rim_data.energy = 1900
rim_data.shape = "DISK"
rim_data.size = 42
rim_data.color = (0.25, 0.68, 1.0)
rim_obj = bpy.data.objects.new("RENDER_Rim", rim_data)
rim_obj.location = (72, 58, 58)
look_at(rim_obj, (0, 3, 4))
lighting.objects.link(rim_obj)

front_data = bpy.data.lights.new("RENDER_FrontSoft_Data", "AREA")
front_data.energy = 2700
front_data.shape = "DISK"
front_data.size = 62
front_data.color = (0.72, 0.83, 1.0)
front_obj = bpy.data.objects.new("RENDER_FrontSoft", front_data)
front_obj.location = (10, -78, 72)
look_at(front_obj, (0, 3, 4))
lighting.objects.link(front_obj)

bpy.context.view_layer.update()
for index, (x, y, z) in enumerate(lamp_positions):
    point_data = bpy.data.lights.new(f"RENDER_Lamp_{index:02d}_Data", "POINT")
    point_data.energy = 110
    point_data.color = (1.0, 0.27, 0.07)
    point_data.shadow_soft_size = 2.0
    point_obj = bpy.data.objects.new(f"RENDER_Lamp_{index:02d}", point_data)
    point_obj.location = historic_root.matrix_world @ Vector(
        (x + 0.48, y, z + 3.9)
    )
    lighting.objects.link(point_obj)

camera_data = bpy.data.cameras.new("RENDER_Camera_Data")
camera = bpy.data.objects.new("RENDER_Camera", camera_data)
camera.location = (154.0, -192.0, 134.0)
camera.data.lens = 58
camera.data.sensor_width = 36
look_at(camera, (0, 3.0, 3.0))
lighting.objects.link(camera)
scene.camera = camera

# A subtle platform shadow beneath the island makes the silhouette readable.
shadow_mat = material(
    "MAT_Atmospheric_Shadow",
    (0.005, 0.01, 0.025),
    roughness=1.0,
    alpha=0.52,
)
cylinder(
    "Atmospheric_Shadow_Disc",
    (0, 0, -20.5),
    60.0,
    0.15,
    shadow_mat,
    root,
    foundation,
    vertices=64,
    scale=(1.38, 0.86, 1.0),
)

# A few warm windows keep the historic quarter alive at dusk.
for obj in scene.objects:
    if (
        obj.type == "MESH"
        and obj.name.endswith("_Glass")
        and sum(ord(character) for character in obj.name) % 4 == 0
    ):
        obj.data.materials.clear()
        obj.data.materials.append(window_warm)

# Select only the asset hierarchy for the dedicated GLB export.
bpy.ops.object.select_all(action="DESELECT")
export_count = 0
for obj in scene.objects:
    if not obj.name.startswith("RENDER_"):
        obj.select_set(True)
        export_count += 1
scene.frame_set(1)

os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

_result = {
    "blend_path": BLEND_PATH,
    "objects": len(scene.objects),
    "selected_for_export": export_count,
    "animations": len(bpy.data.actions),
    "connections": 6,
    "frame_range": [scene.frame_start, scene.frame_end],
}
