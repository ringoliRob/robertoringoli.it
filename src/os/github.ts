import { useEffect, useState } from "react";

/**
 * Repository pubblici di GitHub per il desktop di RingoliOS, letti dall'API pubblica (niente token).
 * L'API anonima concede 60 richieste l'ora per visitatore: la risposta resta in cache un'ora.
 * Si escludono i fork e il repo del profilo, così sul desktop restano solo i progetti veri.
 */

export const GITHUB_USER = "ringoliRob";
export const GITHUB_PROFILE = `https://github.com/${GITHUB_USER}`;

export type Repo = {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  homepage: string | null;
  pushedAt: string;
};

type ApiRepo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  homepage: string | null;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
};

const CACHE_KEY = "rr-github-repos";
const CACHE_MS = 60 * 60 * 1000;

/** Colori dei linguaggi più comuni (come la barra di GitHub). */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  "C#": "#178600",
  C: "#555555",
  "C++": "#f34b7d",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
};

function readCache(): { at: number; repos: Repo[] } | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchRepos(): Promise<Repo[]> {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = (await res.json()) as ApiRepo[];
  return data
    .filter((r) => !r.fork && !r.private && !r.archived && r.name.toLowerCase() !== GITHUB_USER.toLowerCase())
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      homepage: r.homepage || null,
      pushedAt: r.pushed_at,
    }));
}

export type RepoState = { status: "loading" | "ready" | "error"; repos: Repo[] };

export function useGithubRepos(): RepoState {
  const [state, setState] = useState<RepoState>(() => {
    const cached = readCache();
    return cached ? { status: "ready", repos: cached.repos } : { status: "loading", repos: [] };
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.at < CACHE_MS) return;
    let alive = true;
    fetchRepos()
      .then((repos) => {
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos }));
        } catch {
          /* storage non disponibile */
        }
        if (alive) setState({ status: "ready", repos });
      })
      .catch(() => {
        // se GitHub non risponde resta la cache (anche scaduta), altrimenti la lista statica
        if (alive) setState((prev) => (prev.repos.length ? prev : { status: "error", repos: [] }));
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
