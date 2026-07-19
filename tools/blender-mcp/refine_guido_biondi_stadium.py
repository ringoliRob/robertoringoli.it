import bpy
import math


STADIUM_ROOT_NAME = "STADIO_GUIDO_BIONDI_ROOT"
STADIUM_COLLECTION_NAME = "09_STADIO_GUIDO_BIONDI"
REFINED_PREFIX = "GBR_Refined_"


def material(name, color, roughness=0.82, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def assign(obj, mat):
    if not obj.data:
        return
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def add_box_geometry(vertices, faces, center, dimensions, rotation_z=0.0):
    cx, cy, cz = center
    hx, hy, hz = (value * 0.5 for value in dimensions)
    cos_a = math.cos(rotation_z)
    sin_a = math.sin(rotation_z)
    start = len(vertices)
    for x, y, z in (
        (-hx, -hy, -hz),
        (hx, -hy, -hz),
        (hx, hy, -hz),
        (-hx, hy, -hz),
        (-hx, -hy, hz),
        (hx, -hy, hz),
        (hx, hy, hz),
        (-hx, hy, hz),
    ):
        rx = x * cos_a - y * sin_a
        ry = x * sin_a + y * cos_a
        vertices.append((cx + rx, cy + ry, cz + z))
    faces.extend(
        (
            (start + 0, start + 1, start + 2, start + 3),
            (start + 4, start + 7, start + 6, start + 5),
            (start + 0, start + 4, start + 5, start + 1),
            (start + 1, start + 5, start + 6, start + 2),
            (start + 2, start + 6, start + 7, start + 3),
            (start + 4, start + 0, start + 3, start + 7),
        )
    )


def add_beam_geometry(vertices, faces, point_a, point_b, thickness):
    """Rectangular beam between two points; optimized for the YZ roof trusses."""
    ax, ay, az = point_a
    bx, by, bz = point_b
    dx, dy, dz = bx - ax, by - ay, bz - az
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    dx, dy, dz = dx / length, dy / length, dz / length
    ux, uy, uz = 1.0, 0.0, 0.0
    vx, vy, vz = 0.0, dz, -dy
    v_length = math.sqrt(vy * vy + vz * vz)
    vy, vz = vy / v_length, vz / v_length
    half = thickness * 0.5
    start = len(vertices)
    for px, py, pz in (point_a, point_b):
        for u_sign, v_sign in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            vertices.append(
                (
                    px + ux * half * u_sign + vx * half * v_sign,
                    py + uy * half * u_sign + vy * half * v_sign,
                    pz + uz * half * u_sign + vz * half * v_sign,
                )
            )
    faces.extend(
        (
            (start, start + 1, start + 2, start + 3),
            (start + 4, start + 7, start + 6, start + 5),
            (start, start + 4, start + 5, start + 1),
            (start + 1, start + 5, start + 6, start + 2),
            (start + 2, start + 6, start + 7, start + 3),
            (start + 3, start + 7, start + 4, start),
        )
    )


def mesh_object(name, vertices, faces, mat, parent, collection):
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    assign(obj, mat)
    return obj


def box_batch(name, boxes, mat, parent, collection):
    vertices = []
    faces = []
    for center, dimensions, rotation_z in boxes:
        add_box_geometry(vertices, faces, center, dimensions, rotation_z)
    return mesh_object(name, vertices, faces, mat, parent, collection)


def annular_sector(
    name,
    angle_start,
    angle_end,
    inner_radius,
    outer_radius,
    z,
    height,
    mat,
    parent,
    collection,
    segments=24,
    center_x=0.0,
):
    vertices = []
    faces = []
    irx, iry = inner_radius
    orx, ory = outer_radius
    for level in (z, z + height):
        for index in range(segments + 1):
            angle = angle_start + (angle_end - angle_start) * index / segments
            vertices.append(
                (
                    center_x + math.cos(angle) * orx,
                    math.sin(angle) * ory,
                    level,
                )
            )
        for index in range(segments + 1):
            angle = angle_start + (angle_end - angle_start) * index / segments
            vertices.append(
                (
                    center_x + math.cos(angle) * irx,
                    math.sin(angle) * iry,
                    level,
                )
            )
    stride = segments + 1
    outer_bottom = 0
    inner_bottom = stride
    outer_top = stride * 2
    inner_top = stride * 3
    for index in range(segments):
        following = index + 1
        faces.extend(
            (
                (
                    outer_top + index,
                    outer_top + following,
                    inner_top + following,
                    inner_top + index,
                ),
                (
                    outer_bottom + following,
                    outer_bottom + index,
                    inner_bottom + index,
                    inner_bottom + following,
                ),
                (
                    outer_bottom + index,
                    outer_bottom + following,
                    outer_top + following,
                    outer_top + index,
                ),
                (
                    inner_bottom + following,
                    inner_bottom + index,
                    inner_top + index,
                    inner_top + following,
                ),
            )
        )
    faces.extend(
        (
            (
                outer_bottom,
                outer_top,
                inner_top,
                inner_bottom,
            ),
            (
                outer_bottom + segments,
                inner_bottom + segments,
                inner_top + segments,
                outer_top + segments,
            ),
        )
    )
    return mesh_object(name, vertices, faces, mat, parent, collection)


def oval_podium(name, outer, inner, z_bottom, z_top, mat, parent, collection, segments=112):
    vertices = []
    faces = []
    for z in (z_bottom, z_top):
        for radius in (outer, inner):
            rx, ry = radius
            for index in range(segments):
                angle = index / segments * math.tau
                vertices.append((math.cos(angle) * rx, math.sin(angle) * ry, z))
    outer_bottom = 0
    inner_bottom = segments
    outer_top = segments * 2
    inner_top = segments * 3
    for index in range(segments):
        following = (index + 1) % segments
        faces.extend(
            (
                (
                    outer_top + index,
                    outer_top + following,
                    inner_top + following,
                    inner_top + index,
                ),
                (
                    outer_bottom + index,
                    outer_bottom + following,
                    outer_top + following,
                    outer_top + index,
                ),
                (
                    inner_bottom + following,
                    inner_bottom + index,
                    inner_top + index,
                    inner_top + following,
                ),
            )
        )
    return mesh_object(name, vertices, faces, mat, parent, collection)


def stadium_contour(half_length, half_width, straight_segments=32, arc_segments=48):
    """Rounded football-stadium outline: straight touchlines and curved goal ends."""
    center_offset = half_length - half_width
    points = []
    for index in range(straight_segments):
        amount = index / straight_segments
        points.append((center_offset - 2.0 * center_offset * amount, half_width))
    for index in range(arc_segments):
        angle = math.pi * 0.5 + math.pi * index / arc_segments
        points.append(
            (
                -center_offset + math.cos(angle) * half_width,
                math.sin(angle) * half_width,
            )
        )
    for index in range(straight_segments):
        amount = index / straight_segments
        points.append((-center_offset + 2.0 * center_offset * amount, -half_width))
    for index in range(arc_segments):
        angle = -math.pi * 0.5 + math.pi * index / arc_segments
        points.append(
            (
                center_offset + math.cos(angle) * half_width,
                math.sin(angle) * half_width,
            )
        )
    return points


def superellipse_contour(half_length, half_width, exponent, segments=160):
    """Rounded rectangle; higher exponents preserve the football pitch corners."""
    points = []
    power = 2.0 / exponent
    for index in range(segments):
        angle = index / segments * math.tau
        cosine = math.cos(angle)
        sine = math.sin(angle)
        x = math.copysign(abs(cosine) ** power, cosine) * half_length
        y = math.copysign(abs(sine) ** power, sine) * half_width
        points.append((x, y))
    return points


def athletics_contour(
    half_straight,
    end_depth,
    half_width,
    straight_segments=32,
    arc_segments=48,
):
    """Track outline with straight sidelines and semi-elliptical goal ends."""
    points = []
    for index in range(straight_segments):
        amount = index / straight_segments
        points.append(
            (
                half_straight - 2.0 * half_straight * amount,
                half_width,
            )
        )
    for index in range(arc_segments):
        angle = math.pi * 0.5 + math.pi * index / arc_segments
        points.append(
            (
                -half_straight + math.cos(angle) * end_depth,
                math.sin(angle) * half_width,
            )
        )
    for index in range(straight_segments):
        amount = index / straight_segments
        points.append(
            (
                -half_straight + 2.0 * half_straight * amount,
                -half_width,
            )
        )
    for index in range(arc_segments):
        angle = -math.pi * 0.5 + math.pi * index / arc_segments
        points.append(
            (
                half_straight + math.cos(angle) * end_depth,
                math.sin(angle) * half_width,
            )
        )
    return points


def sloped_stadium_bowl(
    name,
    inner_size,
    outer_size,
    inner_z,
    outer_z,
    mat,
    parent,
    collection,
    slope_rings=14,
):
    vertices = []
    faces = []
    inner_contour = athletics_contour(*inner_size)
    outer_contour = athletics_contour(*outer_size)
    segments = len(inner_contour)
    for ring in range(slope_rings + 1):
        amount = ring / slope_rings
        eased = amount ** 0.82
        z = inner_z + (outer_z - inner_z) * eased
        for index, inner_point in enumerate(inner_contour):
            outer_point = outer_contour[index]
            vertices.append(
                (
                    inner_point[0] + (outer_point[0] - inner_point[0]) * amount,
                    inner_point[1] + (outer_point[1] - inner_point[1]) * amount,
                    z,
                )
            )
    for ring in range(slope_rings):
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
    return mesh_object(name, vertices, faces, mat, parent, collection)


def stadium_podium(
    name,
    outer_size,
    inner_size,
    bottom_z,
    top_z,
    mat,
    parent,
    collection,
):
    outer = athletics_contour(*outer_size)
    inner = athletics_contour(*inner_size)
    segments = len(outer)
    vertices = []
    faces = []
    for z in (bottom_z, top_z):
        vertices.extend((x, y, z) for x, y in outer)
        vertices.extend((x, y, z) for x, y in inner)
    outer_bottom = 0
    inner_bottom = segments
    outer_top = segments * 2
    inner_top = segments * 3
    for index in range(segments):
        following = (index + 1) % segments
        faces.extend(
            (
                (
                    outer_top + index,
                    outer_top + following,
                    inner_top + following,
                    inner_top + index,
                ),
                (
                    outer_bottom + index,
                    outer_bottom + following,
                    outer_top + following,
                    outer_top + index,
                ),
                (
                    inner_bottom + following,
                    inner_bottom + index,
                    inner_top + index,
                    inner_top + following,
                ),
            )
        )
    return mesh_object(name, vertices, faces, mat, parent, collection)


def text_mesh(name, body, location, size, mat, parent, collection):
    curve = bpy.data.curves.new(name + "_Curve", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.055
    curve.bevel_depth = 0.012
    curve.bevel_resolution = 1
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


stadium_root = bpy.data.objects.get(STADIUM_ROOT_NAME)
stadium_collection = bpy.data.collections.get(STADIUM_COLLECTION_NAME)
if not stadium_root or not stadium_collection:
    raise RuntimeError("Stadio Guido Biondi non trovato nella scena corrente")

# Remove only the old continuous seating ring and previous refined parts.
for obj in list(bpy.data.objects):
    if (
        obj.name.startswith(REFINED_PREFIX)
        or obj.name.startswith("Guido_Biondi_Seating_Tier_")
        or obj.name.startswith("Guido_Biondi_Yellow_Access_")
        or obj.name.startswith("Guido_Biondi_MainStand_Seat_")
        or obj.name == "Guido_Biondi_MainStand_Base"
        or obj.name == "Guido_Biondi_Velodrome"
        or obj.name == "Guido_Biondi_Citta_Di_Lanciano"
    ):
        bpy.data.objects.remove(obj, do_unlink=True)

concrete = material("MAT_GBR_Raised_Concrete", (0.48, 0.50, 0.48), 0.92)
concrete_light = material("MAT_GBR_Terrace_Concrete", (0.67, 0.68, 0.64), 0.91)
banked_concrete = material("MAT_GBR_Banked_Concrete", (0.56, 0.54, 0.48), 0.94)
yellow = material("MAT_Stadium_Seat_Yellow", (1.0, 0.66, 0.015), 0.66)
blue = material("MAT_Stadium_Seat_Blue", (0.018, 0.12, 0.82), 0.66)
red = material("MAT_GBR_Lanciano_Red", (0.82, 0.012, 0.025), 0.68)
black = material("MAT_GBR_Lanciano_Black", (0.010, 0.012, 0.014), 0.64)
curve_green = material("MAT_GBR_Curve_Pale_Green", (0.075, 0.52, 0.27), 0.78)
white = material("MAT_GBR_Lettering_White", (0.92, 0.92, 0.86), 0.68)
metal = material("MAT_GBR_Railing", (0.035, 0.045, 0.05), 0.42, 0.72)
pitch_object = bpy.data.objects.get("Guido_Biondi_Football_Pitch")
pitch_grass = (
    pitch_object.data.materials[0]
    if pitch_object and pitch_object.data and pitch_object.data.materials
    else material("MAT_GBR_Pitch_Grass", (0.16, 0.42, 0.08), 0.88)
)

# Keep the precise existing outline and emphasize the elevated concrete border.
oval_podium(
    REFINED_PREFIX + "Continuous_Raised_Concrete_Border",
    (36.5, 26.0),
    (34.25, 23.65),
    -0.16,
    1.12,
    concrete,
    stadium_root,
    stadium_collection,
)

# The original pitch must remain above the island terrain so its stripes stay visible.
# Store the applied offset on the root to keep this refinement idempotent.
target_field_drop = 0.0
previous_field_drop = float(stadium_root.get("gbr_field_drop", 0.0))
field_drop_delta = target_field_drop - previous_field_drop
if abs(field_drop_delta) > 0.0001:
    field_tokens = (
        "Football_Pitch",
        "Pitch_Stripe",
        "Touchline",
        "GoalLine",
        "Center_Line",
        "Center_Circle",
        "Penalty",
        "Corner_Arc",
        "Guido_Biondi_Goal_",
    )
    for obj in stadium_root.children_recursive:
        if any(token in obj.name for token in field_tokens):
            obj.location.z -= field_drop_delta
    stadium_root["gbr_field_drop"] = target_field_drop

# One continuous green oval apron surrounds the rectangular marked pitch.
apron_outline = athletics_contour(24.50, 8.00, 15.50)
apron_vertices = [(0.0, 0.0, 0.985)]
apron_vertices.extend((x, y, 0.985) for x, y in apron_outline)
apron_faces = []
for index in range(len(apron_outline)):
    apron_faces.append(
        (
            0,
            index + 1,
            ((index + 1) % len(apron_outline)) + 1,
        )
    )
mesh_object(
    REFINED_PREFIX + "Green_Oval_Field_Apron",
    apron_vertices,
    apron_faces,
    pitch_grass,
    stadium_root,
    stadium_collection,
)

sloped_stadium_bowl(
    REFINED_PREFIX + "Continuous_Banked_Concrete_Bowl",
    (24.50, 8.00, 15.50),
    (24.50, 10.50, 20.20),
    1.04,
    2.48,
    banked_concrete,
    stadium_root,
    stadium_collection,
)

# A continuous upper curb and repeated fence posts follow the complete bowl.
stadium_podium(
    REFINED_PREFIX + "Banked_Bowl_Upper_Curb",
    (24.50, 10.82, 20.52),
    (24.50, 10.46, 20.16),
    2.44,
    2.68,
    concrete_light,
    stadium_root,
    stadium_collection,
)
bowl_fence_posts = []
fence_contour = athletics_contour(24.50, 10.66, 20.36)
fence_step = max(1, len(fence_contour) // 40)
for index in range(0, len(fence_contour), fence_step):
    previous = fence_contour[index - 1]
    following = fence_contour[(index + 1) % len(fence_contour)]
    x, y = fence_contour[index]
    tangent_angle = math.atan2(following[1] - previous[1], following[0] - previous[0])
    bowl_fence_posts.append(
        (
            (x, y, 3.08),
            (0.10, 0.10, 0.88),
            tangent_angle,
        )
    )
box_batch(
    REFINED_PREFIX + "Banked_Bowl_Fence_Posts",
    bowl_fence_posts,
    metal,
    stadium_root,
    stadium_collection,
)

# Dark expansion joints make the real inclination readable in viewport and render.
joint_inner = athletics_contour(24.50, 8.00, 15.50)
joint_outer = athletics_contour(24.50, 10.50, 20.20)
joint_vertices = []
joint_faces = []
for index in range(0, len(joint_inner), 10):
    inner_point = joint_inner[index]
    outer_point = joint_outer[index]
    direction_x = outer_point[0] - inner_point[0]
    direction_y = outer_point[1] - inner_point[1]
    length = math.hypot(direction_x, direction_y)
    normal_x = -direction_y / length * 0.035
    normal_y = direction_x / length * 0.035
    start = len(joint_vertices)
    joint_vertices.extend(
        (
            (inner_point[0] + normal_x, inner_point[1] + normal_y, 1.055),
            (inner_point[0] - normal_x, inner_point[1] - normal_y, 1.055),
            (outer_point[0] - normal_x, outer_point[1] - normal_y, 2.495),
            (outer_point[0] + normal_x, outer_point[1] + normal_y, 2.495),
        )
    )
    joint_faces.append((start, start + 1, start + 2, start + 3))
mesh_object(
    REFINED_PREFIX + "Banked_Bowl_Expansion_Joints",
    joint_vertices,
    joint_faces,
    metal,
    stadium_root,
    stadium_collection,
)

# Repeated outer pilasters communicate the elevated structure without heavy geometry.
pilasters = []
for index in range(28):
    angle = index / 28 * math.tau
    x = math.cos(angle) * 35.45
    y = math.sin(angle) * 24.95
    pilasters.append(((x, y, 0.47), (0.48, 0.48, 1.26), angle))
box_batch(
    REFINED_PREFIX + "Outer_Concrete_Pilasters",
    pilasters,
    concrete_light,
    stadium_root,
    stadium_collection,
)

# Main covered stand: real concrete steps with visible seats in broad
# yellow-blue-yellow-blue-yellow sections.
main_lift = 2.20
main_concrete = [
    ((0.0, -26.35, 0.92 + main_lift), (33.0, 6.6, 1.45), 0.0)
]
main_yellow_seats = []
main_blue_seats = []
for row in range(6):
    y = -20.95 - row * 0.76
    z = 1.62 + main_lift + row * 0.50
    main_concrete.append(((0.0, y, z - 0.20), (33.0, 0.98, 0.48), 0.0))
    for column in range(14):
        x = -14.3 + column * 2.2
        seat = ((x, y + 0.10, z + 0.13), (1.62, 0.52, 0.30), 0.0)
        blue_columns = {3, 4, 5, 9, 10, 11}
        (main_blue_seats if column in blue_columns else main_yellow_seats).append(seat)
box_batch(
    REFINED_PREFIX + "Main_Stand_Concrete_Gradoni",
    main_concrete,
    concrete_light,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Main_Stand_Yellow_Seats",
    main_yellow_seats,
    yellow,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Main_Stand_Blue_Seats",
    main_blue_seats,
    blue,
    stadium_root,
    stadium_collection,
)

# The real canopy covers the rear part of the main stand rather than hiding
# every coloured row from an elevated view.
main_roof = bpy.data.objects.get("Guido_Biondi_MainStand_Roof")
if main_roof:
    main_roof.hide_viewport = True
    main_roof.hide_render = True

roof_vertices = [
    (-17.75, -22.55, 9.95),
    (17.75, -22.55, 9.95),
    (17.75, -32.70, 11.25),
    (-17.75, -32.70, 11.25),
    (-17.75, -22.55, 9.58),
    (17.75, -22.55, 9.58),
    (17.75, -32.70, 10.88),
    (-17.75, -32.70, 10.88),
]
roof_faces = [
    (0, 1, 2, 3),
    (4, 7, 6, 5),
    (0, 4, 5, 1),
    (1, 5, 6, 2),
    (2, 6, 7, 3),
    (3, 7, 4, 0),
]
mesh_object(
    REFINED_PREFIX + "Main_Stand_Sloped_Canopy",
    roof_vertices,
    roof_faces,
    concrete_light,
    stadium_root,
    stadium_collection,
)

main_roof_supports = []
for support_x in (-15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0):
    main_roof_supports.append(
        ((support_x, -30.20, 6.93), (0.30, 0.34, 8.30), 0.0)
    )
box_batch(
    REFINED_PREFIX + "Main_Stand_Roof_Supports",
    main_roof_supports,
    metal,
    stadium_root,
    stadium_collection,
)
truss_vertices = []
truss_faces = []
for truss_x in (-16.0, -12.0, -8.0, -4.0, 0.0, 4.0, 8.0, 12.0, 16.0):
    add_beam_geometry(
        truss_vertices,
        truss_faces,
        (truss_x, -32.50, 11.42),
        (truss_x, -22.65, 10.12),
        0.28,
    )
    add_beam_geometry(
        truss_vertices,
        truss_faces,
        (truss_x, -29.70, 13.35),
        (truss_x, -22.65, 10.12),
        0.28,
    )
    add_beam_geometry(
        truss_vertices,
        truss_faces,
        (truss_x, -29.70, 13.35),
        (truss_x, -32.50, 11.42),
        0.28,
    )
mesh_object(
    REFINED_PREFIX + "Main_Stand_Roof_Trusses",
    truss_vertices,
    truss_faces,
    concrete_light,
    stadium_root,
    stadium_collection,
)

# Blue access aisles and yellow roof edge make the main stand legible from above.
main_aisles = []
for aisle_x in (-8.8, 0.0, 8.8):
    for row in range(6):
        main_aisles.append(
            (
                (
                    aisle_x,
                    -20.95 - row * 0.76,
                    1.94 + main_lift + row * 0.50,
                ),
                (0.58, 0.56, 0.16),
                0.0,
            )
        )
box_batch(
    REFINED_PREFIX + "Main_Stand_Blue_Access_Aisles",
    main_aisles,
    blue,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Main_Stand_Yellow_Roof_Edge",
    [((0.0, -22.55, 9.93), (35.5, 0.30, 0.28), 0.0)],
    yellow,
    stadium_root,
    stadium_collection,
)

# Opposite "Distinti": a straight, independent red-and-black stand. The
# lettering is made from pale seats inside the seating grid, not from signage.
distinct_lift = 1.90
distinct_concrete = []
distinct_red_seats = []
distinct_black_seats = []
distinct_letter_seats = []
for row in range(7):
    y = 19.65 + row * 0.72
    z = 1.42 + distinct_lift + row * 0.48
    distinct_concrete.append(((0.0, y, z - 0.18), (33.0, 0.92, 0.44), 0.0))

glyphs = {
    "A": ("010", "101", "111", "101", "101"),
    "C": ("111", "100", "100", "100", "111"),
    "D": ("110", "101", "101", "101", "110"),
    "I": ("111", "010", "010", "010", "111"),
    "L": ("100", "100", "100", "100", "111"),
    "N": ("101", "111", "111", "111", "101"),
    "O": ("111", "101", "101", "101", "111"),
    "T": ("111", "010", "010", "010", "010"),
}


def mosaic_columns(text):
    columns = []
    for char_index, char in enumerate(text):
        if char == " ":
            columns.extend([[0, 0, 0, 0, 0]] * 2)
            continue
        rows = glyphs[char]
        for glyph_column in range(3):
            columns.append(
                [int(rows[glyph_row][glyph_column]) for glyph_row in range(5)]
            )
        if char_index != len(text) - 1:
            columns.append([0, 0, 0, 0, 0])
    return columns


def add_seat_mosaic(text, x_min, x_max):
    columns = mosaic_columns(text)
    spacing = (x_max - x_min) / len(columns)
    for row in range(7):
        y = 19.65 + row * 0.72
        z = 1.42 + distinct_lift + row * 0.48
        for column, pixels in enumerate(columns):
            x = x_min + (column + 0.5) * spacing
            seat = (
                (x, y - 0.12, z + 0.12),
                (spacing * 0.94, 0.78, 0.32),
                0.0,
            )
            is_letter = 1 <= row <= 5 and pixels[5 - row] == 1
            if is_letter:
                distinct_letter_seats.append(seat)
            elif (column // 4) % 2 == 0:
                distinct_red_seats.append(seat)
            else:
                distinct_black_seats.append(seat)


add_seat_mosaic("CITTA DI", -15.65, -1.75)
add_seat_mosaic("LANCIANO", 1.75, 15.65)
box_batch(
    REFINED_PREFIX + "Distinti_Continuous_Raised_Base",
    [((0.0, 22.0, 2.72), (33.4, 6.0, 0.48), 0.0)],
    concrete_light,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Distinti_Concrete_Gradoni",
    distinct_concrete,
    black,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Distinti_Red_Seats",
    distinct_red_seats,
    red,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Distinti_Black_Seats",
    distinct_black_seats,
    black,
    stadium_root,
    stadium_collection,
)
box_batch(
    REFINED_PREFIX + "Distinti_Seat_Mosaic_Lettering",
    distinct_letter_seats,
    white,
    stadium_root,
    stadium_collection,
)

# The central tunnel separates the two seat-written phrases.
box_batch(
    REFINED_PREFIX + "Distinti_Central_Tunnel",
    [
        ((-1.45, 19.8, 2.15 + distinct_lift), (0.34, 1.9, 2.7), 0.0),
        ((1.45, 19.8, 2.15 + distinct_lift), (0.34, 1.9, 2.7), 0.0),
        ((0.0, 19.8, 3.52 + distinct_lift), (3.25, 1.9, 0.30), 0.0),
    ],
    concrete,
    stadium_root,
    stadium_collection,
)

# Independent raised curves. A curved concrete deck and two rows of pillars
# support each one above the continuous lower perimeter wall.
curve_lift = 0.55
curve_ranges = [
    ("East", 24.50, math.radians(-72), math.radians(72)),
    ("West", -24.50, math.radians(108), math.radians(252)),
]
for curve_name, center_x, angle_start, angle_end in curve_ranges:
    annular_sector(
        REFINED_PREFIX + f"Curva_{curve_name}_Rear_Structure_Wall",
        angle_start,
        angle_end,
        (11.45, 23.85),
        (12.00, 24.75),
        1.04,
        2.22,
        concrete,
        stadium_root,
        stadium_collection,
        segments=28,
        center_x=center_x,
    )
    annular_sector(
        REFINED_PREFIX + f"Curva_{curve_name}_Concrete_Deck",
        angle_start,
        angle_end,
        (8.35, 18.95),
        (12.00, 24.75),
        2.67 + curve_lift,
        0.42,
        concrete_light,
        stadium_root,
        stadium_collection,
        segments=28,
        center_x=center_x,
    )
    for row in range(7):
        inner = (8.65 + row * 0.48, 19.25 + row * 0.70)
        outer = (9.05 + row * 0.48, 19.72 + row * 0.70)
        annular_sector(
            REFINED_PREFIX + f"Curva_{curve_name}_Gradone_{row:02d}",
            angle_start,
            angle_end,
            inner,
            outer,
            3.17 + curve_lift + row * 0.30,
            0.20,
            curve_green,
            stadium_root,
            stadium_collection,
            segments=26,
            center_x=center_x,
        )

curve_supports = []
for center_x, angle_start, angle_end in (
    (24.50, math.radians(-66), math.radians(66)),
    (-24.50, math.radians(114), math.radians(246)),
):
    for index in range(7):
        angle = angle_start + (angle_end - angle_start) * index / 6
        for rx, ry in ((8.95, 19.55), (11.65, 23.90)):
            curve_supports.append(
                (
                    (
                        center_x + math.cos(angle) * rx,
                        math.sin(angle) * ry,
                        2.205,
                    ),
                    (0.72, 0.72, 3.13),
                    angle,
                )
            )
box_batch(
    REFINED_PREFIX + "Curve_Concrete_Support_Pillars",
    curve_supports,
    concrete_light,
    stadium_root,
    stadium_collection,
)

# Yellow stepped bands mark the entrances inside each curve.
yellow_steps = []
for angle_degrees in (-30, 0, 30, 150, 180, 210):
    angle = math.radians(angle_degrees)
    center_x = 24.50 if math.cos(angle) >= 0.0 else -24.50
    for row in range(7):
        rx = 8.85 + row * 0.48
        ry = 19.48 + row * 0.70
        yellow_steps.append(
            (
                (
                    center_x + math.cos(angle) * rx,
                    math.sin(angle) * ry,
                    3.41 + curve_lift + row * 0.30,
                ),
                (0.92, 0.66, 0.14),
                angle,
            )
        )
box_batch(
    REFINED_PREFIX + "Curve_Yellow_Entrance_Bands",
    yellow_steps,
    yellow,
    stadium_root,
    stadium_collection,
)

# Lightweight top rails on the distinct stand and the two curve ends.
rail_boxes = [
    ((0.0, 24.45, 5.02 + distinct_lift), (33.0, 0.10, 0.12), 0.0),
    ((-16.45, 22.1, 3.9 + distinct_lift), (0.10, 5.2, 0.12), 0.0),
    ((16.45, 22.1, 3.9 + distinct_lift), (0.10, 5.2, 0.12), 0.0),
]
box_batch(
    REFINED_PREFIX + "Distinti_Top_Rail",
    rail_boxes,
    metal,
    stadium_root,
    stadium_collection,
)

bpy.context.view_layer.update()
camera = bpy.data.objects.get("RENDER_Camera")
if camera:
    for backup_prefix in ("gbr_backup", "final_review"):
        location_key = backup_prefix + "_location"
        rotation_key = backup_prefix + "_rotation"
        lens_key = backup_prefix + "_lens"
        if location_key in camera:
            camera.location = camera[location_key]
            camera.rotation_euler = camera[rotation_key]
            camera.data.lens = float(camera[lens_key])
            del camera[location_key]
            del camera[rotation_key]
            del camera[lens_key]
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(
    filepath=r"C:\Users\rober\Documents\GitHub\robertoringoli.it\assets\blender\lanciano_central_island.blend"
)

refined_objects = [
    obj
    for obj in bpy.data.objects
    if obj.name.startswith(REFINED_PREFIX)
]
_result = {
    "stadium_root_location": [round(value, 3) for value in stadium_root.location],
    "stadium_root_rotation_z_degrees": round(
        math.degrees(stadium_root.rotation_euler.z), 3
    ),
    "refined_objects": len(refined_objects),
    "continuous_old_seating_removed": not any(
        obj.name.startswith("Guido_Biondi_Seating_Tier_")
        for obj in bpy.data.objects
    ),
    "sections": [
        "yellow_blue_main_stand",
        "red_black_distinti",
        "pale_green_east_curve",
        "pale_green_west_curve",
        "continuous_raised_concrete_border",
    ],
}
