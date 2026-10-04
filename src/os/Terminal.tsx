import { useEffect, useRef, useState } from "react";
import { CPU, EXAMS, PART_IDS, PARTS, PROJECTS, RAM, type Lang, type PartId } from "../content";

type Line = { kind: "in" | "out" | "err" | "accent"; text: string };

type Props = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  openApp: (app: "snake" | "about" | "exams" | "projects") => void;
  openPart: (id: PartId) => void;
  onExit: () => void;
  onShutdown: () => void;
};

const T = {
  motd: {
    it: "RingoliOS 2.0.26 — scrivi 'help' per la lista dei comandi.",
    en: "RingoliOS 2.0.26 — type 'help' for the list of commands.",
  },
  help: {
    it: [
      "whoami            chi c'è dietro questo PC",
      "ls                elenca i file",
      "cat <file>        legge un file",
      "open <parte>      entra in un componente (cpu, ram, gpu, ssd, psu)",
      "snake             avvia il benchmark della GPU",
      "cazzeggio         apre cazzeggia.online",
      "neofetch          informazioni di sistema",
      "lang <it|en>      cambia lingua",
      "clear · date · exit · shutdown",
    ],
    en: [
      "whoami            who's behind this PC",
      "ls                list files",
      "cat <file>        read a file",
      "open <part>       dive into a component (cpu, ram, gpu, ssd, psu)",
      "snake             run the GPU benchmark",
      "cazzeggio         open cazzeggia.online",
      "neofetch          system information",
      "lang <it|en>      switch language",
      "clear · date · exit · shutdown",
    ],
  },
  whoami: {
    it: "roberto — studente di Informatica @ Università dell'Aquila · Lanciano, Abruzzo",
    en: "roberto — Computer Science student @ University of L'Aquila · Lanciano, Abruzzo",
  },
  notFound: { it: "comando non trovato", en: "command not found" },
  noFile: { it: "file inesistente", en: "no such file" },
  sudo: { it: "Permesso negato. Bel tentativo però.", en: "Permission denied. Nice try though." },
  openUsage: { it: "uso: open <cpu|ram|gpu|ssd|psu>", en: "usage: open <cpu|ram|gpu|ssd|psu>" },
};

const FILES = (lang: Lang) => [lang === "it" ? "chi_sono.txt" : "about_me.txt", "esami.db", "progetti/", "snake.exe", "cazzeggio.url"];

export default function Terminal({ lang, setLang, openApp, openPart, onExit, onShutdown }: Props) {
  const [lines, setLines] = useState<Line[]>([{ kind: "accent", text: T.motd[lang] }]);
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight);
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const run = (raw: string) => {
    const cmd = raw.trim();
    const out: Line[] = [{ kind: "in", text: cmd }];
    const say = (text: string, kind: Line["kind"] = "out") => out.push({ kind, text });
    const [name, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ").toLowerCase();

    switch (name.toLowerCase()) {
      case "":
        break;
      case "help":
        T.help[lang].forEach((l) => say(l));
        break;
      case "whoami":
        say(T.whoami[lang]);
        break;
      case "ls":
        say(FILES(lang).join("   "));
        break;
      case "cat":
        if (arg === "chi_sono.txt" || arg === "about_me.txt") {
          say(CPU.lead[lang]);
          CPU.cores.forEach((c) => say(`· ${c.title[lang]}: ${c.body[lang]}`));
        } else if (arg === "esami.db") {
          EXAMS.forEach((e, i) => say(`0x${(i * 0x100).toString(16).padStart(4, "0")}  ${e.name[lang]}`));
          say(`→ ${RAM.next}`, "accent");
        } else if (arg === "cazzeggio.url") {
          say("https://cazzeggia.online");
        } else {
          say(`cat: ${arg || "?"}: ${T.noFile[lang]}`, "err");
        }
        break;
      case "cd":
        if (arg.startsWith("progetti")) {
          PROJECTS.forEach((p) => say(`${p.file.padEnd(28)} ${p.status[lang]}`));
        } else say(`cd: ${arg || "?"}: ${T.noFile[lang]}`, "err");
        break;
      case "open":
        if ((PART_IDS as string[]).includes(arg)) {
          say(`→ ${PARTS[arg as PartId].chip} · ${PARTS[arg as PartId].section[lang]}`, "accent");
          window.setTimeout(() => openPart(arg as PartId), 350);
        } else say(T.openUsage[lang], "err");
        break;
      case "snake":
      case "snake.exe":
      case "./snake.exe":
        openApp("snake");
        break;
      case "cazzeggio":
        window.open("https://cazzeggia.online", "_blank", "noopener");
        say("→ cazzeggia.online", "accent");
        break;
      case "neofetch":
        [
          "       ____    roberto@ringoli-pc",
          "      / __ \\   ------------------",
          "     / /_/ /   OS: RingoliOS 2.0.26",
          "    / _, _/    CPU: Ringoli Core R-05 (2005)",
          "   /_/ |_|     GPU: Ringoli GFX 2026",
          "               RAM: DDR-Coppito · 10 exams",
          "               Shell: rrsh · Uptime: since 29.01.2005",
        ].forEach((l, i) => say(l, i < 5 ? "accent" : "out"));
        break;
      case "date":
        say(new Date().toLocaleString(lang === "it" ? "it-IT" : "en-GB"));
        break;
      case "lang":
        if (arg === "it" || arg === "en") setLang(arg);
        else say("lang <it|en>", "err");
        break;
      case "clear":
        setLines([]);
        return;
      case "sudo":
        say(T.sudo[lang], "err");
        break;
      case "exit":
        onExit();
        break;
      case "shutdown":
      case "poweroff":
        onShutdown();
        break;
      default:
        say(`${name}: ${T.notFound[lang]}`, "err");
    }
    setLines((prev) => [...prev, ...out].slice(-200));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (input.trim()) history.current.unshift(input);
      historyIndex.current = -1;
      run(input);
      setInput("");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      historyIndex.current = Math.min(history.current.length - 1, historyIndex.current + 1);
      setInput(history.current[historyIndex.current] ?? "");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      historyIndex.current = Math.max(-1, historyIndex.current - 1);
      setInput(history.current[historyIndex.current] ?? "");
    }
  };

  return (
    <div className="terminal" ref={bodyRef} onClick={() => inputRef.current?.focus({ preventScroll: true })}>
      {lines.map((line, i) => (
        <p key={i} className={`t-${line.kind}`}>
          {line.kind === "in" && <span className="t-prompt">roberto@ringoli-pc:~$ </span>}
          {line.text}
        </p>
      ))}
      <label className="t-input">
        <span className="t-prompt">roberto@ringoli-pc:~$ </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Terminal"
        />
      </label>
    </div>
  );
}
