import * as THREE from "three";
import type { Lang } from "../content";

/** TV: video da public/videos/tv.mp4 (in loop, con audio) o "nessun segnale" se manca. */
export class TVScreen {
  readonly material: THREE.MeshBasicMaterial;
  readonly glow = new THREE.Color(0, 0, 0);
  private video: HTMLVideoElement;
  private videoTexture: THREE.VideoTexture;
  private noSignal: THREE.CanvasTexture;
  private noSignalCtx: CanvasRenderingContext2D;
  private sampler = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  private lastSample = 0;
  private level = 0;
  on = false;
  missing = false;

  constructor(src: string) {
    this.video = document.createElement("video");
    this.video.src = src;
    this.video.loop = true;
    this.video.playsInline = true;
    this.video.preload = "auto";
    this.video.crossOrigin = "anonymous";
    this.video.addEventListener("error", () => (this.missing = true));
    this.videoTexture = new THREE.VideoTexture(this.video);
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    // le UV del GLB seguono la convenzione glTF (origine in alto)
    this.videoTexture.flipY = false;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 288;
    this.noSignalCtx = canvas.getContext("2d")!;
    this.noSignal = new THREE.CanvasTexture(canvas);
    this.noSignal.colorSpace = THREE.SRGBColorSpace;
    this.noSignal.flipY = false;
    this.sampler.canvas.width = 8;
    this.sampler.canvas.height = 8;

    this.material = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  }

  /** Accende/spegne. Va chiamata dentro un gesto dell'utente (tasto) perché l'audio parta. */
  setOn(on: boolean) {
    this.on = on;
    if (on && !this.missing) {
      this.video.currentTime = 0;
      void this.video.play().catch(() => {
        // autoplay con audio bloccato: riprova muto
        this.video.muted = true;
        void this.video.play().catch(() => (this.missing = true));
      });
    } else {
      this.video.pause();
    }
  }

  setVolume(volume: number) {
    this.video.volume = THREE.MathUtils.clamp(volume, 0, 1);
  }

  pause(paused: boolean) {
    if (!this.on || this.missing) return;
    if (paused) this.video.pause();
    else void this.video.play().catch(() => {});
  }

  update(time: number, dt: number) {
    this.level += ((this.on ? 1 : 0) - this.level) * Math.min(1, dt * 8);
    const playing = this.on && !this.missing && this.video.readyState >= 2;
    if (this.on && !playing) this.drawNoSignal(time);
    const map = playing ? this.videoTexture : this.on ? this.noSignal : null;
    if (this.material.map !== map) {
      this.material.map = map;
      this.material.needsUpdate = true;
    }
    this.material.color.setScalar(this.level * 0.95);

    // colore medio del frame: tinge la luce che la TV getta nella stanza
    if (this.on && time - this.lastSample > 0.12) {
      this.lastSample = time;
      if (playing) {
        this.sampler.drawImage(this.video, 0, 0, 8, 8);
        const d = this.sampler.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const n = (d.length / 4) * 255;
        this.glow.setRGB(r / n, g / n, b / n, THREE.SRGBColorSpace);
      } else {
        this.glow.setRGB(0.35, 0.38, 0.45);
      }
    }
    if (!this.on) this.glow.multiplyScalar(Math.max(0, 1 - dt * 8));
    return this.level;
  }

  private drawNoSignal(time: number) {
    const ctx = this.noSignalCtx;
    const { width: w, height: h } = ctx.canvas;
    // neve analogica + scritta
    const img = ctx.createImageData(w / 4, h / 4);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 120;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    const tmp = document.createElement("canvas");
    tmp.width = w / 4;
    tmp.height = h / 4;
    tmp.getContext("2d")!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(w * 0.2, h * 0.4, w * 0.6, h * 0.2);
    ctx.fillStyle = "#e9ecf2";
    ctx.font = "600 30px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.floor(time * 2) % 2 ? "NO SIGNAL" : "NO SIGNAL_", w / 2, h / 2);
    this.noSignal.needsUpdate = true;
  }

  dispose() {
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.videoTexture.dispose();
    this.noSignal.dispose();
    this.material.dispose();
  }
}

/** Schermi del 3DS nella stanza: titolo del gioco in attesa, poi "completato". */
export class DSScreens {
  readonly top: THREE.MeshBasicMaterial;
  readonly bottom: THREE.MeshBasicMaterial;
  private topCtx: CanvasRenderingContext2D;
  private botCtx: CanvasRenderingContext2D;
  private topTex: THREE.CanvasTexture;
  private botTex: THREE.CanvasTexture;
  private last = -1;
  lang: Lang = "it";
  cleared = false;

  constructor() {
    // UV glTF (origine in alto): flipY falso; lo schermo superiore sta sul coperchio ruotato e torna dritto con flipY
    const make = (w: number, h: number, flipY: boolean) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.flipY = flipY;
      return { ctx: c.getContext("2d")!, tex };
    };
    const t = make(400, 240, true);
    const b = make(320, 240, false);
    this.topCtx = t.ctx;
    this.botCtx = b.ctx;
    this.topTex = t.tex;
    this.botTex = b.tex;
    this.top = new THREE.MeshBasicMaterial({ map: t.tex, toneMapped: false, color: 0xd8d8d8 });
    this.bottom = new THREE.MeshBasicMaterial({ map: b.tex, toneMapped: false, color: 0xd8d8d8 });
  }

  update(time: number) {
    const frame = Math.floor(time * 4);
    if (frame === this.last) return;
    this.last = frame;
    const ctx = this.topCtx;
    // cielo, colline e titolo, in pixel art
    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, "#5c94fc");
    sky.addColorStop(1, "#a8d0ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 400, 240);
    ctx.fillStyle = "#2f9e44";
    for (let x = 0; x < 400; x += 80) {
      ctx.beginPath();
      ctx.arc(x + ((frame * 2) % 80), 210, 46, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = "#c46b2d";
    ctx.fillRect(0, 208, 400, 32);
    ctx.fillStyle = "#8b4513";
    for (let x = 0; x < 400; x += 16) ctx.fillRect(x, 208, 1, 32);
    ctx.textAlign = "center";
    ctx.font = "bold 34px monospace";
    ctx.fillStyle = "#000";
    ctx.fillText("SUPER RINGOLI", 202, 82);
    ctx.fillStyle = "#ffd60a";
    ctx.fillText("SUPER RINGOLI", 200, 80);
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#fff";
    if (this.cleared) ctx.fillText(this.lang === "it" ? "★ COMPLETATO ★" : "★ COURSE CLEAR ★", 200, 120);
    else if (frame % 2) ctx.fillText(this.lang === "it" ? "PRENDIMI E PREMI F" : "PICK ME UP, PRESS F", 200, 120);
    this.topTex.needsUpdate = true;

    const b = this.botCtx;
    b.fillStyle = "#101318";
    b.fillRect(0, 0, 320, 240);
    b.fillStyle = "#e8e8e8";
    b.font = "bold 14px monospace";
    b.textAlign = "center";
    b.fillText("WORLD 1-1", 160, 90);
    b.fillStyle = "#ff5a5f";
    b.fillRect(146, 120, 28, 28);
    b.fillStyle = "#fff";
    b.fillText("▶", 160, 140);
    this.botTex.needsUpdate = true;
  }

  dispose() {
    this.topTex.dispose();
    this.botTex.dispose();
    this.top.dispose();
    this.bottom.dispose();
  }
}
