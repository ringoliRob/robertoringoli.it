import * as THREE from "three";

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Venature di legno scuro per il piano della scrivania. */
export function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3a2619";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 260; i += 1) {
    const y = Math.random() * canvas.height;
    const shade = 30 + Math.random() * 40;
    ctx.strokeStyle = `rgba(${shade + 40}, ${shade + 18}, ${shade}, ${0.08 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.006 + i) * 6 + Math.sin(x * 0.03 + i * 3) * 1.2);
    }
    ctx.stroke();
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

type LabelOptions = {
  width?: number;
  height?: number;
  bg?: string;
  fg?: string;
  accent?: string;
  lines: { text: string; size: number; weight?: number; color?: string; mono?: boolean }[];
  border?: boolean;
  align?: CanvasTextAlign;
};

/** Etichetta stampata (adesivi su CPU, PSU, RAM...). */
export function createLabelTexture({
  width = 512,
  height = 256,
  bg = "#111318",
  fg = "#e9ecf2",
  accent,
  lines,
  border = false,
  align = "center",
}: LabelOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  if (border && accent) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(4, width * 0.012);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, width - ctx.lineWidth * 2, height - ctx.lineWidth * 2);
  }
  const total = lines.reduce((sum, line) => sum + line.size * 1.25, 0);
  let y = (height - total) / 2;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const x = align === "center" ? width / 2 : width * 0.08;
  for (const line of lines) {
    ctx.fillStyle = line.color ?? fg;
    ctx.font = `${line.weight ?? 700} ${line.size}px ${
      line.mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', Arial, sans-serif"
    }`;
    ctx.fillText(line.text, x, y);
    y += line.size * 1.25;
  }
  return canvasTexture(canvas);
}

/** Piste dorate su PCB scuro, per la scheda madre. */
export function createPcbTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#151b24";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.lineCap = "round";
  for (let i = 0; i < 140; i += 1) {
    let x = Math.random() * 1024;
    let y = Math.random() * 1024;
    ctx.strokeStyle = `rgba(160, 140, 90, ${0.12 + Math.random() * 0.18})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s += 1) {
      const len = 30 + Math.random() * 140;
      const dir = Math.floor(Math.random() * 8) * (Math.PI / 4);
      x += Math.cos(dir) * len;
      y += Math.sin(dir) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(190, 170, 110, .35)";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(230, 235, 245, .32)";
  ctx.font = "600 26px 'JetBrains Mono', monospace";
  ctx.fillText("RR-Z790 · ROBERTO RINGOLI", 40, 980);
  return canvasTexture(canvas);
}

/** Texture morbida radiale per aloni luminosi. */
export function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return canvasTexture(canvas);
}
