import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

type Language = "it" | "en";
type WorldNodeId = "profile" | "cazzeggio";

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
  accent: string;
  copy: Record<Language, LocalizedNode>;
  camera: [number, number, number];
  target: [number, number, number];
};

const CENTRAL_POSITION = new THREE.Vector3(-28, 0, 0);
const CAZZEGGIO_POSITION = new THREE.Vector3(45, 0, 5);
const OVERVIEW_CAMERA = new THREE.Vector3(105, 82, 145);
const OVERVIEW_TARGET = new THREE.Vector3(-2, -2, 2);
const MOBILE_OVERVIEW_CAMERA = new THREE.Vector3(165, 132, 225);
const MOBILE_OVERVIEW_TARGET = new THREE.Vector3(-2, -4, 2);

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
};

const WORLD_NODES: WorldNode[] = [
  {
    id: "profile",
    index: "00",
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
    accent: "#63ead8",
    camera: [88, 46, 65],
    target: [45, 1, 5],
    copy: {
      it: {
        eyebrow: "Prima destinazione · Casual gaming",
        title: "Cazzeggio",
        description:
          "L’isola dedicata al tempo perso bene: giochi leggeri, esperimenti e nessuna fretta di concludere qualcosa.",
        detail:
          "È la prima isola affiancata a Lanciano. In futuro altre destinazioni troveranno posto nello stesso arcipelago.",
        action: "Visita Cazzeggio",
      },
      en: {
        eyebrow: "First destination · Casual gaming",
        title: "Cazzeggio",
        description:
          "The island devoted to time well wasted: casual games, experiments, and no pressure to get anything done.",
        detail:
          "It is the first island beside Lanciano. More destinations will join the same archipelago in the future.",
        action: "Visit Cazzeggio",
      },
    },
  },
];

const UI_COPY = {
  it: {
    brand: "ROBERTO RINGOLI",
    brandMeta: "Arcipelago digitale · Hub centrale",
    overviewLabel: "Torna alla vista dell’arcipelago",
    languageSelector: "Seleziona la lingua",
    kicker: "Un portfolio fatto di luoghi",
    headlineStart: "Il mio",
    headlineAccent: "arcipelago digitale.",
    intro:
      "Lanciano è il punto centrale: clicca sull’isola per aprire il mio profilo oppure scegli Cazzeggio, subito accanto.",
    mapLabel: "Isole disponibili",
    explore: "Destinazioni",
    hint: "Trascina · zooma · scegli un’isola",
    loading: "Sto preparando le isole",
    closeCard: "Chiudi la scheda",
    errorTitle: "L’arcipelago non riesce a partire",
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
    camera.position.copy(
      startsMobile ? MOBILE_OVERVIEW_CAMERA : OVERVIEW_CAMERA,
    );
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
            island.name = id === "profile" ? "Lanciano_Central_Hub" : "Cazzeggio_Island";
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
    let cameraTransitioning = false;

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
      motes.rotation.y = elapsed * 0.003;
      cloudSea.position.x = Math.sin(elapsed * 0.055) * 2.4;
      cloudSea.position.z = Math.cos(elapsed * 0.04) * 1.8;
      sunRays.position.x = Math.sin(elapsed * 0.11) * 1.2;
      birds.position.x = Math.sin(elapsed * 0.09) * 3.2;
      birds.position.y = Math.sin(elapsed * 0.35) * 0.7;
      centralGlow.material.opacity = 0.18 + Math.sin(elapsed * 0.7) * 0.035;
      cazzeggioGlow.material.opacity =
        0.17 + Math.sin(elapsed * 0.76 + 1.4) * 0.035;
      distantSun.material.opacity = 0.66 + Math.sin(elapsed * 0.28) * 0.05;

      if (cameraTransitioning) {
        camera.position.lerp(cameraGoal, 0.055);
        controls.target.lerp(targetGoal, 0.07);
        if (
          camera.position.distanceTo(cameraGoal) < 0.2 &&
          controls.target.distanceTo(targetGoal) < 0.12
        ) {
          cameraTransitioning = false;
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectNode]);

  return (
    <main className="archipelago-shell">
      <div className="archipelago-aurora archipelago-aurora--gold" />
      <div className="archipelago-aurora archipelago-aurora--aqua" />
      <div ref={mountRef} className="archipelago-canvas" aria-hidden="true" />

      <header className="brand">
        <button
          className="brand-mark"
          onClick={() => selectNode(null)}
          aria-label={copy.overviewLabel}
        >
          R
        </button>
        <div>
          <p>{copy.brand}</p>
          <small>{copy.brandMeta}</small>
        </div>
      </header>

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

      <section
        className={`archipelago-intro ${
          selected ? "archipelago-intro--hidden" : ""
        }`}
        aria-hidden={Boolean(selected)}
      >
        <p className="archipelago-kicker">{copy.kicker}</p>
        <h1>
          {copy.headlineStart}
          <br />
          <em>{copy.headlineAccent}</em>
        </h1>
        <p>{copy.intro}</p>
      </section>

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
            <strong>{node.id === "profile" ? "Lanciano" : "Cazzeggio"}</strong>
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
