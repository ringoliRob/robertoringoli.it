import json
import math
import os
import queue
import socket
import threading
import traceback

import bpy
from bpy.props import IntProperty, StringProperty
from bpy.types import AddonPreferences, Operator, Panel


_requests = queue.Queue()
_server = None
_thread = None
_stop_event = threading.Event()


def _vec(values, default):
    values = values if values is not None else default
    if len(values) != 3:
        raise ValueError("Il vettore deve contenere esattamente 3 valori.")
    return tuple(float(value) for value in values)


def _object_data(obj):
    return {
        "name": obj.name,
        "type": obj.type,
        "location": [round(value, 6) for value in obj.location],
        "rotation_degrees": [
            round(math.degrees(value), 4) for value in obj.rotation_euler
        ],
        "scale": [round(value, 6) for value in obj.scale],
        "visible": not obj.hide_get(),
        "selected": obj.select_get(),
        "materials": [
            slot.material.name for slot in obj.material_slots if slot.material
        ],
        "vertices": len(obj.data.vertices) if obj.type == "MESH" else None,
        "triangles": (
            sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
            if obj.type == "MESH"
            else None
        ),
    }


def _handle_request(method, params):
    if method == "status":
        return {
            "connected": True,
            "blender_version": bpy.app.version_string,
            "blend_file": bpy.data.filepath or None,
            "object_count": len(bpy.context.scene.objects),
        }

    if method == "get_scene":
        include_hidden = bool(params.get("include_hidden", False))
        objects = [
            _object_data(obj)
            for obj in bpy.context.scene.objects
            if include_hidden or not obj.hide_get()
        ]
        return {
            "blend_file": bpy.data.filepath or None,
            "active_object": (
                bpy.context.view_layer.objects.active.name
                if bpy.context.view_layer.objects.active
                else None
            ),
            "objects": objects,
        }

    if method == "create_primitive":
        primitive = params["type"]
        operators = {
            "cube": bpy.ops.mesh.primitive_cube_add,
            "sphere": bpy.ops.mesh.primitive_uv_sphere_add,
            "cylinder": bpy.ops.mesh.primitive_cylinder_add,
            "cone": bpy.ops.mesh.primitive_cone_add,
            "plane": bpy.ops.mesh.primitive_plane_add,
            "torus": bpy.ops.mesh.primitive_torus_add,
        }
        if primitive not in operators:
            raise ValueError(f"Primitiva non supportata: {primitive}")
        location = _vec(params.get("location"), (0, 0, 0))
        rotation = tuple(
            math.radians(value)
            for value in _vec(params.get("rotation"), (0, 0, 0))
        )
        operators[primitive](location=location, rotation=rotation)
        obj = bpy.context.active_object
        obj.name = params["name"]
        obj.scale = _vec(params.get("scale"), (1, 1, 1))
        bpy.context.view_layer.objects.active = obj
        return _object_data(obj)

    if method == "set_material":
        obj = bpy.data.objects.get(params["object_name"])
        if obj is None:
            raise ValueError(f"Oggetto non trovato: {params['object_name']}")
        material = bpy.data.materials.get(params["material_name"])
        if material is None:
            material = bpy.data.materials.new(params["material_name"])
        material.use_nodes = True
        color = list(params["base_color"])
        if len(color) == 3:
            color.append(1.0)
        if len(color) != 4:
            raise ValueError("base_color deve contenere 3 o 4 valori.")
        principled = material.node_tree.nodes.get("Principled BSDF")
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Metallic"].default_value = float(params.get("metallic", 0))
        principled.inputs["Roughness"].default_value = float(
            params.get("roughness", 0.5)
        )
        if obj.data and hasattr(obj.data, "materials"):
            if obj.data.materials:
                obj.data.materials[0] = material
            else:
                obj.data.materials.append(material)
        return {"object": obj.name, "material": material.name}

    if method == "delete_objects":
        deleted = []
        for name in params["names"]:
            obj = bpy.data.objects.get(name)
            if obj is not None:
                deleted.append(name)
                bpy.data.objects.remove(obj, do_unlink=True)
        return {"deleted": deleted}

    if method == "execute_python":
        namespace = {"bpy": bpy, "math": math, "_result": None}
        exec(params["code"], namespace, namespace)
        result = namespace.get("_result")
        try:
            json.dumps(result)
            return result
        except TypeError:
            return repr(result)

    if method == "export_glb":
        output_dir = os.path.abspath(params["output_dir"])
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.basename(params["filename"])
        if not filename.lower().endswith(".glb"):
            raise ValueError("Il file deve avere estensione .glb.")
        filepath = os.path.join(output_dir, filename)
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format="GLB",
            use_selection=bool(params.get("selected_only", False)),
            export_apply=bool(params.get("apply_modifiers", True)),
            export_yup=True,
            export_materials="EXPORT",
            export_cameras=False,
            export_lights=False,
        )
        return {"exported": filepath, "size_bytes": os.path.getsize(filepath)}

    if method == "render_preview":
        if bpy.context.scene.camera is None:
            raise ValueError("La scena non contiene una camera attiva.")
        output_dir = os.path.abspath(params["output_dir"])
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.basename(params["filename"])
        if not filename.lower().endswith(".png"):
            raise ValueError("Il file deve avere estensione .png.")
        filepath = os.path.join(output_dir, filename)
        scene = bpy.context.scene
        old_values = (
            scene.render.filepath,
            scene.render.resolution_x,
            scene.render.resolution_y,
            scene.render.resolution_percentage,
            scene.render.image_settings.file_format,
        )
        try:
            scene.render.filepath = filepath
            scene.render.resolution_x = int(params.get("resolution_x", 800))
            scene.render.resolution_y = int(params.get("resolution_y", 800))
            scene.render.resolution_percentage = 100
            scene.render.image_settings.file_format = "PNG"
            bpy.ops.render.render(write_still=True)
        finally:
            (
                scene.render.filepath,
                scene.render.resolution_x,
                scene.render.resolution_y,
                scene.render.resolution_percentage,
                scene.render.image_settings.file_format,
            ) = old_values
        return {"rendered": filepath}

    raise ValueError(f"Metodo sconosciuto: {method}")


def _process_queue():
    while True:
        try:
            item = _requests.get_nowait()
        except queue.Empty:
            break
        try:
            item["response"] = {
                "ok": True,
                "result": _handle_request(item["method"], item["params"]),
            }
        except Exception as error:
            item["response"] = {
                "ok": False,
                "error": f"{error}\n{traceback.format_exc()}",
            }
        finally:
            item["done"].set()
    return 0.05


def _client_worker(connection, token):
    with connection:
        connection.settimeout(130)
        data = b""
        while b"\n" not in data and len(data) < 10_000_000:
            chunk = connection.recv(65536)
            if not chunk:
                return
            data += chunk
        try:
            request = json.loads(data.split(b"\n", 1)[0].decode("utf-8"))
            if request.get("token") != token:
                response = {"ok": False, "error": "Token MCP non valido."}
            else:
                item = {
                    "method": request.get("method"),
                    "params": request.get("params", {}),
                    "done": threading.Event(),
                }
                _requests.put(item)
                if not item["done"].wait(120):
                    response = {"ok": False, "error": "Timeout nel thread Blender."}
                else:
                    response = item["response"]
        except Exception as error:
            response = {"ok": False, "error": str(error)}
        connection.sendall((json.dumps(response) + "\n").encode("utf-8"))


def _server_worker(port, token):
    global _server
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        _server = server
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", port))
        server.listen(8)
        server.settimeout(0.5)
        while not _stop_event.is_set():
            try:
                connection, _ = server.accept()
            except socket.timeout:
                continue
            threading.Thread(
                target=_client_worker,
                args=(connection, token),
                daemon=True,
            ).start()
    _server = None


def _preferences():
    addon = bpy.context.preferences.addons.get(__package__)
    return addon.preferences if addon else None


def start_server():
    global _thread
    if _thread and _thread.is_alive():
        return
    preferences = _preferences()
    port = preferences.port if preferences else 9876
    token = preferences.token if preferences else "blender-local"
    _stop_event.clear()
    _thread = threading.Thread(
        target=_server_worker,
        args=(port, token),
        daemon=True,
        name="PortfolioMCPBridge",
    )
    _thread.start()


def stop_server():
    global _thread
    _stop_event.set()
    if _server:
        try:
            _server.close()
        except OSError:
            pass
    if _thread and _thread.is_alive():
        _thread.join(timeout=1.0)
    _thread = None


class PortfolioMCPPreferences(AddonPreferences):
    bl_idname = __package__

    port: IntProperty(name="Porta", default=9876, min=1024, max=65535)
    token: StringProperty(name="Token locale", default="blender-local")

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "port")
        layout.prop(self, "token")
        layout.label(text="Riavvia l'add-on dopo aver cambiato questi valori.")


class PORTFOLIO_MCP_OT_restart(Operator):
    bl_idname = "portfolio_mcp.restart"
    bl_label = "Riavvia ponte MCP"

    def execute(self, context):
        stop_server()
        start_server()
        self.report({"INFO"}, "Portfolio MCP Bridge riavviato")
        return {"FINISHED"}


class PORTFOLIO_MCP_PT_panel(Panel):
    bl_label = "Portfolio MCP"
    bl_idname = "PORTFOLIO_MCP_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "MCP"

    def draw(self, context):
        layout = self.layout
        running = bool(_thread and _thread.is_alive())
        layout.label(
            text="Server attivo su localhost" if running else "Server non attivo",
            icon="CHECKMARK" if running else "ERROR",
        )
        layout.operator("portfolio_mcp.restart", icon="FILE_REFRESH")


classes = (
    PortfolioMCPPreferences,
    PORTFOLIO_MCP_OT_restart,
    PORTFOLIO_MCP_PT_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    if not bpy.app.timers.is_registered(_process_queue):
        bpy.app.timers.register(_process_queue, persistent=True)
    start_server()


def unregister():
    stop_server()
    if bpy.app.timers.is_registered(_process_queue):
        bpy.app.timers.unregister(_process_queue)
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
