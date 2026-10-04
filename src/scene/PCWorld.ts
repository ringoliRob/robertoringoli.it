import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PARTS, type Lang, type RouteId } from "../content";
import { buildPC, createRig, type PickId, type Rig } from "./buildPC";
import { buildDesk, MONITOR_POS } from "./buildDesk";
import { ScreenTexture } from "./ScreenTexture";

export type WorldCallbacks = {
  onHover: (pick: PickId | null) => void;
  onPick: (pick: PickId) => void;
  onExplodedChange: (exploded: boolean) => void;
};

type View = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };

type CamTween = {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  t0: THREE.Vector3;
  t1: THREE.Vector3;
  fov0: number;
  fov1: number;
  duration: number;
  elapsed: number;
  ease: (t: number) => number;
  marks: { at: number; fn: () => void }[];
  onDone?: () => void;
};

const CASE_POS = new THREE.Vector3(5.2, 0.1, -0.9);

const VIEWS = {
  overview: { pos: new THREE.Vector3(-0.2, 6.4, 13.6), target: new THREE.Vector3(1.6, 2.2, -0.6) },
  exploded: { pos: new THREE.Vector3(-1.0, 9.4, 7.0), target: new THREE.Vector3(3.1, 3.0, -0.9) },
};

/** Da che lato la camera si avvicina a ogni componente prima di entrarci. */
const APPROACH: Record<RouteId, THREE.Vector3> = {
  cpu: new THREE.Vector3(-1, -0.12, 0.45).normalize(),
  ram: new THREE.Vector3(-1, 0.12, 0.55).normalize(),
  gpu: new THREE.Vector3(-1, -0.15, 0.3).normalize(),
  ssd: new THREE.Vector3(-1, 0, 0.35).normalize(),
  psu: new THREE.Vector3(-1, 0.18, 0.4).normalize(),
  os: new THREE.Vector3(0, 0, 1),
};

const HIGHLIGHT: Partial<Record<PickId, number>> = {
  cpu: 0.4,
  ram: 0.4,
  gpu: 0.4,
  ssd: 0.45,
  psu: 0.4,
  monitor: 0.12,
  power: 0.6,
  shell: 0.08,
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInQuad = (t: number) => t * t * (0.4 + 0.6 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function bezier(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number) {
  const u = 1 - t;
  out.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t);
  return out;
}

export class PCWorld {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private rig: Rig;
  private screen = new ScreenTexture();
  private screenMat: THREE.MeshBasicMaterial;
  private screenLight: THREE.PointLight;
  private caseLight: THREE.PointLight;
  private ledMat: THREE.MeshStandardMaterial;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDirty = false;
  private pointerInside = false;
  private down = { x: 0, y: 0, t: 0 };
  private hovered: PickId | null = null;
  private highlightLevel = new Map<PickId, number>();
  private highlightMats = new Map<PickId, { m: THREE.MeshStandardMaterial; color: THREE.Color; intensity: number }[]>();
  private tween: CamTween | null = null;
  private savedView: View | null = null;
  private exploded = false;
  private explodeT = 0;
  private powered = false;
  private power = 0;
  private screenLevel = 0;
  private bootTimer = 0;
  private paused = false;
  /** Vero mentre la camera è "dentro" un componente: i controlli restano fermi. */
  private locked = false;
  private elapsed = 0;
  private lastFrame = performance.now();
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private viewScale = 1;
  private baseFov = 40;
  private glassOpacity: number;
  /** Solo per i test: accelera il tempo della simulazione. */
  timeScale = 1;

  constructor(
    private mount: HTMLElement,
    private cb: WorldCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;
    pmrem.dispose();
    this.scene.background = new THREE.Color(0x07090d);
    this.scene.fog = new THREE.Fog(0x07090d, 26, 70);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);

    /* -------------------------- oggetti -------------------------- */
    this.rig = createRig();
    const { pc, caseLight, ledMat, glass } = buildPC(this.rig);
    pc.position.copy(CASE_POS);
    this.scene.add(pc);
    this.caseLight = caseLight;
    this.ledMat = ledMat;
    this.glassOpacity = (glass.material as THREE.MeshPhysicalMaterial).opacity;

    const { room, screen, lampHead } = buildDesk(this.rig, this.screen.texture);
    this.scene.add(room);
    this.screenMat = screen.material as THREE.MeshBasicMaterial;

    /* -------------------------- luci -------------------------- */
    this.scene.add(new THREE.HemisphereLight(0x8a98c0, 0x1a1410, 0.55));
    const lamp = new THREE.SpotLight(0xffc68a, 90, 34, 0.85, 0.75, 1.5);
    lamp.position.copy(lampHead);
    lamp.target.position.set(0.5, 0, 0.5);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    lamp.shadow.bias = -0.0004;
    lamp.shadow.normalBias = 0.02;
    this.scene.add(lamp, lamp.target);
    const cool = new THREE.SpotLight(0x8fa8ff, 70, 40, 0.5, 0.9, 1.5);
    cool.position.set(-6, 13, 10);
    cool.target.position.copy(CASE_POS).add(new THREE.Vector3(0, 2.5, 0));
    this.scene.add(cool, cool.target);
    const rim = new THREE.DirectionalLight(0x7c6cff, 0.9);
    rim.position.set(6, 9, -10);
    this.scene.add(rim);
    this.screenLight = new THREE.PointLight(0x9a90ff, 0, 11, 1.4);
    this.screenLight.position.set(MONITOR_POS.x, 3.3, MONITOR_POS.z + 1.4);
    this.scene.add(this.screenLight);

    /* -------------------------- post-processing -------------------------- */
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    /* -------------------------- controlli -------------------------- */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 3.5;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = 1.45;

    this.collectHighlightMaterials();
    this.resize();

    // ingresso: la camera arriva dall'alto e si posa sulla scrivania
    const start = this.view("overview");
    this.camera.position.copy(start.pos).add(new THREE.Vector3(-4, 7, 10).multiplyScalar(this.viewScale));
    this.controls.target.copy(start.target);
    this.camera.fov = start.fov;
    this.camera.updateProjectionMatrix();
    this.flyTo(start, this.reducedMotion ? 0.01 : 2.6);

    const el = this.renderer.domElement;
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerLeave);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(mount);
    this.animate();
  }

  /* ============================== API pubblica ============================== */

  setLang(lang: Lang) {
    this.screen.lang = lang;
  }

  isPowered() {
    return this.powered;
  }

  setPowered(on: boolean) {
    if (on === this.powered) return;
    this.powered = on;
    window.clearTimeout(this.bootTimer);
    if (on) {
      this.bootTimer = window.setTimeout(() => this.screen.setState("boot", this.elapsed), 450);
    } else {
      this.screen.setState("off", this.elapsed);
    }
  }

  setExploded(exploded: boolean, moveCamera = true) {
    if (exploded === this.exploded) return;
    this.exploded = exploded;
    this.cb.onExplodedChange(exploded);
    if (moveCamera && !this.locked) this.flyTo(this.view(exploded ? "exploded" : "overview"), 1.5);
  }

  resetView() {
    this.flyTo(this.view(this.exploded ? "exploded" : "overview"), 1.2);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) this.lastFrame = performance.now();
  }

  /** Vola dentro un componente. La promessa si risolve quando l'overlay deve partire. */
  dive(id: RouteId): Promise<void> {
    this.setHovered(null);
    if (id !== "os" && !this.exploded) this.setExploded(true, false);
    this.locked = true;
    this.savedView = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone(),
      fov: this.camera.fov,
    };
    const { center, approach, inside } = this.diveGeometry(id);
    const duration = this.reducedMotion ? 0.35 : id === "os" ? 1.35 : 1.6;
    return new Promise((resolve) => {
      this.startTween({
        p0: this.camera.position.clone(),
        p1: approach,
        p2: inside,
        t0: this.controls.target.clone(),
        t1: center,
        fov0: this.camera.fov,
        fov1: 30,
        duration,
        ease: easeInOutCubic,
        marks: [{ at: 0.62, fn: resolve }],
      });
    });
  }

  /** Esce dal componente: la camera parte da dentro e torna alla vista precedente. */
  undive(id: RouteId) {
    this.locked = false;
    if (id !== "os" && !this.exploded) {
      this.exploded = true;
      this.explodeT = 1;
      this.applyExplode();
      this.cb.onExplodedChange(true);
    }
    const { center, approach, inside } = this.diveGeometry(id);
    const back = this.savedView ?? this.view(id === "os" ? "overview" : "exploded");
    this.savedView = null;
    this.camera.position.copy(inside);
    this.controls.target.copy(center);
    this.startTween({
      p0: inside,
      p1: approach,
      p2: back.pos.clone(),
      t0: center,
      t1: back.target.clone(),
      fov0: 30,
      fov1: back.fov,
      duration: this.reducedMotion ? 0.3 : 1.5,
      ease: easeOutCubic,
      marks: [],
    });
  }

  dispose() {
    window.cancelAnimationFrame(this.frame);
    window.clearTimeout(this.bootTimer);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointerleave", this.onPointerLeave);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
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

  /* ============================== camera ============================== */

  private view(name: keyof typeof VIEWS): View {
    const base = VIEWS[name];
    // in verticale c'è poco spazio in larghezza: l'inquadratura si sposta sul PC
    const shift = this.camera.aspect < 1 ? new THREE.Vector3(name === "overview" ? 2.2 : 0.4, 0, 0) : new THREE.Vector3();
    const target = base.target.clone().add(shift);
    const pos = target.clone().add(base.pos.clone().sub(base.target).multiplyScalar(this.viewScale));
    return { pos, target, fov: this.baseFov };
  }

  private flyTo(view: View, duration: number) {
    const p0 = this.camera.position.clone();
    const mid = p0.clone().lerp(view.pos, 0.5);
    mid.y += p0.distanceTo(view.pos) * 0.12;
    this.startTween({
      p0,
      p1: mid,
      p2: view.pos.clone(),
      t0: this.controls.target.clone(),
      t1: view.target.clone(),
      fov0: this.camera.fov,
      fov1: view.fov,
      duration,
      ease: easeInOutCubic,
      marks: [],
    });
  }

  private startTween(tween: Omit<CamTween, "elapsed">) {
    // completa le promesse in sospeso di un'eventuale animazione interrotta
    this.tween?.marks.forEach((mark) => mark.fn());
    this.tween = { ...tween, elapsed: 0 };
    this.controls.enabled = false;
  }

  private updateTween(dt: number) {
    const tw = this.tween;
    if (!tw) return;
    tw.elapsed += dt;
    const raw = clamp01(tw.elapsed / tw.duration);
    const t = tw.ease(raw);
    bezier(this.camera.position, tw.p0, tw.p1, tw.p2, t);
    // lo sguardo si aggancia al bersaglio prima della posizione
    this.controls.target.lerpVectors(tw.t0, tw.t1, easeOutCubic(Math.min(1, raw * 1.35)));
    this.camera.fov = THREE.MathUtils.lerp(tw.fov0, tw.fov1, easeInQuad(raw));
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.controls.target);
    while (tw.marks.length && raw >= tw.marks[0].at) tw.marks.shift()!.fn();
    if (raw >= 1) {
      this.tween = null;
      this.controls.enabled = !this.locked;
      tw.onDone?.();
    }
  }

  /** Centro del componente nella posa smontata e punti di avvicinamento. */
  private diveGeometry(id: RouteId) {
    const root = this.rig.partRoots[id === "os" ? "monitor" : id]!;
    const t = this.explodeT;
    if (id !== "os") {
      this.explodeT = 1;
      this.applyExplode();
    }
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    if (id !== "os") {
      this.explodeT = t;
      this.applyExplode();
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dir = APPROACH[id];
    const far = id === "os" ? 6.4 * Math.max(1, this.viewScale * 0.8) : 2.6 + size * 0.6;
    return {
      center,
      approach: center.clone().addScaledVector(dir, far),
      inside: center.clone().addScaledVector(dir, id === "os" ? 0.4 : 0.22),
    };
  }

  /* ============================== interazione ============================== */

  private collectHighlightMaterials() {
    const rgbSet = new Set(this.rig.rgb.map((r) => r.material));
    for (const object of this.rig.pickables) {
      const pick = object.userData.pick as PickId;
      const mesh = object as THREE.Mesh;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
      const list = this.highlightMats.get(pick) ?? [];
      for (const m of mats) {
        if (!m.isMeshStandardMaterial || rgbSet.has(m) || list.some((e) => e.m === m)) continue;
        list.push({ m, color: m.emissive.clone(), intensity: m.emissiveIntensity });
      }
      this.highlightMats.set(pick, list);
    }
  }

  private setHovered(pick: PickId | null) {
    if (pick === this.hovered) return;
    this.hovered = pick;
    this.renderer.domElement.style.cursor = pick ? "pointer" : "grab";
    this.cb.onHover(pick);
  }

  private pickAtPointer(): PickId | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.rig.pickables, false);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      const pick = hit.object.userData.pick as PickId | undefined;
      if (!pick) continue;
      // il case si clicca solo per smontarlo: da smontato non deve rubare i click
      if (pick === "shell" && this.exploded) return null;
      return pick;
    }
    return null;
  }

  private setPointer(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    this.setPointer(event);
    this.pointerInside = true;
    this.pointerDirty = true;
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
    this.setHovered(null);
  };

  private onPointerDown = (event: PointerEvent) => {
    this.down = { x: event.clientX, y: event.clientY, t: performance.now() };
    if (event.pointerType === "mouse") this.renderer.domElement.style.cursor = this.hovered ? "pointer" : "grabbing";
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "mouse") this.renderer.domElement.style.cursor = this.hovered ? "pointer" : "grab";
    const moved = Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y);
    if (moved > 7 || performance.now() - this.down.t > 600 || this.tween || this.paused || this.locked) return;
    this.setPointer(event);
    const pick = this.pickAtPointer();
    if (pick) this.cb.onPick(pick);
  };

  /* ============================== loop ============================== */

  private resize() {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const prevScale = this.viewScale;
    this.baseFov = aspect < 1 ? 50 : 40;
    this.viewScale = aspect >= 1.3 ? 1 : Math.min(2.3, 1.3 / aspect) * (aspect < 1 ? 0.7 : 1);
    this.camera.aspect = aspect;
    if (!this.tween) this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.controls.maxDistance = 34 * this.viewScale;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, w < 700 ? 1.4 : 1.75));
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    // mantiene la distanza proporzionata se cambia l'orientamento
    if (!this.tween && prevScale !== this.viewScale) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      this.camera.position.copy(this.controls.target).add(offset.multiplyScalar(this.viewScale / prevScale));
    }
  }

  private applyExplode() {
    for (const part of this.rig.explodables) {
      const local = clamp01((this.explodeT - part.delay) / 0.6);
      const e = easeInOutCubic(local);
      part.object.position.copy(part.home).addScaledVector(part.offset, e);
      part.object.rotation.set(
        part.homeRot.x + part.rot.x * e,
        part.homeRot.y + part.rot.y * e,
        part.homeRot.z + part.rot.z * e,
      );
      if (part.fade) {
        part.fade.opacity = this.glassOpacity * (1 - e);
        part.object.visible = e < 0.98;
      }
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

    // smontaggio
    const goal = this.exploded ? 1 : 0;
    if (this.explodeT !== goal) {
      const speed = this.reducedMotion ? 8 : 0.85;
      this.explodeT = goal > this.explodeT ? Math.min(goal, this.explodeT + dt * speed) : Math.max(goal, this.explodeT - dt * speed);
      this.applyExplode();
    }

    // accensione
    const target = this.powered ? 1 : 0;
    this.power += (target - this.power) * Math.min(1, dt * (this.powered ? 1.6 : 4));
    for (const fan of this.rig.fans) fan.rotor.rotation.z += fan.speed * this.power * dt;
    for (const light of this.rig.rgb) {
      light.material.emissive.setHSL((light.hue + time * 0.05) % 1, 1, 0.55);
      light.material.emissiveIntensity = light.base * this.power;
    }
    this.caseLight.intensity = 5 * this.power;
    this.caseLight.color.setHSL((0.6 + time * 0.05) % 1, 0.8, 0.6);
    this.ledMat.emissiveIntensity = this.powered ? 3 : 0.5 + (Math.sin(time * 3.2) * 0.5 + 0.5) * 2.2;
    this.ledMat.emissive.set(this.powered ? 0x8fd3ff : 0xffffff);

    this.screen.update(time);
    const screenOn = this.powered && this.screen.current !== "off" ? 1 : 0;
    this.screenLevel += (screenOn - this.screenLevel) * Math.min(1, dt * 5);
    this.screenMat.color.setScalar(0.88 * this.screenLevel);
    this.screenLight.intensity = 5 * this.screenLevel;

    // evidenziazione al passaggio del mouse
    if (this.pointerDirty && this.pointerInside && !this.tween) {
      this.pointerDirty = false;
      this.setHovered(this.pickAtPointer());
    }
    for (const [pick, mats] of this.highlightMats) {
      const prev = this.highlightLevel.get(pick) ?? 0;
      const goalLevel = pick === this.hovered ? 1 : 0;
      if (prev === goalLevel) continue;
      const next = Math.abs(goalLevel - prev) < 0.01 ? goalLevel : prev + (goalLevel - prev) * Math.min(1, dt * 10);
      this.highlightLevel.set(pick, next);
      const accent = new THREE.Color(pick in PARTS ? PARTS[pick as RouteId].accent : pick === "monitor" ? PARTS.os.accent : "#ffffff");
      const strength = (HIGHLIGHT[pick] ?? 0.2) * next;
      for (const entry of mats) {
        entry.m.emissive.copy(entry.color).lerp(accent, next);
        entry.m.emissiveIntensity = entry.intensity * (1 - next) + strength;
      }
    }

    if (this.tween) this.updateTween(dt);
    else if (!this.locked) this.controls.update();
    this.composer.render();
  };
}
