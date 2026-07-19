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
          "Questa è l’isola centrale del mio arcipelago digitale e il punto di accesso a tutto ciò che mi riguarda.",
        detail:
          "Qui troverai il mio profilo, le esperienze, i progetti e tutto ciò che mi riguarda. La struttura è pronta per i contenuti che aggiungeremo insieme.",
        action: "Contenuti in arrivo",
      },
      en: {
        eyebrow: "Central hub · Lanciano",
        title: "Roberto Ringoli",
        description:
          "This is the central island of my digital archipelago and the gateway to everything about me.",
        detail:
          "This space will contain my profile, experience, projects, and everything about me. The structure is ready for the content we will add together.",
        action: "Content coming soon",
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
    profileStatus: "Profilo in preparazione",
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
    profileStatus: "Profile in progress",
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
    scene.fog = new THREE.FogExp2(0x070912, 0.00175);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      600,
    );
    camera.position.copy(OVERVIEW_CAMERA);

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
    controls.maxDistance = 280;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.target.copy(OVERVIEW_TARGET);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(430, 48, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x02040d) },
          horizonColor: { value: new THREE.Color(0x34223f) },
          lowerColor: { value: new THREE.Color(0x130d18) },
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
            color += vec3(1.0, 0.34, 0.12) * pow(sun, 95.0) * 2.4;
            color += vec3(0.22, 0.08, 0.32) * pow(sun, 8.0) * 0.52;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    );
    scene.add(sky);

    scene.add(new THREE.HemisphereLight(0xd3d8ff, 0x190f28, 2.45));
    const sun = new THREE.DirectionalLight(0xffddb0, 4.2);
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

    const rim = new THREE.DirectionalLight(0x8c6dff, 1.55);
    rim.position.set(135, 65, -120);
    scene.add(rim);

    const atmosphereTexture = createAtmosphereTexture();
    const cloudSea = new THREE.Group();
    const cloudColors = [0x667080, 0x473d5e, 0x76506c, 0x9b6c4d];
    for (let i = 0; i < 86; i += 1) {
      const cloud = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: atmosphereTexture,
          color: cloudColors[i % cloudColors.length],
          transparent: true,
          opacity: 0.1 + Math.random() * 0.16,
          depthWrite: false,
        }),
      );
      cloud.position.set(
        -145 + Math.random() * 300,
        -25 + Math.random() * 16,
        -145 + Math.random() * 275,
      );
      const width = 32 + Math.random() * 58;
      cloud.scale.set(width, width * (0.24 + Math.random() * 0.14), 1);
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
    const centralGlow = createIslandGlow(CENTRAL_POSITION, 0xff9f45, 96);
    const cazzeggioGlow = createIslandGlow(CAZZEGGIO_POSITION, 0x55d9c8, 62);

    const distantSun = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: atmosphereTexture,
        color: 0xff7544,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    distantSun.position.set(-145, 78, -260);
    distantSun.scale.set(86, 86, 1);
    scene.add(distantSun);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 620; i += 1) {
      const radius = 150 + Math.random() * 220;
      const angle = Math.random() * Math.PI * 2;
      starPositions.push(
        25 + Math.cos(angle) * radius,
        -35 + Math.random() * 230,
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
        color: 0xd8efff,
        size: 0.12,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    scene.add(stars);

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
    let cameraGoal = OVERVIEW_CAMERA.clone();
    let targetGoal = OVERVIEW_TARGET.clone();
    let cameraTransitioning = false;

    selectRef.current = (id) => {
      const node = WORLD_NODES.find((item) => item.id === id);
      if (node) {
        cameraGoal.set(...node.camera);
        targetGoal.set(...node.target);
      } else {
        cameraGoal.copy(OVERVIEW_CAMERA);
        targetGoal.copy(OVERVIEW_TARGET);
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
      const elapsed = clock.getElapsedTime();

      centralLabel.position.y = 29 + Math.sin(elapsed * 0.8) * 0.35;
      cazzeggioLabel.position.y = 26 + Math.sin(elapsed * 0.8 + 1.2) * 0.3;
      stars.rotation.y = elapsed * 0.004;
      cloudSea.position.x = Math.sin(elapsed * 0.055) * 2.4;
      cloudSea.position.z = Math.cos(elapsed * 0.04) * 1.8;
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

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
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
                <span>Esperienze</span>
                <span>Progetti</span>
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
                {copy.profileStatus}
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
