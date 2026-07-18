import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type AttractionId = "hub" | "blast" | "kebab" | "gp" | "beach";

type AttractionContent = {
  id: AttractionId;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  accent: string;
  camera: [number, number, number];
  target: [number, number, number];
};

type Walker = {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  path: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
};

type WaterfallParticles = {
  points: THREE.Points;
  positions: Float32Array;
  top: number;
  bottom: number;
};

const ATTRACTIONS: AttractionContent[] = [
  {
    id: "hub",
    index: "00",
    eyebrow: "Il cuore dell’isola",
    title: "Cazzeggio Hub",
    description:
      "La piazza digitale da cui parte tutto: giochi rapidi, sfide quotidiane e una buona scusa per rimandare le cose serie.",
    detail:
      "Il padiglione centrale raccoglie l’identità del progetto e diventerà l’ingresso verso il sito completo.",
    accent: "#a855f7",
    camera: [8, 8, 12],
    target: [1.4, 1.5, -0.2],
  },
  {
    id: "blast",
    index: "01",
    eyebrow: "Puzzle · Combo",
    title: "Cazzeggio Blast",
    description:
      "Una torre di blocchi colorati, combinazioni e record da migliorare una partita alla volta.",
    detail:
      "L’attrazione riprende il linguaggio a griglia del gioco e lo trasforma in un monumento luminoso.",
    accent: "#32d7ff",
    camera: [-10, 6.5, 5],
    target: [-3.2, 1.5, -2.4],
  },
  {
    id: "kebab",
    index: "02",
    eyebrow: "Arcade · Precisione",
    title: "Kebab Smash",
    description:
      "Il chiosco più rumoroso dell’isola: mira, martello e un kebab gigante impossibile da ignorare.",
    detail:
      "Una piccola attrazione da luna park dedicata alle partite veloci e ai colpi perfetti.",
    accent: "#ff8a3d",
    camera: [14, 11, -17],
    target: [4.55, 1.5, -2.35],
  },
  {
    id: "gp",
    index: "03",
    eyebrow: "Racing · Giro veloce",
    title: "Cazzeggio GP",
    description:
      "Un micro-circuito sospeso fra le palme, con monoposto che continuano a inseguire il giro perfetto.",
    detail:
      "Questa attrazione racconta il lato competitivo di Cazzeggio e anticipa il mondo motorsport del portfolio.",
    accent: "#ff4f5e",
    camera: [-8, 6.8, 12],
    target: [-1.8, 1.4, 3.8],
  },
  {
    id: "beach",
    index: "04",
    eyebrow: "Relax · Social",
    title: "AFK Beach Club",
    description:
      "Amache, ombrelloni e telefono sempre in mano: qui essere AFK è praticamente un lavoro.",
    detail:
      "La spiaggia rappresenta la parte sociale e leggera del progetto, con abitanti che passeggiano e giocano.",
    accent: "#35e0c1",
    camera: [11, 5.8, 11],
    target: [6.2, 1.2, 3.4],
  },
];

const OVERVIEW_CAMERA = new THREE.Vector3(15, 17, 25);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

const palette = {
  purple: 0x8b24d6,
  purpleDark: 0x3b1769,
  sand: 0xf2c982,
  sandLight: 0xffdfa1,
  grass: 0x46a36f,
  grassDark: 0x267154,
  water: 0x28d8d0,
  rock: 0x53616c,
  rockDark: 0x303b49,
};

function standardMaterial(
  color: number,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.02,
    flatShading: true,
    ...options,
  });
}

function tagAttraction(group: THREE.Object3D, id: AttractionId) {
  group.userData.attractionRoot = true;
  group.userData.attractionId = id;
  group.traverse((child) => {
    child.userData.attractionId = id;
  });
}

function makeRadialShape(radius: number, points: number, seed: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const variation =
      Math.sin(angle * 3 + seed) * 0.06 +
      Math.sin(angle * 7 + seed * 1.7) * 0.035;
    const r = radius * (1 + variation);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * 0.78;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function makeLandLayer(
  radius: number,
  depth: number,
  color: number,
  y: number,
  seed: number,
) {
  const geometry = new THREE.ExtrudeGeometry(makeRadialShape(radius, 48, seed), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.18,
    bevelThickness: 0.16,
    curveSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, standardMaterial(color));
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createLabel(text: string, accent: string, width = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(5, 12, 24, .86)";
  context.beginPath();
  context.roundRect(8, 16, canvas.width - 16, 94, 28);
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "700 38px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(width / 100, 1.28, 1);
  sprite.userData.isAttractionLabel = true;
  return sprite;
}

function createPath(points: THREE.Vector3[], color = 0xe7bd79) {
  const curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.45);
  const path = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.11, 7, true),
    standardMaterial(color, { roughness: 0.9 }),
  );
  path.receiveShadow = true;
  return { path, curve };
}

function createPalm(scale = 1, leafColor = 0x36a86f) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11 * scale, 0.2 * scale, 2.5 * scale, 9),
    standardMaterial(0x9a6545),
  );
  trunk.position.y = 1.25 * scale;
  trunk.rotation.z = -0.08;
  trunk.castShadow = true;
  palm.add(trunk);

  const crown = new THREE.Group();
  crown.position.set(-0.1 * scale, 2.5 * scale, 0);
  crown.userData.isPalmCrown = true;
  const leafMaterial = standardMaterial(leafColor, {
    side: THREE.DoubleSide,
    roughness: 0.72,
  });
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.26 * scale, 1.75 * scale, 5),
      leafMaterial,
    );
    leaf.scale.x = 0.42;
    leaf.position.set(
      Math.cos(angle) * 0.66 * scale,
      0,
      Math.sin(angle) * 0.66 * scale,
    );
    leaf.rotation.z = Math.PI / 2.35;
    leaf.rotation.y = -angle;
    leaf.castShadow = true;
    crown.add(leaf);
  }
  palm.add(crown);

  const coconuts = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.17 * scale, 0),
    standardMaterial(0x6f4632),
  );
  coconuts.position.set(0.12 * scale, 2.36 * scale, 0.08 * scale);
  palm.add(coconuts);
  return palm;
}

function createRock(scale = 1, color = palette.rock) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(scale, 0),
    standardMaterial(color),
  );
  rock.scale.set(1, 0.72, 0.88);
  rock.rotation.set(
    Math.random() * 0.3,
    Math.random() * Math.PI,
    Math.random() * 0.25,
  );
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function createUmbrella(color: number) {
  const umbrella = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 1.45, 8),
    standardMaterial(0xf3eadc),
  );
  pole.position.y = 0.73;
  umbrella.add(pole);
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 0.38, 12),
    standardMaterial(color, { side: THREE.DoubleSide }),
  );
  canopy.position.y = 1.45;
  canopy.castShadow = true;
  umbrella.add(canopy);
  return umbrella;
}

function createLounger(color: number) {
  const group = new THREE.Group();
  const fabric = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.08, 1.35),
    standardMaterial(color),
  );
  fabric.position.y = 0.22;
  fabric.rotation.x = -0.12;
  fabric.castShadow = true;
  group.add(fabric);
  for (const z of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.28, 0.06),
      standardMaterial(0xe7dfd3),
    );
    leg.position.set(0, 0.08, z);
    group.add(leg);
  }
  return group;
}

function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0x1bc8c5) },
      uColorB: { value: new THREE.Color(0x76f6e6) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 p = position;
        float wave = sin((p.x + uTime * 0.7) * 1.35) * 0.07
          + cos((p.y - uTime * 0.55) * 1.8) * 0.045;
        p.z += wave;
        vWave = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        float lines = sin((vUv.x + vUv.y) * 34.0 + uTime * 1.5) * 0.5 + 0.5;
        float shimmer = smoothstep(0.72, 1.0, lines) * 0.16;
        vec3 color = mix(uColorA, uColorB, 0.42 + vWave * 2.4 + shimmer);
        gl_FragColor = vec4(color, 0.78);
      }
    `,
  });
}

function createWaterfall(
  width: number,
  height: number,
  position: THREE.Vector3,
  rotationY: number,
) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotationY;

  const geometry = new THREE.PlaneGeometry(width, height, 14, 28);
  const positionAttribute = geometry.getAttribute("position");
  for (let i = 0; i < positionAttribute.count; i += 1) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const normalized = y / height + 0.5;
    positionAttribute.setZ(
      i,
      Math.sin(x * 2.8) * 0.05 + Math.pow(1 - normalized, 2) * 0.72,
    );
  }
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x61f5ee) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float flow = sin(vUv.x * 27.0 + (vUv.y - uTime * 0.8) * 18.0);
        float ribbons = smoothstep(0.05, 0.95, flow * 0.5 + 0.5);
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        float foam = smoothstep(0.78, 1.0, vUv.y) + smoothstep(0.15, 0.0, vUv.y);
        float alpha = (0.38 + ribbons * 0.32 + foam * 0.22) * edge;
        gl_FragColor = vec4(mix(uColor, vec3(0.92, 1.0, 1.0), foam * 0.6), alpha);
      }
    `,
  });
  const fall = new THREE.Mesh(geometry, material);
  fall.position.y = -height / 2 + 0.45;
  group.add(fall);

  const particleCount = 85;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    particlePositions[i * 3] = (Math.random() - 0.5) * width * 1.08;
    particlePositions[i * 3 + 1] = -Math.random() * height + 0.55;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.65;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3),
  );
  const points = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xb9ffff,
      size: 0.09,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  );
  group.add(points);

  return {
    group,
    material,
    particles: {
      points,
      positions: particlePositions,
      top: 0.55,
      bottom: -height,
    } satisfies WaterfallParticles,
  };
}

function createHub() {
  const group = new THREE.Group();
  group.position.set(0, 1.4, -0.3);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.25, 0.38, 16),
    standardMaterial(0xe8dcf3),
  );
  base.position.y = 0.18;
  base.castShadow = true;
  group.add(base);

  const building = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 1.7, 12),
    standardMaterial(palette.purple),
  );
  building.position.y = 1.18;
  building.castShadow = true;
  group.add(building);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(1.34, 1.5, 1.28, 12),
    standardMaterial(0x151c38, {
      emissive: 0x30105d,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.15,
    }),
  );
  glass.position.y = 1.24;
  group.add(glass);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.15, 0.9, 12),
    standardMaterial(0xf6f1fb),
  );
  roof.position.y = 2.45;
  roof.castShadow = true;
  group.add(roof);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 1.4, 8),
    standardMaterial(0xe9def3),
  );
  antenna.position.y = 3.45;
  group.add(antenna);

  const signal = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 8, 32, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xcf8bff }),
  );
  signal.position.y = 3.82;
  signal.rotation.z = Math.PI / 2;
  signal.userData.isSignal = true;
  group.add(signal);

  const sign = createLabel("CAZZEGGIO", "#a855f7", 620);
  sign.position.set(0, 3.45, 0.2);
  sign.scale.multiplyScalar(0.78);
  group.add(sign);

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.12, 10, 36, Math.PI),
    standardMaterial(0xffffff, {
      emissive: 0x9333ea,
      emissiveIntensity: 1.5,
    }),
  );
  portal.position.set(0, 0.95, 1.55);
  group.add(portal);

  tagAttraction(group, "hub");
  return group;
}

function createBlastTower() {
  const group = new THREE.Group();
  group.position.set(-4.65, 1.35, -2.55);
  const colors = [0x30d5ff, 0x5a63f2, 0xa855f7, 0xff565f, 0xffcf3b, 0x2edd79];
  const layout = [
    [-1, 0, 0],
    [0, 0, 0],
    [1, 0, 0],
    [-1, 1, 0],
    [0, 1, 0],
    [0, 2, 0],
    [1, 2, 0],
    [1, 3, 0],
    [0, 0, 1],
    [0, 1, 1],
  ];
  layout.forEach(([x, y, z], index) => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.72, 0.72),
      standardMaterial(colors[index % colors.length], {
        emissive: colors[index % colors.length],
        emissiveIntensity: 0.1,
        roughness: 0.35,
      }),
    );
    block.position.set(x * 0.76, y * 0.76 + 0.4, z * 0.76);
    block.castShadow = true;
    group.add(block);
  });

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 0.8, 5),
    standardMaterial(0xffd33d, {
      emissive: 0xb77300,
      emissiveIntensity: 0.35,
    }),
  );
  crown.position.set(0.75, 3.65, 0);
  crown.rotation.z = 0.08;
  group.add(crown);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.95, 0.28, 12),
    standardMaterial(0x153463),
  );
  platform.position.y = 0.05;
  group.add(platform);

  const label = createLabel("BLAST", "#32d7ff", 360);
  label.position.set(0, 3.6, 0.4);
  label.scale.multiplyScalar(0.62);
  group.add(label);

  tagAttraction(group, "blast");
  return group;
}

function createKebabBooth() {
  const group = new THREE.Group();
  group.position.set(4.55, 1.32, -2.35);

  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.15, 1.55),
    standardMaterial(0xa44f2d),
  );
  booth.position.y = 0.58;
  booth.castShadow = true;
  group.add(booth);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.18, 1.85),
    standardMaterial(0xff8a3d),
  );
  awning.position.y = 1.35;
  group.add(awning);

  const kebab = new THREE.Group();
  const skewer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8),
    standardMaterial(0xd9d9d9, { metalness: 0.6, roughness: 0.28 }),
  );
  skewer.position.y = 1.7;
  kebab.add(skewer);
  for (let i = 0; i < 7; i += 1) {
    const layer = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.55 - i * 0.035,
        0.5 - i * 0.025,
        0.34,
        9,
      ),
      standardMaterial(i % 2 ? 0xcc5d2c : 0xe48339),
    );
    layer.position.y = 0.62 + i * 0.32;
    layer.rotation.y = i * 0.36;
    layer.castShadow = true;
    kebab.add(layer);
  }
  kebab.position.set(0.35, 1.25, 0);
  kebab.userData.isKebab = true;
  group.add(kebab);

  const hammer = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 1.3, 8),
    standardMaterial(0x7a4c32),
  );
  handle.position.y = 0.65;
  hammer.add(handle);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.42, 0.48),
    standardMaterial(0x30333c, { metalness: 0.35 }),
  );
  head.position.y = 1.35;
  hammer.add(head);
  hammer.position.set(-0.95, 1.2, 0.45);
  hammer.rotation.z = -0.55;
  hammer.userData.isHammer = true;
  group.add(hammer);

  const label = createLabel("KEBAB SMASH", "#ff8a3d", 520);
  label.position.set(0, 3.8, 0);
  label.scale.multiplyScalar(0.62);
  group.add(label);

  tagAttraction(group, "kebab");
  return group;
}

function createTinyCar(color: number) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.13, 0.66),
    standardMaterial(color, { roughness: 0.35 }),
  );
  body.position.y = 0.13;
  car.add(body);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.08, 0.38),
    standardMaterial(color, { roughness: 0.35 }),
  );
  nose.position.set(0, 0.1, 0.48);
  car.add(nose);
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.05, 0.1),
    standardMaterial(0x161921),
  );
  wing.position.set(0, 0.12, 0.7);
  car.add(wing);
  for (const x of [-0.2, 0.2]) {
    for (const z of [-0.22, 0.28]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8),
        standardMaterial(0x111318),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.1, z);
      car.add(wheel);
    }
  }
  return car;
}

function createGpAttraction() {
  const group = new THREE.Group();
  group.position.set(-3.35, 1.28, 3.85);
  const trackPoints = [
    new THREE.Vector3(-2.1, 0.25, -0.6),
    new THREE.Vector3(-1.3, 0.25, -1.45),
    new THREE.Vector3(0.5, 0.25, -1.4),
    new THREE.Vector3(2.05, 0.25, -0.55),
    new THREE.Vector3(1.65, 0.25, 1.0),
    new THREE.Vector3(0.25, 0.25, 1.45),
    new THREE.Vector3(-1.65, 0.25, 1.05),
  ];
  const curve = new THREE.CatmullRomCurve3(
    trackPoints,
    true,
    "catmullrom",
    0.45,
  );
  const roadMaterial = standardMaterial(0x262b34, { roughness: 0.95 });
  for (let i = 0; i < 58; i += 1) {
    const t = i / 58;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.1, 0.42),
      roadMaterial,
    );
    road.position.copy(point);
    road.rotation.y = Math.atan2(tangent.x, tangent.z);
    road.receiveShadow = true;
    group.add(road);
    if (i % 3 === 0) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.04, 0.4),
        standardMaterial(i % 2 ? 0xffffff : 0xff4f5e),
      );
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      curb.position.copy(point).addScaledVector(normal, 0.42);
      curb.position.y += 0.07;
      curb.rotation.y = road.rotation.y;
      group.add(curb);
    }
  }

  const cars = [createTinyCar(0xff4f5e), createTinyCar(0x4dd8ff)];
  cars.forEach((car, index) => {
    car.userData.gpOffset = index * 0.5;
    group.add(car);
  });
  group.userData.gpCurve = curve;
  group.userData.gpCars = cars;

  const gantry = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.22, 0.18),
    standardMaterial(0xffffff),
  );
  gantry.position.set(-0.65, 1.3, -1.15);
  group.add(gantry);
  for (const x of [-1.3, 0]) {
    const support = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.25, 0.12),
      standardMaterial(0xffffff),
    );
    support.position.set(x, 0.7, -1.15);
    group.add(support);
  }

  const label = createLabel("CAZZEGGIO GP", "#ff4f5e", 520);
  label.position.set(0, 2.45, 0);
  label.scale.multiplyScalar(0.58);
  group.add(label);
  tagAttraction(group, "gp");
  return group;
}

function createBeachClub() {
  const group = new THREE.Group();
  group.position.set(4.75, 1.08, 3.45);

  const tikiBar = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.0, 1.15),
    standardMaterial(0xb76c3f),
  );
  tikiBar.position.y = 0.5;
  tikiBar.castShadow = true;
  group.add(tikiBar);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.65, 0.65, 4),
    standardMaterial(0x6e4a35),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.45;
  group.add(roof);

  const neon = createLabel("AFK CLUB", "#35e0c1", 420);
  neon.position.set(0, 2.55, 0.2);
  neon.scale.multiplyScalar(0.54);
  group.add(neon);

  const umbrellaA = createUmbrella(0x35e0c1);
  umbrellaA.position.set(-1.9, 0, 1);
  group.add(umbrellaA);
  const umbrellaB = createUmbrella(0xff5b79);
  umbrellaB.position.set(1.8, 0, 1.2);
  group.add(umbrellaB);

  const loungerA = createLounger(0xf8f3eb);
  loungerA.position.set(-1.8, 0, 2.1);
  loungerA.rotation.y = -0.25;
  group.add(loungerA);
  const loungerB = createLounger(0xf8f3eb);
  loungerB.position.set(1.6, 0, 2.2);
  loungerB.rotation.y = 0.2;
  group.add(loungerB);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8),
    standardMaterial(0xfff2d6),
  );
  ball.position.set(0.8, 0.23, 2.65);
  group.add(ball);

  tagAttraction(group, "beach");
  return group;
}

function createPerson(index: number) {
  const root = new THREE.Group();
  const skinColors = [0xf0b38f, 0xc98663, 0x8f5b44, 0xf4c5a5];
  const shirtColors = [0x8b24d6, 0x28c7c1, 0xff6b58, 0xf1ca45, 0x4389ff];
  const skin = standardMaterial(skinColors[index % skinColors.length]);
  const shirt = standardMaterial(shirtColors[index % shirtColors.length]);
  const dark = standardMaterial(index % 2 ? 0x20263b : 0x45315a);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.55, 5, 8),
    shirt,
  );
  body.position.y = 1.05;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), skin);
  head.position.y = 1.72;
  head.castShadow = true;
  root.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52),
    standardMaterial(index % 3 === 0 ? 0x2a1b18 : 0x4a3024),
  );
  hair.position.y = 1.76;
  root.add(hair);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  for (const [leg, x] of [
    [leftLeg, -0.13],
    [rightLeg, 0.13],
  ] as const) {
    const limb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.5, 4, 7),
      dark,
    );
    limb.position.y = -0.3;
    leg.position.set(x, 0.62, 0);
    leg.add(limb);
    root.add(leg);
  }

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  for (const [arm, x] of [
    [leftArm, -0.35],
    [rightArm, 0.35],
  ] as const) {
    const limb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06, 0.42, 4, 7),
      skin,
    );
    limb.position.y = -0.24;
    arm.position.set(x, 1.35, 0);
    arm.rotation.x = -0.82;
    arm.rotation.z = x > 0 ? 0.25 : -0.25;
    arm.add(limb);
    root.add(arm);
  }

  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.46, 0.045),
    standardMaterial(0x151821, {
      emissive: 0x276aff,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    }),
  );
  phone.position.set(0, 1.18, 0.43);
  phone.rotation.x = -0.55;
  root.add(phone);

  root.scale.setScalar(0.72 + (index % 3) * 0.04);
  return { root, leftLeg, rightLeg, leftArm, rightArm };
}

function createCazzeggioIsland() {
  const island = new THREE.Group();

  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(10.8, 5.6, 5.2, 28, 4),
    standardMaterial(palette.rock),
  );
  cliff.scale.z = 0.78;
  cliff.position.y = -1.9;
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  island.add(cliff);

  const lowerCliff = new THREE.Mesh(
    new THREE.CylinderGeometry(5.7, 2.0, 3.1, 18, 2),
    standardMaterial(palette.rockDark),
  );
  lowerCliff.scale.z = 0.8;
  lowerCliff.position.y = -5.6;
  lowerCliff.castShadow = true;
  island.add(lowerCliff);

  const waterMaterial = createWaterMaterial();
  const upperSea = new THREE.Mesh(
    new THREE.CircleGeometry(10.85, 72),
    waterMaterial,
  );
  upperSea.scale.y = 0.78;
  upperSea.rotation.x = -Math.PI / 2;
  upperSea.position.y = 0.78;
  upperSea.receiveShadow = true;
  island.add(upperSea);

  const sand = makeLandLayer(9.1, 0.48, palette.sand, 0.82, 2.3);
  sand.position.x = -0.2;
  island.add(sand);
  const grass = makeLandLayer(7.15, 0.68, palette.grass, 1.28, 4.8);
  grass.position.set(-0.65, 0.03, -0.45);
  island.add(grass);

  const innerSand = new THREE.Mesh(
    new THREE.RingGeometry(7.15, 8.5, 64),
    standardMaterial(palette.sandLight),
  );
  innerSand.scale.y = 0.78;
  innerSand.rotation.x = -Math.PI / 2;
  innerSand.position.set(-0.2, 1.05, 0);
  island.add(innerSand);

  const pathResult = createPath(
    [
      new THREE.Vector3(-5.8, 1.72, -0.5),
      new THREE.Vector3(-3.8, 1.72, -4.2),
      new THREE.Vector3(0, 1.72, -4.5),
      new THREE.Vector3(4.2, 1.72, -3.7),
      new THREE.Vector3(6.2, 1.72, 0),
      new THREE.Vector3(4.3, 1.72, 3.7),
      new THREE.Vector3(0.2, 1.72, 5.0),
      new THREE.Vector3(-4.4, 1.72, 3.7),
    ],
    0xedd29b,
  );
  island.add(pathResult.path);

  const hub = createHub();
  const blast = createBlastTower();
  const kebab = createKebabBooth();
  const gp = createGpAttraction();
  const beach = createBeachClub();
  island.add(hub, blast, kebab, gp, beach);

  const palmData = [
    [-7.1, -3.8, 1.15, 0.2],
    [-7.8, 1.5, 1.0, -0.35],
    [-5.7, 4.6, 0.9, 0.4],
    [0.5, -5.6, 1.1, -0.1],
    [8.25, -1.25, 1.0, 0.3],
    [7.6, 1.0, 1.2, -0.4],
    [6.4, 5.2, 0.88, 0.2],
    [1.0, 5.8, 0.82, -0.2],
  ] as const;
  palmData.forEach(([x, z, scale, rotation]) => {
    const palm = createPalm(scale);
    palm.position.set(x, 1.34, z);
    palm.rotation.y = rotation;
    island.add(palm);
  });

  const rockData = [
    [-9.5, -2.2, 0.85],
    [-8.9, 3.4, 0.65],
    [8.9, -2.7, 0.72],
    [9.4, 2.6, 0.9],
    [1.5, -6.3, 0.58],
    [-2.4, 6.1, 0.62],
  ] as const;
  rockData.forEach(([x, z, scale]) => {
    const rock = createRock(scale);
    rock.position.set(x, 0.98, z);
    island.add(rock);
  });

  const waterfalls = [
    createWaterfall(2.5, 6.4, new THREE.Vector3(9.3, 0.8, -2.6), Math.PI / 2),
    createWaterfall(2.0, 6.0, new THREE.Vector3(-8.8, 0.8, 3.5), -Math.PI / 2),
    createWaterfall(2.8, 6.8, new THREE.Vector3(1.0, 0.8, 7.9), 0),
  ];
  waterfalls.forEach(({ group }) => island.add(group));

  const foamMaterial = standardMaterial(0xd9ffff, {
    transparent: true,
    opacity: 0.7,
    roughness: 0.2,
  });
  for (const [x, z] of [
    [9.45, -2.6],
    [-8.95, 3.5],
    [1.0, 7.95],
  ] as const) {
    for (let i = 0; i < 8; i += 1) {
      const foam = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18 + Math.random() * 0.2, 1),
        foamMaterial,
      );
      foam.position.set(
        x + (Math.random() - 0.5) * 1.6,
        0.72 + Math.random() * 0.25,
        z + (Math.random() - 0.5) * 1.2,
      );
      foam.userData.isFoam = true;
      foam.userData.foamOffset = Math.random() * Math.PI * 2;
      island.add(foam);
    }
  }

  const walkPaths = [
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-5.7, 1.82, 0.2),
        new THREE.Vector3(-3.6, 1.82, -3.6),
        new THREE.Vector3(0, 1.82, -4.2),
        new THREE.Vector3(4.5, 1.82, -3.2),
        new THREE.Vector3(5.9, 1.82, 0.4),
        new THREE.Vector3(3.8, 1.82, 3.4),
        new THREE.Vector3(0, 1.82, 4.6),
        new THREE.Vector3(-4.4, 1.82, 3.4),
      ],
      true,
      "catmullrom",
      0.45,
    ),
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-2.7, 1.82, -0.2),
        new THREE.Vector3(-1.5, 1.82, -2.2),
        new THREE.Vector3(1.5, 1.82, -2.0),
        new THREE.Vector3(2.7, 1.82, 0),
        new THREE.Vector3(1.5, 1.82, 2.2),
        new THREE.Vector3(-1.8, 1.82, 2.1),
      ],
      true,
      "catmullrom",
      0.42,
    ),
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(2.6, 1.45, 4.9),
        new THREE.Vector3(4.0, 1.45, 5.8),
        new THREE.Vector3(6.6, 1.45, 4.8),
        new THREE.Vector3(7.0, 1.45, 2.7),
        new THREE.Vector3(5.5, 1.45, 1.8),
        new THREE.Vector3(3.3, 1.45, 2.4),
      ],
      true,
      "catmullrom",
      0.4,
    ),
  ];

  const walkers: Walker[] = [];
  for (let i = 0; i < 12; i += 1) {
    const person = createPerson(i);
    const walker: Walker = {
      ...person,
      path: walkPaths[i % walkPaths.length],
      offset: (i * 0.173) % 1,
      speed: 0.018 + (i % 4) * 0.0025,
    };
    walkers.push(walker);
    island.add(person.root);
  }

  return {
    island,
    waterMaterial,
    waterfalls,
    walkers,
    attractions: [hub, blast, kebab, gp, beach],
    gp,
  };
}

export default function PortfolioWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<(id: AttractionId | null) => void>(() => {});
  const [selectedId, setSelectedId] = useState<AttractionId | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const selected =
    ATTRACTIONS.find((attraction) => attraction.id === selectedId) ?? null;

  const selectAttraction = useCallback((id: AttractionId | null) => {
    selectRef.current(id);
    setSelectedId(id);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError(true);
      setLoaded(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x071321, 0.012);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      150,
    );
    camera.position.copy(OVERVIEW_CAMERA);

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 9;
    controls.maxDistance = 38;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.copy(OVERVIEW_TARGET);

    scene.add(new THREE.HemisphereLight(0xa6dcff, 0x181326, 3.5));
    const sun = new THREE.DirectionalLight(0xffe0b2, 5.2);
    sun.position.set(-14, 24, 13);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 65;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x8c65ff, 2.2);
    rim.position.set(14, 8, -14);
    scene.add(rim);

    const world = createCazzeggioIsland();
    scene.add(world.island);

    const lowerMist = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshBasicMaterial({
        color: 0x17334b,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    lowerMist.rotation.x = -Math.PI / 2;
    lowerMist.position.y = -8.2;
    scene.add(lowerMist);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 520; i += 1) {
      const radius = 34 + Math.random() * 48;
      const angle = Math.random() * Math.PI * 2;
      starPositions.push(
        Math.cos(angle) * radius,
        -9 + Math.random() * 52,
        Math.sin(angle) * radius,
      );
    }
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({
        color: 0xcfeaff,
        size: 0.09,
        transparent: true,
        opacity: 0.68,
      }),
    );
    scene.add(stars);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };
    let hovered: AttractionId | null = null;
    let activeSceneId: AttractionId | null = null;
    let cameraGoal = OVERVIEW_CAMERA.clone();
    let targetGoal = OVERVIEW_TARGET.clone();

    selectRef.current = (id) => {
      activeSceneId = id;
      const content = ATTRACTIONS.find((item) => item.id === id);
      if (content) {
        cameraGoal.set(...content.camera);
        targetGoal.set(...content.target);
      } else {
        cameraGoal.copy(OVERVIEW_CAMERA);
        targetGoal.copy(OVERVIEW_TARGET);
      }
      controls.enabled = false;
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findAttraction = () => {
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(
        world.attractions,
        true,
      );
      return (intersections[0]?.object.userData.attractionId ?? null) as
        | AttractionId
        | null;
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      hovered = findAttraction();
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      const moved = Math.hypot(
        event.clientX - pointerDown.x,
        event.clientY - pointerDown.y,
      );
      if (moved > 7) return;
      updatePointer(event);
      const id = findAttraction();
      if (id) selectAttraction(id);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, width < 700 ? 1.25 : 1.65),
      );
    };
    window.addEventListener("resize", onResize);

    const timer = new THREE.Timer();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let animationFrame = 0;

    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();
      const delta = Math.min(timer.getDelta(), 0.04);
      const motionScale = reduceMotion ? 0.18 : 1;

      world.waterMaterial.uniforms.uTime.value = elapsed * motionScale;
      world.waterfalls.forEach((waterfall, waterfallIndex) => {
        waterfall.material.uniforms.uTime.value =
          elapsed * motionScale + waterfallIndex * 0.7;
        const attribute = waterfall.particles.points.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        for (let i = 0; i < waterfall.particles.positions.length / 3; i += 1) {
          const yIndex = i * 3 + 1;
          waterfall.particles.positions[yIndex] -=
            delta * (2.4 + (i % 7) * 0.16) * motionScale;
          if (
            waterfall.particles.positions[yIndex] <
            waterfall.particles.bottom
          ) {
            waterfall.particles.positions[yIndex] =
              waterfall.particles.top - Math.random() * 0.5;
          }
        }
        attribute.needsUpdate = true;
      });

      world.walkers.forEach((walker, index) => {
        const t =
          (elapsed * walker.speed * motionScale + walker.offset) % 1;
        const point = walker.path.getPointAt(t);
        const tangent = walker.path.getTangentAt(t);
        walker.root.position.copy(point);
        walker.root.rotation.y = Math.atan2(tangent.x, tangent.z);
        const stride = Math.sin(elapsed * 7.5 + index) * 0.55 * motionScale;
        walker.leftLeg.rotation.x = stride;
        walker.rightLeg.rotation.x = -stride;
        walker.leftArm.rotation.x = -0.82 - stride * 0.12;
        walker.rightArm.rotation.x = -0.82 + stride * 0.12;
        walker.root.position.y +=
          Math.abs(Math.sin(elapsed * 7.5 + index)) * 0.035 * motionScale;
      });

      const gpCurve = world.gp.userData.gpCurve as THREE.CatmullRomCurve3;
      const gpCars = world.gp.userData.gpCars as THREE.Group[];
      gpCars.forEach((car, index) => {
        const t =
          (elapsed * (0.055 + index * 0.004) * motionScale +
            car.userData.gpOffset) %
          1;
        const point = gpCurve.getPointAt(t);
        const tangent = gpCurve.getTangentAt(t);
        car.position.copy(point);
        car.position.y += 0.12;
        car.rotation.y = Math.atan2(tangent.x, tangent.z);
      });

      world.attractions.forEach((attraction) => {
        const id = attraction.userData.attractionId as AttractionId;
        const scale = hovered === id ? 1.035 : 1;
        attraction.scale.lerp(
          new THREE.Vector3(scale, scale, scale),
          0.09,
        );
      });

      world.island.traverse((object) => {
        if (object.userData.isPalmCrown) {
          object.rotation.z =
            Math.sin(elapsed * 0.8 + object.id) * 0.025 * motionScale;
        }
        if (object.userData.isFoam) {
          object.position.y +=
            Math.sin(elapsed * 1.8 + object.userData.foamOffset) *
            0.0006 *
            motionScale;
        }
        if (object.userData.isKebab) {
          object.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
        }
        if (object.userData.isHammer) {
          object.rotation.z =
            -0.55 + Math.sin(elapsed * 1.15) * 0.08 * motionScale;
        }
        if (object.userData.isSignal) {
          const pulse = 1 + Math.sin(elapsed * 2.2) * 0.08 * motionScale;
          object.scale.setScalar(pulse);
        }
        if (
          object instanceof THREE.Sprite &&
          object.userData.isAttractionLabel
        ) {
          const ownId = object.userData.attractionId as AttractionId;
          const labelOpacity =
            activeSceneId && ownId !== activeSceneId ? 0.08 : 1;
          object.material.opacity = THREE.MathUtils.lerp(
            object.material.opacity,
            labelOpacity,
            0.12,
          );
        }
      });

      stars.rotation.y = elapsed * 0.0025 * motionScale;
      lowerMist.material.opacity =
        0.28 + Math.sin(elapsed * 0.4) * 0.035 * motionScale;

      if (!controls.enabled) {
        camera.position.lerp(cameraGoal, 0.055);
        controls.target.lerp(targetGoal, 0.065);
        if (
          camera.position.distanceTo(cameraGoal) < 0.08 &&
          controls.target.distanceTo(targetGoal) < 0.05
        ) {
          controls.enabled = true;
        }
      }
      if (!activeSceneId && controls.enabled) {
        cameraGoal.copy(camera.position);
        targetGoal.copy(controls.target);
      }

      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    const loadTimer = window.setTimeout(() => setLoaded(true), 650);

    return () => {
      window.clearTimeout(loadTimer);
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite) {
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
        } else if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            if ("map" in material && material.map instanceof THREE.Texture) {
              material.map.dispose();
            }
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectAttraction]);

  return (
    <main className="island-shell">
      <div className="island-aurora island-aurora--purple" />
      <div className="island-aurora island-aurora--aqua" />
      <div ref={mountRef} className="island-canvas" aria-hidden="true" />

      <header className="brand">
        <button
          className="brand-mark"
          onClick={() => selectAttraction(null)}
          aria-label="Torna alla vista completa dell’isola"
        >
          C
        </button>
        <div>
          <p>
            CAZZ<span>EGGIO</span> ISLAND
          </p>
          <small>Roberto Ringoli · Project world 01</small>
        </div>
      </header>

      <section
        className={`island-intro ${selected ? "island-intro--hidden" : ""}`}
        aria-hidden={Boolean(selected)}
      >
        <p className="island-kicker">Benvenuto dove il tempo sparisce</p>
        <h1>
          Perdere tempo,
          <br />
          ma farlo <em>bene.</em>
        </h1>
        <p>
          Un’isola costruita attorno ai giochi di Cazzeggio. Segui gli
          abitanti, ruota il mondo e scegli un’attrazione.
        </p>
      </section>

      <aside
        className={`attraction-card ${
          selected ? "attraction-card--open" : ""
        } ${
          selectedId === "kebab" || selectedId === "beach"
            ? "attraction-card--left"
            : ""
        }`}
        style={
          selected
            ? ({ "--attraction-accent": selected.accent } as React.CSSProperties)
            : undefined
        }
        aria-live="polite"
      >
        {selected && (
          <>
            <button
              className="card-close"
              onClick={() => selectAttraction(null)}
              aria-label="Chiudi la scheda"
            >
              <span />
              <span />
            </button>
            <p className="card-index">{selected.index}</p>
            <p className="card-eyebrow">{selected.eyebrow}</p>
            <h2>{selected.title}</h2>
            <p className="card-lead">{selected.description}</p>
            <div className="card-divider" />
            <p className="card-detail">{selected.detail}</p>
            <button className="card-action" type="button">
              Apri il gioco
              <span aria-hidden="true">↗</span>
            </button>
          </>
        )}
      </aside>

      <nav className="island-map" aria-label="Attrazioni dell’isola">
        <p>Esplora</p>
        {ATTRACTIONS.map((attraction) => (
          <button
            key={attraction.id}
            className={selectedId === attraction.id ? "active" : ""}
            onClick={() => selectAttraction(attraction.id)}
            aria-label={attraction.title}
          >
            <span
              style={{ "--pin-color": attraction.accent } as React.CSSProperties}
            />
            <small>{attraction.index}</small>
          </button>
        ))}
      </nav>

      <div className="island-hint" aria-hidden="true">
        <span>
          <i />
        </span>
        Trascina · zooma · scopri
      </div>

      <div className={`island-loader ${loaded ? "island-loader--done" : ""}`}>
        <div className="loader-waterfall">
          <i />
          <i />
          <i />
        </div>
        <p>Sto popolando l’isola</p>
      </div>

      {webglError && (
        <div className="island-fallback">
          <h2>L’isola non riesce a partire</h2>
          <p>Questo browser non supporta la scena 3D WebGL.</p>
        </div>
      )}
    </main>
  );
}
