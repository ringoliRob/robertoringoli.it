import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Snake from "../components/Snake";
import { CPU, EXAMS, OS, PARTS, PROJECTS, RAM, type Lang, type PartId } from "../content";
import { GITHUB_PROFILE, LANGUAGE_COLORS, useGithubRepos, type Repo } from "./github";
import Terminal from "./Terminal";

type AppId = "terminal" | "about" | "exams" | "snake" | "projects";
type Win = { app: AppId; x: number; y: number; z: number };

type Props = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  onExit: () => void;
  onShutdown: () => void;
  onOpenPart: (id: PartId) => void;
};

const ICONS: { app: AppId | "cazzeggio"; glyph: string; color: string }[] = [
  { app: "terminal", glyph: ">_", color: "#2b2f3a" },
  { app: "about", glyph: "RR", color: PARTS.cpu.accent },
  { app: "exams", glyph: "0x", color: PARTS.ram.accent },
  { app: "snake", glyph: "▚", color: PARTS.gpu.accent },
  { app: "projects", glyph: "▤", color: PARTS.ssd.accent },
  { app: "cazzeggio", glyph: "CZ", color: "#63ead8" },
];

const SIZES: Record<AppId, { w: number; h: number }> = {
  terminal: { w: 640, h: 400 },
  about: { w: 520, h: 440 },
  exams: { w: 560, h: 460 },
  snake: { w: 420, h: 560 },
  projects: { w: 560, h: 420 },
};

function FolderIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 40" width="48" height="40" aria-hidden="true">
      <path d="M2 8a4 4 0 0 1 4-4h12l5 5h19a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill={color} opacity="0.85" />
      <path d="M2 14h44v20a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill={color} />
      <path d="M17 22l-4 4 4 4M31 22l4 4-4 4M26 20l-4 12" stroke="#0b0b12" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

function repoDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function RepoMeta({ repo, lang }: { repo: Repo; lang: Lang }) {
  return (
    <p className="os-repo-meta">
      {repo.language && (
        <span>
          <i style={{ background: LANGUAGE_COLORS[repo.language] ?? "#8b8b8b" }} />
          {repo.language}
        </span>
      )}
      <span>
        ★ {repo.stars} {OS.stars[lang]}
      </span>
      <span>
        {OS.updated[lang]} {repoDate(repo.pushedAt, lang)}
      </span>
    </p>
  );
}

function Clock({ lang }: { lang: Lang }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <time dateTime={now.toISOString()}>
      {now.toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
    </time>
  );
}

export default function RingoliOS({ lang, setLang, onExit, onShutdown, onOpenPart }: Props) {
  // su telefono le finestre sono a schermo intero: si parte dal desktop con le icone
  const [wins, setWins] = useState<Win[]>(() =>
    window.innerWidth < 720 ? [] : [{ app: "terminal", x: 0, y: 0, z: 1 }],
  );
  const [menu, setMenu] = useState(false);
  const zTop = useRef(1);
  const deskRef = useRef<HTMLDivElement>(null);
  const github = useGithubRepos();

  // centra la prima finestra rispetto al desktop
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;
    setWins((prev) =>
      prev.map((w) => ({
        ...w,
        x: Math.max(110, (desk.clientWidth - SIZES[w.app].w) / 2),
        y: Math.max(24, (desk.clientHeight - SIZES[w.app].h) / 2 - 20),
      })),
    );
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focus = useCallback((app: AppId) => {
    zTop.current += 1;
    const z = zTop.current;
    setWins((prev) => prev.map((w) => (w.app === app ? { ...w, z } : w)));
  }, []);

  const open = useCallback(
    (app: AppId | "cazzeggio") => {
      setMenu(false);
      if (app === "cazzeggio") {
        window.open("https://cazzeggia.online", "_blank", "noopener");
        return;
      }
      setWins((prev) => {
        zTop.current += 1;
        if (prev.some((w) => w.app === app)) return prev.map((w) => (w.app === app ? { ...w, z: zTop.current } : w));
        const desk = deskRef.current;
        const offset = (prev.length % 5) * 28;
        const x = desk ? Math.max(110, Math.min(desk.clientWidth - SIZES[app].w - 16, 150 + offset * 2)) : 140;
        const y = desk ? Math.max(16, Math.min(desk.clientHeight - SIZES[app].h - 16, 40 + offset)) : 40;
        return [...prev, { app, x, y, z: zTop.current }];
      });
    },
    [],
  );

  const close = (app: AppId) => setWins((prev) => prev.filter((w) => w.app !== app));

  const drag = (app: AppId, event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    focus(app);
    const win = wins.find((w) => w.app === app);
    if (!win || window.innerWidth < 720) return;
    const el = event.currentTarget as HTMLElement;
    el.setPointerCapture(event.pointerId);
    const sx = event.clientX - win.x;
    const sy = event.clientY - win.y;
    const move = (e: PointerEvent) => {
      const desk = deskRef.current!;
      setWins((prev) =>
        prev.map((w) =>
          w.app === app
            ? {
                ...w,
                x: Math.min(desk.clientWidth - 80, Math.max(-SIZES[app].w + 120, e.clientX - sx)),
                y: Math.min(desk.clientHeight - 40, Math.max(0, e.clientY - sy)),
              }
            : w,
        ),
      );
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  const content = (app: AppId): ReactNode => {
    switch (app) {
      case "terminal":
        return (
          <Terminal
            lang={lang}
            setLang={setLang}
            openApp={open}
            openPart={onOpenPart}
            onExit={onExit}
            onShutdown={onShutdown}
          />
        );
      case "about":
        return (
          <div className="os-doc">
            <h2>{CPU.title}</h2>
            <p>{CPU.lead[lang]}</p>
            {CPU.cores.map((c) => (
              <p key={c.title.en}>
                <b>{c.title[lang]}.</b> {c.body[lang]}
              </p>
            ))}
            <p>{CPU.bio[lang]}</p>
            <button type="button" className="os-link" onClick={() => onOpenPart("cpu")}>
              {PARTS.cpu.chip} · {PARTS.cpu.section[lang]} →
            </button>
          </div>
        );
      case "exams":
        return (
          <div className="os-doc os-table">
            <table>
              <tbody>
                {EXAMS.map((e, i) => (
                  <tr key={e.name.en}>
                    <td>
                      <code>0x{(i * 0x100).toString(16).padStart(4, "0")}</code>
                    </td>
                    <td>{e.name[lang]}</td>
                    <td>
                      <span>{e.tag}</span>
                    </td>
                  </tr>
                ))}
                <tr className="next">
                  <td>
                    <code>0x0a00</code>
                  </td>
                  <td>{RAM.next}</td>
                  <td>
                    <span>MSc</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="button" className="os-link" onClick={() => onOpenPart("ram")}>
              {PARTS.ram.chip} · {PARTS.ram.section[lang]} →
            </button>
          </div>
        );
      case "snake":
        return (
          <div className="os-snake">
            <Snake lang={lang} accent={PARTS.gpu.accent} />
          </div>
        );
      case "projects":
        return (
          <div className="os-doc">
            <h2>{OS.github[lang]}</h2>
            {github.status === "loading" && <p className="os-muted">{OS.githubLoading[lang]}</p>}
            {github.status === "error" && <p className="os-muted">{OS.githubError[lang]}</p>}
            {github.repos.map((repo) => (
              <div key={repo.name} className="os-project">
                <code>{repo.name}/</code>
                {repo.description && <p>{repo.description}</p>}
                <RepoMeta repo={repo} lang={lang} />
                <a href={repo.url} target="_blank" rel="noreferrer">
                  {repo.url.replace("https://", "")} ↗
                </a>
                {repo.homepage && (
                  <a href={repo.homepage} target="_blank" rel="noreferrer">
                    {repo.homepage.replace(/^https?:\/\//, "")} ↗
                  </a>
                )}
              </div>
            ))}
            <a className="os-link" href={GITHUB_PROFILE} target="_blank" rel="noreferrer">
              {OS.githubProfile[lang]} ↗
            </a>
            <h2>{OS.otherProjects[lang]}</h2>
            {PROJECTS.map((p) => (
              <div key={p.file} className="os-project">
                <code>{p.file}</code>
                <p>{p.body[lang]}</p>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.url.replace("https://", "")} ↗
                  </a>
                )}
              </div>
            ))}
            <button type="button" className="os-link" onClick={() => onOpenPart("ssd")}>
              {PARTS.ssd.chip} · {PARTS.ssd.section[lang]} →
            </button>
          </div>
        );
    }
  };

  const title = (app: AppId) => (app === "terminal" ? "rrsh — roberto@ringoli-pc" : OS.apps[app][lang]);

  return (
    <div className="os" style={{ "--accent": PARTS.os.accent } as React.CSSProperties}>
      <div className="os-desk" ref={deskRef} onPointerDown={() => setMenu(false)}>
        <div className="os-wallpaper" aria-hidden="true" />
        <ul className="os-icons">
          {ICONS.map((icon) => (
            <li key={icon.app}>
              <button type="button" onClick={() => open(icon.app)}>
                <span style={{ background: icon.color }}>{icon.glyph}</span>
                {OS.apps[icon.app][lang]}
              </button>
            </li>
          ))}
        </ul>

        {github.repos.length > 0 && (
          <section className="os-repos" aria-label={OS.githubHint[lang]}>
            <p>
              <span aria-hidden="true">⌥</span> {OS.github[lang]}
            </p>
            <ul>
              {github.repos.map((repo) => (
                <li key={repo.name}>
                  <a href={repo.url} target="_blank" rel="noreferrer" title={repo.description ?? repo.name}>
                    <FolderIcon color={LANGUAGE_COLORS[repo.language ?? ""] ?? "#8b7bff"} />
                    <span>{repo.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {wins.map((win) => (
          <section
            key={win.app}
            className={`os-window os-window--${win.app}`}
            style={{ left: win.x, top: win.y, zIndex: win.z, width: SIZES[win.app].w, height: SIZES[win.app].h }}
            onPointerDown={() => focus(win.app)}
            aria-label={title(win.app)}
          >
            <header onPointerDown={(event) => drag(win.app, event)}>
              <span className="os-dots">
                <button type="button" aria-label="Close" onClick={() => close(win.app)} />
                <i />
                <i />
              </span>
              <p>{title(win.app)}</p>
            </header>
            <div className="os-window-body">{content(win.app)}</div>
          </section>
        ))}
      </div>

      <nav className="os-taskbar">
        <button
          type="button"
          className="os-start"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
          aria-label="Menu"
        >
          R
        </button>
        <div className="os-tasks">
          {wins.map((w) => (
            <button key={w.app} type="button" onClick={() => focus(w.app)}>
              {OS.apps[w.app][lang]}
            </button>
          ))}
        </div>
        <Clock lang={lang} />
        <button type="button" className="os-exit" onClick={onExit}>
          {OS.exit[lang]}
        </button>
      </nav>

      {menu && (
        <div className="os-menu" role="menu">
          <p>{OS.welcome[lang]}</p>
          {ICONS.map((icon) => (
            <button key={icon.app} type="button" role="menuitem" onClick={() => open(icon.app)}>
              <span style={{ background: icon.color }}>{icon.glyph}</span>
              {OS.apps[icon.app][lang]}
            </button>
          ))}
          <hr />
          <button type="button" role="menuitem" onClick={onExit}>
            <span>↩</span>
            {OS.exit[lang]}
          </button>
          <button type="button" role="menuitem" onClick={onShutdown}>
            <span>⏻</span>
            {OS.shutdown[lang]}
          </button>
        </div>
      )}
    </div>
  );
}
