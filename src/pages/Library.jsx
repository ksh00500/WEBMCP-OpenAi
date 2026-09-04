import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { categoryNames, languageNames } from "../i18n";

export default function Library({ c, language, user, market, busy, actions, mcpReady }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const marketById = new Map(market.map((item) => [item.id, item]));
  const activeIds = user.activeSkillIds || (user.activeSkillId ? [user.activeSkillId] : []);
  const activeSkills = user.skills.filter((skill) => activeIds.includes(skill.id));
  const responseLanguage = user.responseLanguage || "auto";
  const ordinaryTaskRule = responseLanguage === "auto"
    ? "For ordinary tasks, choose the response language from the user's current request and conversation context."
    : `For ordinary tasks, write explanatory and final response text in ${{ ko: "Korean", en: "English", ja: "Japanese" }[responseLanguage]}, regardless of the language used inside active skills.`;
  const responseLanguagePolicy = [
    ordinaryTaskRule,
    "The user's current request always takes priority when it explicitly specifies a target or output language.",
    "For translation, transcription, quotation, proofreading, language practice, or source-text preservation tasks, produce or preserve the language required by that task instead of forcing this preference onto the target material.",
    "Do not translate code, identifiers, filenames, URLs, or quoted source text unless the user asks for that translation. Surrounding explanations may use the preferred response language."
  ].join(" ");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return user.skills.filter((skill) => {
      if (filter === "market" && !skill.sourceId) return false;
      if (filter === "custom" && skill.sourceId) return false;
      if (filter === "active" && !activeIds.includes(skill.id)) return false;
      return !needle || [skill.name, skill.description, skill.category, ...(skill.tags || [])].join(" ").toLowerCase().includes(needle);
    });
  }, [user, query, filter]);
  const output = activeSkills.length
    ? {
        status: "ok",
        account: user.email,
        skillSummary: activeSkills.map(({ id, name, description }) => ({ id, name, description })),
        combinedInstructions: ["# Response Language Policy", responseLanguagePolicy, "", "# Active Skill Overview", ...activeSkills.map((skill, index) => `${index + 1}. ${skill.name}: ${skill.description}`), "", "# Active Skill Instructions", ...activeSkills.map((skill, index) => `\n## ${index + 1}. ${skill.name}\n${skill.instructions}`)].join("\n"),
        responseLanguage,
        responseLanguagePolicy,
        warning: activeSkills.length > 1 ? "Multiple skills increase token usage and may contain conflicting instructions." : null
      }
    : { status: "skill_required", message: c.noActive, combinedInstructions: `# Response Language Policy\n${responseLanguagePolicy}`, responseLanguage, responseLanguagePolicy };

  const display = (skill) => {
    const listing = marketById.get(skill.sourceId);
    return {
      name: listing?.name[language] || skill.name,
      description: listing?.description[language] || skill.description
    };
  };
  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <section className="page-titlebar">
        <div><p className="eyebrow">{c.library}</p><h1>{c.libraryTitle}</h1><p className="hero-copy">{c.libraryCopy}</p></div>
        <div className="title-actions"><span>{user.skills.length} {c.totalSkills}</span><strong>{activeSkills.length} {c.active}</strong></div>
      </section>
      <div className="workspace-shell library-workspace">
        <aside className="side-panel">
          <div className="side-panel-title">{c.library}</div>
          <nav className="side-nav">
            {[["all", c.allSkills, user.skills.length], ["active", c.active, activeSkills.length], ["market", c.marketplaceSkills, user.skills.filter((skill) => skill.sourceId).length], ["custom", c.mySkills, user.skills.filter((skill) => !skill.sourceId).length]].map(([id, label, count]) => <button className={filter === id ? "active" : ""} onClick={() => setFilter(id)} key={id}>{label}<span>{count}</span></button>)}
          </nav>
          <section className="library-language-setting">
            <label htmlFor="response-language">{c.responseLanguage}</label>
            <select
              id="response-language"
              value={responseLanguage}
              disabled={busy === "response-language"}
              onChange={(event) => actions.setResponseLanguage(event.target.value)}
            >
              <option value="auto">{c.responseLanguageAuto}</option>
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            <p>{c.responseLanguageHelp}</p>
            <span>{c.translationException}</span>
          </section>
        </aside>
        <div className="workspace-main">
          <section className="library-controls"><label className="search-box"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label></section>
          {activeSkills.length > 1 && <div className="multi-skill-warning"><strong>{language === "ko" ? "여러 스킬이 활성화되어 있습니다." : "Multiple skills are active."}</strong><span>{language === "ko" ? "토큰 사용량이 늘어나며, 서로 다른 지침이 충돌하면 답변 품질이 낮아질 수 있습니다." : "Token usage increases, and conflicting instructions may reduce response quality."}</span></div>}
          <section className="library-layout advanced">
        <div className="library-list">
          {visible.length === 0 && <div className="empty-state"><h2>{c.empty}</h2><NavLink className="primary" to="/marketplace">{c.browseMarket}</NavLink></div>}
          {visible.map((skill) => {
            const shown = display(skill);
            return (
              <article className={"library-item " + (activeIds.includes(skill.id) ? "active" : "")} key={skill.id}>
                <div className="library-info">
                  <div className="library-title-row"><h2>{shown.name}</h2>{activeIds.includes(skill.id) && <span className="active-badge"><i />{c.active}</span>}</div>
                  <p>{shown.description}</p>
                  <div className="library-meta"><span>{categoryNames[language][skill.category] || skill.category}</span><span>{languageNames[language][skill.language || "English"] || skill.language}</span><span>{skill.source ? skill.source + " · " + skill.license : c.mySkills}</span><span>{c.updated} {skill.updatedAt || "—"}</span></div>
                </div>
                <div className="library-actions">
                  <button type="button" role="switch" aria-checked={activeIds.includes(skill.id)} className={"skill-toggle " + (activeIds.includes(skill.id) ? "on" : "")} disabled={busy === "activate-" + skill.id} onClick={() => actions.activate(skill.id)}><span /><b>{activeIds.includes(skill.id) ? c.active : c.activate}</b></button>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="agent-card sticky-card">
          <div className="agent-status"><span className={"dot " + (mcpReady ? "connected" : "")} /><div><p className="section-label">{c.agentHandoff}</p><h2>{mcpReady ? c.webmcpReady : c.webmcpMissing}</h2></div></div>
          <p>{c.agentCopy}</p>
          <code className="invoke-code">@SkillMCP · {c.invocation}</code>
          <div className="terminal compact">
            <div className="terminal-top"><span /><span /><span /><p>skillmcp_get_active_skill</p></div>
            <pre>{JSON.stringify(output, null, 2)}</pre>
            <button className="copy-button" onClick={copy}>{copied ? c.copied : c.copyResponse}</button>
          </div>
        </aside>
          </section>
        </div>
      </div>
    </>
  );
}
