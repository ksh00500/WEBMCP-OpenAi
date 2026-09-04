import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoryNames, languageNames, skillTemplates } from "../i18n";

export default function CreateSkill({ c, language, busy, onCreate }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", description: "", category: "Other", language: language === "ko" ? "Korean" : "English", visibility: "private", tags: [], instructions: "" });
  const [tagText, setTagText] = useState("");
  const [template, setTemplate] = useState("blank");
  const [saved, setSaved] = useState(false);
  const completion = useMemo(() => Math.round(([values.name, values.description, values.category, values.instructions].filter(Boolean).length / 4) * 100), [values]);
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
  const chooseTemplate = (id) => { setTemplate(id); set("instructions", skillTemplates[values.language === "Korean" ? "ko" : "en"][id]); };
  async function submit(event) {
    event.preventDefault();
    try {
      await onCreate({ ...values, tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean) });
      setSaved(true);
      setTimeout(() => navigate("/library"), 700);
    } catch {}
  }

  return (
    <>
      <section className="create-heading">
        <div><p className="eyebrow">{c.createSkill}</p><h1>{c.createTitle}</h1><p className="hero-copy">{c.createCopy}</p></div>
        <div className="completion-ring" style={{ "--progress": completion + "%" }}><strong>{completion}%</strong><span>{c.completeness}</span></div>
      </section>
      <div className="builder-steps"><span className="active">01 · {c.basics}</span><i /><span className={values.instructions ? "active" : ""}>02 · {c.behavior}</span><i /><span className={completion === 100 ? "active" : ""}>03 · {c.review}</span></div>
      <section className="skill-builder">
        <form className="builder-form" onSubmit={submit}>
          <fieldset>
            <legend><span>01</span>{c.basics}</legend>
            <div className="field-grid">
              <label className="full">{c.skillName}<input required maxLength="60" value={values.name} onChange={(event) => set("name", event.target.value)} placeholder={c.nameHint} /><small>{values.name.length}/60</small></label>
              <label className="full">{c.shortDescription}<textarea className="short-textarea" required maxLength="180" value={values.description} onChange={(event) => set("description", event.target.value)} placeholder={c.descriptionHint} /><small>{values.description.length}/180</small></label>
              <label>{c.skillCategory}<select value={values.category} onChange={(event) => set("category", event.target.value)}>{Object.keys(categoryNames.en).filter((item) => !["All", "Favorites"].includes(item)).map((item) => <option value={item} key={item}>{categoryNames[language][item]}</option>)}</select></label>
              <label>{c.skillLanguage}<select value={values.language} onChange={(event) => set("language", event.target.value)}>{Object.keys(languageNames.en).map((item) => <option value={item} key={item}>{languageNames[language][item]}</option>)}</select></label>
              <label>{c.visibility}<select value={values.visibility} onChange={(event) => set("visibility", event.target.value)}><option value="private">{c.private}</option><option value="unlisted">{c.unlisted}</option><option value="public">{c.public}</option></select></label>
              <label>{c.tags}<input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder={c.tagHelp} /></label>
            </div>
          </fieldset>
          <fieldset>
            <legend><span>02</span>{c.behavior}</legend>
            <div className="template-picker"><p>{c.template}</p>{[["blank", c.blank], ["research", c.researchTemplate], ["writing", c.writingTemplate], ["review", c.reviewTemplate]].map(([id, label]) => <button type="button" className={template === id ? "active" : ""} onClick={() => chooseTemplate(id)} key={id}>{label}</button>)}</div>
            <label>{c.instructions}<textarea className="instruction-editor" required maxLength="20000" value={values.instructions} onChange={(event) => set("instructions", event.target.value)} placeholder={c.instructionHelp} /><small>{values.instructions.length.toLocaleString()}/20,000 {c.characters} · {c.markdownHint}</small></label>
          </fieldset>
          <div className="builder-submit"><span>{saved ? "✓ " + c.saved : completion === 100 ? "✓ " + c.readyToSave : completion + "%"}</span><button className="primary" disabled={busy === "create" || completion < 100}>{busy === "create" ? "…" : c.saveSkill}</button></div>
        </form>
        <aside className="skill-preview">
          <div className="preview-top"><p className="section-label">{c.preview}</p><span className={"visibility-badge " + values.visibility}>{values.visibility === "private" ? c.private : values.visibility === "public" ? c.public : c.unlisted}</span></div>
          <h2>{values.name || c.skillName}</h2>
          <p>{values.description || c.descriptionHint}</p>
          <div className="tag-row">{tagText.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <dl><div><dt>{c.category}</dt><dd>{categoryNames[language][values.category]}</dd></div><div><dt>{c.language}</dt><dd>{languageNames[language][values.language]}</dd></div><div><dt>{c.source}</dt><dd>{c.mySkills}</dd></div></dl>
          <div className="preview-markdown"><span>SKILL.md</span><pre>{values.instructions || c.instructionHelp}</pre></div>
        </aside>
      </section>
    </>
  );
}
