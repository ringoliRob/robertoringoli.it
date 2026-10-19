import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { BULB_COLORS, ITEMS, PROMPTS, TOASTS, type Lang, type RouteId } from "../content";
import { loadPC, type PCModel } from "../scene/loadPC";
import { ScreenTexture } from "../scene/ScreenTexture";
import { buildColliders, resolveCircle, stepBody, type Body } from "./physics";
import { DSScreens, TVScreen } from "./screens";

/**
 * La stanza giocabile: si cammina in prima persona (WASD + mouse), si guardano gli oggetti col
 * mirino, E prende/interagisce, F usa l'oggetto in mano, G lo lancia. Il modello viene da
 * tools/blender-mcp/room (public/models/room.glb); il PC è lo stesso GLB del vecchio sito.
 * Unità: 1 = 10 cm, pavimento a y = 0.
 */

export type ItemId = keyof typeof ITEMS;

/** Uno slot della hotbar: tipo di oggetto e quanti (le fette di pizza si impilano). */
export type Slot = { id: ItemId; count: number } | null;

export const SLOTS = 9;

export type RoomCallbacks = {
  onPrompt: (prompt: string | null) => void;
  onInventory: (slots: Slot[], selected: number) => void;
  onIcons: (icons: Partial<Record<ItemId, string>>) => void;
  onToast: (text: string) => void;
  onDialog: () => void;
  onOpenThesis: () => void;
  onPlayDs: () => void;
  onNavigate: (route: RouteId) => void;
  onLock: (locked: boolean) => void;
  onLoaded: () => void;
  onPower: (on: boolean) => void;
};

type Target =
  | { kind: "item"; item: ItemId }
  | { kind: "door" | "switch" | "switchLed" | "safe" | "tv" | "monitor" | "pizzaBox" | "thesis" }
  | { kind: "power" };

type Item = {
  id: ItemId;
  carrier: THREE.Group;
  half: THREE.Vector3;
  body: Body | null;
};

/** Oggetti presenti nella stanza all'avvio (le fette di pizza si staccano dal cartone). */
const ITEM_NODES: Partial<Record<ItemId, string>> = {
  ds: "DS",
  key: "Key",
  lightRemote: "Light_Remote",
  tvRemote: "TV_Remote",
  drink: "Energy_Drink",
};

/** Posa in mano, nello spazio della camera (x a destra, y in alto, -z avanti). */
const HOLD: Record<ItemId, { pos: [number, number, number]; rot: [number, number, number]; scale: number }> = {
  ds: { pos: [0.15, -0.95, -2.3], rot: [0.55, 0, 0], scale: 0.8 },
  key: { pos: [0.75, -0.75, -1.9], rot: [0.2, 0.9, 0.3], scale: 1 },
  lightRemote: { pos: [0.95, -0.95, -2.2], rot: [0.45, -0.2, 0], scale: 0.7 },
  tvRemote: { pos: [0.95, -0.95, -2.2], rot: [0.4, -0.2, 0], scale: 0.7 },
  pizza: { pos: [0.8, -0.8, -2.3], rot: [0.9, 0.5, 0.15], scale: 0.5 },
  drink: { pos: [0.85, -0.95, -2.1], rot: [0.1, 0.3, -0.08], scale: 0.9 },
};

const STACK = 16;

const EYE = 16.5;
const CROUCH_EYE = 9;
const RADIUS = 2.2;
const REACH = 17;
const WALK = 15;
const RUN = 26;
const SPAWN = { pos: new THREE.Vector3(16.5, 0, 15), yaw: 0.64, pitch: -0.08 };
const PC_ANCHOR = new THREE.Vector3(-0.8, 7.95, -15.875); // layout.py PC_ANCHOR convertito in Y-up (+0.1 sul piano)

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export class RoomWorld {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
  private raycaster = new THREE.Raycaster();
  private lang: Lang = "it";
  private disposed = false;
  private frame = 0;
  private lastFrame = performance.now();
  private elapsed = 0;
  private paused = false;
  /** Input bloccato (dialogo, gioco del 3DS, transizione verso una pagina). */
  private blocked = false;
  private locked = false;
  private touch = window.matchMedia("(hover: none)").matches;
  private resizeObserver: ResizeObserver;
  timeScale = 1;

  /* giocatore */
  private pos = SPAWN.pos.clone();
  private vel = new THREE.Vector3();
  private yaw = SPAWN.yaw;
  private pitch = SPAWN.pitch;
  private keys = new Set<string>();
  private moveInput = new THREE.Vector2();
  private crouchInput = false;
  private bob = 0;
  /** Altezza degli occhi: si abbassa tenendo premuto C (niente Ctrl: Ctrl+W chiude la scheda). */
  private eye = EYE;

  /* stanza */
  private room: THREE.Object3D | null = null;
  private colliders: THREE.Box3[] = [];
  private rayMeshes: THREE.Object3D[] = [];
  /** Tutti gli oggetti raccoglibili, nella stanza o nell'inventario. */
  private items: Item[] = [];
  /** Hotbar: ogni slot è una pila (l'oggetto in mano è l'ultimo dello slot selezionato). */
  private slots: Item[][] = Array.from({ length: SLOTS }, () => []);
  private selected = 0;
  private bodies: Body[] = [];
  private pizzaSlices: THREE.Object3D[] = [];
  /** Mangiare/bere richiede un attimo, come in Minecraft. */
  private eating: { item: Item; t: number } | null = null;
  private hovered: { target: Target; root: THREE.Object3D } | null = null;
  /** Ultimo testo dell'azione inviato all'interfaccia (undefined = da ricalcolare). */
  private promptText: string | null | undefined = null;
  /** Radice evidenziata per ogni mesh bersaglio (fuori da userData: clone() lo copia via JSON). */
  private targetRoots = new WeakMap<THREE.Object3D, THREE.Object3D>();
  private highlight = new Map<THREE.Object3D, { mats: { m: THREE.MeshStandardMaterial; base: THREE.Color }[]; level: number }>();
  private shadowsDirty = true;
  /** Vero finché il telecomando non viene tolto dalla cassaforte. */
  private remoteHome = true;

  /* luci */
  /** Lampadario: spot verso il basso aperto quanto il paralume (niente cuciture della shadow map cubica). */
  private lamp: THREE.SpotLight;
  private hemi = new THREE.HemisphereLight(0x7d8bb0, 0x1c1510, 0.22);
  private lampBounce: THREE.PointLight;
  private lampOn = true;
  private lampLevel = 1;
  private bulbIndex = 0;
  private bulbColor = new THREE.Color(BULB_COLORS[0].hex);
  private bulbMat: THREE.MeshStandardMaterial | null = null;
  private ledOn = true;
  private ledLevel = 1;
  private ledLights: THREE.PointLight[] = [];
  private ledMats: THREE.MeshStandardMaterial[] = [];
  private tvLight: THREE.PointLight;
  private screenLight: THREE.PointLight;
  private rockers: Record<"switch" | "switchLed", THREE.Object3D | null> = { switch: null, switchLed: null };

  /* oggetti animati */
  private safeDoor: { object: THREE.Object3D; rest: THREE.Quaternion; t: number; open: boolean } | null = null;
  private tv: TVScreen;
  private ds = new DSScreens();
  private screen = new ScreenTexture();
  private screenMat: THREE.MeshBasicMaterial | null = null;
  private screenLevel = 0;

  /* PC */
  private pc: PCModel | null = null;
  private powered = false;
  private power = 0;
  private bootTimer = 0;
  private caseLight = new THREE.PointLight(0x7c6cff, 0, 4.5, 1.6);

  /* transizioni verso le pagine */
  private diveAnim: { from: THREE.Vector3; to: THREE.Vector3; lookFrom: THREE.Vector3; lookTo: THREE.Vector3; t: number; duration: number; done: () => void } | null = null;
  private saved: { pos: THREE.Vector3; yaw: number; pitch: number } | null = null;

  constructor(
    private mount: HTMLElement,
    private cb: RoomCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.touch ? 1.3 : 1.6));
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // le ombre si ricalcolano solo quando qualcosa si muove
    this.renderer.shadowMap.autoUpdate = false;
    mount.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.12;
    pmrem.dispose();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.add(this.camera);
    this.camera.rotation.order = "YXZ";

    const base = import.meta.env.BASE_URL;
    this.tv = new TVScreen(`${base}videos/tv.mp4`);

    /* -------------------------- luci -------------------------- */
    this.scene.add(this.hemi);
    // lampadario: luce vera con ombre, la posizione arriva dal modello
    this.lamp = new THREE.SpotLight(this.bulbColor, 900, 0, THREE.MathUtils.degToRad(68), 0.45, 2);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(this.touch ? 1024 : 2048, this.touch ? 1024 : 2048);
    this.lamp.shadow.camera.near = 0.75;
    this.lamp.shadow.camera.far = 80;
    // il paralume è sottile (6 mm): un normalBias alto lo farebbe "bucare" dalla luce
    this.lamp.shadow.bias = -0.0008;
    this.lamp.shadow.normalBias = 0.012;
    this.lampBounce = new THREE.PointLight(this.bulbColor, 40, 0, 2); // alone sul soffitto (luce riflessa)
    this.scene.add(this.lamp, this.lamp.target, this.lampBounce);
    // luna dalla finestra (parete est)
    const moon = new THREE.DirectionalLight(0x8ea6ff, 0.55);
    moon.position.set(70, 38, -12);
    moon.target.position.set(0, 0, -6);
    moon.castShadow = true;
    moon.shadow.mapSize.set(this.touch ? 1024 : 2048, this.touch ? 1024 : 2048);
    Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 10, far: 160 });
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.04;
    this.scene.add(moon, moon.target);
    for (const x of [-11, 11]) {
      const led = new THREE.PointLight(0x5a6cff, 70, 0, 2);
      led.position.set(x, 20.5, 0); // più in basso: bagliore diffuso invece di una macchia sul soffitto
      this.ledLights.push(led);
      this.scene.add(led);
    }
    this.tvLight = new THREE.PointLight(0xffffff, 0, 0, 2);
    this.tvLight.position.set(-17.5, 12, 4);
    this.screenLight = new THREE.PointLight(0x9a90ff, 0, 0, 2);
    this.screenLight.position.set(-8.7, 11.5, -13.5);
    this.scene.add(this.tvLight, this.screenLight);

    /* -------------------------- post-processing -------------------------- */
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    /* -------------------------- modelli -------------------------- */
    const draco = new DRACOLoader().setDecoderPath(`${base}draco/`);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    loader
      .loadAsync(`${base}models/room.glb`)
      .then((gltf) => {
        if (this.disposed) return;
        this.useRoom(gltf.scene);
        this.cb.onLoaded();
        return loadPC(`${base}models/pc-parts.glb`, `${base}draco/`);
      })
      .then((pc) => {
        if (pc && !this.disposed) this.usePC(pc);
      })
      .catch((error) => console.error("Stanza non caricata", error))
      .finally(() => draco.dispose());

    /* -------------------------- input -------------------------- */
    const el = this.renderer.domElement;
    el.addEventListener("click", this.onCanvasClick);
    document.addEventListener("pointerlockchange", this.onLockChange);
    document.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("wheel", this.onWheel, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(mount);
    this.resize();
    this.applyCamera();
    this.animate();
  }

  /* ============================== API pubblica ============================== */

  setLang(lang: Lang) {
    this.lang = lang;
    this.screen.lang = lang;
    this.ds.lang = lang;
    this.promptText = undefined;
  }

  isPowered() {
    return this.powered;
  }

  setPowered(on: boolean) {
    if (on === this.powered) return;
    this.powered = on;
    this.cb.onPower(on);
    window.clearTimeout(this.bootTimer);
    if (on) this.bootTimer = window.setTimeout(() => this.screen.setState("boot", this.elapsed), 450);
    else this.screen.setState("off", this.elapsed);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.tv.pause(paused);
    if (!paused) this.lastFrame = performance.now();
  }

  /** Blocca il movimento e i tasti (dialoghi, gioco del 3DS); `release` libera anche il mouse. */
  setBlocked(blocked: boolean, release = false) {
    this.blocked = blocked;
    this.keys.clear();
    this.moveInput.set(0, 0);
    if (blocked && release) this.releaseLock();
  }

  /** Cattura il mouse (va chiamata da un gesto dell'utente). */
  requestLock() {
    if (this.touch) return;
    const request = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
    request?.catch?.(() => {});
  }

  releaseLock() {
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
  }

  /** Comandi touch: joystick (-1..1) e trascinamento per guardare (pixel). */
  setMoveInput(x: number, y: number) {
    this.moveInput.set(x, y);
  }

  setCrouch(on: boolean) {
    this.crouchInput = on;
  }

  addLook(dx: number, dy: number) {
    if (this.blocked || this.diveAnim) return;
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.005, -1.45, 1.45);
  }

  /** Azioni dei tasti E / F / G (anche dai pulsanti touch). */
  action(kind: "interact" | "use" | "throw") {
    if (this.blocked || this.diveAnim || this.paused || !this.room) return;
    if (kind === "interact") this.interact();
    else if (kind === "use") this.useHeld();
    else this.throwHeld();
  }

  /** Seleziona uno slot della hotbar (anche dai tocchi sulla hotbar). */
  selectSlot(index: number) {
    this.selected = ((index % SLOTS) + SLOTS) % SLOTS;
    this.eating = null;
    this.refreshHand();
  }

  /** Il gioco del 3DS è stato completato: dalla console salta fuori la chiave. */
  rewardKey() {
    this.ds.cleared = true;
    const key = this.findItem("key");
    if (!key || key.carrier.visible) return;
    key.carrier.visible = true;
    // salta fuori dal 3DS (in mano) e cade davanti al giocatore
    const flat = this.forward().setY(0).normalize();
    const start = this.pos.clone().addScaledVector(flat, 2.6).setY(this.eye - 4);
    this.scene.attach(key.carrier);
    key.carrier.position.copy(start);
    this.launch(key, flat.multiplyScalar(5).add(new THREE.Vector3(0, 8, 0)));
    this.cb.onToast(TOASTS.keyFound[this.lang]);
  }

  /** Zoom dritto sul monitor finché lo schermo riempie la vista; si risolve a zoom finito. */
  zoomToMonitor(): Promise<void> {
    this.setBlocked(true, true);
    this.eating = null;
    if (!this.saved) this.saved = { pos: this.pos.clone(), yaw: this.yaw, pitch: this.pitch };
    const { center, view } = this.monitorView();
    const from = this.camera.position.clone();
    const lookFrom = from.clone().add(this.forward().multiplyScalar(10));
    return new Promise((resolve) => {
      this.diveAnim = { from, to: view, lookFrom, lookTo: center, t: 0, duration: 1.0, done: resolve };
    });
  }

  /** Ritorno dal monitor alla posizione di prima. */
  zoomOut() {
    const saved = this.saved;
    if (!saved) {
      this.blocked = false;
      return;
    }
    const { center, view } = this.monitorView();
    const eye = saved.pos.clone().setY(saved.pos.y + this.eye);
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(saved.pitch, saved.yaw, 0, "YXZ"));
    this.diveAnim = {
      from: view,
      to: eye,
      lookFrom: center,
      lookTo: eye.clone().addScaledVector(forward, 10),
      t: 0,
      duration: 0.8,
      done: () => {
        this.pos.copy(saved.pos);
        this.yaw = saved.yaw;
        this.pitch = saved.pitch;
        this.saved = null;
        this.blocked = false;
        this.applyCamera();
      },
    };
  }

  /** Centro dello schermo e punto davanti da cui lo schermo riempie l'inquadratura. */
  private monitorView() {
    const screen = this.room?.getObjectByName("Monitor_Screen");
    const box = screen ? new THREE.Box3().setFromObject(screen) : new THREE.Box3().setFromCenterAndSize(PC_ANCHOR, new THREE.Vector3(7, 4, 0.1));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // lo schermo guarda verso +Z: la camera si mette sulla sua normale
    const dist = Math.max(size.y / 2 / tan, size.x / 2 / (tan * this.camera.aspect)) * 0.96;
    return { center, view: center.clone().add(new THREE.Vector3(0, 0, dist)) };
  }

  dispose() {
    this.disposed = true;
    window.cancelAnimationFrame(this.frame);
    window.clearTimeout(this.bootTimer);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("click", this.onCanvasClick);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("wheel", this.onWheel);
    this.releaseLock();
    this.tv.dispose();
    this.ds.dispose();
    // gli oggetti nell'inventario non sono nella scena: rimessi dentro per liberare la memoria
    for (const item of this.items) if (!item.carrier.parent) this.scene.add(item.carrier);
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        material.dispose();
      });
    });
    this.scene.environment?.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    el.remove();
  }

  /* ============================== caricamento ============================== */

  private useRoom(room: THREE.Object3D) {
    this.room = room;
    this.scene.add(room);
    room.updateWorldMatrix(true, true);
    const node = (name: string) => room.getObjectByName(name) ?? null;

    room.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name;
      mesh.receiveShadow = !/^(LED_Strip|Ceiling_Lamp_Bulb|Window_View|Neon)/.test(name);
      mesh.castShadow = !/^(Floor|LED_Strip|Ceiling_Lamp_Bulb|Ceiling_Lamp_Cord|Ceiling_Lamp_Canopy|Window_View|Window_Glass|Neon_Tubes|Rug|Desk_Mat|TV_Screen|Monitor_Screen|DS_.*Screen|Hallway)/.test(name);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats as THREE.MeshStandardMaterial[]) {
        if (!m.isMeshStandardMaterial) continue;
        if (m.name.startsWith("RGB_Room_Strip") && !this.ledMats.includes(m)) this.ledMats.push(m);
        if (m.name === "Light_Bulb") this.bulbMat = m;
        if (m.name === "Room_Window_Glass") m.depthWrite = false;
        // il pannello del neon e il paralume del comodino abbagliano col bloom
        if (m.name === "Prop_Acrylic") m.roughness = 0.6;
        if (m.name === "Prop_Lamp_Shade") m.emissiveIntensity *= 0.3;
      }
      // la vista notturna fuori dalla finestra non deve essere toccata dalle luci
      if (name.startsWith("Window_View")) {
        const src = mesh.material as THREE.MeshStandardMaterial;
        mesh.material = new THREE.MeshBasicMaterial({ map: src.emissiveMap ?? src.map, toneMapped: false, color: 0x9aa0b0 });
      }
    });

    // schermi
    const setScreen = (name: string, material: THREE.Material) => {
      node(name)?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = material;
      });
    };
    this.screen.texture.flipY = false; // UV glTF
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.screen.texture, color: 0x000000, toneMapped: false });
    setScreen("Monitor_Screen", this.screenMat);
    setScreen("TV_Screen", this.tv.material);
    setScreen("DS_Top_Screen", this.ds.top);
    setScreen("DS_Bottom_Screen", this.ds.bottom);

    // luci davanti agli schermi
    const tvScreen = node("TV_Screen");
    if (tvScreen) this.tvLight.position.copy(new THREE.Box3().setFromObject(tvScreen).getCenter(new THREE.Vector3())).add(new THREE.Vector3(3, 0, 0));
    const monitorScreen = node("Monitor_Screen");
    if (monitorScreen) this.screenLight.position.copy(new THREE.Box3().setFromObject(monitorScreen).getCenter(new THREE.Vector3())).add(new THREE.Vector3(0, 0, 2.5));

    // luce del lampadario al centro della lampadina
    const bulb = node("Ceiling_Lamp_Bulb");
    if (bulb) {
      const c = new THREE.Box3().setFromObject(bulb).getCenter(new THREE.Vector3());
      this.lamp.position.copy(c);
      this.lamp.target.position.set(c.x, 0, c.z);
      this.lampBounce.position.copy(c).setY(c.y + 3);
    }
    const lampShade = node("Bed_Lamp_Shade");
    if (lampShade) {
      const bedLamp = new THREE.PointLight(0xffc48a, 22, 0, 2);
      bedLamp.position.copy(new THREE.Box3().setFromObject(lampShade).getCenter(new THREE.Vector3()));
      this.scene.add(bedLamp);
    }
    const neon = node("Neon_Tubes");
    if (neon) {
      const glow = new THREE.PointLight(0xff3c9a, 18, 0, 2);
      glow.position.copy(new THREE.Box3().setFromObject(neon).getCenter(new THREE.Vector3())).add(new THREE.Vector3(0, -1.5, 4.5));
      this.scene.add(glow);
    }
    this.rockers.switch = node("Light_Switch_Rocker");
    this.rockers.switchLed = node("Light_Switch_LED_Rocker");
    const safeDoor = node("Safe_Door");
    if (safeDoor) this.safeDoor = { object: safeDoor, rest: safeDoor.quaternion.clone(), t: 0, open: false };

    // oggetti da raccogliere: avvolti in un contenitore centrato sul loro baricentro
    const skip = new Set<THREE.Object3D>();
    for (const id of Object.keys(ITEM_NODES) as ItemId[]) {
      const root = node(ITEM_NODES[id]!);
      if (!root) continue;
      const item = this.addItem(id, root);
      skip.add(item.carrier);
    }
    const key = this.findItem("key");
    if (key) key.carrier.visible = false; // compare finendo il gioco del 3DS
    // fette di pizza: restano nel cartone finché non se ne prende una
    for (let k = 0; k < 8; k++) {
      const slice = node(`Pizza_Slice_${k}`);
      if (slice) this.pizzaSlices.push(slice);
    }
    void this.renderIcons();

    const fixed: [string, Target][] = [
      ["Pizza_Box", { kind: "pizzaBox" }],
      ["Thesis", { kind: "thesis" }],
      ["Door", { kind: "door" }],
      ["Light_Switch", { kind: "switch" }],
      ["Light_Switch_LED", { kind: "switchLed" }],
      ["Safe", { kind: "safe" }],
      ["TV", { kind: "tv" }],
      ["Monitor", { kind: "monitor" }],
    ];
    for (const [name, target] of fixed) {
      const root = node(name);
      if (root) this.tagTarget(root, target);
    }

    this.colliders = buildColliders(room, skip);
    this.collectRayMeshes();
    this.shadowsDirty = true;
  }

  private usePC(model: PCModel) {
    this.pc = model;
    model.group.position.copy(PC_ANCHOR);
    this.scene.add(model.group);
    model.group.add(this.caseLight);
    this.caseLight.position.set(0.2, 2.9, -0.4);
    // dei componenti resta interattivo solo il tasto di accensione: il resto si vede dal monitor
    for (const mesh of model.pickables) {
      if (mesh.userData.pick !== "power") continue;
      mesh.userData.target = { kind: "power" } satisfies Target;
      this.targetRoots.set(mesh, mesh);
    }
    // il PC montato è un ostacolo per giocatore e oggetti
    model.group.updateWorldMatrix(true, true);
    this.colliders.push(new THREE.Box3().setFromObject(model.group));
    this.collectRayMeshes();
    this.shadowsDirty = true;
  }

  private addItem(id: ItemId, root: THREE.Object3D) {
    const item = this.wrapItem(id, root);
    this.items.push(item);
    this.tagTarget(item.carrier, { kind: "item", item: id });
    return item;
  }

  private findItem(id: ItemId) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  /**
   * Icone della hotbar: ogni oggetto renderizzato di tre quarti su sfondo trasparente.
   * Un renderer piccolo e temporaneo, così la scena principale non viene toccata.
   */
  private async renderIcons() {
    const size = 128;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // niente environment: la PMREM della scena vive solo nel contesto WebGL principale
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    const icons: Partial<Record<ItemId, string>> = {};
    const sources: [ItemId, THREE.Object3D | undefined][] = [
      ...(["ds", "key", "lightRemote", "tvRemote", "drink"] as ItemId[]).map((id) => [id, this.findItem(id)?.carrier] as [ItemId, THREE.Object3D | undefined]),
      ["pizza", this.pizzaSlices[0]],
    ];
    for (const [id, source] of sources) {
      if (!source) continue;
      const clone = source.clone(true);
      clone.position.set(0, 0, 0);
      clone.quaternion.identity();
      clone.scale.setScalar(1);
      clone.visible = true;
      clone.traverse((o) => (o.visible = true));
      const pivot = new THREE.Group();
      pivot.add(clone);
      // centra l'oggetto nell'origine
      pivot.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(pivot);
      clone.position.sub(box.getCenter(new THREE.Vector3()));
      pivot.rotation.set(id === "pizza" ? 0.2 : 0, id === "drink" ? 0.4 : -0.6, 0);
      scene.add(pivot);
      pivot.updateWorldMatrix(true, true);
      // inquadra il lato più lungo: gli oggetti allungati riempiono lo slot come gli altri
      const size = new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3());
      const dist = (Math.max(size.x, size.y, size.z) / 2 / Math.tan(THREE.MathUtils.degToRad(14))) * 1.12 + Math.min(size.x, size.y, size.z) / 2;
      camera.position.set(0, 0.75, 1).normalize().multiplyScalar(dist);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      icons[id] = renderer.domElement.toDataURL("image/png");
      scene.remove(pivot);
      await new Promise((r) => setTimeout(r, 0));
    }
    renderer.dispose();
    renderer.forceContextLoss();
    if (!this.disposed) this.cb.onIcons(icons);
  }

  private wrapItem(id: ItemId, root: THREE.Object3D): Item {
    const worldPos = root.getWorldPosition(new THREE.Vector3());
    const worldQuat = root.getWorldQuaternion(new THREE.Quaternion());
    root.removeFromParent();
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    // la chiave vera (7 cm) sul pavimento non si vede: nel gioco è un po' più grande
    if (id === "key") root.scale.setScalar(2);
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const carrier = new THREE.Group();
    carrier.name = `Item_${id}`;
    carrier.position.copy(worldPos).add(center.clone().applyQuaternion(worldQuat));
    carrier.quaternion.copy(worldQuat);
    root.position.copy(center).multiplyScalar(-1);
    carrier.add(root);
    this.scene.add(carrier);
    return { id, carrier, half, body: null };
  }

  /** Segna tutte le mesh di una radice come bersaglio del mirino e clona i loro materiali. */
  private tagTarget(root: THREE.Object3D, target: Target) {
    const mats: { m: THREE.MeshStandardMaterial; base: THREE.Color }[] = [];
    const clones = new Map<THREE.Material, THREE.Material>();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.userData.target = target;
      this.targetRoots.set(mesh, root);
      const swap = (src: THREE.Material) => {
        const std = src as THREE.MeshStandardMaterial;
        if (!std.isMeshStandardMaterial || std.name.startsWith("RGB_") || std.emissiveIntensity * std.emissive.getHex() > 0) return src;
        let clone = clones.get(src) as THREE.MeshStandardMaterial | undefined;
        if (!clone) {
          clone = std.clone();
          clones.set(src, clone);
          mats.push({ m: clone, base: clone.emissive.clone() });
        }
        return clone;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
    this.highlight.set(root, { mats, level: 0 });
  }

  /** Mesh fisse per il mirino; gli oggetti raccoglibili si aggiungono a ogni raggio (si spostano). */
  private collectRayMeshes() {
    this.rayMeshes = [];
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.noRaycast || /^(Window_View|Window_Glass|LED_Strip|Cove_)/.test(mesh.name)) return;
      if ((mesh.userData.target as Target | undefined)?.kind === "item") return;
      this.rayMeshes.push(mesh);
    });
  }

  /** Mesh da colpire col mirino: stanza + oggetti a terra (non quelli nell'inventario). */
  private rayTargets() {
    const list = [...this.rayMeshes];
    for (const item of this.items) {
      if (item.carrier.parent !== this.scene || !item.carrier.visible) continue;
      item.carrier.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) list.push(o);
      });
    }
    return list;
  }

  /* ============================== interazione ============================== */

  private forward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
  }

  private pickTarget(): { target: Target; root: THREE.Object3D } | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = REACH;
    const targets = this.rayTargets();
    const hits = this.raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      // solo mesh visibili e ancora nella scena (non quelle finite nell'inventario)
      let visible = true;
      let top: THREE.Object3D = hit.object;
      for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
        if (!o.visible) visible = false;
        top = o;
      }
      if (!visible || top !== this.scene) continue;
      const target = hit.object.userData.target as Target | undefined;
      if (!target) break; // il primo ostacolo copre ciò che sta dietro
      return { target, root: this.targetRoots.get(hit.object) ?? hit.object };
    }
    return this.assistTarget(hits[0]?.distance ?? REACH, targets);
  }

  /** Mira assistita per gli oggetti piccoli: basta sfiorarli, purché nulla li copra. */
  private assistTarget(blockedAt: number, targets: THREE.Object3D[]): { target: Target; root: THREE.Object3D } | null {
    const eye = this.camera.position;
    const forward = this.forward();
    const candidates: { item: Item; off: number; dist: number }[] = [];
    for (const item of this.items) {
      if (!item.carrier.visible || item.carrier.parent !== this.scene) continue;
      const to = item.carrier.position.clone().sub(eye);
      const dist = to.length();
      if (dist > REACH || dist > blockedAt + item.half.length()) continue;
      const off = to.clone().cross(forward).length(); // distanza dal raggio del mirino
      if (off > 0.9 + item.half.length() * 0.6 || to.dot(forward) <= 0) continue;
      candidates.push({ item, off, dist });
    }
    candidates.sort((a, b) => a.off - b.off);
    // linea di vista: il primo ostacolo verso il centro dell'oggetto deve essere l'oggetto stesso
    const ray = new THREE.Raycaster();
    for (const { item, dist } of candidates) {
      ray.set(eye, item.carrier.position.clone().sub(eye).normalize());
      ray.far = dist;
      const first = ray.intersectObjects(targets, false)[0];
      let mine = false;
      for (let o: THREE.Object3D | null = first?.object ?? null; o; o = o.parent) if (o === item.carrier) mine = true;
      if (!first || mine || first.distance > dist - item.half.length()) return { target: { kind: "item", item: item.id }, root: item.carrier };
    }
    return null;
  }

  /** Oggetto in mano: l'ultimo della pila nello slot selezionato. */
  private get held(): Item | null {
    const slot = this.slots[this.selected];
    return slot[slot.length - 1] ?? null;
  }

  /** Il telecomando della lampadina è ancora dentro la cassaforte aperta? */
  private remoteInSafe() {
    const remote = this.findItem("lightRemote");
    return !!remote && this.safeDoor?.open === true && !remote.body && remote !== this.held && this.remoteHome;
  }

  private promptFor(target: Target): string {
    const t = <K extends keyof typeof PROMPTS>(k: K) => PROMPTS[k][this.lang];
    switch (target.kind) {
      case "item":
        return `${t("pick")}: ${ITEMS[target.item].name[this.lang]}`;
      case "door":
        return t("door");
      case "switch":
        return this.lampOn ? t("lightOff") : t("lightOn");
      case "switchLed":
        return this.ledOn ? t("ledOff") : t("ledOn");
      case "safe":
        if (this.remoteInSafe()) return `${t("pick")}: ${ITEMS.lightRemote.name[this.lang]}`;
        return this.safeDoor?.open ? t("safeOpen") : this.held?.id === "key" ? t("safeUnlock") : t("safeLocked");
      case "tv":
        return t("tv");
      case "pizzaBox":
        return t("pizzaBox");
      case "thesis":
        return t("thesis");
      case "monitor":
        return this.powered ? t("monitorOn") : t("monitorOff");
      case "power":
        return this.powered ? t("powerOff") : t("powerOn");
    }
  }

  private interact() {
    const hit = this.hovered;
    if (!hit) return;
    const { target } = hit;
    switch (target.kind) {
      case "item": {
        const item = this.items.find((i) => i.carrier === hit.root);
        if (item) this.pickUp(item);
        break;
      }
      case "pizzaBox":
        this.takeSlice();
        break;
      case "thesis":
        this.cb.onOpenThesis();
        break;
      case "door":
        this.cb.onDialog();
        break;
      case "switch":
        this.lampOn = !this.lampOn;
        this.flipRocker("switch", this.lampOn);
        break;
      case "switchLed":
        this.ledOn = !this.ledOn;
        this.flipRocker("switchLed", this.ledOn);
        break;
      case "safe":
        if (this.remoteInSafe()) {
          this.pickUp(this.findItem("lightRemote")!);
          break;
        }
        if (this.safeDoor?.open) break;
        if (this.held?.id === "key") this.unlockSafe();
        else this.cb.onToast(TOASTS.safeLocked[this.lang]);
        break;
      case "tv":
        if (this.held?.id === "tvRemote") this.toggleTv();
        else this.cb.onToast(TOASTS.tvNeedsRemote[this.lang]);
        break;
      case "monitor":
        if (this.powered) this.cb.onNavigate("os");
        else this.cb.onToast(TOASTS.needPower[this.lang]);
        break;
      case "power":
        this.setPowered(!this.powered);
        break;
    }
    this.promptText = undefined; // aggiorna il testo (es. acceso/spento)
  }

  private useHeld() {
    const held = this.held;
    if (!held) return;
    switch (held.id) {
      case "ds":
        this.cb.onPlayDs();
        break;
      case "lightRemote": {
        if (!this.lampOn) {
          this.cb.onToast(TOASTS.lampOff[this.lang]);
          break;
        }
        this.bulbIndex = (this.bulbIndex + 1) % BULB_COLORS.length;
        const color = BULB_COLORS[this.bulbIndex];
        this.bulbColor.set(color.hex);
        this.cb.onToast(`💡 ${color.name[this.lang]}`);
        break;
      }
      case "tvRemote":
        this.toggleTv();
        break;
      case "key":
        if (this.hovered?.target.kind === "safe" && !this.safeDoor?.open) this.unlockSafe();
        else this.cb.onToast(TOASTS.useKeyHere[this.lang]);
        break;
      case "pizza":
      case "drink":
        // vita e fame sono solo estetiche: si mangia per gusto
        if (!this.eating) this.eating = { item: held, t: 0 };
        break;
    }
  }

  /** Stacca una fetta dal cartone e la mette nell'inventario. */
  private takeSlice() {
    const slice = this.pizzaSlices.shift();
    if (!slice) {
      this.cb.onToast(TOASTS.pizzaGone[this.lang]);
      return;
    }
    if (!this.hasRoomFor("pizza")) {
      this.pizzaSlices.unshift(slice);
      this.cb.onToast(TOASTS.inventoryFull[this.lang]);
      return;
    }
    // la fetta non fa più parte del cartone: esce dalle mesh fisse del mirino
    const sliceMeshes = new Set<THREE.Object3D>();
    slice.traverse((o) => sliceMeshes.add(o));
    this.rayMeshes = this.rayMeshes.filter((m) => !sliceMeshes.has(m));
    this.pickUp(this.addItem("pizza", slice));
  }

  /** Fine del morso: la fetta o la lattina sparisce. */
  private finishEating() {
    const eating = this.eating!;
    this.eating = null;
    const slot = this.slots[this.selected];
    if (slot[slot.length - 1] !== eating.item) return;
    slot.pop();
    eating.item.carrier.removeFromParent();
    this.items = this.items.filter((i) => i !== eating.item);
    this.cb.onToast(TOASTS.ate[this.lang]);
    this.refreshHand();
  }

  private toggleTv() {
    this.tv.setOn(!this.tv.on);
    if (this.tv.on && this.tv.missing) this.cb.onToast(TOASTS.noVideo[this.lang]);
  }

  private unlockSafe() {
    if (!this.safeDoor || this.safeDoor.open) return;
    this.safeDoor.open = true;
    const key = this.held;
    if (key?.id === "key") {
      // la chiave resta nella serratura: sparisce dalla mano e dall'inventario
      this.slots[this.selected].pop();
      key.carrier.removeFromParent();
      this.items = this.items.filter((i) => i !== key);
      this.refreshHand();
    }
    this.cb.onToast(TOASTS.safeOpened[this.lang]);
  }

  private flipRocker(which: "switch" | "switchLed", on: boolean) {
    const rocker = this.rockers[which];
    if (rocker) rocker.rotation.x = (on ? -1 : 1) * Math.abs(rocker.rotation.x || 0.105);
  }

  /* ------------------------------ inventario ------------------------------ */

  private slotFor(id: ItemId) {
    // pila già iniziata, poi lo slot in mano se vuoto, poi il primo libero (come Minecraft)
    if (id === "pizza") {
      const stack = this.slots.findIndex((s) => s.length > 0 && s[0].id === id && s.length < STACK);
      if (stack >= 0) return stack;
    }
    if (this.slots[this.selected].length === 0) return this.selected;
    return this.slots.findIndex((s) => s.length === 0);
  }

  private hasRoomFor(id: ItemId) {
    return this.slotFor(id) >= 0;
  }

  private pickUp(item: Item) {
    const index = this.slotFor(item.id);
    if (index < 0) {
      this.cb.onToast(TOASTS.inventoryFull[this.lang]);
      return;
    }
    if (item.id === "lightRemote") this.remoteHome = false;
    if (item.body) {
      this.bodies = this.bodies.filter((b) => b !== item.body);
      item.body = null;
    }
    item.carrier.removeFromParent();
    item.carrier.traverse((o) => ((o as THREE.Mesh).castShadow = false));
    this.slots[index].push(item);
    this.refreshHand();
  }

  /** Mette in mano l'oggetto dello slot selezionato e toglie gli altri dalla vista. */
  private refreshHand() {
    const held = this.held;
    for (const slot of this.slots) for (const item of slot) if (item !== held && item.carrier.parent === this.camera) item.carrier.removeFromParent();
    if (held && held.carrier.parent !== this.camera) {
      const pose = HOLD[held.id];
      this.camera.add(held.carrier);
      held.carrier.position.set(...pose.pos);
      held.carrier.rotation.set(...pose.rot);
      held.carrier.scale.setScalar(pose.scale);
      held.carrier.visible = true;
    }
    this.cb.onInventory(
      this.slots.map((s) => (s.length ? { id: s[0].id, count: s.length } : null)),
      this.selected,
    );
    this.promptText = undefined;
    this.shadowsDirty = true;
  }

  private throwHeld() {
    const item = this.held;
    if (!item) return;
    this.eating = null;
    this.slots[this.selected].pop();
    this.scene.attach(item.carrier);
    item.carrier.scale.setScalar(1);
    item.carrier.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    // parte davanti al giocatore, fuori dagli ostacoli
    const forward = this.forward();
    const v = forward.clone().multiplyScalar(17).add(new THREE.Vector3(0, 4, 0)).addScaledVector(this.vel, 0.5);
    this.launch(item, v);
    this.refreshHand();
  }


  private launch(item: Item, velocity: THREE.Vector3) {
    const euler = new THREE.Euler().setFromQuaternion(item.carrier.quaternion, "YXZ");
    const body: Body = {
      object: item.carrier,
      half: item.half,
      velocity,
      spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 6),
      restYaw: euler.y,
      sleeping: false,
      grounded: 0,
    };
    item.body = body;
    this.bodies.push(body);
  }

  /* ============================== input ============================== */

  private onCanvasClick = () => {
    if (this.paused || this.blocked) return;
    if (!this.locked) this.requestLock();
    else this.action("use");
  };

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    if (!this.locked) this.keys.clear();
    this.cb.onLock(this.locked);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.locked || this.blocked || this.diveAnim) return;
    this.yaw -= event.movementX * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * 0.0022, -1.45, 1.45);
  };

  private active() {
    return (this.locked || this.touch) && !this.blocked && !this.paused;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.active()) return;
    const code = event.code;
    this.keys.add(code);
    if (event.repeat) return;
    if (code === "KeyE") this.action("interact");
    else if (code === "KeyF") this.action("use");
    else if (code === "KeyG") this.action("throw");
    else if (/^Digit[1-9]$/.test(code)) this.selectSlot(Number(code.slice(5)) - 1);
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.locked || this.blocked || this.paused || Math.abs(event.deltaY) < 1) return;
    this.selectSlot(this.selected + (event.deltaY > 0 ? 1 : -1));
  };

  private onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.code);
  private onBlur = () => this.keys.clear();

  /* ============================== loop ============================== */

  private resize() {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 80 : 70;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
  }

  private applyCamera() {
    const bob = Math.sin(this.bob) * 0.18;
    this.camera.position.set(this.pos.x, this.pos.y + this.eye + bob, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  private updatePlayer(dt: number) {
    const k = this.keys;
    const input = new THREE.Vector2(
      (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0),
      (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0),
    );
    if (this.blocked) input.set(0, 0);
    else if (this.moveInput.lengthSq() > 0) input.copy(this.moveInput);
    if (input.lengthSq() > 1) input.normalize();
    const crouch = !this.blocked && (k.has("KeyC") || this.crouchInput);
    this.eye += ((crouch ? CROUCH_EYE : EYE) - this.eye) * Math.min(1, dt * 10);
    const speed = crouch ? WALK * 0.5 : k.has("ShiftLeft") || k.has("ShiftRight") ? RUN : WALK;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // avanti = -Z ruotato dall'imbardata
    const want = new THREE.Vector3(input.x * cos - input.y * sin, 0, -input.x * sin - input.y * cos).multiplyScalar(speed);
    this.vel.lerp(want, Math.min(1, dt * 10));
    this.pos.addScaledVector(this.vel, dt);
    resolveCircle(this.pos, RADIUS, EYE + 1, 1.5, this.colliders);
    const moving = this.vel.length();
    if (moving > 1) this.bob += dt * moving * 0.55;
    else this.bob += (Math.round(this.bob / Math.PI) * Math.PI - this.bob) * Math.min(1, dt * 6);
  }

  private updateDive(dt: number) {
    const d = this.diveAnim!;
    d.t += dt;
    const raw = clamp01(d.t / d.duration);
    const e = easeInOutCubic(raw);
    // arco verso l'alto: la camera scavalca la sedia invece di attraversarla
    const lift = Math.sin(Math.PI * e) * Math.max(0, 19 - Math.min(d.from.y, d.to.y)) * 0.6;
    this.camera.position.lerpVectors(d.from, d.to, e).add(new THREE.Vector3(0, lift, 0));
    const look = d.lookFrom.clone().lerp(d.lookTo, easeInOutCubic(Math.min(1, raw * 1.4)));
    this.camera.lookAt(look);
    if (raw >= 1) {
      this.diveAnim = null;
      d.done();
    }
  }

  private updateHover(dt: number) {
    const hit = this.blocked || this.diveAnim ? null : this.pickTarget();
    const same = hit && this.hovered && hit.root === this.hovered.root;
    if (!same) this.hovered = hit;
    const text = this.hovered ? this.promptFor(this.hovered.target) : null;
    if (text !== this.promptText) {
      this.promptText = text;
      this.cb.onPrompt(text);
    }
    for (const [root, h] of this.highlight) {
      const goal = this.hovered?.root === root ? 1 : 0;
      if (h.level === goal) continue;
      h.level = Math.abs(goal - h.level) < 0.02 ? goal : h.level + (goal - h.level) * Math.min(1, dt * 12);
      for (const { m, base } of h.mats) m.emissive.copy(base).lerp(new THREE.Color(0x3a3550), h.level);
    }
  }

  private animate = () => {
    this.frame = window.requestAnimationFrame(this.animate);
    if (this.paused) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05) * this.timeScale;
    this.lastFrame = now;
    this.elapsed += dt;
    const time = this.elapsed;

    // dentro il computer la camera resta ferma davanti allo schermo (saved = posizione da ripristinare)
    if (this.diveAnim) this.updateDive(dt);
    else if (!this.saved) {
      this.updatePlayer(dt);
      this.applyCamera();
    }
    if (this.room) this.updateHover(dt);

    // morso: l'oggetto va verso la bocca e trema, poi sparisce
    if (this.eating) {
      const e = this.eating;
      e.t += dt;
      const pose = HOLD[e.item.id];
      const k = Math.min(1, e.t * 5);
      e.item.carrier.position.set(pose.pos[0] * (1 - 0.6 * k), pose.pos[1] * (1 - 0.55 * k) + Math.sin(e.t * 28) * 0.06 * k, pose.pos[2]);
      if (e.t >= 1.1) this.finishEating();
    }

    // oggetti lanciati
    for (const body of this.bodies) if (stepBody(body, dt, this.colliders)) this.shadowsDirty = true;

    // luci della stanza
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * Math.min(1, dt * 14);
    this.lamp.color.lerp(this.bulbColor, Math.min(1, dt * 8));
    this.lamp.intensity = 900 * this.lampLevel;
    this.lampBounce.color.copy(this.lamp.color);
    this.lampBounce.intensity = 28 * this.lampLevel;
    // la luce ambiente simula il rimbalzo del lampadario sulle pareti
    this.hemi.intensity = 0.14 + 0.32 * this.lampLevel;
    this.hemi.color.setRGB(0.49, 0.55, 0.69).lerp(this.lamp.color, 0.35 * this.lampLevel);
    if (this.bulbMat) {
      this.bulbMat.emissive.copy(this.lamp.color);
      this.bulbMat.emissiveIntensity = 0.15 + 7 * this.lampLevel;
      this.bulbMat.color.setScalar(0.3 + 0.7 * this.lampLevel);
    }
    this.ledLevel += ((this.ledOn ? 1 : 0) - this.ledLevel) * Math.min(1, dt * 10);
    const ledColor = new THREE.Color().setHSL((0.62 + time * 0.02) % 1, 0.85, 0.55);
    for (const m of this.ledMats) {
      m.emissive.copy(ledColor);
      m.emissiveIntensity = 5 * this.ledLevel;
    }
    for (const l of this.ledLights) {
      l.color.copy(ledColor);
      l.intensity = 55 * this.ledLevel;
    }

    // cassaforte
    const safe = this.safeDoor;
    if (safe && safe.open && safe.t < 1) {
      safe.t = Math.min(1, safe.t + dt / 1.3);
      const angle = -THREE.MathUtils.degToRad(100) * easeInOutCubic(safe.t);
      safe.object.quaternion.copy(safe.rest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle));
      this.shadowsDirty = true;
    }

    // TV
    const tvLevel = this.tv.update(time, dt);
    this.tvLight.color.copy(this.tv.glow);
    this.tvLight.intensity = 55 * tvLevel;
    if (this.tv.on) {
      const dist = this.camera.position.distanceTo(this.tvLight.position);
      this.tv.setVolume(1 - dist / 60);
    }
    this.ds.update(time);

    // PC
    if (this.pc) {
      this.power += ((this.powered ? 1 : 0) - this.power) * Math.min(1, dt * (this.powered ? 1.6 : 4));
      for (const fan of this.pc.fans) fan.rotor.rotation[fan.axis] += fan.speed * this.power * dt;
      for (const light of this.pc.rgb) {
        light.material.emissive.setHSL((light.hue + time * 0.05) % 1, 1, 0.55);
        light.material.emissiveIntensity = light.base * this.power;
      }
      for (const light of this.pc.powerLights) light.material.emissiveIntensity = light.base * this.power;
      if (this.pc.powerLed) {
        this.pc.powerLed.emissiveIntensity = this.powered ? 3 : 0.5 + (Math.sin(time * 3.2) * 0.5 + 0.5) * 2.2;
        this.pc.powerLed.emissive.set(this.powered ? 0x8fd3ff : 0xffffff);
      }
      this.caseLight.intensity = 5 * this.power;
      this.caseLight.color.setHSL((0.6 + time * 0.05) % 1, 0.8, 0.6);
    }
    this.screen.update(time);
    const screenOn = this.powered && this.screen.current !== "off" ? 1 : 0;
    this.screenLevel += (screenOn - this.screenLevel) * Math.min(1, dt * 5);
    this.screenMat?.color.setScalar(0.88 * this.screenLevel);
    this.screenLight.intensity = 40 * this.screenLevel;

    if (this.shadowsDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsDirty = false;
    }
    this.composer.render();
  };
}

