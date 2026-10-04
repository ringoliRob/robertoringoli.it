import { useState } from "react";
import { PROJECTS, SSD, type Lang } from "../content";

export default function SsdPage({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(0);
  const project = PROJECTS[open];

  return (
    <>
      <section className="hero">
        <p className="kicker">{SSD.kicker[lang]}</p>
        <h1>{SSD.title[lang]}</h1>
        <p className="lead">{SSD.lead[lang]}</p>
      </section>

      <section className="explorer">
        <div className="explorer-bar">
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <code>{SSD.path}</code>
          <span className="disk">
            <span style={{ width: "38%" }} /> 760 GB {SSD.used[lang]}
          </span>
        </div>
        <div className="explorer-body">
          <ul className="explorer-list" role="listbox" aria-label={SSD.title[lang]}>
            {PROJECTS.map((p, i) => (
              <li key={p.file}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === open}
                  className={i === open ? "active" : ""}
                  onClick={() => setOpen(i)}
                >
                  <span className="folder" aria-hidden="true" />
                  <code>{p.file}</code>
                </button>
              </li>
            ))}
          </ul>
          <article className="explorer-detail" key={project.file}>
            <p className="detail-path">
              <code>
                {SSD.path}/{project.file}
              </code>
            </p>
            <h2>{project.title[lang]}</h2>
            <p>{project.body[lang]}</p>
            <ul className="tags">
              {project.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <p className="detail-status">
              {SSD.status[lang]}: <b>{project.status[lang]}</b>
            </p>
            {project.url && (
              <a className="cta" href={project.url} target="_blank" rel="noreferrer">
                {SSD.open[lang]} <span aria-hidden="true">↗</span>
              </a>
            )}
          </article>
        </div>
      </section>
    </>
  );
}
