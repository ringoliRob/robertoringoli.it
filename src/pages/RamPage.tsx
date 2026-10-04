import { EXAMS, RAM, type Lang } from "../content";

const hex = (n: number) => `0x${(n * 0x100).toString(16).toUpperCase().padStart(4, "0")}`;

export default function RamPage({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">{RAM.kicker[lang]}</p>
        <h1>{RAM.title[lang]}</h1>
        <p className="lead">{RAM.lead[lang]}</p>
        <ul className="banks" aria-label="Coppito">
          {RAM.banks.map((bank, i) => (
            <li key={bank}>
              <span>BANK {i}</span>
              {bank}
            </li>
          ))}
        </ul>
      </section>

      <section className="memory">
        <header>
          <h2>{RAM.mapTitle[lang]}</h2>
          <p>{RAM.mapNote[lang]}</p>
        </header>
        <ol className="memory-map">
          {EXAMS.map((exam, i) => (
            <li key={exam.name.en} style={{ animationDelay: `${i * 60}ms` }}>
              <code>{hex(i)}</code>
              <span className="mem-tag">{exam.tag}</span>
              <span className="mem-name">{exam.name[lang]}</span>
              <span className="mem-state">{RAM.written[lang]}</span>
            </li>
          ))}
          <li className="mem-next">
            <code>{hex(EXAMS.length)}</code>
            <span className="mem-tag">MSc</span>
            <span className="mem-name">
              <small>{RAM.nextTitle[lang]}</small>
              {RAM.next}
            </span>
            <span className="mem-state">{RAM.allocating[lang]}</span>
          </li>
        </ol>
        <p className="memory-foot">{RAM.nextBody[lang]}</p>
      </section>
    </>
  );
}
