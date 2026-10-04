import Snake from "../components/Snake";
import { GPU, type Lang } from "../content";

export default function GpuPage({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">{GPU.kicker[lang]}</p>
        <h1 className="glitch" data-text={GPU.title}>
          {GPU.title}
        </h1>
        <p className="lead">{GPU.lead[lang]}</p>
        <a className="cta" href="https://cazzeggia.online" target="_blank" rel="noreferrer">
          {GPU.cta[lang]} <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="bench">
        <header>
          <h2>{GPU.benchTitle[lang]}</h2>
          <p>{GPU.benchBody[lang]}</p>
        </header>
        <Snake lang={lang} accent="#ff4fd8" />
      </section>
    </>
  );
}
