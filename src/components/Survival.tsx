import { useEffect, useState } from "react";
import { GAME, ITEMS, type Lang } from "../content";
import { SLOTS, type ItemId, type Slot } from "../game/RoomWorld";

/* ------------------------------ pixel art (stile Minecraft) ------------------------------ */

/** Cuore 7x6: il contorno nero si ricava dalle celle vicine. */
const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
/** Coscia 8x8: m = carne, b = osso. */
const SHANK = ["....mmm.", "...mmmmm", "..mmmmmm", "..mmmmmm", ".bmmmm..", ".bb.....", "b.b.....", ".b......"];

type Fill = "full" | "half" | "empty";

function PixelIcon({ mask, color, fill, mirror = false }: { mask: string[]; color: (ch: string, x: number, y: number) => string | null; fill: Fill; mirror?: boolean }) {
  const h = mask.length;
  const w = mask[0].length;
  const on = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && mask[y][x] !== ".";
  const rects: React.ReactNode[] = [];
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const px = (mirror ? w - 1 - x : x) + 1;
      if (on(x, y)) {
        // metà: il cuore si svuota da destra, la coscia (specchiata) da sinistra
        const filledHalf = fill === "full" || (fill === "half" && (mirror ? x >= w / 2 : x < w / 2));
        const c = filledHalf ? color(mask[y][x], x, y) : "#3a1414";
        if (c) rects.push(<rect key={`${x},${y}`} x={px} y={y + 1} width={1} height={1} fill={c} />);
      } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) {
        rects.push(<rect key={`${x},${y}`} x={px} y={y + 1} width={1} height={1} fill="#000" />);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w + 2} ${h + 2}`} width={(w + 2) * 2.25} height={(h + 2) * 2.25} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

const heartColor = (_: string, x: number, y: number) => (x === 1 && y === 1 ? "#ffb3b3" : y >= 4 ? "#a80f14" : "#e3171d");
const shankColor = (ch: string, x: number, y: number) => (ch === "b" ? "#efe6d2" : x >= 5 && y <= 1 ? "#e9a466" : y >= 3 ? "#8a4a1c" : "#b8692d");

function fills(value: number): Fill[] {
  return Array.from({ length: 10 }, (_, i) => (value >= (i + 1) * 2 ? "full" : value >= i * 2 + 1 ? "half" : "empty"));
}

/* ------------------------------ barre ------------------------------ */

/** Vita e fame alla Minecraft: solo estetiche, sempre piene (nella stanza non si muore). */
export function StatusBars({ lang }: { lang: Lang }) {
  const full = fills(20);
  return (
    <div className="bars" aria-hidden="true" title={`${GAME.health[lang]} · ${GAME.hunger[lang]}`}>
      <div className="bar bar--health">
        {full.map((f, i) => (
          <span key={i}>
            <PixelIcon mask={HEART} color={heartColor} fill={f} />
          </span>
        ))}
      </div>
      <div className="bar bar--hunger">
        {full.map((f, i) => (
          <span key={i}>
            <PixelIcon mask={SHANK} color={shankColor} fill={f} mirror />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ hotbar ------------------------------ */

export function Hotbar({
  slots,
  selected,
  icons,
  lang,
  onSelect,
}: {
  slots: Slot[];
  selected: number;
  icons: Partial<Record<ItemId, string>>;
  lang: Lang;
  onSelect: (index: number) => void;
}) {
  // il nome dell'oggetto compare per un attimo quando cambia lo slot (come in Minecraft)
  const current = slots[selected];
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!current) {
      setLabel(null);
      return;
    }
    setLabel(ITEMS[current.id].name[lang]);
    const id = window.setTimeout(() => setLabel(null), 1800);
    return () => window.clearTimeout(id);
  }, [selected, current?.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="hotbar-wrap">
      {label && (
        <p key={`${selected}-${label}`} className="hotbar-label">
          {label}
          {current && (
            <small>
              F {ITEMS[current.id].use[lang]} · G {GAME.throw[lang]}
            </small>
          )}
        </p>
      )}
      <div className="hotbar" role="listbox" aria-label={GAME.hotbar[lang]}>
        {Array.from({ length: SLOTS }, (_, i) => {
          const slot = slots[i] ?? null;
          return (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={i === selected}
              aria-label={slot ? `${i + 1}: ${ITEMS[slot.id].name[lang]}${slot.count > 1 ? ` ×${slot.count}` : ""}` : `${i + 1}`}
              className={`slot ${i === selected ? "selected" : ""}`}
              onClick={() => onSelect(i)}
            >
              <span className="slot-key">{i + 1}</span>
              {slot && icons[slot.id] && <img src={icons[slot.id]} alt="" draggable={false} />}
              {slot && !icons[slot.id] && <span className="slot-fallback">{ITEMS[slot.id].name[lang].slice(0, 2)}</span>}
              {slot && slot.count > 1 && <span className="slot-count">{slot.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
