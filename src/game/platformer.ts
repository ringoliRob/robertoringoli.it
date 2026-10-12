/**
 * "Super Ringoli": platform a scorrimento in stile anni '80 per lo schermo superiore del 3DS
 * (400 x 240). Personaggio e grafica originali, disegnati a rettangoli; nemici = "bug".
 * Passo fisso a 60 Hz, collisioni a tile da 16 px.
 */

export const VIEW_W = 400;
export const VIEW_H = 240;
const T = 16;
const ROWS = 15;
const COLS = 168;

type Tile = "" | "ground" | "brick" | "q" | "used" | "pipe" | "pipeTop" | "block";
type Enemy = { x: number; y: number; vx: number; vy: number; alive: boolean; squash: number };
type Coin = { x: number; y: number; taken: boolean };
type Pop = { x: number; y: number; t: number };

export type Input = { left: boolean; right: boolean; jump: boolean; run: boolean };
export type GameState = "play" | "dead" | "clear";

const SOLID = new Set<Tile>(["ground", "brick", "q", "used", "pipe", "pipeTop", "block"]);

function buildLevel() {
  const tiles: Tile[][] = Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill(""));
  const coins: Coin[] = [];
  const set = (x: number, y: number, t: Tile) => {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) tiles[y][x] = t;
  };
  const pits = [
    [38, 40],
    [71, 73],
    [112, 115],
  ];
  for (let x = 0; x < COLS; x++) {
    if (pits.some(([a, b]) => x >= a && x <= b)) continue;
    set(x, 13, "ground");
    set(x, 14, "ground");
  }
  // blocchi
  set(16, 9, "q");
  [19, 21, 23].forEach((x) => set(x, 9, "brick"));
  [20, 22].forEach((x) => set(x, 9, "q"));
  set(21, 5, "q");
  // tubi
  const pipe = (x: number, h: number) => {
    for (let y = 13 - h; y < 13; y++) {
      set(x, y, y === 13 - h ? "pipeTop" : "pipe");
      set(x + 1, y, y === 13 - h ? "pipeTop" : "pipe");
    }
  };
  pipe(28, 2);
  pipe(34, 3);
  pipe(46, 4);
  pipe(57, 4);
  // seconda zona: mattoni e piattaforme
  for (let x = 64; x <= 68; x++) set(x, 9, x === 66 ? "q" : "brick");
  for (let x = 78; x <= 82; x++) set(x, 9, "brick");
  for (let x = 86; x <= 91; x++) set(x, 6, x === 88 ? "q" : "brick");
  set(98, 9, "q");
  set(102, 9, "q");
  set(102, 5, "q");
  set(106, 9, "q");
  // scalinate
  const stairs = (x0: number, n: number, dir: 1 | -1) => {
    for (let i = 0; i < n; i++) {
      const h = dir === 1 ? i + 1 : n - i;
      for (let y = 13 - h; y < 13; y++) set(x0 + i, y, "block");
    }
  };
  stairs(120, 4, 1);
  stairs(126, 4, -1);
  stairs(136, 8, 1);
  // monete
  const arc = (x0: number, x1: number, y: number) => {
    for (let x = x0; x <= x1; x++) coins.push({ x: x * T + 4, y: (y - Math.sin(((x - x0) / Math.max(1, x1 - x0)) * Math.PI) * 2) * T + 4, taken: false });
  };
  arc(37, 41, 9);
  arc(70, 74, 9);
  arc(111, 116, 8);
  arc(86, 91, 4);
  arc(8, 11, 10);
  const enemies: Enemy[] = [24, 33, 50, 53, 66, 80, 95, 100, 108, 118, 132].map((x) => ({
    x: x * T,
    y: (x === 80 ? 8 : 12) * T,
    vx: -0.45,
    vy: 0,
    alive: true,
    squash: 0,
  }));
  return { tiles, coins, enemies, flagX: 154 * T, castleX: 159 * T };
}

export class Platformer {
  state: GameState = "play";
  coins = 0;
  time = 0;
  private level = buildLevel();
  private p = { x: 3 * T, y: 11 * T, vx: 0, vy: 0, w: 12, h: 15, onGround: false, face: 1, anim: 0 };
  private camX = 0;
  private jumpHeld = false;
  private deadT = 0;
  private clearT = 0;
  private flagY = 4 * T;
  private pops: Pop[] = [];
  private bumps = new Map<string, number>();
  private frame = 0;

  /** Avanza di un fotogramma (1/60 s). Restituisce true quando il livello è completato. */
  step(input: Input) {
    this.frame++;
    if (this.state === "dead") {
      this.deadT++;
      this.p.vy += 0.35;
      this.p.y += this.p.vy;
      if (this.deadT > 90) this.respawn();
      return false;
    }
    if (this.state === "clear") {
      this.clearT++;
      if (this.flagY < 12 * T) this.flagY += 2;
      // scende dall'asta e cammina verso il castello
      if (this.p.y < 12 * T - this.p.h) this.p.y = Math.min(12 * T - this.p.h + 16, this.p.y + 2);
      else if (this.p.x < this.level.castleX + 8) {
        this.p.x += 1.2;
        this.p.anim += 0.2;
      }
      return this.clearT === 150;
    }
    this.time += 1 / 60;

    // movimento orizzontale con inerzia
    const p = this.p;
    const max = input.run ? 2.7 : 1.7;
    const acc = p.onGround ? 0.12 : 0.08;
    if (input.left) p.vx = Math.max(-max, p.vx - acc);
    else if (input.right) p.vx = Math.min(max, p.vx + acc);
    else p.vx *= p.onGround ? 0.82 : 0.96;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    if (p.vx) p.face = Math.sign(p.vx);
    // salto variabile: rilasciare presto taglia il salto
    if (input.jump && !this.jumpHeld && p.onGround) {
      p.vy = -6.1 - Math.abs(p.vx) * 0.25;
      p.onGround = false;
    }
    if (!input.jump && p.vy < -2.4) p.vy = -2.4;
    this.jumpHeld = input.jump;
    p.vy = Math.min(7, p.vy + (input.jump ? 0.3 : 0.42));

    p.x += p.vx;
    this.collideX();
    p.y += p.vy;
    p.onGround = false;
    this.collideY();
    p.x = Math.max(this.camX, p.x);
    p.anim += Math.abs(p.vx) * 0.12;
    if (p.y > VIEW_H + 20) return this.die();

    // monete
    for (const c of this.level.coins) {
      if (!c.taken && p.x < c.x + 8 && p.x + p.w > c.x && p.y < c.y + 8 && p.y + p.h > c.y) {
        c.taken = true;
        this.coins++;
      }
    }
    // nemici
    for (const e of this.level.enemies) {
      if (!e.alive) {
        if (e.squash > 0) e.squash--;
        continue;
      }
      if (e.x > this.camX + VIEW_W + 32) continue; // si muovono solo quando entrano in scena
      e.vy = Math.min(6, e.vy + 0.35);
      e.x += e.vx;
      if (this.solidAt(e.x + (e.vx < 0 ? 0 : 14), e.y + 8)) e.vx = -e.vx;
      e.y += e.vy;
      if (this.solidAt(e.x + 2, e.y + 16) || this.solidAt(e.x + 13, e.y + 16)) {
        e.y = Math.floor((e.y + 16) / T) * T - 16;
        e.vy = 0;
      }
      if (e.y > VIEW_H + 40) e.alive = false;
      const hit = p.x < e.x + 14 && p.x + p.w > e.x + 2 && p.y < e.y + 16 && p.y + p.h > e.y + 4;
      if (!hit) continue;
      if (p.vy > 0.5 && p.y + p.h - e.y < 10) {
        e.alive = false;
        e.squash = 30;
        p.vy = input.jump ? -6 : -3.8;
      } else return this.die();
    }
    // bandiera
    if (p.x + p.w >= this.level.flagX + 4) {
      this.state = "clear";
      p.vx = 0;
      p.x = this.level.flagX - 6;
    }
    for (const pop of this.pops) pop.t++;
    this.pops = this.pops.filter((pop) => pop.t < 30);
    for (const [k, v] of this.bumps) v > 0 ? this.bumps.set(k, v - 1) : this.bumps.delete(k);
    const target = p.x - VIEW_W * 0.4;
    this.camX = Math.max(this.camX, Math.min(target, COLS * T - VIEW_W));
    return false;
  }

  private die() {
    this.state = "dead";
    this.deadT = 0;
    this.p.vy = -5;
    return false;
  }

  private respawn() {
    const coins = this.coins;
    const time = this.time;
    // riparte dall'inizio o dal tubo a metà livello
    const checkpoint = this.p.x > 72 * T ? 76 * T : 3 * T;
    this.level = buildLevel();
    this.coins = coins;
    this.time = time;
    this.p = { x: checkpoint, y: 11 * T, vx: 0, vy: 0, w: 12, h: 15, onGround: false, face: 1, anim: 0 };
    this.camX = Math.max(0, checkpoint - VIEW_W * 0.4);
    // i nemici già superati non ricompaiono alle spalle
    this.level.enemies.forEach((e) => {
      if (e.x < checkpoint + 64) e.alive = false;
    });
    this.state = "play";
  }

  private tileAt(px: number, py: number): Tile {
    const tx = Math.floor(px / T);
    const ty = Math.floor(py / T);
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return "";
    return this.level.tiles[ty][tx];
  }

  private solidAt(px: number, py: number) {
    return SOLID.has(this.tileAt(px, py));
  }

  private collideX() {
    const p = this.p;
    for (const y of [p.y + 1, p.y + p.h - 1]) {
      if (p.vx > 0 && this.solidAt(p.x + p.w, y)) {
        p.x = Math.floor((p.x + p.w) / T) * T - p.w - 0.01;
        p.vx = 0;
      } else if (p.vx < 0 && this.solidAt(p.x, y)) {
        p.x = Math.floor(p.x / T + 1) * T + 0.01;
        p.vx = 0;
      }
    }
  }

  private collideY() {
    const p = this.p;
    const xs = [p.x + 1, p.x + p.w - 1];
    if (p.vy >= 0) {
      if (xs.some((x) => this.solidAt(x, p.y + p.h))) {
        p.y = Math.floor((p.y + p.h) / T) * T - p.h;
        p.vy = 0;
        p.onGround = true;
      }
    } else {
      // testata: dal blocco "?" esce una moneta, i mattoni sobbalzano
      const x = p.x + p.w / 2;
      const head = this.tileAt(x, p.y);
      if (SOLID.has(head) || xs.some((xx) => this.solidAt(xx, p.y))) {
        const tx = Math.floor(x / T);
        const ty = Math.floor(p.y / T);
        if (head === "q") {
          this.level.tiles[ty][tx] = "used";
          this.coins++;
          this.pops.push({ x: tx * T + 4, y: ty * T - 12, t: 0 });
        }
        if (head === "q" || head === "brick") this.bumps.set(`${tx},${ty}`, 8);
        p.y = Math.floor(p.y / T + 1) * T;
        p.vy = 1;
      }
    }
  }

  /* ------------------------------ disegno ------------------------------ */

  draw(ctx: CanvasRenderingContext2D) {
    const cam = Math.floor(this.camX);
    // cielo, nuvole e colline con parallasse
    ctx.fillStyle = "#6b8cff";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 12; i++) {
      const x = ((i * 157 - cam * 0.3) % 1900 + 1900) % 1900 - 100;
      const y = 30 + ((i * 37) % 60);
      ctx.fillRect(x, y, 40, 10);
      ctx.fillRect(x + 8, y - 6, 24, 8);
    }
    ctx.fillStyle = "#3aa64a";
    for (let i = 0; i < 10; i++) {
      const x = ((i * 241 - cam * 0.55) % 2400 + 2400) % 2400 - 120;
      ctx.beginPath();
      ctx.ellipse(x, 208, 70, 46 + (i % 3) * 12, 0, Math.PI, 0);
      ctx.fill();
    }
    // tile
    const x0 = Math.floor(cam / T);
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx < x0 + VIEW_W / T + 2; tx++) {
        const tile = this.level.tiles[ty]?.[tx];
        if (!tile) continue;
        const bump = this.bumps.get(`${tx},${ty}`) ?? 0;
        this.drawTile(ctx, tile, tx * T - cam, ty * T - Math.sin((bump / 8) * Math.PI) * 4, tx, ty);
      }
    }
    // bandiera e castello
    const fx = this.level.flagX - cam;
    ctx.fillStyle = "#9be15d";
    ctx.fillRect(fx + 6, 3 * T, 3, 10 * T);
    ctx.fillStyle = "#2b8a3e";
    ctx.beginPath();
    ctx.arc(fx + 7.5, 3 * T, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath();
    ctx.moveTo(fx + 6, this.flagY);
    ctx.lineTo(fx - 14, this.flagY + 8);
    ctx.lineTo(fx + 6, this.flagY + 16);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px monospace";
    ctx.fillText("R", fx - 4, this.flagY + 11);
    const cx = this.level.castleX - cam;
    ctx.fillStyle = "#b5532a";
    ctx.fillRect(cx - 24, 8 * T, 80, 5 * T);
    ctx.fillRect(cx - 8, 5 * T, 48, 3 * T);
    ctx.fillStyle = "#000";
    ctx.fillRect(cx + 8, 10 * T, 16, 3 * T);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#b5532a";
      ctx.fillRect(cx - 24 + i * 17, 7.4 * T, 10, 10);
    }
    // monete
    for (const c of this.level.coins) {
      if (c.taken) continue;
      const w = Math.abs(Math.cos(this.frame * 0.08 + c.x)) * 6 + 2;
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(c.x - cam + 4 - w / 2, c.y, w, 9);
      ctx.fillStyle = "#c88a00";
      ctx.fillRect(c.x - cam + 4 - w / 4, c.y + 2, Math.max(1, w / 2), 5);
    }
    for (const pop of this.pops) {
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(pop.x - cam + 2, pop.y - pop.t * 1.2, 6, 9);
    }
    // nemici: piccoli "bug" verdi con le zampette
    for (const e of this.level.enemies) {
      if (!e.alive && e.squash <= 0) continue;
      const ex = Math.round(e.x - cam);
      if (ex < -20 || ex > VIEW_W + 20) continue;
      const ey = Math.round(e.y);
      if (!e.alive) {
        ctx.fillStyle = "#2f9e44";
        ctx.fillRect(ex + 1, ey + 12, 14, 4);
        continue;
      }
      const leg = Math.floor(this.frame / 8) % 2;
      ctx.fillStyle = "#1b1b1b";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(ex + 2 + i * 5, ey + 13 + ((i + leg) % 2), 2, 3);
      }
      ctx.fillStyle = "#2f9e44";
      ctx.fillRect(ex + 1, ey + 4, 14, 10);
      ctx.fillRect(ex + 3, ey + 2, 10, 2);
      ctx.fillStyle = "#1e6b2e";
      ctx.fillRect(ex + 7, ey + 4, 2, 10);
      ctx.fillStyle = "#fff";
      ctx.fillRect(ex + (e.vx < 0 ? 2 : 10), ey + 5, 4, 4);
      ctx.fillStyle = "#000";
      ctx.fillRect(ex + (e.vx < 0 ? 2 : 12), ey + 6, 2, 2);
      ctx.fillStyle = "#1b1b1b";
      ctx.fillRect(ex + 4, ey, 1, 3);
      ctx.fillRect(ex + 11, ey, 1, 3);
    }
    this.drawPlayer(ctx, cam);
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number, tx: number, ty: number) {
    switch (tile) {
      case "ground":
        ctx.fillStyle = "#c46b2d";
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(x, y + (ty === 13 ? 0 : 7), T, 1);
        ctx.fillRect(x + ((tx + ty) % 2 ? 4 : 11), y, 1, T);
        if (ty === 13) {
          ctx.fillStyle = "#3aa64a";
          ctx.fillRect(x, y, T, 3);
        }
        break;
      case "brick":
        ctx.fillStyle = "#b5532a";
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#5a2410";
        ctx.fillRect(x, y + 7, T, 1);
        ctx.fillRect(x, y + 15, T, 1);
        ctx.fillRect(x + 7, y, 1, 7);
        ctx.fillRect(x + 3, y + 8, 1, 7);
        ctx.fillRect(x + 12, y + 8, 1, 7);
        break;
      case "q": {
        const glow = Math.floor(this.frame / 12) % 3;
        ctx.fillStyle = ["#ffb000", "#ffc933", "#e69500"][glow];
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#7a3b00";
        ctx.fillRect(x, y + 15, T, 1);
        ctx.fillRect(x + 15, y, 1, T);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.fillText("?", x + 4, y + 12);
        break;
      }
      case "used":
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#5a3415";
        ctx.fillRect(x + 1, y + 1, 2, 2);
        ctx.fillRect(x + 13, y + 13, 2, 2);
        break;
      case "block":
        ctx.fillStyle = "#9a6b3a";
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#c79a62";
        ctx.fillRect(x, y, T, 2);
        ctx.fillRect(x, y, 2, T);
        ctx.fillStyle = "#5a3a1a";
        ctx.fillRect(x, y + 14, T, 2);
        ctx.fillRect(x + 14, y, 2, T);
        break;
      case "pipe":
      case "pipeTop": {
        const left = this.level.tiles[ty][tx - 1] === tile;
        ctx.fillStyle = "#2b9b3c";
        const inset = tile === "pipe" ? 2 : 0;
        ctx.fillRect(x + (left ? 0 : inset), y, T - inset, T);
        ctx.fillStyle = "#7ee08a";
        if (!left) ctx.fillRect(x + inset + 3, y, 3, T);
        ctx.fillStyle = "#145c22";
        if (left) ctx.fillRect(x + T - inset - 2, y, 2, T);
        if (tile === "pipeTop") {
          ctx.fillStyle = "#145c22";
          ctx.fillRect(x, y + T - 2, T, 2);
        }
        break;
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, cam: number) {
    const p = this.p;
    if (this.state === "clear" && p.x > this.level.castleX + 6) return; // entrato nel castello
    const x = Math.round(p.x - cam) - 2;
    const y = Math.round(p.y) - 1;
    const f = p.face;
    const px = (dx: number, dy: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(f > 0 ? x + dx : x + 16 - dx - w, y + dy, w, h);
    };
    const run = p.onGround ? Math.floor(p.anim) % 3 : 1;
    // cappellino arancione, maglia viola, salopette blu (personaggio originale)
    px(4, 0, 8, 3, "#ff8c1a");
    px(10, 2, 4, 2, "#ff8c1a");
    px(4, 3, 8, 5, "#ffcc99");
    px(9, 4, 2, 2, "#1b1b1b");
    px(3, 3, 2, 3, "#5a2a0a");
    px(5, 7, 6, 1, "#5a2a0a");
    px(3, 8, 10, 4, "#7c3aed");
    px(5, 9, 6, 5, "#1e3a8a");
    px(6, 10, 1, 1, "#ffd60a");
    px(9, 10, 1, 1, "#ffd60a");
    px(1, 9, 2, 3, "#ffcc99");
    px(13, 9, 2, 3, "#ffcc99");
    if (!p.onGround) {
      px(3, 14, 4, 2, "#5a2a0a");
      px(10, 13, 4, 2, "#5a2a0a");
    } else if (run === 0) {
      px(3, 14, 4, 2, "#5a2a0a");
      px(9, 14, 4, 2, "#5a2a0a");
    } else {
      px(2 + run, 14, 4, 2, "#5a2a0a");
      px(10 - run, 14, 4, 2, "#5a2a0a");
    }
  }

  /** Avanzamento verso la bandiera (0..1). */
  progress() {
    return Math.min(1, this.p.x / this.level.flagX);
  }
}
