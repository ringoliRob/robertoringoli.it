import { useEffect, useRef, type ReactNode } from "react";
import { PART_IDS, PARTS, UI, type Lang, type PartId } from "../content";
import LangSwitch from "../components/LangSwitch";

type Props = {
  id: PartId;
  lang: Lang;
  setLang: (lang: Lang) => void;
  onBack: () => void;
  onNavigate: (id: PartId) => void;
  children: ReactNode;
};

export default function PageShell({ id, lang, setLang, onBack, onNavigate, children }: Props) {
  const part = PARTS[id];
  const scrollRef = useRef<HTMLDivElement>(null);
  const next = PART_IDS[(PART_IDS.indexOf(id) + 1) % PART_IDS.length];

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    scrollRef.current?.focus({ preventScroll: true });
  }, [id]);

  return (
    <div
      ref={scrollRef}
      className={`page page--${id}`}
      style={{ "--accent": part.accent, "--page-bg": part.bg } as React.CSSProperties}
      tabIndex={-1}
    >
      <header className="page-bar">
        <button type="button" className="page-back" onClick={onBack}>
          <span aria-hidden="true">←</span> {UI.back[lang]}
        </button>
        <p className="page-crumb" aria-hidden="true">
          PC <span>/</span> {part.chip} <span>/</span> <b>{part.section[lang]}</b>
        </p>
        <LangSwitch lang={lang} setLang={setLang} />
      </header>

      <main className="page-main">{children}</main>

      <footer className="page-foot">
        <nav aria-label={UI.index[lang]}>
          {PART_IDS.map((pid) => (
            <button
              key={pid}
              type="button"
              className={pid === id ? "active" : ""}
              aria-current={pid === id ? "page" : undefined}
              onClick={() => pid !== id && onNavigate(pid)}
              style={{ "--chip": PARTS[pid].accent } as React.CSSProperties}
            >
              <span>{PARTS[pid].chip}</span>
              {PARTS[pid].section[lang]}
            </button>
          ))}
        </nav>
        <button type="button" className="page-next" onClick={() => onNavigate(next)}>
          {UI.next[lang]}: <b>{PARTS[next].chip} · {PARTS[next].section[lang]}</b> <span aria-hidden="true">→</span>
        </button>
      </footer>
    </div>
  );
}
