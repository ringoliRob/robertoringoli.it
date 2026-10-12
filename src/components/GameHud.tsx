import { useEffect, useState } from "react";
import { GAME, PARTS, type Lang, type RouteId } from "../content";
import LangSwitch from "./LangSwitch";

/** Schermata d'ingresso e di pausa: titolo, comandi e scorciatoie alle sezioni. */
export function StartScreen({
  lang,
  setLang,
  loaded,
  resumed,
  touch,
  onStart,
  onNavigate,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  loaded: boolean;
  resumed: boolean;
  touch: boolean;
  onStart: () => void;
  onNavigate: (id: RouteId) => void;
}) {
  return (
    <div className="start" onClick={loaded ? onStart : undefined}>
      <div className="start-card" onClick={(e) => e.stopPropagation()}>
        <header className="start-top">
          <div>
            <p className="brand-name">Roberto Ringoli</p>
            <h1>{GAME.title[lang]}</h1>
          </div>
          <LangSwitch lang={lang} setLang={setLang} />
        </header>
        <p className="start-intro">{GAME.intro[lang]}</p>
        {!touch && (
          <div className="start-keys" aria-label={GAME.controls[lang]}>
            {GAME.keys.map((key) => (
              <p key={key.k}>
                <kbd>{key.k}</kbd>
                <span>{key.v[lang]}</span>
              </p>
            ))}
          </div>
        )}
        <button type="button" className="start-go" disabled={!loaded} onClick={onStart}>
          {!loaded ? GAME.loading[lang] : touch ? GAME.tapStart[lang] : resumed ? GAME.resume[lang] : GAME.start[lang]}
        </button>
        <nav className="start-sections">
          <p>{GAME.skip[lang]}</p>
          <div>
            <button type="button" style={{ "--chip": PARTS.os.accent } as React.CSSProperties} onClick={() => onNavigate("os")}>
              <span className="chip">{PARTS.os.chip}</span>
              {GAME.toComputer[lang]}
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

/** Mirino al centro e azione disponibile sotto. */
export function Crosshair({ prompt, touch }: { prompt: string | null; touch: boolean }) {
  return (
    <>
      <div className={`crosshair ${prompt ? "active" : ""}`} aria-hidden="true" />
      {prompt && (
        <p className="prompt" role="status">
          {!touch && <kbd>E</kbd>}
          {prompt}
        </p>
      )}
    </>
  );
}

/** Box di dialogo stile Pokémon, con il testo che compare una lettera alla volta. */
export function OakDialog({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const text = GAME.oak[lang];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), 28);
    return () => window.clearInterval(id);
  }, [text]);
  const done = shown >= text.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !["KeyE", "Enter", "Space", "Escape"].includes(e.code)) return;
      e.preventDefault();
      if (done) onClose();
      else setShown(text.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, onClose, text.length]);

  return (
    <div className="oak" role="dialog" aria-label={GAME.oakName[lang]} onClick={() => (done ? onClose() : setShown(text.length))}>
      <div className="oak-box">
        <p className="oak-name">{GAME.oakName[lang]}</p>
        <p className="oak-text">{text.slice(0, shown)}</p>
        {done && <span className="oak-next" aria-label={GAME.close[lang]}>▼</span>}
      </div>
    </div>
  );
}
