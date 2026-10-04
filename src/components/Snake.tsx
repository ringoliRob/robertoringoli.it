import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../content";

const GRID = 20;
type Point = { x: number; y: number };
type Dir = Point;

const DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

const COPY = {
  start: { it: "Premi per giocare", en: "Press to play" },
  over: { it: "Game over", en: "Game over" },
  again: { it: "Riprova", en: "Try again" },
  score: { it: "Punti", en: "Score" },
  best: { it: "Record", en: "Best" },
  paused: { it: "In pausa", en: "Paused" },
};

function readBest() {
  try {
    return Number(window.localStorage.getItem("rr-snake-best") ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value: number) {
  try {
    window.localStorage.setItem("rr-snake-best", String(value));
  } catch {
    /* storage non disponibile: il record vale solo per questa sessione */
  }
}

function randomFood(snake: Point[]): Point {
  for (;;) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export default function Snake({ lang, accent = "#ff4fd8" }: { lang: Lang; accent?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const game = useRef({
    snake: [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }] as Point[],
    dir: { x: 1, y: 0 } as Dir,
    queue: [] as Dir[],
    food: { x: 14, y: 10 } as Point,
    score: 0,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = canvas.clientWidth;
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = size / GRID;
    ctx.fillStyle = "#07060c";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,.035)";
    for (let i = 0; i < GRID; i += 1) {
      for (let j = (i % 2); j < GRID; j += 2) ctx.fillRect(i * cell, j * cell, cell, cell);
    }
    const { snake, food } = game.current;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.fillRect(food.x * cell + cell * 0.22, food.y * cell + cell * 0.22, cell * 0.56, cell * 0.56);
    ctx.shadowColor = accent;
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#ffffff" : accent;
      ctx.globalAlpha = 1 - (i / snake.length) * 0.55;
      ctx.fillRect(s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }, [accent]);

  const reset = useCallback(() => {
    const snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    game.current = { snake, dir: { x: 1, y: 0 }, queue: [], food: randomFood(snake), score: 0 };
    setScore(0);
  }, []);

  const start = useCallback(() => {
    if (status === "over" || status === "idle") reset();
    setStatus("playing");
    wrapRef.current?.focus();
  }, [reset, status]);

  const turn = useCallback((d: Dir) => {
    const g = game.current;
    const last = g.queue[g.queue.length - 1] ?? g.dir;
    if (last.x === -d.x && last.y === -d.y) return;
    if (last.x === d.x && last.y === d.y) return;
    if (g.queue.length < 3) g.queue.push(d);
  }, []);

  // ciclo di gioco: accelera con il punteggio
  useEffect(() => {
    if (status !== "playing") return;
    let timer = 0;
    const tick = () => {
      const g = game.current;
      if (g.queue.length) g.dir = g.queue.shift()!;
      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
      const hitSelf = g.snake.some((s) => s.x === head.x && s.y === head.y);
      if (hitWall || hitSelf) {
        setStatus("over");
        if (g.score > readBest()) {
          writeBest(g.score);
          setBest(g.score);
        }
        return;
      }
      g.snake.unshift(head);
      if (head.x === g.food.x && head.y === g.food.y) {
        g.score += 10;
        setScore(g.score);
        g.food = randomFood(g.snake);
      } else {
        g.snake.pop();
      }
      draw();
      timer = window.setTimeout(tick, Math.max(55, 130 - g.score * 0.6));
    };
    timer = window.setTimeout(tick, 130);
    return () => window.clearTimeout(timer);
  }, [status, draw]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (DIRS[key]) {
      event.preventDefault();
      if (status !== "playing") start();
      turn(DIRS[key]);
    } else if (key === " ") {
      event.preventDefault();
      if (status === "playing") setStatus("paused");
      else start();
    }
  };

  // swipe sui dispositivi touch
  const touch = useRef<Point | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (status !== "playing") start();
    turn(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
  };

  return (
    <div
      ref={wrapRef}
      className="snake"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onBlur={() => status === "playing" && setStatus("paused")}
      style={{ "--snake-accent": accent } as React.CSSProperties}
    >
      <div className="snake-hud">
        <span>
          {COPY.score[lang]} <b>{score}</b>
        </span>
        <span>
          {COPY.best[lang]} <b>{best}</b>
        </span>
      </div>
      <div className="snake-board">
        <canvas ref={canvasRef} />
        {status !== "playing" && (
          <button type="button" className="snake-start" onClick={start}>
            {status === "over" ? (
              <>
                <strong>{COPY.over[lang]}</strong>
                <span>{COPY.again[lang]}</span>
              </>
            ) : status === "paused" ? (
              <strong>{COPY.paused[lang]}</strong>
            ) : (
              <strong>{COPY.start[lang]}</strong>
            )}
          </button>
        )}
      </div>
      <div className="snake-pad" aria-hidden="true">
        {(["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"] as const).map((key) => (
          <button
            key={key}
            type="button"
            tabIndex={-1}
            className={`pad-${key}`}
            onPointerDown={(event) => {
              event.preventDefault();
              if (status !== "playing") start();
              turn(DIRS[key]);
            }}
          >
            {{ ArrowUp: "▲", ArrowLeft: "◀", ArrowDown: "▼", ArrowRight: "▶" }[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
