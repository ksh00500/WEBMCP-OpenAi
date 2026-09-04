import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { categoryNames, languageNames, tagNames } from "../i18n";

function ratingLabel(skill, c) {
  return skill.rating === null ? c.noRatings : `★ ${skill.rating} (${skill.ratingCount})`;
}

export default function Marketplace({ c, language, user, market, busy, actions }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [selectedId, setSelectedId] = useState(null);
  const categories = ["All", "Favorites", ...new Set(market.map((skill) => skill.category))];
  const selected = market.find((skill) => skill.id === selectedId) || null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return market
      .filter((skill) => {
        if (category === "Favorites") return user.favoriteSourceIds.includes(skill.id);
        return category === "All" || skill.category === category;
      })
      .filter((skill) => !needle || [skill.name, skill.description, skill.category, ...skill.tags].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1) || b.ratingCount - a.ratingCount;
        if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
        return b.installs - a.installs || b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [market, query, category, sort, user.favoriteSourceIds]);

  return (
    <>
      <section className="page-titlebar">
        <div>
          <p className="eyebrow">{c.marketplace}</p>
          <h1>{c.marketTitle}</h1>
          <p className="hero-copy">{c.marketCopy}</p>
        </div>
        <div className="title-actions"><span>{market.length} {c.allSkills}</span><strong>{c.communitySkills}</strong></div>
      </section>
      <div className="workspace-shell">
        <aside className="side-panel">
          <div className="side-panel-title">{c.marketplace}</div>
          <nav className="side-nav">
            {categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{categoryNames[language][item] || item}<span>{item === "All" ? market.length : ""}</span></button>)}
          </nav>
        </aside>
        <div className="workspace-main">
          <section className="market-toolbar">
            <label className="search-box"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label>
            <div className="sort-tabs">
              <button className={sort === "featured" ? "active" : ""} onClick={() => setSort("featured")}>{c.mostInstalled}</button>
              <button className={sort === "rating" ? "active" : ""} onClick={() => setSort("rating")}>{c.highestRated}</button>
              <button className={sort === "updated" ? "active" : ""} onClick={() => setSort("updated")}>{c.recentlyUpdated}</button>
            </div>
          </section>
          <div className="results-heading"><div><strong>{filtered.length}</strong><span>{c.allSkills}</span></div><small>{categoryNames[language][category] || category}</small></div>
          <section className="market-grid">
            {filtered.length === 0 && <div className="empty-state"><h2>{c.emptyMarketplace}</h2><p>{c.emptyMarketplaceCopy}</p>{user.id && <NavLink className="primary" to="/create">{c.createSkill}</NavLink>}</div>}
            {filtered.map((skill) => {
              const owned = user.skills.some((item) => item.id === skill.id);
              const installed = user.skills.some((item) => item.sourceId === skill.id);
              const favorite = user.favoriteSourceIds.includes(skill.id);
              return (
                <article className="market-card" key={skill.id}>
                  <header className="market-card-head">
                    <span className="category">{categoryNames[language][skill.category] || skill.category}</span>
                    <button className={"favorite " + (favorite ? "active" : "")} onClick={() => actions.favorite(skill.id)} aria-label={favorite ? c.removeFavorite : c.addFavorite}>{favorite ? "♥" : "♡"}</button>
                  </header>
                  <div className="market-card-body">
                    <h2>{skill.name}</h2>
                    <p>{skill.description}</p>
                    <div className="tag-row">{skill.tags.slice(0, 3).map((tag) => <span key={tag}>{tagNames[language][tag] || tag}</span>)}</div>
                    <div className="workshop-stats"><span><strong>{skill.installs.toLocaleString()}</strong>{c.installs}</span><span><strong>{ratingLabel(skill, c)}</strong>{c.ratings}</span><span><strong>{skill.updatedAt.slice(5)}</strong>{c.updated}</span></div>
                    <div className="card-actions">
                      <button className="secondary" onClick={() => setSelectedId(skill.id)}>{c.quickView}</button>
                      <button className={installed || owned ? "installed-button" : "primary"} disabled={installed || owned || busy === "install-" + skill.id} onClick={() => actions.install(skill.id)}>
                        {owned ? c.ownSkill : installed ? "✓ " + c.installed : busy === "install-" + skill.id ? c.installing + "…" : c.install}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </div>
      {selected && <SkillQuickView c={c} language={language} skill={selected} user={user} busy={busy} actions={actions} onClose={() => setSelectedId(null)} />}
    </>
  );
}

function SkillQuickView({ c, language, skill, user, busy, actions, onClose }) {
  const owned = user.skills.some((item) => item.id === skill.id);
  const installed = user.skills.some((item) => item.sourceId === skill.id);
  const favorite = user.favoriteSourceIds.includes(skill.id);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="quick-view">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="quick-content">
          <p className="eyebrow">{c.communitySkills}</p>
          <h1>{skill.name}</h1>
          <p className="quick-description">{skill.description}</p>
          <div className="detail-stats"><span><strong>{ratingLabel(skill, c)}</strong>{c.ratings}</span><span><strong>{skill.installs.toLocaleString()}</strong>{c.installs}</span><span><strong>{skill.updatedAt}</strong>{c.updated}</span></div>
          <dl><div><dt>{c.by}</dt><dd>{skill.author}</dd></div><div><dt>{c.category}</dt><dd>{categoryNames[language][skill.category] || skill.category}</dd></div><div><dt>{c.language}</dt><dd>{languageNames[language][skill.language] || skill.language}</dd></div><div><dt>{c.tags}</dt><dd>{skill.tags.map((tag) => tagNames[language][tag] || tag).join(", ") || "—"}</dd></div></dl>
          {installed && <div className="rating-picker"><span>{c.rateSkill}</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} disabled={busy === "rate-" + skill.id} onClick={() => actions.rate(skill.id, value)} aria-label={`${value} / 5`}>★<small>{value}</small></button>)}</div></div>}
          {!installed && !owned && <p className="rating-help">{c.installToRate}</p>}
          <div className="quick-actions">
            <button className="secondary" onClick={() => actions.favorite(skill.id)}>{favorite ? "♥ " + c.removeFavorite : "♡ " + c.addFavorite}</button>
            <button className={installed || owned ? "installed-button" : "primary"} disabled={installed || owned || busy === "install-" + skill.id} onClick={() => actions.install(skill.id)}>{owned ? c.ownSkill : installed ? "✓ " + c.installed : c.install}</button>
          </div>
        </div>
      </article>
    </div>
  );
}
