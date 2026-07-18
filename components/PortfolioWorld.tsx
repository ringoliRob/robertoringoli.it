"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type IslandId = "racing" | "milano" | "maldives";

type IslandContent = {
  id: IslandId;
  number: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  description: string;
  detail: string;
  accent: string;
  camera: [number, number, number];
  target: [number, number, number];
};

const ISLANDS: IslandContent[] = [
  {
    id: "racing",
    number: "01",
    eyebrow: "Motorsport · Mobile game",
    title: "Pitwall Tycoon",
    shortTitle: "Il circuito",
    description:
      "Una monoposto non vince da sola. Strategia, sviluppo e decisioni al muretto diventano un tycoon mobile.",
    detail:
      "Un progetto in evoluzione dedicato alla parte della Formula racing che amo di più: costruire una squadra, leggere la gara e rischiare al momento giusto.",
    accent: "#ff5c45",
    camera: [-11, 8, 12],
    target: [-8.5, 0, 1.5],
  },
  {
    id: "milano",
    number: "02",
    eyebrow: "Identità · About",
    title: "Milano, sempre",
    shortTitle: "La città",
    description:
      "Il Duomo custodisce la mia storia: chi sono, cosa so fare e la città che continua a ispirarmi.",
    detail:
      "Questa sarà la parte più personale del mondo, con esperienze, competenze, contatti e tutto ciò che non entra in una semplice bio.",
    accent: "#ba9cff",
    camera: [0, 7, 5],
    target: [0, 1, -5.2],
  },
  {
    id: "maldives",
    number: "03",
    eyebrow: "Casual gaming · Web",
    title: "Cazzeggio tropicale",
    shortTitle: "Le Maldive",
    description:
      "Un’isola per giocare senza prendersi troppo sul serio: piccoli giochi, idee veloci e zero dress code.",
    detail:
      "Qui prende vita il progetto casual gaming: un posto leggero, immediato e pieno di esperimenti da aprire direttamente dalla spiaggia.",
    accent: "#39dfc3",
    camera: [12, 7, 12],
    target: [8.7, 0, 2.2],
  },
];

const OVERVIEW_CAMERA = new THREE.Vector3(0, 19, 26);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

function tagInteractive(object: THREE.Object3D, islandId: IslandId) {
  object.traverse((child) => {
    child.userData.islandId = islandId;
  });
}

function createIslandBase(
  radius: number,
  topColor: number,
  rockColor: number,
) {
  const group = new THREE.Group();

  const rock = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.48, radius * 0.94, 3.4, 9, 3),
    new THREE.MeshStandardMaterial({
      color: rockColor,
      flatShading: true,
      roughness: 0.9,
    }),
  );
  rock.position.y = -1.8;
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, 0.72, 12),
    new THREE.MeshStandardMaterial({
      color: topColor,
      flatShading: true,
      roughness: 0.85,
    }),
  );
  ground.position.y = 0;
  ground.castShadow = true;
  ground.receiveShadow = true;
  group.add(ground);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(radius * 0.2, 0),
    new THREE.MeshStandardMaterial({
      color: 0x88a9bd,
      emissive: 0x18344a,
      flatShading: true,
      roughness: 0.35,
    }),
  );
  crystal.scale.y = 1.8;
  crystal.position.y = -3.65;
  group.add(crystal);

  return group;
}

function createTree(scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.25 * scale, 6),
    new THREE.MeshStandardMaterial({ color: 0x73523d, flatShading: true }),
  );
  trunk.position.y = 0.65 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c8767,
    flatShading: true,
  });
  for (let i = 0; i < 3; i += 1) {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry((0.68 - i * 0.12) * scale, 0.95 * scale, 7),
      crownMaterial,
    );
    crown.position.y = (1.25 + i * 0.48) * scale;
    crown.castShadow = true;
    tree.add(crown);
  }
  return tree;
}

function createRaceCar(color: number) {
  const car = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x111722,
    roughness: 0.7,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.12, 0.72),
    bodyMaterial,
  );
  body.position.y = 0.13;
  body.castShadow = true;
  car.add(body);

  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.42),
    bodyMaterial,
  );
  nose.position.set(0, 0.1, 0.48);
  car.add(nose);

  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.045, 0.12),
    darkMaterial,
  );
  wing.position.set(0, 0.11, 0.68);
  car.add(wing);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    darkMaterial,
  );
  cockpit.scale.set(1, 0.6, 1.35);
  cockpit.position.set(0, 0.22, -0.05);
  car.add(cockpit);

  for (const x of [-0.2, 0.2]) {
    for (const z of [-0.24, 0.3]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.075, 8),
        darkMaterial,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.1, z);
      car.add(wheel);
    }
  }

  return car;
}

function createRacingIsland() {
  const island = createIslandBase(5.2, 0x8aaa6a, 0x5a5460);
  island.position.set(-8.5, 0, 1.5);

  const trackPoints = [
    new THREE.Vector3(-3.55, 0.47, -0.9),
    new THREE.Vector3(-2.7, 0.47, -2.45),
    new THREE.Vector3(-0.2, 0.47, -2.75),
    new THREE.Vector3(2.65, 0.47, -2.15),
    new THREE.Vector3(3.7, 0.47, -0.55),
    new THREE.Vector3(3.1, 0.47, 1.15),
    new THREE.Vector3(1.3, 0.47, 1.65),
    new THREE.Vector3(0.3, 0.47, 2.75),
    new THREE.Vector3(-2.15, 0.47, 2.45),
    new THREE.Vector3(-3.7, 0.47, 1.05),
  ];
  const curve = new THREE.CatmullRomCurve3(trackPoints, true, "catmullrom", 0.35);
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x252a34,
    roughness: 0.92,
  });
  const curbRed = new THREE.MeshStandardMaterial({ color: 0xff584f });
  const curbWhite = new THREE.MeshStandardMaterial({ color: 0xf4eee6 });
  const segmentGeometry = new THREE.BoxGeometry(0.96, 0.12, 0.56);

  for (let i = 0; i < 72; i += 1) {
    const t = i / 72;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const road = new THREE.Mesh(segmentGeometry, roadMaterial);
    road.position.copy(point);
    road.rotation.y = Math.atan2(tangent.x, tangent.z);
    road.castShadow = true;
    road.receiveShadow = true;
    island.add(road);

    if (i % 2 === 0) {
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      for (const side of [-1, 1]) {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.055, 0.52),
          i % 4 === 0 ? curbRed : curbWhite,
        );
        curb.position.copy(point).addScaledVector(normal, side * 0.57);
        curb.position.y += 0.05;
        curb.rotation.y = road.rotation.y;
        island.add(curb);
      }
    }
  }

  const pit = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.62, 0.85),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d7, flatShading: true }),
  );
  pit.position.set(-0.5, 0.75, -1.15);
  pit.castShadow = true;
  island.add(pit);

  const pitRoof = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.13, 1.05),
    new THREE.MeshStandardMaterial({ color: 0xff5c45 }),
  );
  pitRoof.position.set(-0.5, 1.13, -1.15);
  island.add(pitRoof);

  const cars = [
    createRaceCar(0xff5c45),
    createRaceCar(0xf0d85c),
    createRaceCar(0x67d5ff),
    createRaceCar(0xf4f1ea),
  ];
  cars.forEach((car, index) => {
    car.userData.offset = index / cars.length;
    car.userData.speed = 0.035 + index * 0.0025;
    island.add(car);
  });

  for (const [x, z, scale] of [
    [-3.8, -2.5, 0.7],
    [3.5, 2.2, 0.65],
    [-2.7, 2.9, 0.55],
  ] as const) {
    const tree = createTree(scale);
    tree.position.set(x, 0.42, z);
    island.add(tree);
  }

  tagInteractive(island, "racing");
  return { island, curve, cars };
}

function createMilanoIsland() {
  const island = createIslandBase(4.4, 0xc5b3d4, 0x59506c);
  island.position.set(0, 0, -5.2);

  const stone = new THREE.MeshStandardMaterial({
    color: 0xe6e0dc,
    roughness: 0.82,
    flatShading: true,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x343149,
    emissive: 0x17172b,
  });

  const cathedral = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.42, 2.3), stone);
  base.position.y = 0.62;
  base.castShadow = true;
  cathedral.add(base);

  const nave = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.55, 1.7), stone);
  nave.position.y = 1.55;
  nave.castShadow = true;
  cathedral.add(nave);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 1.35), stone);
  upper.position.y = 2.65;
  upper.castShadow = true;
  cathedral.add(upper);

  const facade = new THREE.Mesh(new THREE.BoxGeometry(3.05, 2.15, 0.32), stone);
  facade.position.set(0, 1.75, 1.02);
  facade.castShadow = true;
  cathedral.add(facade);

  for (const x of [-1.05, -0.52, 0, 0.52, 1.05]) {
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.65, 0.05),
      windowMaterial,
    );
    window.position.set(x, 1.75, 1.2);
    cathedral.add(window);
  }

  const spirePositions: [number, number, number, number][] = [
    [-1.35, 3.35, 0.75, 0.55],
    [1.35, 3.35, 0.75, 0.55],
    [-1.1, 2.75, -0.7, 0.45],
    [1.1, 2.75, -0.7, 0.45],
    [-0.55, 3.4, 0, 0.55],
    [0.55, 3.4, 0, 0.55],
    [0, 4.15, 0, 0.85],
  ];
  spirePositions.forEach(([x, y, z, scale]) => {
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.22 * scale, 1.65 * scale, 7),
      stone,
    );
    spire.position.set(x, y, z);
    spire.castShadow = true;
    cathedral.add(spire);
  });

  island.add(cathedral);

  for (const [x, z, scale] of [
    [-3.1, 0.2, 0.7],
    [2.8, -1.5, 0.58],
    [2.75, 1.7, 0.7],
  ] as const) {
    const tree = createTree(scale);
    tree.position.set(x, 0.42, z);
    island.add(tree);
  }

  tagInteractive(island, "milano");
  return island;
}

function createPalmTree(scale = 1) {
  const palm = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x9f6948,
    flatShading: true,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x2faf7f,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.16 * scale, 1.8 * scale, 7),
    trunkMaterial,
  );
  trunk.position.y = 0.9 * scale;
  trunk.rotation.z = -0.12;
  trunk.castShadow = true;
  palm.add(trunk);

  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.22 * scale, 1.35 * scale, 5),
      leafMaterial,
    );
    leaf.scale.x = 0.38;
    leaf.position.set(
      Math.cos((i / 7) * Math.PI * 2) * 0.48 * scale,
      1.88 * scale,
      Math.sin((i / 7) * Math.PI * 2) * 0.48 * scale,
    );
    leaf.rotation.z = Math.PI / 2.5;
    leaf.rotation.y = -(i / 7) * Math.PI * 2;
    palm.add(leaf);
  }
  return palm;
}

function createMaldivesIsland() {
  const island = createIslandBase(4.65, 0xf1cc83, 0x536b72);
  island.position.set(8.7, 0, 2.2);

  const water = new THREE.Mesh(
    new THREE.RingGeometry(3.25, 5.25, 64),
    new THREE.MeshStandardMaterial({
      color: 0x35d8d1,
      transparent: true,
      opacity: 0.65,
      roughness: 0.28,
      metalness: 0.12,
      side: THREE.DoubleSide,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.45;
  water.userData.isWater = true;
  island.add(water);

  const lagoon = new THREE.Mesh(
    new THREE.CircleGeometry(3.28, 48),
    new THREE.MeshStandardMaterial({
      color: 0x36cfc5,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2,
    }),
  );
  lagoon.rotation.x = -Math.PI / 2;
  lagoon.position.y = 0.43;
  lagoon.userData.isWater = true;
  island.add(lagoon);

  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(2.75, 11),
    new THREE.MeshStandardMaterial({
      color: 0xffdd98,
      flatShading: true,
      roughness: 0.9,
    }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0.2, 0.5, 0.1);
  sand.scale.set(1.15, 0.78, 1);
  sand.receiveShadow = true;
  island.add(sand);

  for (const [x, z, scale, rotation] of [
    [-1.55, 0.65, 1, 0.15],
    [1.35, -0.75, 0.86, -0.35],
    [1.65, 0.95, 0.7, 0.42],
  ] as const) {
    const palm = createPalmTree(scale);
    palm.position.set(x, 0.5, z);
    palm.rotation.y = rotation;
    island.add(palm);
  }

  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xef7a66, flatShading: true }),
  );
  hut.position.set(-0.2, 0.92, -0.8);
  hut.castShadow = true;
  island.add(hut);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 0.6, 4),
    new THREE.MeshStandardMaterial({ color: 0x74524c, flatShading: true }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-0.2, 1.6, -0.8);
  island.add(roof);

  const arcade = new THREE.Group();
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.05, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x59479b, flatShading: true }),
  );
  cabinet.position.y = 0.52;
  cabinet.castShadow = true;
  arcade.add(cabinet);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.28),
    new THREE.MeshStandardMaterial({
      color: 0x68f7da,
      emissive: 0x1a8f85,
      emissiveIntensity: 1.2,
    }),
  );
  screen.position.set(0, 0.7, 0.245);
  arcade.add(screen);
  arcade.position.set(0.75, 0.5, 0.75);
  arcade.rotation.y = -0.45;
  island.add(arcade);

  tagInteractive(island, "maldives");
  return island;
}

function createCentralCore() {
  const core = new THREE.Group();
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.035, 8, 72),
    new THREE.MeshBasicMaterial({
      color: 0x8de8ff,
      transparent: true,
      opacity: 0.42,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  core.add(halo);

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 2),
    new THREE.MeshStandardMaterial({
      color: 0xc9f4ff,
      emissive: 0x4ba4c6,
      emissiveIntensity: 1.8,
      roughness: 0.25,
      metalness: 0.15,
    }),
  );
  orb.userData.isCore = true;
  core.add(orb);

  const light = new THREE.PointLight(0x71dfff, 15, 12, 2);
  core.add(light);
  core.position.set(0, 2.2, 2.5);
  return core;
}

function createConnection(
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: number,
) {
  const middle = from.clone().lerp(to, 0.5);
  middle.y += 2.1;
  const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
  const geometry = new THREE.TubeGeometry(curve, 40, 0.025, 5, false);
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.38,
    }),
  );
}

export default function PortfolioWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectIslandRef = useRef<(id: IslandId | null) => void>(() => {});
  const [selectedId, setSelectedId] = useState<IslandId | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const selected = ISLANDS.find((item) => item.id === selectedId) ?? null;

  const selectIsland = useCallback((id: IslandId | null) => {
    selectIslandRef.current(id);
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
    scene.fog = new THREE.FogExp2(0x071426, 0.018);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      120,
    );
    camera.position.copy(OVERVIEW_CAMERA);

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 39;
    controls.minPolarAngle = Math.PI * 0.19;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.target.copy(OVERVIEW_TARGET);

    const hemisphere = new THREE.HemisphereLight(0x99cfff, 0x211a35, 2.7);
    scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffe1bf, 4.2);
    sun.position.set(-12, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    scene.add(sun);

    const racing = createRacingIsland();
    const milano = createMilanoIsland();
    const maldives = createMaldivesIsland();
    const core = createCentralCore();
    scene.add(racing.island, milano, maldives, core);

    scene.add(
      createConnection(
        new THREE.Vector3(-7.1, 0.9, 1.7),
        new THREE.Vector3(-0.8, 2.2, 2.5),
        0xff6655,
      ),
      createConnection(
        new THREE.Vector3(0, 0.9, -2.5),
        new THREE.Vector3(0, 2.2, 1.8),
        0xba9cff,
      ),
      createConnection(
        new THREE.Vector3(7.2, 0.9, 2.2),
        new THREE.Vector3(0.8, 2.2, 2.5),
        0x39dfc3,
      ),
    );

    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 450; i += 1) {
      const radius = 28 + Math.random() * 42;
      const angle = Math.random() * Math.PI * 2;
      starPositions.push(
        Math.cos(angle) * radius,
        -8 + Math.random() * 45,
        Math.sin(angle) * radius,
      );
    }
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xd7edff,
        size: 0.08,
        transparent: true,
        opacity: 0.72,
      }),
    );
    scene.add(stars);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickableRoots = [racing.island, milano, maldives];
    let hovered: IslandId | null = null;
    let pointerDown = { x: 0, y: 0 };
    let cameraGoal = OVERVIEW_CAMERA.clone();
    let targetGoal = OVERVIEW_TARGET.clone();
    let selectedSceneId: IslandId | null = null;

    selectIslandRef.current = (id) => {
      selectedSceneId = id;
      const content = ISLANDS.find((item) => item.id === id);
      if (content) {
        cameraGoal.set(...content.camera);
        targetGoal.set(...content.target);
        controls.enabled = false;
      } else {
        cameraGoal.copy(OVERVIEW_CAMERA);
        targetGoal.copy(OVERVIEW_TARGET);
        controls.enabled = false;
      }
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findIsland = () => {
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(clickableRoots, true);
      return (intersections[0]?.object.userData.islandId ?? null) as
        | IslandId
        | null;
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      hovered = findIsland();
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
      const islandId = findIsland();
      if (islandId) {
        selectIsland(islandId);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, width < 700 ? 1.35 : 1.75),
      );
    };
    window.addEventListener("resize", handleResize);

    const timer = new THREE.Timer();
    let animationFrame = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();

      racing.cars.forEach((car) => {
        const t =
          (elapsed * (reduceMotion ? 0.006 : car.userData.speed) +
            car.userData.offset) %
          1;
        const point = racing.curve.getPointAt(t);
        const tangent = racing.curve.getTangentAt(t);
        car.position.copy(point);
        car.position.y += 0.12;
        car.rotation.y = Math.atan2(tangent.x, tangent.z);
      });

      [racing.island, milano, maldives].forEach((island, index) => {
        const baseY =
          island === racing.island ? 0 : island === milano ? 0 : 0;
        island.position.y =
          baseY + Math.sin(elapsed * 0.5 + index * 1.8) * 0.12;
        const id = island.children[0]?.userData.islandId as IslandId;
        const scale = hovered === id ? 1.025 : 1;
        island.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
      });

      core.rotation.y = elapsed * 0.18;
      const coreOrb = core.children.find((child) => child.userData.isCore);
      if (coreOrb) {
        coreOrb.rotation.x = elapsed * 0.24;
        coreOrb.rotation.z = elapsed * 0.18;
      }

      maldives.traverse((child) => {
        if (child.userData.isWater) {
          child.rotation.z = Math.sin(elapsed * 0.28) * 0.025;
        }
      });

      stars.rotation.y = elapsed * 0.003;

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

      if (!selectedSceneId && controls.enabled) {
        cameraGoal.copy(camera.position);
        targetGoal.copy(controls.target);
      }

      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    const loadedTimer = window.setTimeout(() => setLoaded(true), 520);

    return () => {
      window.clearTimeout(loadedTimer);
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectIsland]);

  return (
    <main className="world-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div ref={mountRef} className="world-canvas" aria-hidden="true" />

      <header className="identity">
        <button
          className="identity-mark"
          onClick={() => selectIsland(null)}
          aria-label="Torna alla vista completa"
        >
          RR
        </button>
        <div>
          <p>Roberto Ringoli</p>
          <span>Digital world · v0.1</span>
        </div>
      </header>

      <section
        className={`intro ${selected ? "intro--hidden" : ""}`}
        aria-hidden={Boolean(selected)}
      >
        <p className="intro-kicker">Il mio mondo, in tre coordinate</p>
        <h1>
          Idee da guidare.
          <br />
          Luoghi da <em>esplorare.</em>
        </h1>
        <p className="intro-copy">
          Ogni isola è una passione diventata progetto. Trascina il mondo,
          scegli una destinazione e guarda cosa c’è dentro.
        </p>
      </section>

      <aside
        className={`island-panel ${selected ? "island-panel--open" : ""}`}
        style={
          selected
            ? ({ "--panel-accent": selected.accent } as React.CSSProperties)
            : undefined
        }
        aria-live="polite"
      >
        {selected && (
          <>
            <button
              className="panel-close"
              onClick={() => selectIsland(null)}
              aria-label="Chiudi il progetto"
            >
              <span />
              <span />
            </button>
            <div className="panel-index">{selected.number}</div>
            <p className="panel-eyebrow">{selected.eyebrow}</p>
            <h2>{selected.title}</h2>
            <p className="panel-lead">{selected.description}</p>
            <div className="panel-rule" />
            <p className="panel-detail">{selected.detail}</p>
            <button className="panel-action" type="button">
              Esplora il progetto
              <span aria-hidden="true">↗</span>
            </button>
          </>
        )}
      </aside>

      <nav className="atlas" aria-label="Destinazioni del portfolio">
        <span className="atlas-label">Atlante</span>
        {ISLANDS.map((island) => (
          <button
            key={island.id}
            className={selectedId === island.id ? "active" : ""}
            onClick={() => selectIsland(island.id)}
          >
            <span
              className="atlas-dot"
              style={{ backgroundColor: island.accent }}
            />
            <span className="atlas-number">{island.number}</span>
            <span>{island.shortTitle}</span>
          </button>
        ))}
      </nav>

      <div className="explore-hint" aria-hidden="true">
        <span className="mouse">
          <i />
        </span>
        Trascina per esplorare
      </div>

      <div className={`loader ${loaded ? "loader--done" : ""}`}>
        <div className="loader-orbit">
          <span />
        </div>
        <p>Sto costruendo il mondo</p>
      </div>

      {webglError && (
        <div className="webgl-fallback">
          <p>Il tuo browser non supporta la scena 3D.</p>
          <p>Puoi comunque scegliere una destinazione dall’Atlante.</p>
        </div>
      )}
    </main>
  );
}
