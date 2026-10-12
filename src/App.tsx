import { useCallback, useEffect, useRef, useState } from "react";
import DsGame from "./components/DsGame";
import { Crosshair, OakDialog, StartScreen } from "./components/GameHud";
import { Hotbar, StatusBars } from "./components/Survival";
import TouchControls from "./components/TouchControls";
import { GAME, PARTS, ROUTE_IDS, UI, type Lang, type PartId, type RouteId } from "./content";
import { RoomWorld, SLOTS, type ItemId, type Slot } from "./game/RoomWorld";
import RingoliOS from "./os/RingoliOS";
import CpuPage from "./pages/CpuPage";
import GpuPage from "./pages/GpuPage";
import PageShell from "./pages/PageShell";
import PsuPage from "./pages/PsuPage";
import RamPage from "./pages/RamPage";
import SsdPage from "./pages/SsdPage";

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
  const worldRef = useRef<RoomWorld | null>(null);
  const routeRef = useRef<RouteId | null>(parseHash());
  const busy = useRef(false);

  const [lang, setLang] = useState<Lang>(initialLang);
  const [route, setRoute] = useState<RouteId | null>(routeRef.current);
  const [world, setWorld] = useState<RoomWorld | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  /** Perché il mouse è stato liberato: pausa voluta (Esc) o il sito stesso (pagina, 3DS). */
  const [unlockReason, setUnlockReason] = useState<"user" | "app">("user");
  const expectUnlock = useRef(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>(() => Array(SLOTS).fill(null));
  const [selected, setSelected] = useState(0);
  const [icons, setIcons] = useState<Partial<Record<ItemId, string>>>({});
  const held = slots[selected]?.id ?? null;
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [dsOpen, setDsOpen] = useState(false);
  const [dsCleared, setDsCleared] = useState(false);
  const [noWebgl, setNoWebgl] = useState(false);
  const [diving, setDiving] = useState(false);
  const [touch] = useState(() => window.matchMedia("(hover: none)").matches);

  /* ------------------------------ transizioni ------------------------------ */

  /** Dalla stanza: zoom sul monitor (il PC si accende da solo), poi RingoliOS in dissolvenza. */
  const openRoute = async (id: RouteId) => {
    const w = worldRef.current;
    if (w) {
      if (!w.isPowered()) w.setPowered(true);
      w.setPaused(false);
      expectUnlock.current = true;
      setDiving(true);
      await w.zoomToMonitor();
      setDiving(false);
    }
    routeRef.current = id;
    setRoute(id);
    await nextFrame();
    w?.setPaused(true);
  };

  /** Tra desktop e sezioni si cambia sul posto. */
  const swapRoute = async (id: RouteId) => {
    routeRef.current = id;
    setRoute(id);
  };

  /** Uscendo dal computer la camera si stacca dallo schermo e torna nella stanza. */
  const closeRoute = async () => {
    const w = worldRef.current;
    routeRef.current = null;
    setRoute(null);
    if (w) {
      w.setPaused(false);
      w.zoomOut();
    }
  };

  const sync = useCallback(async () => {
    if (busy.current) return;
    const want = parseHash();
    const have = routeRef.current;
    if (want === have) return;
    busy.current = true;
    try {
      if (want && !have) await openRoute(want);
      else if (!want && have) await closeRoute();
      else if (want && have) await swapRoute(want);
    } finally {
      busy.current = false;
    }
    if (parseHash() !== routeRef.current) void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback(
    (id: RouteId | null) => {
      if (busy.current) return;
      // tornando nella stanza il mouse si ricattura subito, dentro lo stesso clic
      if (!id && routeRef.current) worldRef.current?.requestLock();
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

  /* ------------------------------ stanza 3D ------------------------------ */

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((current) => (current === text ? null : current)), 3600);
  }, []);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let w: RoomWorld;
    try {
      w = new RoomWorld(mount, {
        onPrompt: setPrompt,
        onInventory: (next, index) => {
          setSlots(next);
          setSelected(index);
        },
        onIcons: setIcons,
        onToast: showToast,
        onDialog: () => {
          w.setBlocked(true);
          setDialog(true);
        },
        onPlayDs: () => {
          expectUnlock.current = true;
          w.setBlocked(true, true);
          setDsOpen(true);
        },
        onNavigate: (id) => navigateRef.current(id),
        onLock: (isLocked) => {
          setLocked(isLocked);
          if (isLocked) setStarted(true);
          else setUnlockReason(expectUnlock.current ? "app" : "user");
          expectUnlock.current = false;
        },
        onLoaded: () => setLoaded(true),
        onPower: () => {},
      });
    } catch {
      setNoWebgl(true);
      return;
    }
    worldRef.current = w;
    setWorld(w);
    if (import.meta.env.DEV) (window as unknown as { __world: RoomWorld }).__world = w;
    if (routeRef.current) w.setPaused(true);
    return () => {
      w.dispose();
      worldRef.current = null;
    };
  }, [showToast]);

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
        ? "Roberto Ringoli — La stanza"
        : "Roberto Ringoli — The room";
  }, [route, lang]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // dalle sezioni Esc riporta al desktop di RingoliOS
      if (event.key === "Escape" && routeRef.current && routeRef.current !== "os") navigate("os");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const start = () => {
    if (touch) setStarted(true);
    else worldRef.current?.requestLock();
  };

  const closeDialog = useCallback(() => {
    setDialog(false);
    worldRef.current?.setBlocked(false);
  }, []);

  const closeDs = useCallback(() => {
    setDsOpen(false);
    worldRef.current?.setBlocked(false);
    worldRef.current?.requestLock();
  }, []);

  const winDs = useCallback(() => {
    setDsCleared(true);
    worldRef.current?.rewardKey();
  }, []);

  const playing = (touch ? started : locked) && !route && !diving && !dsOpen;
  const away = !route && !diving && !dsOpen && !dialog && !(touch ? started : locked);
  const showStart = away && (!started || unlockReason === "user");
  const showResume = away && started && unlockReason === "app";
  // vita, fame e hotbar restano visibili anche in pausa
  const showSurvival = started && !route && !diving && !dsOpen;

  return (
    <div className={`app ${route || diving ? "app--page" : ""}`}>
      <div ref={mountRef} className="scene" aria-hidden="true" />

      <div className="hud" aria-hidden={route ? true : undefined} inert={route ? true : undefined}>
        {playing && <Crosshair prompt={dialog ? null : prompt} touch={touch} />}
        {(playing || showSurvival) && <StatusBars lang={lang} />}
        {(playing || showSurvival) && <Hotbar slots={slots} selected={selected} icons={icons} lang={lang} onSelect={(i) => worldRef.current?.selectSlot(i)} />}
        {playing && touch && !dialog && <TouchControls world={world} lang={lang} prompt={prompt} held={held} />}
        {toast && !route && (
          <p className="toast" role="status">
            {toast}
          </p>
        )}
        {noWebgl && <p className="no-webgl">{UI.noWebgl[lang]}</p>}
      </div>

      {dialog && <OakDialog lang={lang} onClose={closeDialog} />}

      {showStart && (
        <StartScreen
          lang={lang}
          setLang={setLang}
          loaded={loaded || noWebgl}
          resumed={started}
          touch={touch}
          onStart={start}
          onNavigate={(id) => navigate(id)}
        />
      )}

      {showResume && (
        <button type="button" className="resume" onClick={start}>
          {GAME.resume[lang]}
        </button>
      )}

      {dsOpen && <DsGame lang={lang} cleared={dsCleared} onWin={winDs} onClose={closeDs} />}

      {route && route !== "os" && (
        <div key={route} className="route-fade">
          <PageShell id={route} lang={lang} setLang={setLang} onBack={() => navigate("os")} onNavigate={(id) => navigate(id)}>
            {(() => {
              const Page = PAGES[route];
              return <Page lang={lang} />;
            })()}
          </PageShell>
        </div>
      )}

      {route === "os" && (
        <div className="route-fade">
          <RingoliOS
            lang={lang}
            setLang={setLang}
            onExit={() => navigate(null)}
            onShutdown={() => {
              worldRef.current?.setPowered(false);
              navigate(null);
            }}
            onOpenPart={(id) => navigate(id)}
          />
        </div>
      )}
    </div>
  );
}
