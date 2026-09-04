import { useState } from "react";

const MCP_URL = "https://skillmcp.kro.kr/mcp";

export default function Connect({ c }) {
  const [copied, setCopied] = useState("");
  const copy = async (value, key) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 1200);
  };
  const addCommand = `codex mcp add skillmcp --url ${MCP_URL}`;
  const loginCommand = "codex mcp login skillmcp";

  return (
    <>
      <section className="connect-hero">
        <p className="eyebrow">MCP Connection</p>
        <h1>{c.connectTitle}</h1>
        <p>{c.connectCopy}</p>
        <div className="endpoint-box"><div><span>{c.serverAddress}</span><code>{MCP_URL}</code></div><button onClick={() => copy(MCP_URL, "url")}>{copied === "url" ? c.copied : c.copy}</button></div>
      </section>
      <section className="connect-page">
        <div className="connection-note"><strong>{c.beforeConnect}</strong><span>{c.beforeConnectCopy}</span><a href="https://learn.chatgpt.com/docs/extend/mcp#connect-codex-to-an-mcp-server" target="_blank" rel="noreferrer">{c.officialDocs}</a></div>
        <div className="connection-grid">
          <article className="connection-card">
            <header><span>01</span><div><p>{c.desktopApp}</p><h2>{c.connectFromSettings}</h2></div></header>
            <ol>
              <li>{c.desktopStep1}</li>
              <li>{c.desktopStep2}</li>
              <li>{c.desktopStep3}</li>
              <li>{c.desktopStep4}</li>
              <li>{c.desktopStep5}</li>
            </ol>
          </article>
          <article className="connection-card">
            <header><span>02</span><div><p>Codex CLI</p><h2>{c.connectFromCli}</h2></div></header>
            <div className="command-box"><code>{addCommand}</code><button onClick={() => copy(addCommand, "add")}>{copied === "add" ? c.copied : c.copy}</button></div>
            <div className="command-box"><code>{loginCommand}</code><button onClick={() => copy(loginCommand, "login")}>{copied === "login" ? c.copied : c.copy}</button></div>
            <p className="connection-help">{c.cliHelp}</p>
          </article>
          <article className="connection-card full-card">
            <header><span>03</span><div><p>{c.useAfterConnect}</p><h2>{c.tryPrompts}</h2></div></header>
            <div className="prompt-list"><code>{c.connectPrompt1}</code><code>{c.connectPrompt2}</code><code>{c.connectPrompt3}</code></div>
          </article>
        </div>
        <div className="webmcp-note"><div><strong>WebMCP</strong><span>{c.webmcpDifference}</span></div><a href="/library">{c.openLibrary}</a></div>
      </section>
    </>
  );
}
