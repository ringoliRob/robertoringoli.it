import { CPU, type Lang } from "../content";

export default function CpuPage({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">{CPU.kicker[lang]}</p>
        <h1>{CPU.title}</h1>
        <p className="lead">{CPU.lead[lang]}</p>
      </section>

      <section className="cpu-layout">
        <div className="die" aria-hidden="true">
          {CPU.cores.map((core, i) => (
            <span key={core.title.en} style={{ animationDelay: `${i * 0.4}s` }}>
              C{i}
            </span>
          ))}
          <i>R-05</i>
        </div>
        <dl className="spec-sheet">
          {CPU.specs.map((spec) => (
            <div key={spec.k.en}>
              <dt>{spec.k[lang]}</dt>
              <dd>{spec.v[lang]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="core-grid">
        {CPU.cores.map((core, i) => (
          <article key={core.title.en} className="core-card">
            <p className="core-id">CORE {i}</p>
            <h2>{core.title[lang]}</h2>
            <p>{core.body[lang]}</p>
          </article>
        ))}
      </section>

      <section className="prose">
        <p>{CPU.bio[lang]}</p>
      </section>
    </>
  );
}
