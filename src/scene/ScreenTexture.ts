import * as THREE from "three";
import type { Lang } from "../content";

const W = 1280;
const H = 720;
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Space Grotesk', Arial, sans-serif";

const BOOT_LINES = (lang: Lang) => [
  { at: 0.15, text: "RINGOLI BIOS v2.0.26  (c) Roberto Ringoli" },
  { at: 0.45, text: "CPU: Ringoli Core R-05 @ 29.01.2005 ........ OK" },
  { at: 0.8, text: "RAM: DDR-Coppito, 10 moduli esame ........... OK", memory: true },
  { at: 1.15, text: "GPU: Ringoli GFX 2026 · cazzeggio-ready ..... OK" },
  { at: 1.45, text: "NVMe: /home/roberto/progetti · 2 TB ......... OK" },
  { at: 1.75, text: lang === "it" ? "PSU: 850 W · caffè rilevato ................ OK" : "PSU: 850 W · coffee detected .............. OK" },
  { at: 2.15, text: lang === "it" ? "Avvio di RingoliOS..." : "Booting RingoliOS..." },
];

const ICONS = [
  { glyph: ">_", label: { it: "Terminale", en: "Terminal" }, color: "#2b2f3a" },
  { glyph: "RR", label: { it: "Chi sono", en: "About" }, color: "#f2b84b" },
  { glyph: "0x", label: { it: "Esami", en: "Exams" }, color: "#5cf2a0" },
  { glyph: "▚", label: { it: "Snake", en: "Snake" }, color: "#ff4fd8" },
  { glyph: "▤", label: { it: "Progetti", en: "Projects" }, color: "#5aa9ff" },
];

export type ScreenState = "off" | "boot" | "desktop";

/** Contenuto del monitor 3D, ridisegnato su canvas solo quando serve. */
export class ScreenTexture {
  readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private state: ScreenState = "off";
  private bootStart = 0;
  private lastDraw = -1;
  lang: Lang = "it";

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.clear();
  }

  get current() {
    return this.state;
  }

  setState(state: ScreenState, now: number) {
    this.state = state;
    this.bootStart = now;
    this.lastDraw = -1;
    if (state === "off") this.clear();
  }

  /** Durata della sequenza di boot, in secondi. */
  static BOOT_SECONDS = 4.2;

  update(now: number) {
    if (this.state === "off") return;
    if (this.state === "boot") {
      const e = now - this.bootStart;
      if (e > ScreenTexture.BOOT_SECONDS) {
        this.state = "desktop";
        this.lastDraw = -1;
      } else {
        this.drawBoot(e);
        this.texture.needsUpdate = true;
        return;
      }
    }
    // il desktop cambia poco: ridisegna a ~8 fps per pulsazione e orologio
    if (now - this.lastDraw > 0.12) {
      this.drawDesktop(now);
      this.lastDraw = now;
      this.texture.needsUpdate = true;
    }
  }

  private clear() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, W, H);
    this.texture.needsUpdate = true;
  }

  private drawBoot(e: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, W, H);
    if (e < 2.9) {
      ctx.font = `600 26px ${MONO}`;
      ctx.textBaseline = "top";
      BOOT_LINES(this.lang).forEach((line, i) => {
        if (e < line.at) return;
        let text = line.text;
        if (line.memory) {
          const mb = Math.min(32768, Math.floor(((e - line.at) / 0.3) * 32768));
          text = `RAM: DDR-Coppito ${mb} MB ................. ${mb >= 32768 ? "OK" : ""}`;
        }
        ctx.fillStyle = i === 0 ? "#f2b84b" : text.endsWith("OK") ? "#cfd6e4" : "#8b7bff";
        ctx.fillText(text, 70, 70 + i * 46);
      });
      if (Math.floor(e * 3) % 2 === 0) {
        ctx.fillStyle = "#cfd6e4";
        ctx.fillRect(70, 70 + 7 * 46, 16, 28);
      }
      return;
    }
    // logo e barra di avanzamento
    const p = Math.min(1, (e - 2.9) / 1.2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4f2ff";
    ctx.font = `700 92px ${SANS}`;
    ctx.globalAlpha = Math.min(1, (e - 2.9) * 3);
    ctx.fillText("RingoliOS", W / 2, H / 2 - 40);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1b1d2c";
    ctx.fillRect(W / 2 - 220, H / 2 + 60, 440, 8);
    const grad = ctx.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0);
    grad.addColorStop(0, "#8b7bff");
    grad.addColorStop(1, "#ff4fd8");
    ctx.fillStyle = grad;
    ctx.fillRect(W / 2 - 220, H / 2 + 60, 440 * p, 8);
    ctx.textAlign = "left";
  }

  private drawDesktop(now: number) {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#14123a");
    bg.addColorStop(0.55, "#2b1748");
    bg.addColorStop(1, "#0b1c3a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // onde decorative dello sfondo
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const y = 430 + i * 26 + Math.sin(x * 0.006 + i * 0.7 + now * 0.4) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ICONS.forEach((icon, i) => {
      const x = 90;
      const y = 80 + i * 112;
      ctx.fillStyle = icon.color;
      roundRect(ctx, x - 36, y - 36, 72, 72, 16);
      ctx.fill();
      ctx.fillStyle = icon.color === "#2b2f3a" ? "#9cf5c2" : "#0b0b12";
      ctx.font = `700 28px ${MONO}`;
      ctx.fillText(icon.glyph, x, y + 1);
      ctx.fillStyle = "#e9e8f5";
      ctx.font = `500 19px ${SANS}`;
      ctx.fillText(icon.label[this.lang], x, y + 54);
    });

    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = `700 84px ${SANS}`;
    ctx.fillText("RingoliOS", W / 2 + 70, H / 2 - 50);
    const pulse = 0.55 + Math.sin(now * 3.2) * 0.45;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + pulse * 0.5})`;
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(
      this.lang === "it" ? "▶  Clicca lo schermo per entrare" : "▶  Click the screen to enter",
      W / 2 + 70,
      H / 2 + 30,
    );

    // barra delle applicazioni
    ctx.fillStyle = "rgba(8, 8, 20, .72)";
    ctx.fillRect(0, H - 54, W, 54);
    ctx.fillStyle = "#8b7bff";
    roundRect(ctx, 14, H - 44, 34, 34, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 17px ${MONO}`;
    ctx.fillText("R", 31, H - 26);
    const d = new Date();
    ctx.textAlign = "right";
    ctx.font = `600 22px ${MONO}`;
    ctx.fillStyle = "#e9e8f5";
    ctx.fillText(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      W - 24,
      H - 27,
    );
    ctx.textAlign = "left";
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
