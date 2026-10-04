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
  back: { it: "Torna al PC", en: "Back to the PC" },
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
    it: "Studente di Informatica all’Università degli Studi dell’Aquila, nato a San Severo e cresciuto a Lanciano, in Abruzzo.",
    en: "Computer Science student at the University of L’Aquila, born in San Severo and raised in Lanciano, Abruzzo.",
  },
  specs: [
    { k: { it: "Modello", en: "Model" }, v: { it: "Ringoli Core R-05", en: "Ringoli Core R-05" } },
    { k: { it: "Data di produzione", en: "Manufactured" }, v: { it: "29 gennaio 2005", en: "January 29, 2005" } },
    { k: { it: "Fabbrica", en: "Fab" }, v: { it: "San Severo", en: "San Severo" } },
    { k: { it: "Assemblato a", en: "Assembled in" }, v: { it: "Lanciano, Abruzzo", en: "Lanciano, Abruzzo" } },
    { k: { it: "Firmware", en: "Firmware" }, v: { it: "Liceo scientifico", en: "Scientific high school" } },
    { k: { it: "Set di istruzioni", en: "Instruction set" }, v: { it: "Informatica · AI · 3D", en: "CS · AI · 3D" } },
    { k: { it: "Prossimo upgrade", en: "Next upgrade" }, v: { it: "Magistrale AICoNDA", en: "AICoNDA master’s" } },
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
        it: "Dopo il liceo scientifico, Informatica all’Università dell’Aquila, al polo di Coppito. Sto per laurearmi.",
        en: "After scientific high school, Computer Science at the University of L’Aquila, Coppito campus. Graduating soon.",
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
    it: "Questo portfolio vuole mostrare ciò che so fare e tutto quello che mi viene in mente di realizzare. Ogni componente di questo PC contiene un pezzo di me: smontalo, entra dentro, e se vuoi accendilo. Buon viaggio.",
    en: "This portfolio is meant to show what I can do and everything I imagine building. Every component of this PC holds a piece of me: take it apart, dive in, and power it on if you like. Enjoy the journey.",
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
    it: "Il polo di Coppito, dove sto per laurearmi in Informatica all’Università degli Studi dell’Aquila: Blocco 0, Coppito 1 e Coppito 2 affacciati sulla stessa via.",
    en: "The Coppito campus, where I’m about to graduate in Computer Science at the University of L’Aquila: Blocco 0, Coppito 1 and Coppito 2 along the same street.",
  },
  banks: ["Blocco 0", "Coppito 1", "Coppito 2"],
  mapTitle: { it: "Mappa della memoria · esami superati", en: "Memory map · passed exams" },
  mapNote: {
    it: "Alcuni degli esami superati lungo il percorso.",
    en: "Some of the exams passed along the way.",
  },
  written: { it: "SCRITTO", en: "WRITTEN" },
  nextTitle: { it: "Prossima allocazione", en: "Next allocation" },
  next: "AICoNDA — Artificial Intelligence, Complex Networks, and Data Analytics",
  nextBody: {
    it: "Appena conclusa la triennale, punto alla laurea magistrale in AICoNDA.",
    en: "Right after my bachelor’s, I aim to start the AICoNDA master’s degree.",
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
        it: "Lanciano è casa, L’Aquila è dove studio. Una tensione bassa ma sempre presente.",
        en: "Lanciano is home, L’Aquila is where I study. A low voltage, but always on.",
      },
      load: 0.64,
    },
  ],
  connectorsTitle: { it: "Connettori · contatti", en: "Connectors · contacts" },
  connectors: [
    { label: "GitHub", value: "github.com/ringoliRob", url: "https://github.com/ringoliRob" },
    { label: "Cazzeggio", value: "cazzeggia.online", url: "https://cazzeggia.online" },
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
    cazzeggio: { it: "Cazzeggio", en: "Cazzeggio" },
  },
};
