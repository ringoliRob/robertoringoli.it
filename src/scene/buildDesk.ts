import * as THREE from "three";
import { box, markPick, rgbMaterial, std, type Rig } from "./buildPC";
import { createLabelTexture, createWoodTexture } from "./textures";

export const MONITOR_POS = new THREE.Vector3(-2.7, 0, -1.7);
export const SCREEN_SIZE = { w: 7.1, h: 7.1 / (16 / 9), y: 3.4 };

export function buildDesk(rig: Rig, screenTexture: THREE.Texture) {
  const room = new THREE.Group();

  /* ---------------------------- stanza ---------------------------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), std(0x0b0c10, 0.95, 0));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -7.85;
  floor.receiveShadow = true;
  room.add(floor);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), std(0x11141b, 0.92, 0));
  wall.position.set(0, 14, -6.2);
  wall.receiveShadow = true;
  room.add(wall);

  const neonTexture = createLabelTexture({
    width: 1536,
    height: 256,
    bg: "rgba(0,0,0,0)",
    fg: "#ffffff",
    lines: [{ text: "ROBERTO RINGOLI", size: 128, weight: 600 }],
  });
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 1.75),
    new THREE.MeshBasicMaterial({
      map: neonTexture,
      color: new THREE.Color(0xff9ad5).multiplyScalar(1.5),
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  neon.position.set(0.5, 9.2, -6.15);
  room.add(neon);

  /* ---------------------------- scrivania ---------------------------- */
  const wood = createWoodTexture();
  wood.repeat.set(2, 1);
  const top = box(19, 0.35, 8.6, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0.05 }), 0, -0.175, 0);
  room.add(top);
  const legMat = std(0x16181c, 0.4, 0.8);
  for (const x of [-8.9, 8.9]) {
    for (const z of [-3.8, 3.8]) room.add(box(0.35, 7.5, 0.35, legMat, x, -0.35 - 3.75, z));
  }
  room.add(box(10.5, 0.03, 4.3, std(0x141519, 1, 0), -1.4, 0.015, 1.4));

  /* ---------------------------- monitor ---------------------------- */
  const monitor = new THREE.Group();
  monitor.position.copy(MONITOR_POS);
  const dark = std(0x121418, 0.35, 0.7);
  monitor.add(box(2.5, 0.08, 1.5, dark, 0, 0.04, 0));
  monitor.add(box(0.36, 2.2, 0.18, dark, 0, 1.15, -0.36));
  const panelH = SCREEN_SIZE.h + 0.32;
  monitor.add(box(SCREEN_SIZE.w + 0.24, panelH, 0.22, std(0x0c0d10, 0.4, 0.5), 0, SCREEN_SIZE.y - 0.05, -0.12));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN_SIZE.w, SCREEN_SIZE.h),
    new THREE.MeshBasicMaterial({ map: screenTexture, color: 0x000000, toneMapped: false }),
  );
  screen.position.set(0, SCREEN_SIZE.y, 0.0);
  monitor.add(screen);
  const chinLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.1),
    new THREE.MeshBasicMaterial({
      map: createLabelTexture({ width: 256, height: 40, bg: "#0c0d10", fg: "#6d7380", lines: [{ text: "RINGOLI", size: 28 }] }),
    }),
  );
  chinLogo.position.set(0, SCREEN_SIZE.y - SCREEN_SIZE.h / 2 - 0.1, 0.0);
  monitor.add(chinLogo);
  markPick(rig, monitor, "monitor");
  rig.partRoots.monitor = screen;
  room.add(monitor);

  /* ---------------------------- tastiera e mouse ---------------------------- */
  const keyboard = new THREE.Group();
  keyboard.position.set(-2.7, 0, 1.45);
  keyboard.add(box(5.3, 0.16, 1.8, std(0x15171b, 0.4, 0.6), 0, 0.08, 0));
  const keyMat = rgbMaterial(rig, 0.7, 0.09);
  keyMat.color.set(0x1e2026);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), keyMat, 75);
  const matrix = new THREE.Matrix4();
  let k = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      matrix.makeTranslation(-2.31 + col * 0.33, 0.21, -0.66 + row * 0.33);
      keys.setMatrixAt(k, matrix);
      k += 1;
    }
  }
  keys.castShadow = true;
  keyboard.add(keys);
  markPick(rig, keyboard, "monitor");
  room.add(keyboard);

  const mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), std(0x1a1c21, 0.35, 0.5));
  mouse.scale.set(0.34, 0.17, 0.52);
  mouse.position.set(1.25, 0.1, 1.6);
  mouse.castShadow = true;
  room.add(mouse);
  room.add(box(0.03, 0.02, 0.2, rgbMaterial(rig, 0.95, 2), 1.25, 0.27, 1.32));

  /* ---------------------------- lampada ---------------------------- */
  const lamp = new THREE.Group();
  // il braccio punta verso chi guarda, così la lampada non copre il monitor
  lamp.position.set(-8.3, 0, -3.0);
  const lampMat = std(0x22252b, 0.35, 0.85);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.16, 32), lampMat);
  base.position.y = 0.08;
  base.castShadow = true;
  lamp.add(base);
  lamp.add(box(0.12, 5.6, 0.12, lampMat, 0, 2.9, 0));
  const armDir = new THREE.Vector3(Math.cos(-1.2), 0, -Math.sin(-1.2));
  const arm = box(2.9, 0.1, 0.1, lampMat, armDir.x * 1.4, 5.65, armDir.z * 1.4);
  arm.rotation.y = -1.2;
  lamp.add(arm);
  const head = armDir.clone().multiplyScalar(2.75);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.75, 32, 1, true), std(0x22252b, 0.4, 0.8));
  shade.material.side = THREE.DoubleSide;
  shade.position.set(head.x, 5.35, head.z);
  lamp.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd7a0).multiplyScalar(3), toneMapped: false }),
  );
  bulb.position.set(head.x, 5.08, head.z);
  lamp.add(bulb);
  room.add(lamp);
  const lampHead = new THREE.Vector3(-8.3 + head.x, 5.0, -3.0 + head.z);

  /* ---------------------------- pianta e tazza ---------------------------- */
  const plant = new THREE.Group();
  plant.position.set(8.0, 0, -2.6);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.95, 24), std(0xb5643c, 0.8, 0));
  pot.position.y = 0.475;
  pot.castShadow = true;
  plant.add(pot);
  const leafMat = std(0x2f6b3a, 0.7, 0);
  for (let i = 0; i < 11; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leafMat);
    const a = (i / 11) * Math.PI * 2;
    const tilt = 0.35 + (i % 3) * 0.22;
    leaf.scale.set(0.16, 1.15 - (i % 3) * 0.2, 0.42);
    leaf.position.set(Math.cos(a) * 0.35, 1.6 - (i % 3) * 0.12, Math.sin(a) * 0.35);
    leaf.rotation.set(Math.sin(a) * tilt, -a, -Math.cos(a) * tilt);
    leaf.castShadow = true;
    plant.add(leaf);
  }
  room.add(plant);

  const mug = new THREE.Group();
  mug.position.set(2.55, 0, 1.0);
  const mugMat = std(0xcfc9bf, 0.45, 0);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.3, 0.72, 28), mugMat);
  cup.position.y = 0.36;
  cup.castShadow = true;
  mug.add(cup);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.29, 24), std(0x2a160c, 0.25, 0));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.66;
  mug.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 20), mugMat);
  handle.position.set(0.36, 0.38, 0);
  mug.add(handle);
  mug.rotation.y = -0.9;
  room.add(mug);

  return { room, screen, neon, lampHead };
}
