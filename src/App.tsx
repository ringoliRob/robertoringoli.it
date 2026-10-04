import { useCallback, useEffect, useRef, useState } from "react";
import DiveOverlay, { type DiveOverlayHandle } from "./components/DiveOverlay";
import LangSwitch from "./components/LangSwitch";
import { PART_IDS, PARTS, ROUTE_IDS, UI, type Lang, type PartId, type RouteId } from "./content";
import RingoliOS from "./os/RingoliOS";
import CpuPage from "./pages/CpuPage";
import GpuPage from "./pages/GpuPage";
import PageShell from "./pages/PageShell";
import PsuPage from "./pages/PsuPage";
import RamPage from "./pages/RamPage";
import SsdPage from "./pages/SsdPage";
import type { PickId } from "./scene/buildPC";
import { PCWorld } from "./scene/PCWorld";

const PAGES: Record<PartId, (props: { lang: Lang }) => React.ReactNode> = {
  cpu: CpuPage,
  ram: RamPage,
  gpu: GpuPage,
  ssd: SsdPage,
  psu: PsuPage,
};

function parseHash(): RouteId | null {
  const id = window.location.hash.replace(/^#\/?/, "");
  return (ROUTE_IDS as string[]).includes(id) ? (id as RouteId) : null;
}

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem("rr-lang");
    if (saved === "it" || saved === "en") return saved;
  } catch {
    /* storage non disponibile */
  }
  return window.navigator.language.toLowerCase().startsWith("it") ? "it" : "en";
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<PCWorld | null>(null);
  const overlayRef = useRef<DiveOverlayHandle>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<RouteId | null>(parseHash());
  const busy = useRef(false);

  const [lang, setLang] = useState<Lang>(initialLang);
  const [route, setRoute] = useState<RouteId | null>(routeRef.current);
  const [powered, setPowered] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [hovered, setHovered] = useState<PickId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  const [diving, setDiving] = useState(false);
  const [touch] = useState(() => window.matchMedia("(hover: none)").matches);

  /* ------------------------------ transizioni ------------------------------ */

  const openRoute = async (id: RouteId) => {
    const world = worldRef.current;
    const part = PARTS[id];
    setDiving(true);
    if (world) {
      if (id === "os" && !world.isPowered()) {
        world.setPowered(true);
        setPowered(true);
      }
      world.setPaused(false);
      await world.dive(id);
    }
    await overlayRef.current?.enter(part.accent, part.bg);
    setDiving(false);
    routeRef.current = id;
    setRoute(id);
    await nextFrame();
    world?.setPaused(true);
    await overlayRef.current?.reveal();
  };

  const swapRoute = async (id: RouteId) => {
    const part = PARTS[id];
    await overlayRef.current?.enter(part.accent, part.bg);
    routeRef.current = id;
    setRoute(id);
    await nextFrame();
    await overlayRef.current?.reveal();
  };

  const closeRoute = async (from: RouteId) => {
    const world = worldRef.current;
    const part = PARTS[from];
    const done = overlayRef.current?.exit(part.accent, part.bg);
    routeRef.current = null;
    setRoute(null);
    if (world) {
      world.setPaused(false);
      world.undive(from);
    }
    await done;
  };

  const sync = useCallback(async () => {
    if (busy.current) return;
    const want = parseHash();
    const have = routeRef.current;
    if (want === have) return;
    busy.current = true;
    try {
      if (want && !have) await openRoute(want);
      else if (!want && have) await closeRoute(have);
      else if (want && have) await swapRoute(want);
    } finally {
      busy.current = false;
    }
    // l'utente potrebbe aver navigato di nuovo durante l'animazione
    if (parseHash() !== routeRef.current) void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback(
    (id: RouteId | null) => {
      if (busy.current) return;
      const url = id ? `#/${id}` : window.location.pathname + window.location.search;
      window.history.pushState(null, "", url);
      void sync();
    },
    [sync],
  );

  useEffect(() => {
    const onNav = () => void sync();
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, [sync]);

  /* ------------------------------ scena 3D ------------------------------ */

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((current) => (current === text ? null : current)), 3200);
  }, []);

  const handlePick = useRef<(pick: PickId) => void>(() => {});
  handlePick.current = (pick) => {
    const world = worldRef.current;
    if (!world || busy.current) return;
    if (pick === "power") {
      const next = !world.isPowered();
      world.setPowered(next);
      setPowered(next);
    } else if (pick === "shell") {
      world.setExploded(true);
    } else if (pick === "monitor") {
      if (world.isPowered()) navigate("os");
      else showToast(UI.needPower[lang]);
    } else {
      navigate(pick);
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let world: PCWorld;
    try {
      world = new PCWorld(mount, {
        onHover: setHovered,
        onPick: (pick) => handlePick.current(pick),
        onExplodedChange: setExploded,
      });
    } catch {
      setNoWebgl(true);
      return;
    }
    worldRef.current = world;
    if (import.meta.env.DEV) (window as unknown as { __world: PCWorld }).__world = world;
    if (routeRef.current) world.setPaused(true);
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.setLang(lang);
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem("rr-lang", lang);
    } catch {
      /* storage non disponibile */
    }
  }, [lang]);

  useEffect(() => {
    document.title = route
      ? `${PARTS[route].section[lang]} — Roberto Ringoli`
      : lang === "it"
        ? "Roberto Ringoli — Il PC"
        : "Roberto Ringoli — The PC";
  }, [route, lang]);

  // il tooltip segue il puntatore senza passare da React
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const el = tooltipRef.current;
      if (el) el.style.transform = `translate(${event.clientX + 18}px, ${event.clientY + 16}px)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && routeRef.current && routeRef.current !== "os") navigate(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  /* ------------------------------ comandi HUD ------------------------------ */

  const togglePower = () => {
    const world = worldRef.current;
    if (!world) return;
    const next = !powered;
    world.setPowered(next);
    setPowered(next);
  };

  const toggleExplode = () => worldRef.current?.setExploded(!exploded);

  const tooltip = (() => {
    if (!hovered || touch) return null;
    if (hovered === "shell") return { title: UI.shell[lang], sub: null, color: "#ffffff" };
    if (hovered === "power") return { title: UI.powerButton[lang], sub: powered ? UI.powerOff[lang] : UI.powerOn[lang], color: "#8fd3ff" };
    if (hovered === "monitor")
      return { title: powered ? UI.monitorOn[lang] : UI.monitorOff[lang], sub: null, color: PARTS.os.accent };
    const part = PARTS[hovered];
    return { title: `${part.chip} · ${part.section[lang]}`, sub: UI.enter[lang], color: part.accent };
  })();

  const hoveredRoute: RouteId | null =
    hovered && hovered in PARTS ? (hovered as RouteId) : hovered === "monitor" ? "os" : null;

  return (
    <div className={`app ${route || diving ? "app--page" : ""}`}>
      <div ref={mountRef} className="scene" aria-hidden="true" />

      <div className="hud" aria-hidden={route ? true : undefined} inert={route ? true : undefined}>
        <header className="hud-top">
          <div className="brand">
            <p className="brand-name">Roberto Ringoli</p>
            <p className="brand-meta">{UI.brandMeta[lang]}</p>
          </div>
          <LangSwitch lang={lang} setLang={setLang} />
        </header>

        <nav className="hud-index" aria-label={UI.index[lang]}>
          <p>{UI.index[lang]}</p>
          {[...PART_IDS, "os" as const].map((id) => (
            <button
              key={id}
              type="button"
              className={hoveredRoute === id ? "hover" : ""}
              style={{ "--chip": PARTS[id].accent } as React.CSSProperties}
              onClick={() => navigate(id)}
            >
              <span className="chip">{PARTS[id].chip}</span>
              <span className="label">
                {PARTS[id].section[lang]}
                <small>{PARTS[id].name[lang]}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="hud-bottom">
          <p className="hud-hint">{touch ? UI.hintTouch[lang] : UI.hint[lang]}</p>
          <div className="controls">
            <button
              type="button"
              className={`ctrl ctrl--power ${powered ? "on" : "off"}`}
              onClick={togglePower}
              aria-pressed={powered}
            >
              <span aria-hidden="true">⏻</span>
              {powered ? UI.powerOff[lang] : UI.powerOn[lang]}
            </button>
            <button type="button" className="ctrl" onClick={toggleExplode} aria-pressed={exploded}>
              <span aria-hidden="true">{exploded ? "⧉" : "⇱"}</span>
              {exploded ? UI.assemble[lang] : UI.explode[lang]}
            </button>
            <button type="button" className="ctrl" onClick={() => worldRef.current?.resetView()}>
              <span aria-hidden="true">⟲</span>
              {UI.resetView[lang]}
            </button>
          </div>
        </div>

        {toast && (
          <p className="toast" role="status">
            {toast}
          </p>
        )}

        {noWebgl && <p className="no-webgl">{UI.noWebgl[lang]}</p>}
      </div>

      <div ref={tooltipRef} className={`tooltip ${tooltip ? "visible" : ""}`} aria-hidden="true">
        {tooltip && (
          <>
            <i style={{ background: tooltip.color }} />
            <span>
              {tooltip.title}
              {tooltip.sub && <small>{tooltip.sub}</small>}
            </span>
          </>
        )}
      </div>

      {route && route !== "os" && (
        <PageShell
          id={route}
          lang={lang}
          setLang={setLang}
          onBack={() => navigate(null)}
          onNavigate={(id) => navigate(id)}
        >
          {(() => {
            const Page = PAGES[route];
            return <Page lang={lang} />;
          })()}
        </PageShell>
      )}

      {route === "os" && (
        <RingoliOS
          lang={lang}
          setLang={setLang}
          onExit={() => navigate(null)}
          onShutdown={() => {
            worldRef.current?.setPowered(false);
            setPowered(false);
            navigate(null);
          }}
          onOpenPart={(id) => navigate(id)}
        />
      )}

      <DiveOverlay ref={overlayRef} />
    </div>
  );
}
