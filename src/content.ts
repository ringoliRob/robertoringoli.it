export type Lang = "it" | "en";
export type L = Record<Lang, string>;

export type PartId = "cpu" | "ram" | "gpu" | "ssd" | "psu";
export type RouteId = PartId | "os";

export const PART_IDS: PartId[] = ["cpu", "ram", "gpu", "ssd", "psu"];
export const ROUTE_IDS: RouteId[] = [...PART_IDS, "os"];

export type PartMeta = {
  id: RouteId;
  chip: string;
  accent: string;
  /** Colore di sfondo della pagina: la transizione "entra nel chip" sfuma in questo. */
  bg: string;
  name: L;
  section: L;
};

export const PARTS: Record<RouteId, PartMeta> = {
  cpu: {
    id: "cpu",
    chip: "CPU",
    accent: "#f2b84b",
    bg: "#0d0b07",
    name: { it: "Processore", en: "Processor" },
    section: { it: "Chi sono", en: "About me" },
  },
  ram: {
    id: "ram",
    chip: "RAM",
    accent: "#5cf2a0",
    bg: "#06100b",
    name: { it: "Memoria", en: "Memory" },
    section: { it: "Studi", en: "Studies" },
  },
  gpu: {
    id: "gpu",
    chip: "GPU",
    accent: "#ff4fd8",
    bg: "#0e0612",
    name: { it: "Scheda video", en: "Graphics card" },
    section: { it: "Giochi", en: "Games" },
  },
  ssd: {
    id: "ssd",
    chip: "SSD",
    accent: "#5aa9ff",
    bg: "#060b14",
    name: { it: "Archivio", en: "Storage" },
    section: { it: "Progetti", en: "Projects" },
  },
  psu: {
    id: "psu",
    chip: "PSU",
    accent: "#ff7a3d",
    bg: "#120906",
    name: { it: "Alimentatore", en: "Power supply" },
    section: { it: "Energia e contatti", en: "Power & contacts" },
  },
  os: {
    id: "os",
    chip: "MON",
    accent: "#8b7bff",
    bg: "#0b0a1a",
    name: { it: "Monitor", en: "Monitor" },
    section: { it: "RingoliOS", en: "RingoliOS" },
  },
};

export const UI = {
  brandMeta: { it: "Portfolio · un PC da smontare", en: "Portfolio · a PC to take apart" },
  hint: {
    it: "Trascina per ruotare · clicca un componente per entrarci",
    en: "Drag to orbit · click a component to dive in",
  },
  hintTouch: {
    it: "Trascina per ruotare · tocca un componente",
    en: "Drag to orbit · tap a component",
  },
  powerOn: { it: "Accendi", en: "Power on" },
  powerOff: { it: "Spegni", en: "Power off" },
  explode: { it: "Smonta", en: "Take apart" },
  assemble: { it: "Rimonta", en: "Reassemble" },
  resetView: { it: "Vista", en: "View" },
  index: { it: "Componenti", en: "Components" },
  enter: { it: "clicca per entrare", en: "click to dive in" },
  shell: { it: "Case · clicca per smontare", en: "Case · click to take apart" },
  shellBack: { it: "Case · clicca per rimontare", en: "Case · click to reassemble" },
  powerButton: { it: "Tasto di accensione", en: "Power button" },
  monitorOff: {
    it: "Monitor spento · accendi prima il PC",
    en: "Monitor off · power on the PC first",
  },
  monitorOn: { it: "Monitor · entra in RingoliOS", en: "Monitor · enter RingoliOS" },
  needPower: {
    it: "Il monitor è spento: premi il tasto di accensione sul case.",
    en: "The monitor is off: press the power button on the case.",
  },
  back: { it: "Torna a RingoliOS", en: "Back to RingoliOS" },
  next: { it: "Prossimo componente", en: "Next component" },
  language: { it: "Lingua", en: "Language" },
  noWebgl: {
    it: "Il tuo browser non riesce ad avviare la scena 3D. Puoi comunque esplorare tutte le sezioni da qui sotto.",
    en: "Your browser can't start the 3D scene. You can still explore every section below.",
  },
} satisfies Record<string, L>;

/* ---------------------------------- CPU ---------------------------------- */

export const CPU = {
  kicker: { it: "CPU · Core 0 · Chi sono", en: "CPU · Core 0 · About me" },
  title: "Roberto Ringoli",
  lead: {
    it: "Laureato in Informatica all’Università degli Studi dell’Aquila con 109/110, ora studente della laurea magistrale in Informatica AICoNDA. Nato a San Severo e cresciuto a Lanciano, in Abruzzo.",
    en: "Computer Science graduate (109/110) from the University of L’Aquila, now a student of the AICoNDA master’s degree in Computer Science. Born in San Severo and raised in Lanciano, Abruzzo.",
  },
  specs: [
    { k: { it: "Modello", en: "Model" }, v: { it: "Ringoli Core R-05", en: "Ringoli Core R-05" } },
    { k: { it: "Data di produzione", en: "Manufactured" }, v: { it: "29 gennaio 2005", en: "January 29, 2005" } },
    { k: { it: "Fabbrica", en: "Fab" }, v: { it: "San Severo", en: "San Severo" } },
    { k: { it: "Assemblato a", en: "Assembled in" }, v: { it: "Lanciano, Abruzzo", en: "Lanciano, Abruzzo" } },
    { k: { it: "Firmware", en: "Firmware" }, v: { it: "Liceo scientifico", en: "Scientific high school" } },
    { k: { it: "Set di istruzioni", en: "Instruction set" }, v: { it: "Informatica · AI · 3D", en: "CS · AI · 3D" } },
    { k: { it: "Laurea", en: "Degree" }, v: { it: "Informatica · 109/110", en: "Computer Science · 109/110" } },
    { k: { it: "Upgrade in corso", en: "Upgrade in progress" }, v: { it: "Magistrale in Informatica AICoNDA", en: "AICoNDA master’s in Computer Science" } },
  ],
  cores: [
    {
      title: { it: "Origini", en: "Origins" },
      body: {
        it: "Nato a San Severo il 29 gennaio 2005, cresciuto a Lanciano. L’Abruzzo è il mio sistema operativo di base.",
        en: "Born in San Severo on January 29, 2005, raised in Lanciano. Abruzzo is my base operating system.",
      },
    },
    {
      title: { it: "Studi", en: "Studies" },
      body: {
        it: "Dopo il liceo scientifico, la laurea in Informatica all’Università dell’Aquila, al polo di Coppito, con 109/110 e una tesi sul rilevamento di eventi complessi nella videosorveglianza. Ora frequento la magistrale in Informatica AICoNDA.",
        en: "After scientific high school, a Computer Science degree at the University of L’Aquila, Coppito campus, with 109/110 and a thesis on complex event detection in video surveillance. I’m now enrolled in the AICoNDA master’s in Computer Science.",
      },
    },
    {
      title: { it: "AI e creatività", en: "AI & creativity" },
      body: {
        it: "Credo che nel 2026 le competenze non siano più soltanto tecniche, ma anche creative: l’intelligenza artificiale ci permette di esprimere questo potenziale.",
        en: "I believe that in 2026 skills are no longer only technical, but creative too: artificial intelligence lets us express that potential.",
      },
    },
    {
      title: { it: "Adesso", en: "Right now" },
      body: {
        it: "Perdo tempo creando con l’AI i progetti che più mi vengono in mente. Questo sito è uno di quelli.",
        en: "I spend my time building with AI whatever projects come to mind. This website is one of them.",
      },
    },
  ],
  bio: {
    it: "Questo portfolio vuole mostrare ciò che so fare e tutto quello che mi viene in mente di realizzare. Ogni angolo di questa stanza contiene un pezzo di me: esplorala, accendi il PC e curiosa sul desktop. Buon viaggio.",
    en: "This portfolio is meant to show what I can do and everything I imagine building. Every corner of this room holds a piece of me: explore it, power on the PC and look around the desktop. Enjoy the journey.",
  },
};

/* ---------------------------------- RAM ---------------------------------- */

export type Exam = { name: L; tag: string };

export const EXAMS: Exam[] = [
  { name: { it: "Ricerca Operativa", en: "Operations Research" }, tag: "OPT" },
  { name: { it: "Ottimizzazione Combinatoria", en: "Combinatorial Optimization" }, tag: "OPT" },
  { name: { it: "Sistemi Operativi", en: "Operating Systems" }, tag: "SYS" },
  { name: { it: "Programmazione a Oggetti", en: "Object-Oriented Programming" }, tag: "PRG" },
  { name: { it: "Algoritmi", en: "Algorithms" }, tag: "ALG" },
  {
    name: { it: "Algoritmi con Applicazioni (stile LeetCode)", en: "Algorithms with Applications (LeetCode style)" },
    tag: "ALG",
  },
  {
    name: { it: "Teoria della Calcolabilità e della Complessità", en: "Computability and Complexity Theory" },
    tag: "THY",
  },
  { name: { it: "Process and Operation Scheduling", en: "Process and Operation Scheduling" }, tag: "OPT" },
  { name: { it: "Machine Learning", en: "Machine Learning" }, tag: "AI" },
  { name: { it: "Fondamenti di Intelligenza Artificiale", en: "Foundations of Artificial Intelligence" }, tag: "AI" },
];

export const RAM = {
  kicker: { it: "RAM · DDR-Coppito · Studi", en: "RAM · DDR-Coppito · Studies" },
  title: { it: "Università dell’Aquila", en: "University of L’Aquila" },
  lead: {
    it: "Il polo di Coppito, dove mi sono laureato in Informatica all’Università degli Studi dell’Aquila con 109/110: Blocco 0, Coppito 1 e Coppito 2 affacciati sulla stessa via.",
    en: "The Coppito campus, where I graduated in Computer Science at the University of L’Aquila with 109/110: Blocco 0, Coppito 1 and Coppito 2 along the same street.",
  },
  banks: ["Blocco 0", "Coppito 1", "Coppito 2"],
  mapTitle: { it: "Mappa della memoria · esami superati", en: "Memory map · passed exams" },
  mapNote: {
    it: "Alcuni degli esami superati lungo il percorso.",
    en: "Some of the exams passed along the way.",
  },
  written: { it: "SCRITTO", en: "WRITTEN" },
  nextTitle: { it: "Allocazione in corso", en: "Current allocation" },
  next: "AICoNDA — Artificial Intelligence, Complex Networks, and Data Analytics",
  nextBody: {
    it: "Dopo la triennale chiusa con 109/110, ora frequento la laurea magistrale in Informatica AICoNDA.",
    en: "After my bachelor’s (109/110), I’m now enrolled in the AICoNDA master’s degree in Computer Science.",
  },
  allocating: { it: "ALLOCAZIONE IN CORSO", en: "ALLOCATING" },
};

/* ---------------------------------- GPU ---------------------------------- */

export const GPU = {
  kicker: { it: "GPU · Ringoli GFX 2026 · Giochi", en: "GPU · Ringoli GFX 2026 · Games" },
  title: "Cazzeggio",
  lead: {
    it: "Il mio sito di casual gaming dedicato ai nullafacenti. Se hai voglia di perdere un po’ di tempo e non sai come fare, è il posto giusto.",
    en: "My casual gaming site dedicated to slackers. If you want to waste some time and don’t know how, it’s the right place.",
  },
  cta: { it: "Gioca su cazzeggia.online", en: "Play on cazzeggia.online" },
  benchTitle: { it: "Benchmark · Pixel Snake", en: "Benchmark · Pixel Snake" },
  benchBody: {
    it: "Ogni GPU va messa sotto stress. Questa la stressi tu: frecce, WASD o swipe.",
    en: "Every GPU needs a stress test. You’re the stress test: arrows, WASD or swipe.",
  },
};

/* ---------------------------------- SSD ---------------------------------- */

export type Project = {
  file: string;
  kind: "dir" | "link";
  title: L;
  body: L;
  tags: string[];
  url?: string;
  status: L;
};

export const PROJECTS: Project[] = [
  {
    file: "cazzeggio/",
    kind: "dir",
    title: { it: "Cazzeggio", en: "Cazzeggio" },
    body: {
      it: "Sito di casual gaming dedicato ai nullafacenti: giochi veloci per quando non hai niente da fare.",
      en: "Casual gaming site for slackers: quick games for when you have nothing to do.",
    },
    tags: ["web", "games"],
    url: "https://cazzeggia.online",
    status: { it: "online", en: "live" },
  },
  {
    file: "robertoringoli.it/",
    kind: "dir",
    title: { it: "Questo sito (v2)", en: "This website (v2)" },
    body: {
      it: "Un PC 3D sulla scrivania che puoi smontare pezzo per pezzo: ogni componente è una sezione, il monitor è un piccolo sistema operativo. React + Three.js, geometria tutta procedurale.",
      en: "A 3D PC on a desk you can take apart piece by piece: every component is a section, the monitor is a tiny operating system. React + Three.js, fully procedural geometry.",
    },
    tags: ["react", "three.js", "typescript"],
    url: "https://github.com/ringoliRob/robertoringoli.it",
    status: { it: "in esecuzione", en: "running" },
  },
  {
    file: "arcipelago-digitale.old/",
    kind: "dir",
    title: { it: "Arcipelago digitale (v1)", en: "Digital archipelago (v1)" },
    body: {
      it: "La prima versione del portfolio: isole fluttuanti tra le nuvole all’alba, con Lanciano al centro, un’isola per Cazzeggio e il campus di Coppito. Navicelle comprese.",
      en: "The first version of the portfolio: floating islands among sunrise clouds, with Lanciano at the center, an island for Cazzeggio and the Coppito campus. Spaceships included.",
    },
    tags: ["three.js", "blender", "glTF"],
    status: { it: "archiviato", en: "archived" },
  },
  {
    file: "blender/",
    kind: "dir",
    title: { it: "Modelli 3D in Blender", en: "Blender 3D models" },
    body: {
      it: "Il centro di Lanciano, lo stadio Guido Biondi, un’isola delle Maldive con le montagne russe e il campus di Coppito: modellati in Blender anche con script Python e AI.",
      en: "Downtown Lanciano, the Guido Biondi stadium, a Maldives island with a roller coaster and the Coppito campus: modeled in Blender, partly with Python scripts and AI.",
    },
    tags: ["blender", "python", "AI"],
    status: { it: "archiviato", en: "archived" },
  },
];

export const SSD = {
  kicker: { it: "SSD · NVMe 2 TB · Progetti", en: "SSD · NVMe 2 TB · Projects" },
  title: { it: "Progetti", en: "Projects" },
  lead: {
    it: "Tutto quello che ho costruito finora, salvato su disco. Seleziona una cartella per aprirla.",
    en: "Everything I’ve built so far, saved to disk. Select a folder to open it.",
  },
  path: "/home/roberto/progetti",
  open: { it: "Apri", en: "Open" },
  status: { it: "Stato", en: "Status" },
  used: { it: "usati", en: "used" },
};

/* ---------------------------------- PSU ---------------------------------- */

export const PSU = {
  kicker: { it: "PSU · 850 W · 80+ Gold", en: "PSU · 850 W · 80+ Gold" },
  title: { it: "Cosa mi alimenta", en: "What powers me" },
  lead: {
    it: "Ogni componente di questo PC funziona perché qualcosa gli dà corrente. Queste sono le mie linee di alimentazione.",
    en: "Every component in this PC works because something feeds it power. These are my power rails.",
  },
  rails: [
    {
      volt: "+12V",
      title: { it: "Intelligenza artificiale", en: "Artificial intelligence" },
      body: {
        it: "La linea principale: con l’AI do forma a tutto quello che mi viene in mente, dai siti ai modelli 3D.",
        en: "The main rail: with AI I give shape to whatever comes to mind, from websites to 3D models.",
      },
      load: 0.92,
    },
    {
      volt: "+5V",
      title: { it: "Creatività", en: "Creativity" },
      body: {
        it: "Le competenze non sono più soltanto tecniche: idee, design e gioco valgono quanto il codice.",
        en: "Skills are no longer only technical: ideas, design and play matter as much as code.",
      },
      load: 0.81,
    },
    {
      volt: "+3.3V",
      title: { it: "Abruzzo", en: "Abruzzo" },
      body: {
        it: "Lanciano è casa, L’Aquila è dove mi sono laureato. Una tensione bassa ma sempre presente.",
        en: "Lanciano is home, L’Aquila is where I study. A low voltage, but always on.",
      },
      load: 0.64,
    },
  ],
  connectorsTitle: { it: "Connettori · contatti", en: "Connectors · contacts" },
  connectors: [
    { label: { it: "Contattami", en: "Get in touch" }, value: "info@robertoringoli.it", url: "mailto:info@robertoringoli.it" },
    {
      label: { it: "Mail accademica", en: "Academic email" },
      value: "roberto.ringoli@student.univaq.it",
      url: "mailto:roberto.ringoli@student.univaq.it",
    },
    { label: { it: "Cazzeggio", en: "Cazzeggio" }, value: "roberto.ringoli@cazzeggia.online", url: "mailto:roberto.ringoli@cazzeggia.online" },
    { label: { it: "GitHub", en: "GitHub" }, value: "github.com/ringoliRob", url: "https://github.com/ringoliRob" },
  ],
};

/* ---------------------------------- OS ----------------------------------- */

export const OS = {
  welcome: { it: "Benvenuto in RingoliOS", en: "Welcome to RingoliOS" },
  shutdown: { it: "Spegni", en: "Shut down" },
  exit: { it: "Esci", en: "Exit" },
  apps: {
    terminal: { it: "Terminale", en: "Terminal" },
    about: { it: "chi_sono.txt", en: "about_me.txt" },
    exams: { it: "Esami", en: "Exams" },
    snake: { it: "Snake", en: "Snake" },
    projects: { it: "Progetti", en: "Projects" },
    contacts: { it: "Contatti", en: "Contacts" },
    thesis: { it: "tesi.pdf", en: "thesis.pdf" },
    cazzeggio: { it: "Cazzeggio", en: "Cazzeggio" },
  },
  github: { it: "GitHub", en: "GitHub" },
  githubHint: { it: "Repository pubblici · clic per aprirli su GitHub", en: "Public repositories · click to open on GitHub" },
  githubLoading: { it: "Carico i repository da GitHub…", en: "Loading repositories from GitHub…" },
  githubError: { it: "GitHub non risponde: ecco i progetti salvati.", en: "GitHub is not answering: here are the saved projects." },
  githubProfile: { it: "Tutti i repository su GitHub", en: "All repositories on GitHub" },
  updated: { it: "aggiornato", en: "updated" },
  stars: { it: "stelle", en: "stars" },
  otherProjects: { it: "Altri progetti", en: "Other projects" },
};

/* ---------------------------------- Tesi di laurea ---------------------------------- */

/** La tesi triennale, nella libreria della stanza e sul desktop di RingoliOS (PDF in public/docs). */
export const THESIS = {
  file: "docs/tesi-roberto-ringoli.pdf",
  title: "Modellazione e rilevamento di eventi complessi in sistemi di videosorveglianza multimodale",
  grade: "109/110",
  label: { it: "Tesi di laurea", en: "Bachelor’s thesis" },
  open: { it: "Leggi la tesi", en: "Read the thesis" },
};

/** Apre il PDF della tesi in una nuova scheda (va chiamata dentro un gesto dell’utente). */
export function openThesis() {
  window.open(`${import.meta.env.BASE_URL}${THESIS.file}`, "_blank", "noopener");
}

/* ---------------------------------- Stanza (gioco) ---------------------------------- */

export const GAME = {
  title: { it: "La stanza di Roberto", en: "Roberto's room" },
  start: { it: "Clicca per entrare", en: "Click to enter" },
  resume: { it: "Clicca per continuare", en: "Click to continue" },
  tapStart: { it: "Tocca per entrare", en: "Tap to enter" },
  intro: {
    it: "Esplora la mia stanza: ogni oggetto racconta qualcosa. Prendi le cose, usale, lanciale.",
    en: "Explore my room: every object tells you something. Pick things up, use them, throw them.",
  },
  controls: { it: "Comandi", en: "Controls" },
  keys: [
    { k: "W A S D", v: { it: "muoviti (Shift per correre)", en: "move (Shift to run)" } },
    { k: "C", v: { it: "abbassati", en: "crouch" } },
    { k: "Mouse", v: { it: "guardati intorno", en: "look around" } },
    { k: "E", v: { it: "prendi / interagisci", en: "pick up / interact" } },
    { k: "F", v: { it: "usa l'oggetto in mano", en: "use the held item" } },
    { k: "G", v: { it: "lancia l'oggetto", en: "throw the item" } },
    { k: "1–9", v: { it: "scegli lo slot (anche con la rotella)", en: "pick a slot (or mouse wheel)" } },
    { k: "Esc", v: { it: "pausa", en: "pause" } },
  ],
  skip: { it: "Preferisci leggere? Vai dritto al computer:", en: "Rather read? Jump straight to the computer:" },
  toComputer: { it: "Apri RingoliOS", en: "Open RingoliOS" },
  holding: { it: "In mano", en: "Holding" },
  use: { it: "usa", en: "use" },
  throw: { it: "lancia", en: "throw" },
  loading: { it: "Sto arredando la stanza…", en: "Furnishing the room…" },
  oakName: { it: "PROF. OAK", en: "PROF. OAK" },
  oak: {
    it: "Le parole del Prof. Oak riecheggiano…\nC'è un momento e un luogo per ogni cosa, ma non ora!",
    en: "OAK's words echoed…\nThere's a time and place for everything, but not now!",
  },
  close: { it: "E per chiudere", en: "E to close" },
  health: { it: "Vita", en: "Health" },
  hunger: { it: "Fame", en: "Hunger" },
  hotbar: { it: "Inventario", en: "Inventory" },
} satisfies Record<string, unknown>;

/** Nomi e azioni degli oggetti della stanza. */
export const ITEMS = {
  ds: { name: { it: "Nintendo 3DS XL", en: "Nintendo 3DS XL" }, use: { it: "gioca", en: "play" } },
  key: { name: { it: "Chiave della cassaforte", en: "Safe key" }, use: { it: "usala sulla cassaforte", en: "use it on the safe" } },
  lightRemote: { name: { it: "Telecomando della lampadina", en: "Light bulb remote" }, use: { it: "cambia colore", en: "change color" } },
  tvRemote: { name: { it: "Telecomando della TV", en: "TV remote" }, use: { it: "accendi/spegni la TV", en: "TV on/off" } },
  pizza: { name: { it: "Fetta di pizza", en: "Pizza slice" }, use: { it: "mangia", en: "eat" } },
  drink: { name: { it: "Lattina energetica", en: "Energy drink" }, use: { it: "bevi", en: "drink" } },
} satisfies Record<string, { name: L; use: L }>;

export const PROMPTS = {
  pick: { it: "Prendi", en: "Pick up" },
  door: { it: "Esci dalla stanza", en: "Leave the room" },
  lightOn: { it: "Accendi il lampadario", en: "Turn on the ceiling light" },
  lightOff: { it: "Spegni il lampadario", en: "Turn off the ceiling light" },
  ledOn: { it: "Accendi la striscia LED", en: "Turn on the LED strip" },
  ledOff: { it: "Spegni la striscia LED", en: "Turn off the LED strip" },
  safeLocked: { it: "Cassaforte chiusa a chiave", en: "Locked safe" },
  safeUnlock: { it: "Apri la cassaforte con la chiave", en: "Unlock the safe with the key" },
  safeOpen: { it: "Cassaforte aperta", en: "Open safe" },
  tv: { it: "TV · serve il telecomando", en: "TV · needs the remote" },
  monitorOn: { it: "Entra in RingoliOS", en: "Enter RingoliOS" },
  monitorOff: { it: "Monitor spento · accendi il PC", en: "Monitor off · power on the PC" },
  powerOn: { it: "Accendi il PC", en: "Power on the PC" },
  powerOff: { it: "Spegni il PC", en: "Power off the PC" },
  pizzaBox: { it: "Prendi una fetta di pizza", en: "Take a pizza slice" },
  thesis: { it: "Leggi la mia tesi di laurea (109/110)", en: "Read my bachelor’s thesis (109/110)" },
} satisfies Record<string, L>;

export const TOASTS = {
  safeLocked: { it: "È chiusa. Forse la chiave è in qualche gioco…", en: "It's locked. Maybe the key is hidden in some game…" },
  safeOpened: { it: "Clic! La cassaforte si apre.", en: "Click! The safe opens." },
  keyFound: { it: "Livello completato! Dal 3DS è saltata fuori una chiave.", en: "Course clear! A key popped out of the 3DS." },
  lampOff: { it: "Il lampadario è spento: accendilo dall'interruttore vicino alla porta.", en: "The ceiling light is off: switch it on by the door." },
  tvNeedsRemote: { it: "Ti serve il telecomando della TV.", en: "You need the TV remote." },
  noVideo: { it: "Nessun segnale: manca il video in public/videos/tv.mp4.", en: "No signal: the video is missing from public/videos/tv.mp4." },
  needPower: { it: "Il monitor è spento: premi il tasto di accensione sul case.", en: "The monitor is off: press the power button on the case." },
  inventoryFull: { it: "Inventario pieno: lancia qualcosa con G.", en: "Inventory full: throw something with G." },
  pizzaGone: { it: "La pizza è finita. Qualcuno aveva fame…", en: "The pizza is gone. Someone was hungry…" },
  ate: { it: "Gnam!", en: "Yum!" },
  useKeyHere: { it: "Avvicinati alla cassaforte e guardala per usare la chiave.", en: "Walk up to the safe and look at it to use the key." },
} satisfies Record<string, L>;

export const BULB_COLORS: { name: L; hex: string }[] = [
  { name: { it: "bianco caldo", en: "warm white" }, hex: "#ffd2a1" },
  { name: { it: "rosso", en: "red" }, hex: "#ff3b30" },
  { name: { it: "verde", en: "green" }, hex: "#34c759" },
  { name: { it: "blu", en: "blue" }, hex: "#2f7bff" },
  { name: { it: "giallo", en: "yellow" }, hex: "#ffd60a" },
  { name: { it: "viola", en: "purple" }, hex: "#bf5af2" },
  { name: { it: "arancione", en: "orange" }, hex: "#ff9f0a" },
  { name: { it: "azzurro", en: "cyan" }, hex: "#64d2ff" },
  { name: { it: "rosa", en: "pink" }, hex: "#ff2d92" },
  { name: { it: "bianco freddo", en: "cool white" }, hex: "#eef4ff" },
];
