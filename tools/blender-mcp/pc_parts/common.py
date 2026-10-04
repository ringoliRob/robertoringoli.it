"""Funzioni condivise per modellare i componenti del PC in Blender.

Convenzioni (devono restare allineate a src/scene/PCWorld.ts):
- 1 unità Blender = 1 unità della scena web (~10 cm).
- Origine = centro della base del case. Blender è Z-up; l'export glTF converte
  in Y-up, quindi Blender (x, y, z) -> Three.js (x, z, -y).
  Il vetro del case è sul lato -X, il fronte del case è verso -Y.
- Ogni componente ha un Empty radice col nome della parte (GPU, CPU, ...)
  posizionato dove sta da montato: il sito usa solo i figli, in coordinate locali.
- Materiali "RGB_*": luci animate dal sito (colore ed intensità).
- Oggetti "Fan_Rotor_*": rotori delle ventole, girano attorno al proprio asse Z locale.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def reset_collection(name):
    """Svuota (o crea) la collezione del componente senza toccare il resto."""
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    for obj in list(coll.all_objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    return coll


def material(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except Exception:  # Blender 5: i nodi sono sempre attivi
        pass
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    mat.diffuse_color = (*color, 1.0)
    return mat


def srgb(hex_color):
    """Colore esadecimale sRGB -> lineare (come lo vuole Blender)."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def empty(name, coll, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.3
    obj.location = location
    obj.parent = parent
    coll.objects.link(obj)
    return obj


def mesh_object(name, bm, coll, mats, parent=None, location=(0, 0, 0), smooth_angle=35):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    obj.location = location
    obj.parent = parent
    coll.objects.link(obj)
    if smooth_angle is not None:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(smooth_angle))
    return obj


def add_bevel(obj, width=0.012, segments=3, angle=30):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = True
    mod.miter_outer = "MITER_ARC"
    return mod


def cube_bm(size, center=(0, 0, 0), bm=None, rot_z=0.0):
    bm = bm or bmesh.new()
    res = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=res["verts"])
    if rot_z:
        bmesh.ops.rotate(bm, verts=res["verts"], matrix=Matrix.Rotation(rot_z, 3, "Z"))
    bmesh.ops.translate(bm, vec=Vector(center), verts=res["verts"])
    return bm


def box(name, size, center, coll, mat, parent=None, bevel=0.012, segments=3):
    obj = mesh_object(name, cube_bm(size), coll, [mat], parent, smooth_angle=None)
    obj.location = center
    if bevel:
        add_bevel(obj, bevel, segments)
    for p in obj.data.polygons:
        p.use_smooth = False
    return obj


def cylinder_bm(radius, depth, segments=32, center=(0, 0, 0), axis="Z", radius2=None, bm=None):
    bm = bm or bmesh.new()
    res = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius if radius2 is None else radius2,
        depth=depth,
    )
    verts = res["verts"]
    if axis == "X":
        bmesh.ops.rotate(bm, verts=verts, matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
    elif axis == "Y":
        bmesh.ops.rotate(bm, verts=verts, matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    bmesh.ops.translate(bm, vec=Vector(center), verts=verts)
    return bm


def torus_bm(major, minor, seg_major=64, seg_minor=12, center=(0, 0, 0), bm=None):
    """Toro nel piano XY."""
    bm = bm or bmesh.new()
    rings = []
    for i in range(seg_major):
        a = 2 * math.pi * i / seg_major
        ring = []
        for j in range(seg_minor):
            b = 2 * math.pi * j / seg_minor
            r = major + minor * math.cos(b)
            ring.append(
                bm.verts.new((center[0] + r * math.cos(a), center[1] + r * math.sin(a), center[2] + minor * math.sin(b)))
            )
        rings.append(ring)
    for i in range(seg_major):
        for j in range(seg_minor):
            a, b = rings[i], rings[(i + 1) % seg_major]
            bm.faces.new((a[j], b[j], b[(j + 1) % seg_minor], a[(j + 1) % seg_minor]))
    return bm


FONT_DIN = r"C:\Windows\Fonts\bahnschrift.ttf"


def load_font(path):
    for font in bpy.data.fonts:
        if font.filepath == path:
            return font
    return bpy.data.fonts.load(path)


def text_object(
    name,
    body,
    coll,
    mat,
    size,
    extrude,
    parent=None,
    location=(0, 0, 0),
    rotation=(0, 0, 0),
    font=None,
    offset=0.0,
    spacing=1.05,
    shear=0.0,
    resolution=12,
):
    """Testo convertito in mesh (così finisce nel GLB). offset > 0 ingrossa il tratto."""
    curve = bpy.data.curves.new(name + "_curve", type="FONT")
    curve.body = body
    curve.size = size
    curve.extrude = extrude
    curve.offset = offset
    curve.shear = shear
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.space_character = spacing
    curve.resolution_u = resolution
    if font:
        curve.font = load_font(font)
    tmp = bpy.data.objects.new(name + "_tmp", curve)
    coll.objects.link(tmp)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(depsgraph))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(curve)
    me.name = name
    me.materials.append(mat)
    obj = bpy.data.objects.new(name, me)
    obj.location = location
    obj.rotation_euler = rotation
    obj.parent = parent
    coll.objects.link(obj)
    return obj


def mesh_width(obj, axis=0):
    """Ingombro della mesh lungo un asse locale (prima di ruotarla)."""
    values = [v.co[axis] for v in obj.data.vertices]
    return (max(values) - min(values)) if values else 0.0


def offset_polygon(points, d):
    """Allarga (d > 0) un poligono convesso antiorario spostando i lati verso l'esterno."""
    n = len(points)
    out = []
    for i in range(n):
        p0, p1, p2 = Vector(points[i - 1]), Vector(points[i]), Vector(points[(i + 1) % n])
        e1 = (p1 - p0).normalized()
        e2 = (p2 - p1).normalized()
        n1 = Vector((e1.y, -e1.x))
        n2 = Vector((e2.y, -e2.x))
        bis = (n1 + n2).normalized()
        out.append(tuple(p1 + bis * (d / max(0.2, bis.dot(n1)))))
    return out


def _plane_point(u, v, w, plane):
    # plane "XZ": il profilo sta in X/Z e si estrude lungo Y
    if plane == "XZ":
        return Vector((u, w, v))
    if plane == "XY":
        return Vector((u, v, w))
    return Vector((w, u, v))  # "YZ"


def prism_bm(points, depth, center=(0, 0, 0), plane="XZ", bm=None):
    """Prisma estruso da un profilo 2D antiorario, centrato su `center`."""
    bm = bm or bmesh.new()
    c = Vector(center)
    front = [bm.verts.new(_plane_point(u, v, -depth / 2, plane) + c) for u, v in points]
    back = [bm.verts.new(_plane_point(u, v, depth / 2, plane) + c) for u, v in points]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def ring_prism_bm(outer, inner, depth, center=(0, 0, 0), plane="XZ", bm=None):
    """Cornice estrusa: profilo esterno e interno con lo stesso numero di punti."""
    bm = bm or bmesh.new()
    c = Vector(center)
    loops = {}
    for key, pts, w in (("of", outer, -depth / 2), ("ob", outer, depth / 2), ("if", inner, -depth / 2), ("ib", inner, depth / 2)):
        loops[key] = [bm.verts.new(_plane_point(u, v, w, plane) + c) for u, v in pts]
    n = len(outer)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((loops["of"][i], loops["of"][j], loops["if"][j], loops["if"][i]))
        bm.faces.new((loops["ob"][i], loops["ib"][i], loops["ib"][j], loops["ob"][j]))
        bm.faces.new((loops["of"][i], loops["ob"][i], loops["ob"][j], loops["of"][j]))
        bm.faces.new((loops["if"][i], loops["if"][j], loops["ib"][j], loops["ib"][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def apply_modifiers(obj):
    """Applica i modificatori senza operatori (funziona anche da timer)."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    me.name = old.name
    bpy.data.meshes.remove(old)


def boolean_cut(obj, cutters, solver="EXACT"):
    for i, cutter in enumerate(cutters):
        mod = obj.modifiers.new(f"Cut{i}", "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = solver
        mod.object = cutter
    apply_modifiers(obj)
    for cutter in cutters:
        me = cutter.data
        bpy.data.objects.remove(cutter, do_unlink=True)
        bpy.data.meshes.remove(me)


def fan_rotor_bm(r_hub, r_tip, blades=9, thickness=0.012, pitch=28, sweep=0.55, hub_depth=0.07):
    """Rotore con pale curve e svergolate attorno all'asse Z."""
    bm = cylinder_bm(r_hub, hub_depth, segments=40, radius2=r_hub * 0.9)
    U, V = 8, 4
    pitch_r = math.radians(pitch)
    for b in range(blades):
        base = 2 * math.pi * b / blades
        layers = []
        for side in (-1, 1):
            grid = []
            for i in range(U + 1):
                u = i / U
                r = r_hub * 0.92 + (r_tip - r_hub * 0.92) * u
                half = (0.36 + 0.22 * u) * math.pi / blades
                row = []
                for j in range(V + 1):
                    v = -1 + 2 * j / V
                    theta = base + sweep * u * u + v * half
                    z = v * r * half * math.sin(pitch_r) + side * thickness / 2
                    row.append(bm.verts.new((r * math.cos(theta), r * math.sin(theta), z)))
                grid.append(row)
            layers.append(grid)
        bot, top = layers
        for i in range(U):
            for j in range(V):
                bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
                bm.faces.new((bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]))
        for i in range(U):
            bm.faces.new((bot[i][0], bot[i + 1][0], top[i + 1][0], top[i][0]))
            bm.faces.new((top[i][V], top[i + 1][V], bot[i + 1][V], bot[i][V]))
        for j in range(V):
            bm.faces.new((top[U][j], bot[U][j], bot[U][j + 1], top[U][j + 1]))
            bm.faces.new((bot[0][j], top[0][j], top[0][j + 1], bot[0][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def triangle_count(objs):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in objs:
        if obj.type != "MESH":
            continue
        me = obj.evaluated_get(depsgraph).to_mesh()
        total += sum(len(p.vertices) - 2 for p in me.polygons)
        obj.evaluated_get(depsgraph).to_mesh_clear()
    return total


# ============================================================ texture generate
# Le texture procedurali dei nodi Blender non finiscono nel GLB: qui generiamo
# immagini PNG ripetibili (tileable) con numpy e le salviamo accanto al .blend.

import os

import numpy as np

TEX_DIR = r"C:\Users\rober\Documents\GitHub\robertoringoli.it\assets\blender\textures"


def _blur(a, sigma):
    """Sfocatura gaussiana via FFT: il risultato resta ripetibile ai bordi."""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    k = np.exp(-2 * (np.pi**2) * (sigma**2) * (fx**2 + fy**2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * k))


def _norm01(a):
    a = a - a.min()
    return a / max(float(a.max()), 1e-8)


def save_image(name, rgb, non_color=True):
    h, w, _ = rgb.shape
    img = bpy.data.images.get(name)
    if img is not None and tuple(img.size) != (w, h):
        bpy.data.images.remove(img)
        img = None
    if img is None:
        img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = np.clip(rgb, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    os.makedirs(TEX_DIR, exist_ok=True)
    img.filepath_raw = os.path.join(TEX_DIR, name + ".png")
    img.file_format = "PNG"
    img.save()
    img.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    return img


def grain_height(size=512, seed=1):
    rng = np.random.default_rng(seed)
    fine = _norm01(_blur(rng.standard_normal((size, size)), 0.7))
    mid = _norm01(_blur(rng.standard_normal((size, size)), 3.0))
    coarse = _norm01(_blur(rng.standard_normal((size, size)), 28.0))
    return fine * 0.6 + mid * 0.28 + coarse * 0.12, mid, coarse


def normal_from_height(height, strength=2.0):
    gx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 0.5 * strength
    gy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 0.5 * strength
    n = np.stack([-gx, -gy, np.ones_like(height)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def roughness_map(mid, coarse, mean, amp):
    r = mean + (_norm01(mid * 0.6 + coarse * 0.4) - 0.5) * 2 * amp
    return np.repeat(r[..., None], 3, axis=-1)


def use_textures(mat, rough=None, normal=None, normal_strength=0.3, color=None):
    """Collega le immagini al Principled BSDF in modo che l'export glTF le riconosca."""
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    for node in list(nt.nodes):
        if node.name.startswith("RR_"):
            nt.nodes.remove(node)
    x = bsdf.location.x - 600
    if color is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.name = "RR_color"
        tex.image = color
        tex.location = (x, 300)
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if rough is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.name = "RR_rough"
        tex.image = rough
        tex.location = (x, 0)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        sep.name = "RR_rough_sep"
        sep.location = (x + 300, 0)
        nt.links.new(tex.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    if normal is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.name = "RR_normal"
        tex.image = normal
        tex.location = (x, -300)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.name = "RR_normal_map"
        nm.location = (x + 300, -300)
        nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(tex.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])


def box_uv(obj, tile=0.25):
    """Proiezione a cubo con densità costante: 1 ripetizione ogni `tile` unità."""
    if obj.type != "MESH":
        return
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    k = 1.0 / tile
    for face in bm.faces:
        n = face.normal
        axis = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][axis]
        for loop in face.loops:
            co = loop.vert.co
            loop[uv].uv = (co[a] * k, co[b] * k)
    bm.to_mesh(me)
    bm.free()


def pcb_texture(
    size=1024,
    seed=7,
    base=(0.035, 0.11, 0.075),
    trace=(0.06, 0.19, 0.12),
    traces=170,
    widths=(1, 4),
    pad_prob=1.0,
    pad_color=(0.75, 0.6, 0.28),
    silk=40,
    silk_color=0.85,
):
    """Solder mask verde scuro con piste, piazzole dorate e serigrafie."""
    rng = np.random.default_rng(seed)
    base = np.array(base)
    img = np.ones((size, size, 3)) * base
    img += (_norm01(_blur(rng.standard_normal((size, size)), 6)) - 0.5)[..., None] * 0.02
    trace = np.array(trace)
    for _ in range(traces):
        x, y = rng.integers(0, size, 2).astype(float)
        width = int(rng.integers(*widths))
        for _ in range(rng.integers(2, 6)):
            d = rng.integers(0, 8) * np.pi / 4
            length = rng.integers(20, 160)
            for _ in range(length):
                xi, yi = int(x) % size, int(y) % size
                img[yi : yi + width, xi : xi + width] = trace
                x += np.cos(d)
                y += np.sin(d)
        xi, yi = int(x) % size, int(y) % size
        if rng.random() < pad_prob:
            img[max(0, yi - 3) : yi + 4, max(0, xi - 3) : xi + 4] = pad_color
    for _ in range(silk):
        x, y = rng.integers(10, size - 40, 2)
        w, h = rng.integers(6, 30), rng.integers(4, 12)
        img[y : y + 2, x : x + w] = silk_color
        img[y + h : y + h + 2, x : x + w] = silk_color
        img[y : y + h + 2, x : x + 2] = silk_color
        img[y : y + h + 2, x + w : x + w + 2] = silk_color
    return img


def save_rgba(name, rgba):
    """Come save_image ma con canale alpha (maschere di trasparenza)."""
    h, w, _ = rgba.shape
    img = bpy.data.images.get(name)
    if img is not None and tuple(img.size) != (w, h):
        bpy.data.images.remove(img)
        img = None
    if img is None:
        img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(np.clip(rgba, 0, 1).astype(np.float32).ravel())
    os.makedirs(TEX_DIR, exist_ok=True)
    img.filepath_raw = os.path.join(TEX_DIR, name + ".png")
    img.file_format = "PNG"
    img.save()
    img.alpha_mode = "STRAIGHT"
    return img


def hex_mesh_mask(size=512, cols=7, hole=0.8):
    """Lamiera forata a esagoni (punta in alto), ripetibile: alpha 0 nei fori."""
    # righe sfalsate a passo dx*sqrt(3)/2: con un numero pari di righe la texture si ripete
    rows = max(2, int(round(cols / (np.sqrt(3) / 2) / 2)) * 2)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
    alpha = np.ones((size, size), np.float32)
    dx, dy = 1.0 / cols, 1.0 / rows
    R = hole * dx / np.sqrt(3)
    for row in range(-1, rows + 2):
        for col in range(-1, cols + 2):
            cx = col * dx + (dx / 2 if row % 2 else 0)
            cy = row * dy
            px = np.abs(xx - cx)
            py = np.abs(yy - cy)
            d = np.maximum(px * 2 / np.sqrt(3), px / np.sqrt(3) + py)
            alpha[d < R] = 0.0
    rgba = np.zeros((size, size, 4), np.float32)
    rgba[..., :3] = 0.04
    rgba[..., 3] = alpha
    return rgba


def use_alpha_mask(mat, img):
    """Lamiera forata: alpha dalla texture, arrotondato -> glTF alphaMode MASK."""
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    for node in list(nt.nodes):
        if node.name.startswith("RR_mask"):
            nt.nodes.remove(node)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.name = "RR_mask_tex"
    tex.image = img
    tex.location = (bsdf.location.x - 600, -500)
    rnd = nt.nodes.new("ShaderNodeMath")
    rnd.name = "RR_mask_round"
    rnd.operation = "ROUND"
    rnd.location = (bsdf.location.x - 300, -500)
    nt.links.new(tex.outputs["Alpha"], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], bsdf.inputs["Alpha"])
    for attr, value in (("surface_render_method", "DITHERED"), ("blend_method", "CLIP")):
        try:
            setattr(mat, attr, value)
        except Exception:
            pass


def glass_material(name, tint="#0b0d12", alpha=0.16):
    mat = material(name, srgb(tint), metallic=0.0, roughness=0.03)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Alpha"].default_value = alpha
    for attr, value in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND"), ("use_backface_culling", False)):
        try:
            setattr(mat, attr, value)
        except Exception:
            pass
    return mat


def circle(r, segments=48, cx=0.0, cy=0.0):
    return [(cx + r * math.cos(2 * math.pi * k / segments), cy + r * math.sin(2 * math.pi * k / segments)) for k in range(segments)]


def rounded_rect(w, h, r, segments=6, cx=0.0, cy=0.0):
    pts = []
    for qx, qy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(segments + 1):
            a = math.radians(a0 + 90 * k / segments)
            pts.append((cx + qx + r * math.cos(a), cy + qy + r * math.sin(a)))
    return pts


def build_fan(name, coll, parent, M, location, rotation, size=1.1, depth=0.25):
    """Ventola RGB: telaio, anelli luminosi su entrambe le facce, pale traslucide.

    M deve avere fan_frame, fan_ring, fan_blade e rubber. Il rotore si chiama
    Fan_Rotor_<name> e gira attorno al proprio Z locale (il sito lo anima).
    """
    group = empty(f"Fan_{name}", coll, location=location, parent=parent)
    group.rotation_euler = rotation
    s = size
    frame = mesh_object(f"Fan_{name}_Frame", cube_bm((s, s, depth)), coll, [M["fan_frame"]], group, smooth_angle=None)
    bm = prism_bm(circle(0.47 * s, 64), 1.0, (0, 0, 0), plane="XY")
    for cx in (-0.415 * s, 0.415 * s):
        for cy in (-0.415 * s, 0.415 * s):
            prism_bm(circle(0.022, 16, cx, cy), 1.0, (0, 0, 0), plane="XY", bm=bm)
    hole = mesh_object(f"_fan_cut_{name}", bm, coll, [M["fan_frame"]], group, smooth_angle=None)
    boolean_cut(frame, [hole])
    add_bevel(frame, 0.012, 2, 40)
    for side in (-1, 1):
        mesh_object(
            f"Fan_{name}_Ring_{'F' if side > 0 else 'B'}",
            ring_prism_bm(circle(0.492 * s, 72), circle(0.462 * s, 72), 0.018, (0, 0, side * (depth / 2 + 0.002)), "XY"),
            coll,
            [M["fan_ring"]],
            group,
            smooth_angle=60,
        )
        # gommini antivibrazione agli angoli
        bm = bmesh.new()
        for cx in (-0.415 * s, 0.415 * s):
            for cy in (-0.415 * s, 0.415 * s):
                cube_bm((0.1, 0.1, 0.012), (cx, cy, side * (depth / 2 + 0.006)), bm)
        mesh_object(f"Fan_{name}_Pads_{'F' if side > 0 else 'B'}", bm, coll, [M["rubber"]], group, smooth_angle=None)
    # supporto del motore sul retro
    bm = cylinder_bm(0.2 * s, 0.05, 40, (0, 0, -depth / 2 + 0.03))
    for k in range(4):
        a = math.radians(45 + 90 * k)
        mid = 0.335 * s
        cube_bm((0.27 * s, 0.03, 0.03), (math.cos(a) * mid, math.sin(a) * mid, -depth / 2 + 0.03), bm, rot_z=a)
    mesh_object(f"Fan_{name}_Stator", bm, coll, [M["fan_frame"]], group, smooth_angle=30)
    rotor = mesh_object(
        f"Fan_Rotor_{name}",
        fan_rotor_bm(0.19 * s, 0.455 * s, blades=9, thickness=0.014, pitch=32, sweep=0.5, hub_depth=0.12),
        coll,
        [M["fan_blade"]],
        group,
        smooth_angle=50,
    )
    rotor.location = (0, 0, 0.02)
    cap = mesh_object(f"Fan_{name}_Cap", cylinder_bm(0.165 * s, 0.008, 40, radius2=0.155 * s), coll, [M["fan_frame"]], rotor, smooth_angle=40)
    cap.location = (0, 0, 0.064)
    return group


# ============================================================ cavi
def spline_points(keys, per_segment=10):
    """Catmull-Rom che passa per tutti i punti chiave (estremi ripetuti)."""
    pts = [Vector(k) for k in keys]
    ext = [pts[0] + (pts[0] - pts[1])] + pts + [pts[-1] + (pts[-1] - pts[-2])]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for s in range(per_segment):
            t = s / per_segment
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


def transport_frames(points, normal0):
    """Tangente/normale/binormale lungo il percorso (trasporto parallelo)."""
    frames = []
    n = Vector(normal0)
    for i, p in enumerate(points):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, len(points) - 1)]
        t = (b - a).normalized()
        n = (n - t * n.dot(t)).normalized()
        frames.append((t, n, t.cross(n)))
    return frames


def bundle_bm(keys, offsets, radius, normal0=(0, 0, 1), sides=6, per_segment=10, bm=None, v_scale=10.0):
    """Fascio di fili paralleli: ogni filo è spostato di (a, b) lungo normale e binormale."""
    bm = bm or bmesh.new()
    uv = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    pts = spline_points(keys, per_segment)
    frames = transport_frames(pts, normal0)
    lengths = [0.0]
    for i in range(1, len(pts)):
        lengths.append(lengths[-1] + (pts[i] - pts[i - 1]).length)
    for a, b in offsets:
        rings = []
        for p, (t, n, bn) in zip(pts, frames):
            c = p + n * a + bn * b
            rings.append([bm.verts.new(c + (n * math.cos(2 * math.pi * k / sides) + bn * math.sin(2 * math.pi * k / sides)) * radius) for k in range(sides)])
        for i in range(len(rings) - 1):
            for k in range(sides):
                k2 = (k + 1) % sides
                f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
                for loop, (uu, vv) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))):
                    loop[uv].uv = (uu / sides, lengths[vv] * v_scale)
    return bm, pts, frames


def grid_offsets(rows, cols, pitch_a, pitch_b):
    """Disposizione dei fili: `rows` lungo la normale, `cols` lungo la binormale."""
    return [((r - (rows - 1) / 2) * pitch_a, (c - (cols - 1) / 2) * pitch_b) for r in range(rows) for c in range(cols)]


def oriented_box_bm(size, center, frame, bm):
    """Box allineato a un frame (t, n, b) di un percorso: pettinini e fascette."""
    t, n, b = frame
    res = bmesh.ops.create_cube(bm, size=1.0)
    mat = Matrix((t, n, b)).transposed()
    for v in res["verts"]:
        local = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
        v.co = Vector(center) + mat @ local
    return bm


def braid_normal(size=256, strands=8):
    """Calza intrecciata dei cavi sleevati, ripetibile."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
    h = np.abs(np.sin(np.pi * strands * (xx + yy))) * np.abs(np.sin(np.pi * strands * (xx - yy)))
    return normal_from_height(_norm01(h), 3.0)
