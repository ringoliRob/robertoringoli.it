import * as THREE from "three";

/**
 * Fisica minima della stanza: tutto collide contro box allineati agli assi ricavati dalle mesh
 * (muri, mobili). Basta per camminare e per lanciare oggetti piccoli; niente motore esterno.
 * Unità della scena: 1 = 10 cm, Y in alto, pavimento a y = 0.
 */

export const GRAVITY = 98; // 9.8 m/s²

/** Nomi (prefissi) di mesh che non devono bloccare nulla. */
const NON_SOLID = /^(Floor|Ceiling|Cove_|LED_Strip|Ceiling_Lamp|Window_View|Window_Glass|Window_Handle|Rug|Poster_|Neon|Hex_|Light_Switch|Hallway|Skirting|Monitor_Lightbar|Monitor_LED|Bed_Sheet|Bed_Duvet_Fold|Bed_Throw|Bed_Pillow|Desk_Mat|Keyboard|Mouse|Bookshelf_Books|TV_LED|TV_Logo|Door_Groove|Door_Handle|Door_Key|Door_Keyhole|Plant_Leaves|Pizza_Slice)/;

export function buildColliders(root: THREE.Object3D, skip: Set<THREE.Object3D>): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (skip.has(o)) return;
    if (NON_SOLID.test(mesh.name)) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    if (Math.max(size.x, size.y, size.z) < 0.5) return; // bottoni, LED, dettagli
    // i mobili bassi arrivano fino a terra: niente oggetti persi sotto letto e comodino
    if (box.min.y < 1.2) box.min.y = 0;
    boxes.push(box);
  });
  return boxes;
}

/** Spinge un cerchio (giocatore) fuori dai box che attraversano la sua altezza. */
export function resolveCircle(pos: THREE.Vector3, radius: number, height: number, step: number, boxes: THREE.Box3[]) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const b of boxes) {
      if (b.max.y <= pos.y + step || b.min.y >= pos.y + height) continue;
      const cx = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
      const cz = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (radius - d);
        pos.z += (dz / d) * (radius - d);
      } else {
        // centro dentro il box: esce dal lato più vicino
        const pushes = [b.max.x - pos.x + radius, pos.x - b.min.x + radius, b.max.z - pos.z + radius, pos.z - b.min.z + radius];
        const i = pushes.indexOf(Math.min(...pushes));
        dx = i === 0 ? 1 : i === 1 ? -1 : 0;
        dz = i === 2 ? 1 : i === 3 ? -1 : 0;
        pos.x += dx * pushes[i];
        pos.z += dz * pushes[i];
      }
      moved = true;
    }
    if (!moved) break;
  }
}

/** Oggetto lanciato: un box (mezze dimensioni `half`) che vola, rimbalza e si posa. */
export type Body = {
  object: THREE.Object3D;
  half: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  /** Rotazione "a riposo" verso cui si raddrizza una volta a terra (solo imbardata). */
  restYaw: number;
  sleeping: boolean;
  grounded: number;
};

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

export function stepBody(body: Body, dt: number, boxes: THREE.Box3[]) {
  if (body.sleeping) return false;
  const p = body.object.position;
  const v = body.velocity;
  v.y -= GRAVITY * dt;
  v.multiplyScalar(Math.pow(0.75, dt)); // attrito dell'aria
  p.addScaledVector(v, dt);
  let contactUp = false;

  // pavimento
  if (p.y < body.half.y) {
    p.y = body.half.y;
    if (v.y < 0) v.y = v.y < -12 ? -v.y * 0.12 : 0;
    contactUp = true;
  }
  // box: il corpo è un punto contro il box allargato delle sue mezze dimensioni
  for (const b of boxes) {
    const minX = b.min.x - body.half.x,
      maxX = b.max.x + body.half.x;
    const minY = b.min.y - body.half.y,
      maxY = b.max.y + body.half.y;
    const minZ = b.min.z - body.half.z,
      maxZ = b.max.z + body.half.z;
    if (p.x <= minX || p.x >= maxX || p.y <= minY || p.y >= maxY || p.z <= minZ || p.z >= maxZ) continue;
    const pen = [maxX - p.x, p.x - minX, maxY - p.y, p.y - minY, maxZ - p.z, p.z - minZ];
    const i = pen.indexOf(Math.min(...pen));
    const axis = i < 2 ? "x" : i < 4 ? "y" : "z";
    const sign = i % 2 === 0 ? 1 : -1;
    p[axis] += sign * pen[i];
    if (v[axis] * sign < 0) v[axis] = axis === "y" && Math.abs(v.y) < 12 ? 0 : -v[axis] * 0.12;
    if (axis === "y" && sign > 0) contactUp = true;
  }

  if (contactUp) {
    // attrito e smorzamento della rotazione quando appoggia
    const f = Math.pow(0.002, dt);
    v.x *= f;
    v.z *= f;
    body.spin.multiplyScalar(Math.pow(0.002, dt));
    body.grounded += dt;
    // si raddrizza dolcemente mantenendo l'imbardata
    tmpE.set(0, body.restYaw, 0);
    tmpQ.setFromEuler(tmpE);
    body.object.quaternion.slerp(tmpQ, Math.min(1, dt * 6));
  } else {
    body.grounded = 0;
    body.object.rotation.x += body.spin.x * dt;
    body.object.rotation.y += body.spin.y * dt;
    body.object.rotation.z += body.spin.z * dt;
    body.restYaw += body.spin.y * dt;
  }
  if (body.grounded > 0.6 && v.lengthSq() < 4) {
    v.set(0, 0, 0);
    body.sleeping = true;
  }
  return true;
}
