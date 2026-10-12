import { useRef, useState } from "react";
import type { Lang } from "../content";
import type { ItemId, RoomWorld } from "../game/RoomWorld";

type Props = {
  world: RoomWorld | null;
  lang: Lang;
  prompt: string | null;
  held: ItemId | null;
};

/** Comandi per il touch: joystick a sinistra, trascinamento per guardare, pulsanti azione. */
export default function TouchControls({ world, lang, prompt, held }: Props) {
  const stick = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const stickId = useRef<number | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [crouch, setCrouch] = useState(false);

  const moveStick = (e: React.PointerEvent) => {
    const rect = stick.current!.getBoundingClientRect();
    const r = rect.width / 2;
    let dx = (e.clientX - rect.left - r) / r;
    let dy = (e.clientY - rect.top - r) / r;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    knob.current!.style.transform = `translate(${dx * r * 0.6}px, ${dy * r * 0.6}px)`;
    world?.setMoveInput(dx, -dy);
  };

  const endStick = () => {
    stickId.current = null;
    knob.current!.style.transform = "";
    world?.setMoveInput(0, 0);
  };

  const it = lang === "it";
  return (
    <div
      className="touch"
      onPointerDown={(e) => {
        if (look.current) return;
        look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const l = look.current;
        if (!l || l.id !== e.pointerId) return;
        world?.addLook((e.clientX - l.x) * 1.6, (e.clientY - l.y) * 1.6);
        l.x = e.clientX;
        l.y = e.clientY;
      }}
      onPointerUp={(e) => {
        if (look.current?.id === e.pointerId) look.current = null;
      }}
      onPointerCancel={() => (look.current = null)}
    >
      <div
        ref={stick}
        className="touch-stick"
        onPointerDown={(e) => {
          e.stopPropagation();
          stickId.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          moveStick(e);
        }}
        onPointerMove={(e) => {
          if (stickId.current === e.pointerId) moveStick(e);
        }}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      >
        <div ref={knob} className="touch-knob" />
      </div>
      <div className="touch-buttons" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`touch-btn ${crouch ? "ready" : ""}`}
          aria-pressed={crouch}
          onClick={() => {
            world?.setCrouch(!crouch);
            setCrouch(!crouch);
          }}
        >
          {it ? "Abbassati" : "Crouch"}
        </button>
        {held && (
          <>
            <button type="button" className="touch-btn" onClick={() => world?.action("throw")}>
              {it ? "Lancia" : "Throw"}
            </button>
            <button type="button" className="touch-btn" onClick={() => world?.action("use")}>
              {it ? "Usa" : "Use"}
            </button>
          </>
        )}
        <button type="button" className={`touch-btn touch-btn--main ${prompt ? "ready" : ""}`} onClick={() => world?.action("interact")}>
          {prompt ?? (it ? "Interagisci" : "Interact")}
        </button>
      </div>
    </div>
  );
}
