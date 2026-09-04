import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import Marketplace from "./pages/Marketplace";
import Library from "./pages/Library";
import CreateSkill from "./pages/CreateSkill";
import Account from "./pages/Account";
import Connect from "./pages/Connect";
import { messages } from "./i18n";
import { api } from "./lib/api";

export default function App() {
  const [language, setLanguage] = useState(localStorage.getItem("skillmcp.language") || "ko");
  const [user, setUser] = useState(null);
  const [market, setMarket] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ nickname: "", email: "", password: "" });
  const [errorCode, setErrorCode] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [mcpReady, setMcpReady] = useState(false);
  const userRef = useRef(null);
  const c = messages[language];

  const refreshMarketplace = async () => {
    const result = await api("/api/marketplace");
    setMarket(result.skills);
    return result.skills;
  };

  const setAccount = (account) => {
    setUser(account);
    userRef.current = account;
  };

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("skillmcp.language", language);
  }, [language]);

  useEffect(() => {
    api("/api/me")
      .then((result) => setAccount(result.user))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    refreshMarketplace().catch(() => setErrorCode("DEFAULT"));
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const emptySchema = { type: "object", properties: {}, additionalProperties: false };
    const getActiveSkill = async () => {
      const current = userRef.current;
      if (!current) return { status: "sign_in_required", message: "Ask the user to sign in to SkillMCP." };
      const result = await api("/api/skills/active");
      return { ...result, account: current.email, usage: "Read the skill summary first, then apply every section in combinedInstructions to the current task." };
    };
    (async () => {
      try {
        await context.registerTool({
          name: "skillmcp_get_active_skill",
          description: "Get the signed-in user's active SKILL.md workflows as a summary followed by combined execution instructions.",
          inputSchema: emptySchema,
          annotations: { readOnlyHint: true },
          execute: getActiveSkill
        });
        await context.registerTool({
          name: "skillmcp_list_skills",
          description: "List the signed-in user's installed SkillMCP workflows and active selection.",
          inputSchema: emptySchema,
          annotations: { readOnlyHint: true },
          execute: async () => userRef.current ? api("/api/skills") : { status: "sign_in_required" }
        });
        await context.registerTool({
          name: "skillmcp_activate_skill",
          description: "Toggle one installed workflow in the signed-in user's active skill set.",
          inputSchema: {
            type: "object",
            properties: { skillId: { type: "string", description: "An installed SkillMCP skill ID." } },
            required: ["skillId"],
            additionalProperties: false
          },
          execute: async ({ skillId }) => {
            const result = await api("/api/skills/active", { method: "PUT", body: JSON.stringify({ skillId }) });
            setAccount(result.user);
            return { status: result.status, active_skills: result.activeSkills, warning: result.warning };
          }
        });
        setMcpReady(true);
      } catch (error) {
        console.warn("WebMCP registration failed", error);
      }
    })();
  }, []);

  const run = async (key, task) => {
    setBusy(key);
    setErrorCode("");
    try {
      return await task();
    } catch (error) {
      setErrorCode(error.message || "DEFAULT");
      throw error;
    } finally {
      setBusy("");
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    try {
      await run("auth", async () => {
        const result = await api("/api/auth/" + (authMode === "login" ? "login" : "register"), {
          method: "POST",
          body: JSON.stringify(authForm)
        });
        if (result.verificationRequired) {
          setAuthMode("login");
          setAuthNotice(c.verificationSent);
          return;
        }
        setAccount(result.user);
        setAuthOpen(false);
      });
    } catch {}
  };

  const resendVerification = async () => {
    try {
      await run("resend-verification", () => api("/api/auth/email-verification/resend", {
        method: "POST",
        body: JSON.stringify({ email: authForm.email })
      }));
      setErrorCode("");
      setAuthNotice(c.verificationResent);
    } catch {}
  };

  const actions = {
    install: async (sourceId) => run("install-" + sourceId, async () => {
      if (!userRef.current) return setAuthOpen(true);
      const result = await api("/api/marketplace/" + sourceId + "/install", { method: "POST" });
      setAccount(result.user);
      setMarket(result.marketplace);
    }),
    favorite: async (sourceId) => run("favorite-" + sourceId, async () => {
      if (!userRef.current) return setAuthOpen(true);
      const result = await api("/api/marketplace/" + sourceId + "/favorite", { method: "PUT" });
      setAccount(result.user);
    }),
    activate: async (skillId) => run("activate-" + skillId, async () => {
      const result = await api("/api/skills/active", { method: "PUT", body: JSON.stringify({ skillId }) });
      setAccount(result.user);
    }),
    setResponseLanguage: async (responseLanguage) => run("response-language", async () => {
      const result = await api("/api/skills/response-language", {
        method: "PUT",
        body: JSON.stringify({ responseLanguage })
      });
      setAccount(result.user);
    }),
    rate: async (sourceId, rating) => run("rate-" + sourceId, async () => {
      if (!userRef.current) return setAuthOpen(true);
      const result = await api("/api/marketplace/" + sourceId + "/rating", { method: "PUT", body: JSON.stringify({ rating }) });
      setMarket(result.marketplace);
    }),
    create: async (values) => run("create", async () => {
      const result = await api("/api/skills", { method: "POST", body: JSON.stringify(values) });
      setAccount(result.user);
      await refreshMarketplace();
    }),
    update: async (skillId, values) => run("update-" + skillId, async () => {
      const result = await api("/api/skills/" + skillId, { method: "PATCH", body: JSON.stringify(values) });
      setAccount(result.user);
      await refreshMarketplace();
    }),
    duplicate: async (skillId) => run("duplicate-" + skillId, async () => {
      const result = await api("/api/skills/" + skillId + "/duplicate", { method: "POST" });
      setAccount(result.user);
    }),
    remove: async (skillId) => run("remove-" + skillId, async () => {
      const result = await api("/api/skills/" + skillId, { method: "DELETE" });
      setAccount(result.user);
      await refreshMarketplace();
    }),
    updateProfile: async (values) => run("profile", async () => {
      const result = await api("/api/account/profile", { method: "PATCH", body: JSON.stringify(values) });
      setAccount(result.user);
      await refreshMarketplace();
    }),
    changePassword: async (values) => run("password", async () => {
      const result = await api("/api/account/password", { method: "PUT", body: JSON.stringify(values) });
      setAccount(result.user);
    }),
    showError: (code) => setErrorCode(code)
  };

  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    setAccount(null);
  };

  const viewer = user || { skills: [], favoriteSourceIds: [] };

  return (
    <main className="shell app-shell">
      <header className="app-header">
        <nav className="nav app-nav">
          <NavLink className="brand" to="/marketplace"><span className="brand-mark">S</span>SkillMCP</NavLink>
          <div className="nav-links">
            <NavLink to="/marketplace">{c.marketplace}</NavLink>
            <NavLink to="/library">{c.library}</NavLink>
            <NavLink to="/create">{c.createSkill}</NavLink>
            <NavLink to="/connect">{c.connectMcp}</NavLink>
          </div>
          <div className="nav-actions">
            <LanguageSelect language={language} setLanguage={setLanguage} />
            {user ? <>
              <NavLink className="account-chip" to="/account"><span className="avatar">{(user.nickname || user.email).slice(0, 1).toUpperCase()}</span><span>{user.nickname}</span></NavLink>
              <button className="text-button nav-logout" onClick={logout}>{c.signOut}</button>
            </> : <button className="primary nav-sign-in" onClick={() => setAuthOpen(true)}>{c.signIn}</button>}
          </div>
        </nav>
      </header>
      {user && errorCode && <div className="global-error"><span>!</span>{c.errors[errorCode] || c.errors.DEFAULT}<button onClick={() => setErrorCode("")}>×</button></div>}
      <Routes>
        <Route path="/" element={<Navigate to="/marketplace" replace />} />
        <Route path="/marketplace" element={<Marketplace c={c} language={language} user={viewer} market={market} busy={busy} actions={actions} />} />
        <Route path="/library" element={user ? <Library c={c} language={language} user={user} market={market} busy={busy} actions={actions} mcpReady={mcpReady} /> : <AuthGate c={c} authProps={{ authMode, setAuthMode, authForm, setAuthForm, errorCode, setErrorCode, authNotice, setAuthNotice, busy, submitAuth, resendVerification }} />} />
        <Route path="/create" element={user ? <CreateSkill c={c} language={language} busy={busy} onCreate={actions.create} /> : <AuthGate c={c} authProps={{ authMode, setAuthMode, authForm, setAuthForm, errorCode, setErrorCode, authNotice, setAuthNotice, busy, submitAuth, resendVerification }} />} />
        <Route path="/connect" element={<Connect c={c} />} />
        <Route path="/account" element={user ? <Account c={c} user={user} busy={busy} actions={actions} /> : <AuthGate c={c} authProps={{ authMode, setAuthMode, authForm, setAuthForm, errorCode, setErrorCode, authNotice, setAuthNotice, busy, submitAuth, resendVerification }} />} />
        <Route path="*" element={<Navigate to="/marketplace" replace />} />
      </Routes>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} SkillMCP</span>
        <nav aria-label="Policy links">
          <a href="/privacy">개인정보처리방침</a>
          <a href="/terms">이용약관</a>
          <a href="/support">고객지원</a>
          <a href="/account-deletion">계정 삭제</a>
        </nav>
      </footer>
      {authOpen && <div className="modal-backdrop auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAuthOpen(false)}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)}>×</button><AuthForm c={c} authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} errorCode={errorCode} setErrorCode={setErrorCode} authNotice={authNotice} setAuthNotice={setAuthNotice} busy={busy} submitAuth={submitAuth} resendVerification={resendVerification} /></div></div>}
    </main>
  );
}

function AuthGate({ c, authProps }) {
  return <section className="auth-gate"><div className="auth-gate-copy"><p className="eyebrow">{c.runtime}</p><h1>{c.signInRequiredTitle}</h1><p>{c.signInRequiredCopy}</p></div><AuthForm c={c} {...authProps} /></section>;
}

function AuthForm({ c, authMode, setAuthMode, authForm, setAuthForm, errorCode, setErrorCode, authNotice, setAuthNotice, busy, submitAuth, resendVerification }) {
  return <form onSubmit={submitAuth} className="auth-form">
    <div className="form-title"><span className="dot connected" /><h2>{authMode === "login" ? c.signIn : c.createAccount}</h2></div>
    {authMode === "register" && <label>{c.nickname}<input required minLength={2} maxLength={24} autoComplete="nickname" value={authForm.nickname} onChange={(event) => setAuthForm({ ...authForm, nickname: event.target.value })} placeholder={c.nicknamePlaceholder} /></label>}
    <label>{c.email}<input type="email" required value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label>
    <label>{c.password}<input type="password" required minLength={authMode === "register" ? 11 : 1} autoComplete={authMode === "register" ? "new-password" : "current-password"} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="•••••••••••" /></label>
    {authMode === "register" && <p className="form-help">{c.emailVerificationGuide}</p>}
    {authNotice && <p className="auth-notice">{authNotice}</p>}
    {errorCode && <p className="error">{c.errors[errorCode] || c.errors.DEFAULT}</p>}
    {authMode === "login" && errorCode === "EMAIL_NOT_VERIFIED" && <div className="auth-recovery"><span>{c.verificationHelp}</span><button type="button" onClick={resendVerification} disabled={busy === "resend-verification"}>{busy === "resend-verification" ? "…" : c.resendVerification}</button></div>}
    <button className="primary" disabled={busy === "auth"}>{busy === "auth" ? (authMode === "login" ? "…" : c.sending) : authMode === "login" ? c.signIn : c.sendVerificationEmail}</button>
    {authMode === "login" && <a className="text-button" href="/forgot-password">{c.forgotPassword}</a>}
    <button className="text-button" type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setErrorCode(""); setAuthNotice(""); }}>
      {authMode === "login" ? c.newUser + " " + c.createAccount : c.existingUser + " " + c.signIn}
    </button>
  </form>;
}

function LanguageSelect({ language, setLanguage }) {
  return (
    <select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Language">
      <option value="en">EN</option>
      <option value="ko">한국어</option>
    </select>
  );
}
