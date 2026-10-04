import * as THREE from "three";
import type { PartId } from "../content";
import { createLabelTexture, createPcbTexture } from "./textures";

/** Cosa succede cliccando un oggetto della scena. */
export type PickId = PartId | "shell" | "power" | "monitor";

export type Explodable = {
  object: THREE.Object3D;
  home: THREE.Vector3;
  homeRot: THREE.Euler;
  offset: THREE.Vector3;
  rot: THREE.Euler;
  delay: number;
  /** Materiali che svaniscono mentre il pezzo si smonta (vetro, cavi), con la loro opacità di base. */
  fade?: { material: THREE.Material; base: number }[];
};

export type Fan = { rotor: THREE.Object3D; speed: number; axis: "y" | "z" };

export type RgbLight = { material: THREE.MeshStandardMaterial; hue: number; base: number };

export type Rig = {
  pickables: THREE.Object3D[];
  partRoots: Partial<Record<PickId, THREE.Object3D>>;
  explodables: Explodable[];
  fans: Fan[];
  rgb: RgbLight[];
};

export function createRig(): Rig {
  return { pickables: [], partRoots: {}, explodables: [], fans: [], rgb: [] };
}

export function std(color: THREE.ColorRepresentation, roughness = 0.6, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Piano rivolto verso -X (il lato del vetro) con una texture stampata. */
export function sticker(texture: THREE.Texture, w: number, h: number, emissive = 0) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.5,
    metalness: 0.1,
    emissive: emissive ? new THREE.Color(0xffffff) : new THREE.Color(0),
    emissiveMap: emissive ? texture : null,
    emissiveIntensity: emissive,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.y = -Math.PI / 2;
  return mesh;
}

export function rgbMaterial(rig: Rig, hue: number, base = 2.4) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.35,
    metalness: 0.1,
    emissive: new THREE.Color().setHSL(hue, 1, 0.5),
    emissiveIntensity: 0,
  });
  rig.rgb.push({ material, hue, base });
  return material;
}

/** Associa un id cliccabile a tutte le mesh dell'oggetto. */
export function markPick(rig: Rig, object: THREE.Object3D, id: PickId) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.pick = id;
      rig.pickables.push(child);
    }
  });
}

function explodable(
  rig: Rig,
  object: THREE.Object3D,
  offset: [number, number, number],
  delay: number,
  rot: [number, number, number] = [0, 0, 0],
  fade?: Explodable["fade"],
) {
  rig.explodables.push({
    object,
    home: object.position.clone(),
    homeRot: object.rotation.clone(),
    offset: new THREE.Vector3(...offset),
    rot: new THREE.Euler(...rot),
    delay,
    fade,
  });
}

/** Ventola con anello RGB, rivolta verso +Z: il rotore gira attorno a Z. */
function createFan(rig: Rig, size: number, hue: number, speed = 9) {
  const group = new THREE.Group();
  const frameMat = std(0x16181d, 0.55, 0.3);
  const d = size * 0.22;
  const bar = size * 0.08;
  group.add(box(size, bar, d, frameMat, 0, size / 2 - bar / 2, 0));
  group.add(box(size, bar, d, frameMat, 0, -size / 2 + bar / 2, 0));
  group.add(box(bar, size, d, frameMat, size / 2 - bar / 2, 0, 0));
  group.add(box(bar, size, d, frameMat, -size / 2 + bar / 2, 0, 0));

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(size * 0.42, size * 0.028, 8, 48),
    rgbMaterial(rig, hue),
  );
  ring.position.z = d * 0.32;
  group.add(ring);

  const rotor = new THREE.Group();
  const bladeMat = std(0x24262c, 0.4, 0.2);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.13, size * 0.13, d * 0.7, 20), std(0x1c1e23, 0.4, 0.4));
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  for (let i = 0; i < 7; i += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 7) * Math.PI * 2;
    const blade = box(size * 0.27, size * 0.11, d * 0.12, bladeMat, size * 0.26, 0, 0);
    blade.rotation.x = 0.5;
    pivot.add(blade);
    rotor.add(pivot);
  }
  group.add(rotor);
  rig.fans.push({ rotor, speed, axis: "z" });
  return group;
}

export const CASE_SIZE = { W: 2.3, H: 5.0, D: 4.8 };

/**
 * Case mid-tower, origine al centro della base. Il vetro è sul lato -X,
 * la scheda madre sul lato +X e i componenti sporgono verso il vetro.
 */
export function buildPC(rig: Rig) {
  const { W, H, D } = CASE_SIZE;
  const t = 0.06;
  const pc = new THREE.Group();
  pc.name = "PC";

  /* ------------------------------ case ------------------------------ */
  const shell = new THREE.Group();
  const shellMat = std(0x111318, 0.42, 0.55);
  const frontMat = std(0x0d0f13, 0.3, 0.4);
  shell.add(box(W, t, D, shellMat, 0, t / 2, 0));
  shell.add(box(W, t, D, shellMat, 0, H - t / 2, 0));
  shell.add(box(W, H, t, shellMat, 0, H / 2, -D / 2 + t / 2));
  shell.add(box(t, H, D, shellMat, W / 2 - t / 2, H / 2, 0));
  shell.add(box(W, H, 0.14, frontMat, 0, H / 2, D / 2 - 0.07));
  // telaio attorno al vetro
  shell.add(box(0.07, 0.09, D, shellMat, -W / 2 + 0.035, H - 0.045, 0));
  shell.add(box(0.07, 0.09, D, shellMat, -W / 2 + 0.035, 0.045, 0));
  shell.add(box(0.07, H, 0.09, shellMat, -W / 2 + 0.035, H / 2, D / 2 - 0.045));
  shell.add(box(0.07, H, 0.09, shellMat, -W / 2 + 0.035, H / 2, -D / 2 + 0.045));
  // piedini
  const footMat = std(0x050506, 0.9, 0);
  for (const fx of [-0.8, 0.8]) {
    for (const fz of [-1.9, 1.9]) shell.add(box(0.4, 0.1, 0.5, footMat, fx, -0.05, fz));
  }
  // striscia RGB frontale
  const strip = box(0.07, H * 0.62, 0.03, rgbMaterial(rig, 0.55, 3), -W / 2 + 0.3, H * 0.42, D / 2 + 0.005);
  shell.add(strip);
  const frontLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.28),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture({
        width: 512,
        height: 128,
        bg: "#0d0f13",
        fg: "#c8ccd6",
        lines: [{ text: "RINGOLI", size: 64, weight: 700 }],
      }),
      roughness: 0.4,
    }),
  );
  frontLogo.position.set(0.25, 0.55, D / 2 + 0.002);
  shell.add(frontLogo);

  // copertura alimentatore (shroud) con scritta
  const shroudMat = std(0x0f1115, 0.5, 0.4);
  shell.add(box(W - 0.14, 1.12, 2.55, shroudMat, 0, 0.62, D / 2 - 0.12 - 1.275));
  shell.add(box(0.025, 0.04, 2.45, rgbMaterial(rig, 0.82, 2.6), -W / 2 + 0.08, 1.19, D / 2 - 0.12 - 1.275));
  const shroudLabel = sticker(
    createLabelTexture({
      width: 1024,
      height: 160,
      bg: "#0f1115",
      fg: "#d8dce6",
      lines: [{ text: "ROBERTO  RINGOLI", size: 82, weight: 700 }],
    }),
    2.2,
    0.34,
  );
  shroudLabel.position.set(-W / 2 + 0.069, 0.6, D / 2 - 0.12 - 1.275);
  shell.add(shroudLabel);

  // scheda madre
  const BX = W / 2 - t - 0.12; // centro della piastra
  const board = box(0.05, 3.7, 3.5, new THREE.MeshStandardMaterial({ map: createPcbTexture(), roughness: 0.7, metalness: 0.2 }), BX, 3.05, -D / 2 + t + 0.15 + 1.75);
  shell.add(board);
  const FACE = BX - 0.025; // superficie della scheda madre rivolta al vetro
  const heatsink = std(0x2a2e36, 0.35, 0.8);
  shell.add(box(0.26, 0.36, 1.05, heatsink, FACE - 0.13, 4.62, -0.75));
  shell.add(box(0.26, 1.05, 0.36, heatsink, FACE - 0.13, 4.0, -1.5));
  shell.add(box(0.3, 1.0, 0.42, heatsink, FACE - 0.15, 4.25, -2.0));
  const chipset = box(0.12, 0.72, 0.72, heatsink, FACE - 0.06, 1.75, 0.55);
  shell.add(chipset);
  shell.add(box(0.02, 0.05, 0.6, rgbMaterial(rig, 0.6, 2), FACE - 0.125, 1.95, 0.55));
  const slotMat = std(0x0b0c0f, 0.6, 0.1);
  shell.add(box(0.1, 0.08, 1.6, slotMat, FACE - 0.05, 2.6, -1.25));
  shell.add(box(0.1, 0.08, 1.6, slotMat, FACE - 0.05, 1.45, -1.25));

  // ventole frontali, superiori e posteriore (decorative)
  [1.85, 2.98, 4.11].forEach((y, i) => {
    const fan = createFan(rig, 1.08, 0.5 + i * 0.08);
    fan.position.set(0, y, D / 2 - 0.3);
    shell.add(fan);
  });
  const rear = createFan(rig, 1.05, 0.75);
  rear.position.set(-0.05, 4.1, -D / 2 + 0.2);
  shell.add(rear);
  [-0.6, 0.6].forEach((z, i) => {
    const fan = createFan(rig, 1.0, 0.62 + i * 0.1);
    fan.rotation.x = -Math.PI / 2;
    fan.position.set(-0.15, H - 0.2, z);
    shell.add(fan);
  });

  markPick(rig, shell, "shell");
  pc.add(shell);

  /* ------------------------------ power button ------------------------------ */
  const power = new THREE.Group();
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 32), std(0x2a2d34, 0.3, 0.9));
  button.rotation.x = Math.PI / 2;
  power.add(button);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    emissive: new THREE.Color(0x8fd3ff),
    emissiveIntensity: 1,
  });
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 10, 40), ledMat);
  power.add(ledRing);
  // area cliccabile più generosa del bottone
  const hit = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 24),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.z = 0.035;
  power.add(hit);
  power.position.set(0.25, H - 0.45, D / 2 + 0.03);
  markPick(rig, power, "power");
  rig.partRoots.power = power;
  pc.add(power);

  /* ------------------------------ CPU ------------------------------ */
  const cpu = new THREE.Group();
  cpu.position.set(FACE, 4.0, -0.75);
  cpu.add(box(0.06, 0.95, 0.95, std(0x1a1c22, 0.5, 0.6), -0.03, 0, 0));
  cpu.add(box(0.07, 0.74, 0.74, std(0xc9ccd2, 0.28, 1), -0.095, 0, 0));
  const cpuLabel = sticker(
    createLabelTexture({
      width: 512,
      height: 512,
      bg: "#c6c9cf",
      fg: "#1a1c22",
      lines: [
        { text: "RINGOLI", size: 74, weight: 700 },
        { text: "CORE R-05", size: 58, weight: 600 },
        { text: "29.01.2005", size: 40, weight: 600, mono: true },
        { text: "SAN SEVERO · LANCIANO", size: 30, weight: 600 },
      ],
    }),
    0.62,
    0.62,
  );
  cpuLabel.position.x = -0.132;
  cpu.add(cpuLabel);
  markPick(rig, cpu, "cpu");
  explodable(rig, cpu, [-0.55, 0, 0], 0.18);
  rig.partRoots.cpu = cpu;
  pc.add(cpu);

  // dissipatore a torre: appartiene alla CPU
  const cooler = new THREE.Group();
  cooler.position.set(FACE - 0.68, 4.0, -0.75);
  const copper = std(0xc27a45, 0.3, 1);
  const alu = std(0xb9bec8, 0.35, 0.95);
  cooler.add(box(0.12, 0.62, 0.62, copper, 0.6, 0, 0));
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 1.3, 0.56), alu, 24);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 24; i += 1) {
    m.makeTranslation(0.38 - i * 0.037, 0, 0);
    fins.setMatrixAt(i, m);
  }
  fins.castShadow = true;
  cooler.add(fins);
  for (const [py, pz] of [[0.2, 0.1], [-0.2, -0.1], [0.45, -0.12], [-0.45, 0.12]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 10), copper);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0.05, py, pz);
    cooler.add(pipe);
  }
  const cap = box(0.05, 1.34, 0.6, std(0x14161b, 0.3, 0.7), -0.52, 0, 0);
  cooler.add(cap);
  const capLogo = sticker(
    createLabelTexture({
      width: 512,
      height: 512,
      bg: "#14161b",
      fg: "#f2b84b",
      lines: [{ text: "RR", size: 210, weight: 700 }],
    }),
    0.5,
    0.5,
    0.6,
  );
  capLogo.position.x = -0.547;
  cooler.add(capLogo);
  const coolerFan = createFan(rig, 1.2, 0.08, 7);
  coolerFan.position.set(-0.07, 0, 0.36);
  cooler.add(coolerFan);
  markPick(rig, cooler, "cpu");
  explodable(rig, cooler, [-2.35, 1.1, 0.25], 0.04, [0, 0, 0.25]);
  pc.add(cooler);

  /* ------------------------------ RAM ------------------------------ */
  const ram = new THREE.Group();
  ram.position.set(FACE, 4.0, 0);
  [-0.05, 0.11, 0.27, 0.43].forEach((z, i) => {
    const stick = new THREE.Group();
    stick.position.z = z;
    stick.add(box(0.08, 1.5, 0.1, std(0x0c0d10, 0.6, 0.1), -0.04, 0, 0));
    stick.add(box(0.34, 1.36, 0.07, std(0x23262d, 0.35, 0.8), -0.25, 0, 0));
    stick.add(box(0.06, 1.36, 0.076, rgbMaterial(rig, 0.3 + i * 0.07, 3), -0.45, 0, 0));
    ram.add(stick);
    explodable(rig, stick, [-1.6 - i * 0.12, 0.55 + i * 0.16, (i - 1.5) * 0.48], 0.2 + i * 0.05);
  });
  markPick(rig, ram, "ram");
  rig.partRoots.ram = ram;
  pc.add(ram);

  /* ------------------------------ SSD ------------------------------ */
  const ssd = new THREE.Group();
  ssd.position.set(FACE, 3.18, -0.62);
  ssd.add(box(0.11, 0.38, 1.12, std(0x1b1e24, 0.3, 0.85), -0.055, 0, 0));
  const ssdLabel = sticker(
    createLabelTexture({
      width: 1024,
      height: 340,
      bg: "#1b1e24",
      fg: "#5aa9ff",
      lines: [
        { text: "RR NVMe · 2 TB", size: 120, weight: 700 },
        { text: "/home/roberto/progetti", size: 70, weight: 600, mono: true, color: "#c6d4e8" },
      ],
    }),
    1.04,
    0.34,
    0.25,
  );
  ssdLabel.position.x = -0.112;
  ssd.add(ssdLabel);
  markPick(rig, ssd, "ssd");
  explodable(rig, ssd, [-1.95, -0.25, 0.95], 0.3, [0, 0, 0]);
  rig.partRoots.ssd = ssd;
  pc.add(ssd);

  /* ------------------------------ GPU ------------------------------ */
  const gpu = new THREE.Group();
  gpu.position.set(FACE - 0.7, 2.5, -0.85);
  gpu.add(box(1.3, 0.36, 2.9, std(0x1b1d22, 0.4, 0.6), 0, -0.06, 0));
  gpu.add(box(1.28, 0.04, 2.85, std(0x0e1a14, 0.7, 0.2), 0, 0.14, 0));
  gpu.add(box(1.3, 0.05, 2.9, std(0x0a0b0d, 0.35, 0.7), 0, 0.185, 0));
  gpu.add(box(0.03, 0.06, 2.6, rgbMaterial(rig, 0.88, 3.2), -0.665, 0.12, 0));
  gpu.add(box(1.36, 0.62, 0.04, std(0xaeb3bd, 0.35, 1), 0, 0, -1.47));
  const gpuLogo = sticker(
    createLabelTexture({
      width: 1024,
      height: 200,
      bg: "#1b1d22",
      fg: "#e8eaf0",
      lines: [{ text: "RINGOLI  GFX  2026", size: 104, weight: 700 }],
    }),
    1.6,
    0.31,
    0.35,
  );
  gpuLogo.position.set(-0.652, -0.08, 0.3);
  gpu.add(gpuLogo);
  [-0.95, 0, 0.95].forEach((z, i) => {
    const fan = createFan(rig, 0.86, 0.85 + i * 0.05, 11);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(0, -0.26, z);
    gpu.add(fan);
  });
  markPick(rig, gpu, "gpu");
  explodable(rig, gpu, [-2.75, -0.35, 0.55], 0.1, [0, 0, -1.25]);
  rig.partRoots.gpu = gpu;
  pc.add(gpu);

  /* ------------------------------ PSU ------------------------------ */
  const psu = new THREE.Group();
  psu.position.set(-0.15, 0.6, -1.42);
  psu.add(box(1.6, 0.86, 1.7, std(0x15171b, 0.45, 0.55)));
  const psuLabel = sticker(
    createLabelTexture({
      width: 1024,
      height: 560,
      bg: "#15171b",
      fg: "#ff7a3d",
      border: true,
      accent: "#ff7a3d",
      lines: [
        { text: "RR-850", size: 170, weight: 700 },
        { text: "80+ GOLD · 850 W", size: 82, weight: 600, color: "#e6e8ee" },
        { text: "AI · CREATIVITÀ · ABRUZZO", size: 52, weight: 600, mono: true, color: "#9aa0ac" },
      ],
    }),
    1.45,
    0.79,
    0.3,
  );
  psuLabel.position.x = -0.802;
  psu.add(psuLabel);
  markPick(rig, psu, "psu");
  explodable(rig, psu, [-2.35, 0.05, -0.2], 0.34);
  rig.partRoots.psu = psu;
  pc.add(psu);

  /* ------------------------------ vetro ------------------------------ */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xa9bfd6,
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    envMapIntensity: 2.2,
    clearcoat: 1,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.03, H - 0.16, D - 0.16), glassMat);
  glass.position.set(-W / 2 + 0.02, H / 2, 0);
  glass.renderOrder = 5;
  glass.userData.noRaycast = true;
  explodable(rig, glass, [-2.0, 0.2, 0.3], 0, [0, -0.35, 0], [{ material: glassMat, base: glassMat.opacity }]);
  pc.add(glass);

  const caseLight = new THREE.PointLight(0x88aaff, 0, 3.6, 2);
  caseLight.position.set(-0.4, 3.0, 0.2);
  pc.add(caseLight);

  return { pc, caseLight, ledMat, glass };
}
