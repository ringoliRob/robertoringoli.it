import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Explodable, Fan, PickId, RgbLight } from "./buildPC";

/**
 * PC modellato in Blender (tools/blender-mcp/pc_parts). Il GLB è in coordinate del case;
 * ogni componente è un nodo radice con un nome fisso, da cui ricaviamo cosa si clicca,
 * cosa si smonta, quali ventole girano e quali luci si accendono.
 */
export type PCModel = {
  group: THREE.Group;
  pickables: THREE.Object3D[];
  partRoots: Partial<Record<PickId, THREE.Object3D>>;
  explodables: Explodable[];
  fans: Fan[];
  rgb: RgbLight[];
  /** LED che seguono l'accensione (display della pompa, debug, rete): intensità di base. */
  powerLights: { material: THREE.MeshStandardMaterial; base: number }[];
  /** Anello del tasto di accensione: pulsa quando il PC è spento. */
  powerLed: THREE.MeshStandardMaterial | null;
};

const PICKS: Record<string, PickId | null> = {
  Case: "shell",
  Motherboard: "shell",
  Power_Button: "power",
  CPU: "cpu",
  Cooler: "cpu",
  RAM_1: "ram",
  RAM_2: "ram",
  RAM_3: "ram",
  RAM_4: "ram",
  GPU: "gpu",
  SSD: "ssd",
  PSU: "psu",
  Glass_Panel: null,
  Cables: null,
};

type ExplodeSpec = { offset: [number, number, number]; delay: number; rot?: [number, number, number]; fade?: boolean };

/** Smontaggio in coordinate Three del case: -X verso il vetro, +Y in alto, +Z verso il fronte. */
const EXPLODE: Record<string, ExplodeSpec> = {
  Glass_Panel: { offset: [-2.0, 0.2, 0.3], delay: 0, rot: [0, -0.35, 0], fade: true },
  Cables: { offset: [0, 0, 0], delay: 0, fade: true },
  Cooler: { offset: [-2.8, 1.0, 0.2], delay: 0.05 },
  CPU: { offset: [-0.7, 0.1, 0], delay: 0.18 },
  GPU: { offset: [-2.8, -0.35, 0.5], delay: 0.1, rot: [0, 0, -1.25] },
  SSD: { offset: [-1.4, 0.3, 0.2], delay: 0.3 },
  PSU: { offset: [-2.4, 0.05, 0.2], delay: 0.34 },
  ...Object.fromEntries(
    [0, 1, 2, 3].map((i) => [`RAM_${i + 1}`, { offset: [-2.0 - i * 0.1, 0.35 + i * 0.08, 1.2 + i * 0.3], delay: 0.2 + i * 0.05 }]),
  ),
};

/** Luci che non sono RGB ma si accendono con il PC. */
const POWER_LIGHTS = new Set(["LED_Pump", "LED_Pump_Gauge", "LED_Debug", "LED_Green", "LED_Orange"]);

/** Tonalità stabile per materiale: luci diverse, ma in sincronia come un vero RGB sincronizzato. */
function hueOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ((h % 1000) / 1000) * 0.25;
}

export async function loadPC(url: string, decoderPath: string): Promise<PCModel> {
  const draco = new DRACOLoader().setDecoderPath(decoderPath);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  draco.dispose();

  const model: PCModel = {
    group: new THREE.Group(),
    pickables: [],
    partRoots: {},
    explodables: [],
    fans: [],
    rgb: [],
    powerLights: [],
    powerLed: null,
  };
  model.group.name = "PC_Model";
  const ramGroup = new THREE.Group();
  ramGroup.name = "RAM";
  model.group.add(ramGroup);

  for (const root of [...gltf.scene.children]) {
    const name = root.name;
    const pick = PICKS[name];
    // RAM: i quattro banchi stanno in un gruppo, così il tuffo inquadra tutta la memoria
    (name.startsWith("RAM_") ? ramGroup : model.group).add(root);

    // materiali clonati per componente: l'evidenziazione non deve accendere anche gli altri pezzi
    const clones = new Map<THREE.Material, THREE.Material>();
    const fades: { material: THREE.Material; base: number }[] = [];
    const spec = EXPLODE[name];

    root.traverse((object) => {
      if (object.name.startsWith("Fan_Rotor")) {
        model.fans.push({ rotor: object, speed: object.name.includes("GPU") ? 11 : 8, axis: "y" });
      }
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const isGlass = name === "Glass_Panel" || /Glass/.test(mesh.name);
      mesh.castShadow = !isGlass;
      mesh.receiveShadow = !isGlass;
      const swap = (source: THREE.Material) => {
        let material = clones.get(source);
        if (material) return material;
        material = source.clone();
        clones.set(source, material);
        const std = material as THREE.MeshStandardMaterial;
        if (std.isMeshStandardMaterial) {
          const strength = std.emissiveIntensity * Math.max(std.emissive.r, std.emissive.g, std.emissive.b);
          if (std.name.startsWith("RGB_")) {
            // un po' meno del valore di Blender: col bloom del sito le luci sono già piene
            model.rgb.push({ material: std, hue: hueOf(std.name), base: strength * 0.55 });
            std.emissiveIntensity = 0;
          } else if (std.name === "LED_Power") {
            model.powerLed = std;
          } else if (POWER_LIGHTS.has(std.name)) {
            model.powerLights.push({ material: std, base: std.emissiveIntensity });
            std.emissiveIntensity = 0;
          }
        }
        if (spec?.fade) {
          material.transparent = true;
          fades.push({ material, base: material.opacity });
        }
        return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
      if (isGlass) mesh.userData.noRaycast = true;
      if (pick) {
        mesh.userData.pick = pick;
        model.pickables.push(mesh);
      }
    });

    if (pick && pick !== "shell" && !name.startsWith("RAM_") && name !== "Cooler") model.partRoots[pick] = root;
    if (spec) {
      model.explodables.push({
        object: root,
        home: root.position.clone(),
        homeRot: root.rotation.clone(),
        offset: new THREE.Vector3(...spec.offset),
        rot: new THREE.Euler(...(spec.rot ?? [0, 0, 0])),
        delay: spec.delay,
        fade: spec.fade ? fades : undefined,
      });
    }
  }
  model.partRoots.ram = ramGroup;
  return model;
}
