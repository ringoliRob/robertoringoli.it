import { useEffect, useRef, useState } from "react";
import type { Lang } from "../content";
import { Platformer, VIEW_H, VIEW_W, type Input } from "../game/platformer";

type Props = {
  lang: Lang;
  cleared: boolean;
  onWin: () => void;
  onClose: () => void;
};

const STEP = 1000 / 60;

/** Il 3DS in mano: schermo superiore col gioco, inferiore con punteggio e comandi. */
export default function DsGame({ lang, cleared, onWin, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({ left: false, right: false, jump: false, run: false });
  const [hud, setHud] = useState({ coins: 0, time: 0, progress: 0, state: "play" as string });
  const won = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const game = new Platformer();
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudTick = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= STEP) {
        acc -= STEP;
        if (game.step(input.current) && !won.current) {
          won.current = true;
          onWin();
          window.setTimeout(onClose, 1600);
        }
      }
      game.draw(ctx);
      if (game.state === "clear") {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 96, VIEW_W, 44);
        ctx.fillStyle = "#ffd60a";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.fillText(lang === "it" ? "LIVELLO COMPLETATO!" : "COURSE CLEAR!", VIEW_W / 2, 126);
        ctx.textAlign = "left";
      }
      if (++hudTick % 6 === 0) setHud({ coins: game.coins, time: game.time, progress: game.progress(), state: game.state });
    };
    raf = requestAnimationFrame(loop);

    const map: Record<string, keyof Input> = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      Space: "jump",
      ArrowUp: "jump",
      KeyW: "jump",
      KeyK: "jump",
      ShiftLeft: "run",
      ShiftRight: "run",
      KeyJ: "run",
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        onClose();
        return;
      }
      const k = map[e.code];
      if (!k) return;
      e.preventDefault();
      input.current[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.code];
      if (k) input.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hold = (k: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      input.current[k] = true;
    },
    onPointerUp: () => (input.current[k] = false),
    onPointerLeave: () => (input.current[k] = false),
    onPointerCancel: () => (input.current[k] = false),
  });

  const it = lang === "it";
  return (
    <div className="ds-overlay" role="dialog" aria-label="Nintendo 3DS XL · Super Ringoli">
      <div className="ds">
        <div className="ds-lid">
          <span className="ds-speaker" />
          <div className="ds-screen ds-screen--top">
            <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} />
          </div>
          <span className="ds-speaker" />
        </div>
        <div className="ds-hinge" />
        <div className="ds-base">
          <div className="ds-pad" aria-hidden="true">
            <button type="button" className="ds-dpad ds-dpad--l" {...hold("left")}>◀</button>
            <button type="button" className="ds-dpad ds-dpad--r" {...hold("right")}>▶</button>
          </div>
          <div className="ds-screen ds-screen--bottom">
            <p className="ds-title">SUPER RINGOLI · WORLD 1-1</p>
            <div className="ds-stats">
              <span>🪙 × {String(hud.coins).padStart(2, "0")}</span>
              <span>⏱ {hud.time.toFixed(1)}s</span>
            </div>
            <div className="ds-progress">
              <i style={{ width: `${hud.progress * 100}%` }} />
              <b>🚩</b>
            </div>
            <p className="ds-help">
              {cleared
                ? it
                  ? "Hai già la chiave, ma puoi rigiocare!"
                  : "You already have the key, but you can play again!"
                : it
                  ? "Arriva alla bandiera per vincere la chiave."
                  : "Reach the flag to win the key."}
            </p>
            <p className="ds-keys">
              {it ? "← → muovi · Spazio salta · Shift corri · Esc esci" : "← → move · Space jump · Shift run · Esc quit"}
            </p>
          </div>
          <div className="ds-buttons" aria-hidden="true">
            <button type="button" className="ds-btn ds-btn--b" {...hold("run")}>B</button>
            <button type="button" className="ds-btn ds-btn--a" {...hold("jump")}>A</button>
          </div>
        </div>
      </div>
      <button type="button" className="ds-close" onClick={onClose}>
        {it ? "Posa il 3DS (Esc)" : "Put the 3DS down (Esc)"}
      </button>
    </div>
  );
}
