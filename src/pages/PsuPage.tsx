import { PSU, type Lang } from "../content";

export default function PsuPage({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">{PSU.kicker[lang]}</p>
        <h1>{PSU.title[lang]}</h1>
        <p className="lead">{PSU.lead[lang]}</p>
      </section>

      <section className="rails">
        {PSU.rails.map((rail) => (
          <article key={rail.volt} className="rail">
            <p className="volt">{rail.volt}</p>
            <div>
              <h2>{rail.title[lang]}</h2>
              <p>{rail.body[lang]}</p>
              <div className="load" aria-hidden="true">
                <span style={{ "--load": rail.load } as React.CSSProperties} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="connectors">
        <h2>{PSU.connectorsTitle[lang]}</h2>
        <ul>
          {PSU.connectors.map((c) => (
            <li key={c.label}>
              <a href={c.url} target="_blank" rel="noreferrer">
                <span className="pins" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                <span>
                  <small>{c.label}</small>
                  {c.value}
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
