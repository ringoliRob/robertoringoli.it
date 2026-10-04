import { UI, type Lang } from "../content";

export default function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="lang-switch" role="group" aria-label={UI.language[lang]}>
      {(["it", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          className={lang === item ? "active" : ""}
          aria-pressed={lang === item}
          aria-label={item === "it" ? "Italiano" : "English"}
          onClick={() => setLang(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
