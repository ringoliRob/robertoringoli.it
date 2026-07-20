import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

type Language = "it" | "en";
type WorldNodeId = "profile" | "cazzeggio" | "coppito";

type LocalizedNode = {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  action: string;
};

type WorldNode = {
  id: WorldNodeId;
  index: string;
  shortName: string;
  accent: string;
  copy: Record<Language, LocalizedNode>;
  camera: [number, number, number];
  target: [number, number, number];
};

const CENTRAL_POSITION = new THREE.Vector3(-28, 0, 0);
const CAZZEGGIO_POSITION = new THREE.Vector3(45, 0, 5);
// Isola Università dell'Aquila (Coppito): terza destinazione, a sinistra di Lanciano.
// Posizione e scala sono da rifinire guardando la scena nel browser.
const COPPITO_POSITION = new THREE.Vector3(8, -5, 68);
const COPPITO_SCALE = 2.6;
// Entrate dei tre blocchi in coordinate LOCALI del glb (fronte sud, +z).
const COPPITO_ENTRANCES_LOCAL: [number, number, number][] = [
  [-4.5, 2.3, 3.0], // Blocco 0
  [0.0, 2.3, 2.95], // Coppito 1
  [4.5, 2.3, 3.0], // Coppito 2
];
const OVERVIEW_CAMERA = new THREE.Vector3(120, 106, 210);
const OVERVIEW_TARGET = new THREE.Vector3(6, -3, 24);
const MOBILE_OVERVIEW_CAMERA = new THREE.Vector3(188, 165, 310);
const MOBILE_OVERVIEW_TARGET = new THREE.Vector3(6, -5, 24);

const MOBILE_NODE_VIEWS: Record<
  WorldNodeId,
  { camera: [number, number, number]; target: [number, number, number] }
> = {
  profile: {
    camera: [110, 95, 175],
    target: [-28, -13, 0],
  },
  cazzeggio: {
    camera: [105, 62, 90],
    target: [45, -8, 5],
  },
  coppito: {
    camera: [30, 60, 152],
    target: [8, -13, 68],
  },
};

const WORLD_NODES: WorldNode[] = [
  {
    id: "profile",
    index: "00",
    shortName: "Lanciano",
    accent: "#f2b84b",
    camera: [45, 55, 92],
    target: [-28, 1, 0],
    copy: {
      it: {
        eyebrow: "Hub centrale · Lanciano",
        title: "Roberto Ringoli",
        description:
          "Studente di Informatica all’Università degli Studi dell’Aquila, nato a San Severo e cresciuto a Lanciano, in Abruzzo.",
        detail:
          "Sono nato il 29 gennaio 2005 e, dopo il liceo scientifico, oggi perdo tempo creando con l’AI i progetti che più mi vengono in mente. Credo che nel 2026 le competenze non siano più soltanto tecniche, ma anche creative: l’intelligenza artificiale ci permette di esprimere questo potenziale. Questo portfolio vuole mostrare ciò che so fare e tutto quello che mi viene in mente di realizzare. BUON VIAGGIO.",
        action: "Buon viaggio",
      },
      en: {
        eyebrow: "Central hub · Lanciano",
        title: "Roberto Ringoli",
        description:
          "Computer Science student at the University of L’Aquila, born in San Severo and raised in Lanciano, Abruzzo.",
        detail:
          "I was born on January 29, 2005 and, after attending a scientific high school, I now spend my time creating whatever projects come to mind with the help of AI. I believe that in 2026 skills are no longer only technical, but creative too: artificial intelligence allows us to express that potential. This portfolio is meant to show what I can do and everything I imagine building. ENJOY THE JOURNEY.",
        action: "Enjoy the journey",
      },
    },
  },
  {
    id: "cazzeggio",
    index: "01",
    shortName: "Cazzeggio",
    accent: "#63ead8",
    camera: [88, 46, 65],
    target: [45, 1, 5],
    copy: {
      it: {
        eyebrow: "Prima destinazione · Casual gaming",
        title: "Cazzeggio",
        description:
          "È la prima isola affiancata a Lanciano. In futuro altre destinazioni troveranno posto nello stesso arcipelago.",
        detail:
          "Questa isola è dedicata a Cazzeggio, il mio sito di casual gaming dedicato ai nullafacenti. Se hai voglia di perdere un po' di tempo e non sai come fare, prova a dargli un'occhiata dal link qui sotto o su cazzeggia.online",
        action: "Visita Cazzeggio",
      },
      en: {
        eyebrow: "First destination · Casual gaming",
        title: "Cazzeggio",
        description:
          "It is the first island beside Lanciano. More destinations will join the same archipelago in the future.",
        detail:
          "This island is dedicated to Cazzeggio, my casual gaming site dedicated to slackers. If you want to waste some time and don't know how, try taking a look from the link below or on cazzeggia.online",
        action: "Visit Cazzeggio",
      },
    },
  },
  {
    id: "coppito",
    index: "02",
    shortName: "Coppito",
    accent: "#e8b800",
    camera: [30, 46, 124],
    target: [8, -4, 68],
    copy: {
      it: {
        eyebrow: "Seconda destinazione · I miei studi",
        title: "Università dell’Aquila",
        description:
          "Il polo di Coppito, dove sto per laurearmi in Informatica all’Università degli Studi dell’Aquila: Blocco 0, Coppito 1 e Coppito 2 affacciati sulla stessa via.",
        detail:
          "Lungo il percorso ho superato esami come Ricerca Operativa, Ottimizzazione Combinatoria, Sistemi Operativi, Programmazione a Oggetti, Algoritmi e Algoritmi con Applicazioni (in stile LeetCode), Teoria della Calcolabilità e della Complessità, Process and Operation Scheduling, Machine Learning e Fondamenti di Intelligenza Artificiale. Appena conclusa la triennale, punto alla laurea magistrale in AICoNDA — Artificial Intelligence, Complex Networks, and Data Analytics.",
        action: "Visita il campus",
      },
      en: {
        eyebrow: "Second destination · My studies",
        title: "University of L’Aquila",
        description:
          "The Coppito campus, where I’m about to graduate in Computer Science at the University of L’Aquila: Blocco 0, Coppito 1 and Coppito 2 along the same street.",
        detail:
          "Along the way I passed exams such as Operations Research, Combinatorial Optimization, Operating Systems, Object-Oriented Programming, Algorithms and Algorithms with Applications (LeetCode style), Computability and Complexity Theory, Process and Operation Scheduling, Machine Learning and Foundations of Artificial Intelligence. Right after my bachelor’s, I aim to start the master’s degree in AICoNDA — Artificial Intelligence, Complex Networks, and Data Analytics.",
        action: "Visit the campus",
      },
    },
  },
];

const UI_COPY = {
  it: {
    brand: "ROBERTO RINGOLI",
    brandMeta: "Arcipelago digitale · Hub centrale",
    overviewLabel: "Torna alla vista dell'arcipelago",
    languageSelector: "Seleziona la lingua",
    kicker: "Un portfolio fatto di luoghi",
    headlineStart: "Il mio",
    headlineAccent: "arcipelago digitale.",
    intro:
      "Lanciano è il punto centrale: clicca sull'isola per aprire il mio profilo oppure scegli Cazzeggio, subito accanto.",
    mapLabel: "Isole disponibili",
    explore: "Destinazioni",
    hint: "Trascina · zooma · scegli un'isola",
    loading: "Sto preparando le isole",
    welcome: "Benvenuto nel mio portfolio",
    closeCard: "Chiudi la scheda",
    errorTitle: "L'arcipelago non riesce a partire",
    errorBody: "I modelli 3D non sono riusciti a caricarsi in questo browser.",
  },
  en: {
    brand: "ROBERTO RINGOLI",
    brandMeta: "Digital archipelago · Central hub",
    overviewLabel: "Return to the archipelago view",
    languageSelector: "Choose language",
    kicker: "A portfolio made of places",
    headlineStart: "My",
    headlineAccent: "digital archipelago.",
    intro:
      "Lanciano is the central hub: click the island to open my profile, or choose Cazzeggio right beside it.",
    mapLabel: "Available islands",
    explore: "Destinations",
    hint: "Drag · zoom · choose an island",
    loading: "Preparing the islands",
    welcome: "Welcome to my portfolio",
    closeCard: "Close panel",
    errorTitle: "The archipelago could not start",
    errorBody: "The 3D models could not be loaded in this browser.",
  },
} satisfies Record<Language, Record<string, string>>;

function LanguageFlag({ language }: { language: Language }) {
  if (language === "it") {
    return (
      <svg className="flag-icon" viewBox="0 0 60 40" aria-hidden="true">
        <rect width="20" height="40" fill="#009246" />
        <rect x="20" width="20" height="40" fill="#fff" />
        <rect x="40" width="20" height="40" fill="#ce2b37" />
      </svg>
    );
  }

  return (
    <svg className="flag-icon" viewBox="0 0 60 40" aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="10" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="5" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="14" />
      <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}

function createIslandLabel(text: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(4, 13, 24, .88)";
  context.beginPath();
  context.roundRect(12, 24, 744, 112, 34);
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#f7fbfc";
  context.font = "700 42px Manrope, Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 384, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sprite.scale.set(23, 4.8, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function createAtmosphereTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,.82)");
  gradient.addColorStop(0.28, "rgba(255,255,255,.42)");
  gradient.addColorStop(0.62, "rgba(255,255,255,.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSunRayTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const horizontal = context.createLinearGradient(0, 0, 128, 0);
  horizontal.addColorStop(0, "rgba(255,255,255,0)");
  horizontal.addColorStop(0.5, "rgba(255,255,255,.72)");
  horizontal.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = horizontal;
  context.fillRect(0, 0, 128, 512);
  context.globalCompositeOperation = "destination-in";
  const vertical = context.createLinearGradient(0, 0, 0, 512);
  vertical.addColorStop(0, "rgba(255,255,255,0)");
  vertical.addColorStop(0.2, "rgba(255,255,255,.78)");
  vertical.addColorStop(0.72, "rgba(255,255,255,.34)");
  vertical.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = vertical;
  context.fillRect(0, 0, 128, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBirdFlock() {
  const flock = new THREE.Group();
  for (let index = 0; index < 9; index += 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.9, 0, 0),
      new THREE.Vector3(0, 0.38, 0),
      new THREE.Vector3(0.9, 0, 0),
    ]);
    const bird = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0x4d4a4b,
        transparent: true,
        opacity: 0.52,
      }),
    );
    bird.position.set(
      -72 + index * 15 + Math.sin(index * 2.1) * 7,
      44 + Math.sin(index * 1.4) * 10,
      -92 - (index % 3) * 9,
    );
    bird.scale.setScalar(0.75 + (index % 4) * 0.18);
    flock.add(bird);
  }
  return flock;
}

const CONFETTI_COLORS = [
  0xe8b800, // oro UnivAQ
  0x1b3b6f, // blu UnivAQ
  0xef476f,
  0x06d6a0,
  0xff9f1c,
  0x9b5de5,
  0xf4f1de,
];

type ConfettiField = {
  points: THREE.Points;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

// Coriandoli che sgorgano di continuo dalle entrate; posizioni e fisica in unità mondo (scalate).
function createConfetti(
  emitters: THREE.Vector3[],
  scaleFactor: number,
): ConfettiField {
  const COUNT = 320;
  const GRAVITY = 3.4 * scaleFactor;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);
  const life = new Float32Array(COUNT);
  const maxLife = new Float32Array(COUNT);
  const sway = new Float32Array(COUNT);
  const color = new THREE.Color();

  const spawn = (i: number, prime: boolean) => {
    const e = emitters[(Math.random() * emitters.length) | 0];
    const s = scaleFactor;
    positions[i * 3] = e.x + (Math.random() - 0.5) * 0.5 * s;
    positions[i * 3 + 1] = e.y + (Math.random() - 0.5) * 0.3 * s;
    positions[i * 3 + 2] = e.z + (Math.random() - 0.5) * 0.5 * s;
    vel[i * 3] = (Math.random() - 0.5) * 1.7 * s;
    vel[i * 3 + 1] = (2.6 + Math.random() * 2.2) * s;
    vel[i * 3 + 2] = ((Math.random() - 0.5) * 1.7 + 0.6) * s;
    maxLife[i] = 2.4 + Math.random() * 1.8;
    life[i] = prime ? Math.random() * maxLife[i] : maxLife[i];
    sway[i] = Math.random() * Math.PI * 2;
    color.setHex(CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  };
  for (let i = 0; i < COUNT; i += 1) spawn(i, true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.16 * scaleFactor,
    vertexColors: true,
    transparent: true,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;

  const update = (delta: number, elapsed: number) => {
    const dt = Math.min(delta, 0.04);
    for (let i = 0; i < COUNT; i += 1) {
      life[i] -= dt;
      if (life[i] <= 0) {
        spawn(i, false);
        continue;
      }
      vel[i * 3 + 1] -= GRAVITY * dt;
      const flutter = Math.sin(elapsed * 6 + sway[i]) * 0.5 * scaleFactor;
      positions[i * 3] += (vel[i * 3] + flutter) * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    posAttr.needsUpdate = true;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
}

// Navicella low-poly (muso verso -Z, così lookAt la orienta nella direzione di volo).
function createSpaceship(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({
    color: 0xdfe4ee,
    metalness: 0.5,
    roughness: 0.4,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xd23b3b,
    metalness: 0.3,
    roughness: 0.5,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2c6a92,
    emissive: 0x14405e,
    emissiveIntensity: 0.6,
    metalness: 0.2,
    roughness: 0.2,
  });
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d44,
    metalness: 0.7,
    roughness: 0.5,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x8fe0ff,
    emissive: 0x66ccff,
    emissiveIntensity: 3.2,
    roughness: 0.3,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14), hull);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 14), hull);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.65;
  g.add(nose);
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.515, 0.515, 0.28, 14),
    accent,
  );
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = -0.5;
  g.add(stripe);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
  );
  dome.scale.set(1.1, 0.7, 0.95);
  dome.position.set(0, 0.38, -0.5);
  g.add(dome);
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.09, 1.5), hull);
    wing.position.set(s * 0.95, -0.12, 0.35);
    wing.rotation.y = -s * 0.38;
    g.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.5), accent);
    tip.position.set(s * 1.55, -0.05, 0.68);
    g.add(tip);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.7), hull);
  fin.position.set(0, 0.32, 0.9);
  g.add(fin);
  for (const s of [1, -1]) {
    const eng = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.9, 10),
      engineMat,
    );
    eng.rotation.x = Math.PI / 2;
    eng.position.set(s * 0.5, -0.18, 1.15);
    g.add(eng);
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10),
      glowMat,
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(s * 0.5, -0.18, 1.6);
    g.add(glow);
  }
  return g;
}

type FleetSystem = {
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

// Flotta che scorrazza sopra le isole: quando una nave esce dai bordi riparte da un altro punto.
function createFleet(scene: THREE.Scene, count: number): FleetSystem {
  const BOUND = 155;
  const FORWARD = new THREE.Vector3(0, 0, -1); // muso della navicella
  type Ship = {
    group: THREE.Group;
    dir: THREE.Vector3;
    speed: number;
    roll: number;
  };
  const ships: Ship[] = [];

  const resetShip = (ship: Ship, prime: boolean) => {
    const a = Math.random() * Math.PI * 2;
    const start = new THREE.Vector3(
      Math.cos(a) * BOUND,
      26 + Math.random() * 36,
      Math.sin(a) * BOUND,
    );
    const a2 = a + Math.PI + (Math.random() - 0.5) * 1.1;
    const endY = 26 + Math.random() * 36;
    const dir = new THREE.Vector3(Math.cos(a2) * BOUND, endY, Math.sin(a2) * BOUND)
      .sub(start)
      .normalize();
    ship.dir = dir;
    ship.speed = 12 + Math.random() * 13;
    ship.roll = (Math.random() - 0.5) * 0.45;
    if (prime) start.addScaledVector(dir, Math.random() * BOUND * 1.7);
    ship.group.position.copy(start);
    ship.group.quaternion.setFromUnitVectors(FORWARD, dir);
    ship.group.rotateZ(ship.roll);
  };

  for (let i = 0; i < count; i += 1) {
    const group = createSpaceship();
    group.scale.setScalar(1.083);
    scene.add(group);
    const ship: Ship = {
      group,
      dir: new THREE.Vector3(),
      speed: 0,
      roll: 0,
    };
    resetShip(ship, true);
    ships.push(ship);
  }

  // --- EASTER EGG: ogni tanto una nave spara un laser; se colpisce un'altra, esplode ---
  const LASERS = 4;
  const laserGeo = new THREE.CylinderGeometry(0.35, 0.35, 1, 6);
  laserGeo.translate(0, 0.5, 0); // base all'origine, si estende lungo +Y
  const YAXIS = new THREE.Vector3(0, 1, 0);
  const lasers: { mesh: THREE.Mesh; life: number }[] = [];
  for (let i = 0; i < LASERS; i += 1) {
    const mesh = new THREE.Mesh(
      laserGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff4b3b,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    lasers.push({ mesh, life: 0 });
  }
  const fireLaser = (from: THREE.Vector3, to: THREE.Vector3) => {
    const l = lasers.find((x) => x.life <= 0) ?? lasers[0];
    const d = to.clone().sub(from);
    const len = d.length();
    if (len < 0.001) return;
    d.multiplyScalar(1 / len);
    l.mesh.position.copy(from);
    l.mesh.quaternion.setFromUnitVectors(YAXIS, d);
    l.mesh.scale.set(1, len, 1);
    l.mesh.visible = true;
    l.life = 0.16;
  };

  // particelle di esplosione (additive, colori di fuoco)
  const EX = 320;
  const exPos = new Float32Array(EX * 3);
  const exCol = new Float32Array(EX * 3);
  const exBase = new Float32Array(EX * 3);
  const exVel = new Float32Array(EX * 3);
  const exLife = new Float32Array(EX);
  const exMax = new Float32Array(EX);
  const exGeo = new THREE.BufferGeometry();
  exGeo.setAttribute("position", new THREE.BufferAttribute(exPos, 3));
  exGeo.setAttribute("color", new THREE.BufferAttribute(exCol, 3));
  const explosions = new THREE.Points(
    exGeo,
    new THREE.PointsMaterial({
      size: 2.6,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  explosions.frustumCulled = false;
  scene.add(explosions);
  const exPosAttr = exGeo.getAttribute("position") as THREE.BufferAttribute;
  const exColAttr = exGeo.getAttribute("color") as THREE.BufferAttribute;
  const FIRE = [
    [1.0, 0.85, 0.4],
    [1.0, 0.55, 0.18],
    [1.0, 0.32, 0.12],
    [1.0, 0.95, 0.7],
  ];
  let exCursor = 0;
  const explode = (c: THREE.Vector3) => {
    for (let k = 0; k < 72; k += 1) {
      const i = exCursor;
      exCursor = (exCursor + 1) % EX;
      exPos[i * 3] = c.x;
      exPos[i * 3 + 1] = c.y;
      exPos[i * 3 + 2] = c.z;
      const sp = 9 + Math.random() * 28;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      exVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
      exVel[i * 3 + 1] = Math.cos(ph) * sp;
      exVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      exMax[i] = exLife[i] = 0.5 + Math.random() * 0.55;
      const col = FIRE[(Math.random() * FIRE.length) | 0];
      exBase[i * 3] = col[0];
      exBase[i * 3 + 1] = col[1];
      exBase[i * 3 + 2] = col[2];
    }
  };

  let fireCooldown = 30 + Math.random() * 8; // primo colpo dopo un po'
  const rel = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  const findTarget = (shooter: Ship) => {
    let best: Ship | null = null;
    let bestAlong = Infinity;
    for (const t of ships) {
      if (t === shooter) continue;
      rel.copy(t.group.position).sub(shooter.group.position);
      const along = rel.dot(shooter.dir);
      if (along < 14 || along > 260) continue;
      const perp = Math.sqrt(Math.max(rel.lengthSq() - along * along, 0));
      if (perp < 10 && along < bestAlong) {
        best = t;
        bestAlong = along;
      }
    }
    return best;
  };

  const update = (delta: number, elapsed: number) => {
    const dt = Math.min(delta, 0.05);
    for (const ship of ships) {
      ship.group.position.addScaledVector(ship.dir, ship.speed * dt);
      ship.group.position.y += Math.sin(elapsed * 1.3 + ship.roll * 9) * 0.02;
      if (
        ship.group.position.length() > BOUND * 1.02 &&
        ship.dir.dot(ship.group.position) > 0
      ) {
        resetShip(ship, false);
      }
    }

    fireCooldown -= dt;
    if (fireCooldown <= 0) {
      fireCooldown = 30 + Math.random() * 8;
      const order = ships.slice().sort(() => Math.random() - 0.5);
      for (const shooter of order) {
        const target = findTarget(shooter);
        if (target) {
          muzzle
            .copy(FORWARD)
            .applyQuaternion(shooter.group.quaternion)
            .multiplyScalar(3.2 * shooter.group.scale.x)
            .add(shooter.group.position);
          fireLaser(muzzle.clone(), target.group.position.clone());
          explode(target.group.position.clone());
          resetShip(target, false); // colpita: esplode e riparte da un altro punto
          break;
        }
      }
    }

    for (const l of lasers) {
      if (l.life > 0) {
        l.life -= dt;
        (l.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          l.life / 0.16,
          0,
        );
        if (l.life <= 0) l.mesh.visible = false;
      }
    }

    for (let i = 0; i < EX; i += 1) {
      if (exLife[i] <= 0) {
        exCol[i * 3] = exCol[i * 3 + 1] = exCol[i * 3 + 2] = 0;
        exPos[i * 3] = 0;
        exPos[i * 3 + 1] = -9999;
        exPos[i * 3 + 2] = 0;
        continue;
      }
      exLife[i] -= dt;
      exPos[i * 3] += exVel[i * 3] * dt;
      exPos[i * 3 + 1] += exVel[i * 3 + 1] * dt;
      exPos[i * 3 + 2] += exVel[i * 3 + 2] * dt;
      const f = Math.max(exLife[i], 0) / exMax[i];
      exCol[i * 3] = exBase[i * 3] * f;
      exCol[i * 3 + 1] = exBase[i * 3 + 1] * f;
      exCol[i * 3 + 2] = exBase[i * 3 + 2] * f;
    }
    exPosAttr.needsUpdate = true;
    exColAttr.needsUpdate = true;
  };

  const dispose = () => {
    ships.forEach((s) => scene.remove(s.group));
    lasers.forEach((l) => {
      scene.remove(l.mesh);
      (l.mesh.material as THREE.Material).dispose();
    });
    laserGeo.dispose();
    scene.remove(explosions);
    exGeo.dispose();
    (explosions.material as THREE.Material).dispose();
  };

  return { update, dispose };
}

function prepareIsland(
  source: THREE.Object3D,
  id: WorldNodeId,
  position: THREE.Vector3,
  scale: number,
  interactiveMeshes: THREE.Object3D[],
) {
  source.position.copy(position);
  source.scale.setScalar(scale);
  source.userData.worldNodeId = id;
  source.traverse((object) => {
    object.userData.worldNodeId = id;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      interactiveMeshes.push(object);
    }
  });
  return source;
}

export default function PortfolioWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<(id: WorldNodeId | null) => void>(() => {});
  const [selectedId, setSelectedId] = useState<WorldNodeId | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "it";
    const saved = window.localStorage.getItem("portfolio-language");
    if (saved === "it" || saved === "en") return saved;
    return window.navigator.language.toLowerCase().startsWith("it") ? "it" : "en";
  });

  const copy = UI_COPY[language];
  const selected =
    WORLD_NODES.find((node) => node.id === selectedId) ?? null;
  const selectedContent = selected?.copy[language] ?? null;

  const selectNode = useCallback((id: WorldNodeId | null) => {
    selectRef.current(id);
    setSelectedId(id);
  }, []);

  // Dissolve il velo di nuvole dell'intro mentre la camera scende tra le isole.
  useEffect(() => {
    const timer = window.setTimeout(() => setIntroDone(true), 5200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "it"
        ? "Roberto Ringoli — Arcipelago digitale"
        : "Roberto Ringoli — Digital archipelago";
    window.localStorage.setItem("portfolio-language", language);
  }, [language]);

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
    scene.fog = new THREE.FogExp2(0xc6a58f, 0.00155);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1200,
    );
    const startsMobile = mount.clientWidth <= 680;
    camera.fov = startsMobile ? 50 : 42;
    // La camera parte immersa nelle nuvole, più in alto, e scende tra le isole.
    const introStart = (startsMobile ? MOBILE_OVERVIEW_CAMERA : OVERVIEW_CAMERA)
      .clone()
      .add(new THREE.Vector3(0, startsMobile ? 270 : 205, 55));
    camera.position.copy(introStart);
    camera.updateProjectionMatrix();

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 48;
    controls.maxDistance = startsMobile ? 380 : 280;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.target.copy(
      startsMobile ? MOBILE_OVERVIEW_TARGET : OVERVIEW_TARGET,
    );

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(430, 48, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x7899b4) },
          horizonColor: { value: new THREE.Color(0xefb28d) },
          lowerColor: { value: new THREE.Color(0x69777e) },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPosition;
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 lowerColor;
          void main() {
            vec3 direction = normalize(vWorldPosition);
            float heightMix = direction.y * 0.5 + 0.5;
            vec3 color = mix(lowerColor, horizonColor, smoothstep(0.08, 0.48, heightMix));
            color = mix(color, topColor, smoothstep(0.48, 0.94, heightMix));
            float sun = max(dot(direction, normalize(vec3(-0.42, 0.2, -0.88))), 0.0);
            color += vec3(1.0, 0.48, 0.24) * pow(sun, 95.0) * 1.65;
            color += vec3(0.5, 0.2, 0.12) * pow(sun, 8.0) * 0.3;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    );
    scene.add(sky);

    scene.add(new THREE.HemisphereLight(0xe4eff8, 0x5f493d, 2.65));
    const sun = new THREE.DirectionalLight(0xffd1a1, 4.75);
    sun.position.set(-70, 130, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 360;
    sun.shadow.camera.left = -145;
    sun.shadow.camera.right = 145;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0xa7cee1, 1.15);
    rim.position.set(135, 65, -120);
    scene.add(rim);

    const atmosphereTexture = createAtmosphereTexture();
    const cloudSea = new THREE.Group();
    const cloudColors = [0xe9ddd2, 0xc8d2d8, 0xe4b99e, 0xadbcc6];
    for (let i = 0; i < 156; i += 1) {
      const layer = i % 3;
      const cloud = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: atmosphereTexture,
          color: cloudColors[i % cloudColors.length],
          transparent: true,
          opacity: 0.17 + Math.random() * 0.22,
          depthWrite: false,
        }),
      );
      cloud.position.set(
        -175 + Math.random() * 350,
        -31 + layer * 6.5 + Math.random() * 8,
        -175 + Math.random() * 330,
      );
      const width = 42 + Math.random() * 76;
      cloud.scale.set(width, width * (0.25 + Math.random() * 0.16), 1);
      cloudSea.add(cloud);
    }
    scene.add(cloudSea);

    const createIslandGlow = (
      position: THREE.Vector3,
      color: number,
      width: number,
    ) => {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: atmosphereTexture,
          color,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      glow.position.set(position.x, -14, position.z - 4);
      glow.scale.set(width, width * 0.52, 1);
      scene.add(glow);
      return glow;
    };
    const centralGlow = createIslandGlow(CENTRAL_POSITION, 0xffc079, 96);
    const cazzeggioGlow = createIslandGlow(CAZZEGGIO_POSITION, 0x9edbd2, 62);
    const coppitoGlow = createIslandGlow(COPPITO_POSITION, 0xffd34d, 78);

    const distantSun = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: atmosphereTexture,
        color: 0xffb16f,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    distantSun.position.set(-145, 78, -260);
    distantSun.scale.set(86, 86, 1);
    scene.add(distantSun);

    const rayTexture = createSunRayTexture();
    const sunRays = new THREE.Group();
    for (let index = 0; index < 4; index += 1) {
      const ray = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: rayTexture,
          color: 0xffd2a5,
          transparent: true,
          opacity: 0.075 - index * 0.008,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          rotation: -0.2 + index * 0.055,
        }),
      );
      ray.position.set(-92 + index * 27, 36, -88 - index * 8);
      ray.scale.set(24 + index * 5, 165, 1);
      sunRays.add(ray);
    }
    scene.add(sunRays);

    const birds = createBirdFlock();
    scene.add(birds);

    const fleet = createFleet(scene, 8);

    const motesGeometry = new THREE.BufferGeometry();
    const motePositions: number[] = [];
    for (let i = 0; i < 260; i += 1) {
      const radius = 90 + Math.random() * 190;
      const angle = Math.random() * Math.PI * 2;
      motePositions.push(
        Math.cos(angle) * radius,
        -8 + Math.random() * 145,
        Math.sin(angle) * radius,
      );
    }
    motesGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(motePositions, 3),
    );
    const motes = new THREE.Points(
      motesGeometry,
      new THREE.PointsMaterial({
        color: 0xffead0,
        size: 0.17,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    scene.add(motes);

    const centralLabel = createIslandLabel("HUB · LANCIANO", "#f2b84b");
    centralLabel.position.set(CENTRAL_POSITION.x, 29, CENTRAL_POSITION.z);
    scene.add(centralLabel);

    const cazzeggioLabel = createIslandLabel("CAZZEGGIO", "#63ead8");
    cazzeggioLabel.position.set(
      CAZZEGGIO_POSITION.x,
      26,
      CAZZEGGIO_POSITION.z,
    );
    cazzeggioLabel.scale.multiplyScalar(0.82);
    scene.add(cazzeggioLabel);

    const coppitoLabel = createIslandLabel("COPPITO · UNIVAQ", "#e8b800");
    coppitoLabel.position.set(COPPITO_POSITION.x, 21, COPPITO_POSITION.z);
    coppitoLabel.scale.multiplyScalar(0.9);
    scene.add(coppitoLabel);

    // Coriandoli dalle entrate dei tre blocchi (posizioni in coordinate mondo).
    const coppitoEmitters = COPPITO_ENTRANCES_LOCAL.map((e) =>
      new THREE.Vector3(
        COPPITO_POSITION.x + e[0] * COPPITO_SCALE,
        COPPITO_POSITION.y + e[1] * COPPITO_SCALE,
        COPPITO_POSITION.z + e[2] * COPPITO_SCALE,
      ),
    );
    const confetti = createConfetti(coppitoEmitters, COPPITO_SCALE);
    scene.add(confetti.points);

    const interactiveMeshes: THREE.Object3D[] = [];
    const loadedIslands: THREE.Object3D[] = [];
    const animationMixers: THREE.AnimationMixer[] = [];
    let disposed = false;
    const loader = new GLTFLoader();

    const loadIsland = (
      url: string,
      id: WorldNodeId,
      position: THREE.Vector3,
      scale: number,
    ) =>
      new Promise<void>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            if (disposed) return;
            const island = prepareIsland(
              gltf.scene,
              id,
              position,
              scale,
              interactiveMeshes,
            );
            island.name =
              id === "profile"
                ? "Lanciano_Central_Hub"
                : id === "coppito"
                  ? "Coppito_University"
                  : "Cazzeggio_Island";
            scene.add(island);
            loadedIslands.push(island);
            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(island);
              gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
              });
              animationMixers.push(mixer);
            }
            resolve();
          },
          undefined,
          reject,
        );
      });

    Promise.all([
      loadIsland(
        "/models/lanciano-central-island.glb",
        "profile",
        CENTRAL_POSITION,
        0.55,
      ),
      loadIsland(
        "/models/maldives-leisure-island.glb",
        "cazzeggio",
        CAZZEGGIO_POSITION,
        0.52,
      ),
      loadIsland(
        "/models/coppito-island.glb",
        "coppito",
        COPPITO_POSITION,
        COPPITO_SCALE,
      ),
    ])
      .then(() => {
        if (!disposed) setLoaded(true);
      })
      .catch(() => {
        if (!disposed) {
          setWebglError(true);
          setLoaded(true);
        }
      });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };
    let cameraGoal = (
      startsMobile ? MOBILE_OVERVIEW_CAMERA : OVERVIEW_CAMERA
    ).clone();
    let targetGoal = (
      startsMobile ? MOBILE_OVERVIEW_TARGET : OVERVIEW_TARGET
    ).clone();
    let cameraTransitioning = true; // volo introduttivo: dalle nuvole alle isole
    let introFlight = true; // il primo volo è lento e cinematografico
    controls.enabled = false;

    selectRef.current = (id) => {
      const node = WORLD_NODES.find((item) => item.id === id);
      const mobile = mount.clientWidth <= 680;
      if (node) {
        const view = mobile ? MOBILE_NODE_VIEWS[node.id] : node;
        cameraGoal.set(...view.camera);
        targetGoal.set(...view.target);
      } else {
        cameraGoal.copy(mobile ? MOBILE_OVERVIEW_CAMERA : OVERVIEW_CAMERA);
        targetGoal.copy(mobile ? MOBILE_OVERVIEW_TARGET : OVERVIEW_TARGET);
      }
      introFlight = false;
      cameraTransitioning = true;
      controls.enabled = false;
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findNode = () => {
      if (!interactiveMeshes.length) return null;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(interactiveMeshes, false);
      return (intersections[0]?.object.userData.worldNodeId ?? null) as
        | WorldNodeId
        | null;
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      renderer.domElement.style.cursor = findNode() ? "pointer" : "grab";
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (
        Math.hypot(
          event.clientX - pointerDown.x,
          event.clientY - pointerDown.y,
        ) > 7
      ) {
        return;
      }
      updatePointer(event);
      const id = findNode();
      if (id) selectNode(id);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.fov = width <= 680 ? 50 : 42;
      controls.maxDistance = width <= 680 ? 380 : 280;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, width < 700 ? 1.2 : 1.6),
      );
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;

      animationMixers.forEach((mixer) => mixer.update(delta));
      centralLabel.position.y = 29 + Math.sin(elapsed * 0.8) * 0.35;
      cazzeggioLabel.position.y = 26 + Math.sin(elapsed * 0.8 + 1.2) * 0.3;
      coppitoLabel.position.y = 21 + Math.sin(elapsed * 0.8 + 2.1) * 0.32;
      confetti.update(delta, elapsed);
      motes.rotation.y = elapsed * 0.003;
      cloudSea.position.x = Math.sin(elapsed * 0.055) * 2.4;
      cloudSea.position.z = Math.cos(elapsed * 0.04) * 1.8;
      sunRays.position.x = Math.sin(elapsed * 0.11) * 1.2;
      birds.position.x = Math.sin(elapsed * 0.09) * 3.2;
      birds.position.y = Math.sin(elapsed * 0.35) * 0.7;
      fleet.update(delta, elapsed);
      centralGlow.material.opacity = 0.18 + Math.sin(elapsed * 0.7) * 0.035;
      cazzeggioGlow.material.opacity =
        0.17 + Math.sin(elapsed * 0.76 + 1.4) * 0.035;
      coppitoGlow.material.opacity =
        0.17 + Math.sin(elapsed * 0.72 + 2.6) * 0.035;
      distantSun.material.opacity = 0.66 + Math.sin(elapsed * 0.28) * 0.05;

      if (cameraTransitioning) {
        const posLerp = introFlight ? 0.016 : 0.055;
        const targetLerp = introFlight ? 0.02 : 0.07;
        camera.position.lerp(cameraGoal, posLerp);
        controls.target.lerp(targetGoal, targetLerp);
        if (
          camera.position.distanceTo(cameraGoal) < 0.3 &&
          controls.target.distanceTo(targetGoal) < 0.18
        ) {
          cameraTransitioning = false;
          introFlight = false;
          controls.enabled = true;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      selectRef.current = () => {};
      animationMixers.forEach((mixer) => {
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
      });

      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points ||
          object instanceof THREE.Line
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
        } else if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      loadedIslands.length = 0;
      confetti.dispose();
      fleet.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectNode]);

  return (
    <main className="archipelago-shell">
      <div className="archipelago-aurora archipelago-aurora--gold" />
      <div className="archipelago-aurora archipelago-aurora--aqua" />
      <div ref={mountRef} className="archipelago-canvas" aria-hidden="true" />

      <div
        className={`intro-veil ${introDone ? "intro-veil--done" : ""}`}
        aria-hidden={introDone}
      >
        <p className="intro-veil-text">{copy.welcome}</p>
      </div>

      <div
        className="language-switcher"
        role="group"
        aria-label={copy.languageSelector}
      >
        {(["it", "en"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={language === item ? "active" : ""}
            onClick={() => setLanguage(item)}
            aria-label={item === "it" ? "Italiano" : "English"}
            aria-pressed={language === item}
          >
            <LanguageFlag language={item} />
            <small>{item.toUpperCase()}</small>
          </button>
        ))}
      </div>

      <aside
        className={`node-card ${selected ? "node-card--open" : ""} ${
          selectedId === "cazzeggio" ? "node-card--left" : ""
        }`}
        style={
          selected
            ? ({ "--node-accent": selected.accent } as React.CSSProperties)
            : undefined
        }
        aria-live="polite"
      >
        {selected && selectedContent && (
          <>
            <button
              className="card-close"
              onClick={() => selectNode(null)}
              aria-label={copy.closeCard}
            >
              <span />
              <span />
            </button>
            <p className="card-index">{selected.index}</p>
            <p className="card-eyebrow">{selectedContent.eyebrow}</p>
            <h2>{selectedContent.title}</h2>
            <p className="card-lead">{selectedContent.description}</p>

            {selected.id === "profile" && (
              <div className="profile-slots">
                <span>Profilo</span>
                <span>Creatività</span>
                <span>AI</span>
              </div>
            )}

            <div className="card-divider" />
            <p className="card-detail">{selectedContent.detail}</p>

            {selected.id === "cazzeggio" ? (
              <a
                className="card-action"
                href="https://cazzeggia.online"
                target="_blank"
                rel="noreferrer"
              >
                {selectedContent.action}
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <div className="card-pending">
                <i />
                {selectedContent.action}
              </div>
            )}
          </>
        )}
      </aside>

      <nav className="island-map" aria-label={copy.mapLabel}>
        <p>{copy.explore}</p>
        {WORLD_NODES.map((node) => (
          <button
            key={node.id}
            className={selectedId === node.id ? "active" : ""}
            onClick={() => selectNode(node.id)}
            aria-label={node.copy[language].title}
          >
            <span style={{ "--pin-color": node.accent } as React.CSSProperties} />
            <strong>{node.shortName}</strong>
            <small>{node.index}</small>
          </button>
        ))}
      </nav>

      <div className="archipelago-hint" aria-hidden="true">
        <span>
          <i />
        </span>
        {copy.hint}
      </div>

      <div
        className={`archipelago-loader ${
          loaded ? "archipelago-loader--done" : ""
        }`}
      >
        <div className="loader-islands">
          <i />
          <i />
        </div>
        <p>{copy.loading}</p>
      </div>

      {webglError && (
        <div className="archipelago-fallback">
          <h2>{copy.errorTitle}</h2>
          <p>{copy.errorBody}</p>
        </div>
      )}
    </main>
  );
}
