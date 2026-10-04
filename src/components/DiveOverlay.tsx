import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type DiveOverlayHandle = {
  /** Zoom dentro il circuito: si risolve quando lo schermo è coperto dal colore della pagina. */
  enter: (accent: string, bg: string) => Promise<void>;
  /** Dissolve l'overlay sulla pagina appena montata. */
  reveal: () => Promise<void>;
  /** Uscita: parte coperto e fa zoom all'indietro mostrando la scena 3D. */
  exit: (accent: string, bg: string) => Promise<void>;
};

type Trace = { pts: [number, number][]; w: number; speed: number; phase: number };

/** Piste di circuito procedurali che partono dal centro (il "die"). */
function generateTraces(count: number): Trace[] {
  const traces: Trace[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    let x = Math.cos(angle) * 0.09;
    let y = Math.sin(angle) * 0.09;
    const pts: [number, number][] = [[x, y]];
    let dir = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const segs = 3 + Math.floor(Math.random() * 4);
    for (let s = 0; s < segs; s += 1) {
      const len = 0.06 + Math.random() * 0.22;
      x += Math.cos(dir) * len;
      y += Math.sin(dir) * len;
      pts.push([x, y]);
      // piega di 45° restando grosso modo verso l'esterno
      const outward = Math.atan2(y, x);
      const turn = (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 4);
      const candidate = dir + turn;
      if (Math.cos(candidate - outward) > 0.2) dir = candidate;
    }
    traces.push({ pts, w: 0.6 + Math.random() * 1.6, speed: 0.4 + Math.random() * 0.8, phase: Math.random() });
  }
  return traces;
}

function hexToRgb(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
}

const DiveOverlay = forwardRef<DiveOverlayHandle>(function DiveOverlay(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const traces = useRef<Trace[]>(generateTraces(110));
  const raf = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(raf.current);
  }, []);

  /**
   * Disegna un fotogramma. depth 0 = circuito lontano, 1 = dentro il chip.
   * cover = quanto il colore di fondo della pagina copre la scena.
   */
  const draw = (depth: number, cover: number, accent: string, bg: string, time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const [r, g, b] = hexToRgb(accent);
    const [br, bg2, bb] = hexToRgb(bg);
    const unit = Math.min(w, h);

    // velo scuro che cresce con la profondità
    ctx.fillStyle = `rgba(${br}, ${bg2}, ${bb}, ${Math.min(1, depth * 1.1)})`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.globalCompositeOperation = "lighter";
    // tre livelli di circuito annidati: zoom "infinito"
    for (let layer = 0; layer < 3; layer += 1) {
      const scale = unit * 0.55 * Math.exp(depth * 4.6) / Math.pow(9, layer);
      if (scale < unit * 0.04 || scale > unit * 140) continue;
      const fadeIn = Math.min(1, scale / (unit * 0.35));
      const fadeOut = 1 - Math.min(1, Math.max(0, (scale - unit * 25) / (unit * 90)));
      const alpha = fadeIn * fadeOut * (1 - cover);
      if (alpha <= 0.01) continue;
      const lw = Math.min(14, 1 + scale / unit);
      ctx.rotate(layer * 0.7);
      for (const trace of traces.current) {
        ctx.beginPath();
        trace.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.16 * alpha})`;
        ctx.lineWidth = lw * trace.w * 3;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.75 * alpha})`;
        ctx.lineWidth = lw * trace.w * 0.7;
        ctx.stroke();
        const [ex, ey] = trace.pts[trace.pts.length - 1];
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
        ctx.beginPath();
        ctx.arc(ex * scale, ey * scale, lw * 2.2, 0, Math.PI * 2);
        ctx.fill();
        // impulso di dati che corre lungo la pista
        const p = (time * trace.speed + trace.phase) % 1;
        const seg = Math.min(trace.pts.length - 2, Math.floor(p * (trace.pts.length - 1)));
        const k = p * (trace.pts.length - 1) - seg;
        const [ax, ay] = trace.pts[seg];
        const [bx, by] = trace.pts[seg + 1];
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.beginPath();
        ctx.arc((ax + (bx - ax) * k) * scale, (ay + (by - ay) * k) * scale, lw * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // il die al centro
      const die = 0.08 * scale;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * alpha})`;
      ctx.lineWidth = lw * 1.4;
      ctx.strokeRect(-die, -die, die * 2, die * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.08 * alpha})`;
      ctx.fillRect(-die, -die, die * 2, die * 2);
      ctx.rotate(-layer * 0.7);
    }
    ctx.restore();

    // bagliore centrale e copertura finale con il colore della pagina
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, unit * (0.2 + depth * 0.8));
    glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 * depth * (1 - cover)})`);
    glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    if (cover > 0) {
      ctx.fillStyle = `rgba(${br}, ${bg2}, ${bb}, ${cover})`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  const run = (duration: number, frame: (t: number, time: number) => void) =>
    new Promise<void>((resolve) => {
      cancelAnimationFrame(raf.current);
      const start = performance.now();
      // primo fotogramma subito: evita un frame scoperto quando la pagina si smonta
      frame(0, start / 1000);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        frame(t, now / 1000);
        if (t < 1) raf.current = requestAnimationFrame(step);
        else resolve();
      };
      raf.current = requestAnimationFrame(step);
    });

  const smooth = (a: number, b: number, t: number) => {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  };

  useImperativeHandle(ref, () => ({
    enter: (accent, bg) => {
      const canvas = canvasRef.current!;
      canvas.style.transition = "none";
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      const duration = reduced.current ? 250 : 950;
      return run(duration, (t, time) => draw(t, smooth(0.62, 1, t), accent, bg, time));
    },
    reveal: () => {
      const canvas = canvasRef.current!;
      canvas.style.transition = "opacity 380ms ease";
      canvas.style.opacity = "0";
      return new Promise((resolve) =>
        window.setTimeout(() => {
          canvas.style.visibility = "hidden";
          resolve();
        }, 400),
      );
    },
    exit: (accent, bg) => {
      const canvas = canvasRef.current!;
      canvas.style.transition = "none";
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      const duration = reduced.current ? 250 : 1100;
      return run(duration, (t, time) => draw(1 - t, 1 - smooth(0, 0.35, t), accent, bg, time)).then(() => {
        canvas.style.visibility = "hidden";
      });
    },
  }));

  return <canvas ref={canvasRef} className="dive-overlay" aria-hidden="true" />;
});

export default DiveOverlay;
