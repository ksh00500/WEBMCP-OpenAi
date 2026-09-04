import crypto from "node:crypto";

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SCOPES = "skills:read skills:write";
const allowedScopes = new Set(["skills:read", "skills:write"]);

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeOAuthStore(db) {
  db.oauth ||= {};
  db.oauth.clients ||= [];
  db.oauth.accessTokens ||= [];
  db.oauth.refreshTokens ||= [];
  db.oauth.authorizationCodes ||= [];
  return db.oauth;
}

function parseScopes(value) {
  const scopes = [...new Set(String(value || DEFAULT_SCOPES).split(/\s+/).filter(Boolean))];
  if (!scopes.length || scopes.some((scope) => !allowedScopes.has(scope))) return null;
  if (!scopes.includes("skills:read")) return null;
  return scopes;
}

function validRedirectUri(value) {
  try {
    const url = new URL(value);
    if (url.hash || url.username || url.password) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function oauthError(res, status, error, description) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  return res.status(status).json({ error, error_description: description });
}

function loginPage(params, clientName, error = "", showVerificationHelp = false) {
  const hidden = Object.entries(params)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join("\n");
  const scopeLabels = String(params.scope)
    .split(/\s+/)
    .map((scope) => {
      const labels = {
        "skills:read": "내 스킬과 활성 지침 읽기",
        "skills:write": "스킬 활성화 상태 변경"
      };
      return `<li>${labels[scope] || escapeHtml(scope)}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkillMCP 연결 승인</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#17202a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(100%,440px);background:#fff;border:1px solid #dde2e8;border-radius:18px;padding:30px;box-shadow:0 18px 50px rgba(25,35,45,.1)}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;color:#667085;text-transform:uppercase}.brand{font-size:27px;font-weight:750;margin:8px 0}.copy{color:#5b6572;line-height:1.55;margin:0 0 22px}.permissions{background:#f8fafc;border:1px solid #e7ebef;border-radius:12px;padding:14px 16px;margin-bottom:20px}.permissions strong{font-size:14px}.permissions ul{margin:9px 0 0;padding-left:20px;color:#596472;font-size:14px;line-height:1.65}.field{margin:14px 0}.field label{display:block;font-size:13px;font-weight:650;margin-bottom:7px}.field input{width:100%;height:46px;border:1px solid #cfd6dd;border-radius:10px;padding:0 13px;font:inherit}.field input:focus{outline:3px solid #dcefe9;border-color:#287d68}.error{background:#fff1f0;border:1px solid #ffc9c5;color:#a93226;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px}.submit{width:100%;height:48px;border:0;border-radius:11px;background:#173f36;color:#fff;font:inherit;font-weight:700;cursor:pointer;margin-top:8px}.deny{width:100%;height:42px;border:0;background:transparent;color:#667085;font:inherit;cursor:pointer;margin-top:6px}.note{text-align:center;color:#7b8490;font-size:12px;margin:16px 0 0}.note a{color:#536b65}
    .submit{box-shadow:0 2px 0 #0d2b24;transition:background .16s,transform .08s,box-shadow .08s}.submit:hover{background:#21594d}.submit:active{transform:translateY(2px);box-shadow:none}.submit[aria-busy="true"]{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:#315f55;cursor:wait}.submit[aria-busy="true"]::before{content:"";width:15px;height:15px;border:2px solid rgba(255,255,255,.42);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}.submit:disabled,.deny:disabled{opacity:.82}@keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">OAuth 2.1 authorization</div>
    <div class="brand">SkillMCP 연결</div>
    <p class="copy"><strong>${escapeHtml(clientName)}</strong>에서 SkillMCP 계정에 접근하려고 합니다.</p>
    <section class="permissions"><strong>허용할 작업</strong><ul>${scopeLabels}</ul></section>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    ${showVerificationHelp ? `<p class="note" style="margin:0 0 12px">확인 메일을 받지 못했나요? <a href="/resend-verification">확인 메일 다시 받기</a></p>` : ""}
    <form method="post" action="/oauth/authorize" data-submit-feedback>
      ${hidden}
      <div class="field"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button class="submit" name="decision" value="allow" type="submit" data-loading-label="연결 중…">로그인하고 연결 허용</button>
      <button class="deny" name="decision" value="deny" type="submit" formnovalidate data-loading-label="취소 중…">연결 취소</button>
    </form>
    <p class="note"><a href="/forgot-password">비밀번호 재설정</a><br>비밀번호는 SkillMCP 서버에서만 확인되며 연결 서비스에 전달되지 않습니다.<br><a href="/privacy">개인정보처리방침</a> · <a href="/terms">이용약관</a></p>
  </main>
  <script src="/form-feedback.js" defer></script>
</body>
</html>`;
}

export function installOAuthRoutes({ app, database, save, authenticateCredentials, publicOrigin, publicMcpUrl }) {
  const issuer = publicOrigin.replace(/\/$/, "");
  const resource = publicMcpUrl;
  const metadataUrl = `${issuer}/.well-known/oauth-protected-resource`;

  function clientById(clientId) {
    return normalizeOAuthStore(database()).clients.find((client) => client.clientId === clientId) || null;
  }

  function validateAuthorization(params) {
    const client = clientById(params.client_id);
    if (!client) return { error: "Unknown OAuth client." };
    if (params.response_type !== "code") return { error: "Only the authorization code flow is supported." };
    if (!client.redirectUris.includes(params.redirect_uri)) return { error: "The redirect URI is not registered." };
    if (params.code_challenge_method !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(params.code_challenge || "")) {
      return { error: "A valid S256 PKCE challenge is required." };
    }
    if (params.resource !== resource) return { error: "The OAuth resource does not match this MCP server." };
    const scopes = parseScopes(params.scope);
    if (!scopes) return { error: "The requested scopes are invalid." };
    return { client, scopes };
  }

  function issueTokens({ userId, clientId, scopes }) {
    const accessToken = randomToken();
    const refreshToken = randomToken(40);
    const now = Date.now();
    const db = database();
    const store = normalizeOAuthStore(db);
    store.accessTokens = store.accessTokens.filter((token) => token.expiresAt > now);
    store.refreshTokens = store.refreshTokens.filter((token) => token.expiresAt > now);
    store.accessTokens.push({
      tokenHash: tokenHash(accessToken),
      userId,
      clientId,
      scopes,
      resource,
      expiresAt: now + ACCESS_TOKEN_TTL_MS
    });
    store.refreshTokens.push({
      tokenHash: tokenHash(refreshToken),
      userId,
      clientId,
      scopes,
      resource,
      expiresAt: now + REFRESH_TOKEN_TTL_MS
    });
    save(db);
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      refresh_token: refreshToken,
      scope: scopes.join(" ")
    };
  }

  function accessTokenRecord(token) {
    if (!token) return null;
    const now = Date.now();
    return normalizeOAuthStore(database()).accessTokens.find(
      (candidate) => candidate.tokenHash === tokenHash(token) && candidate.expiresAt > now && candidate.resource === resource
    ) || null;
  }

  app.get(["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"], (_, res) => {
    res.json({
      resource,
      authorization_servers: [issuer],
      scopes_supported: [...allowedScopes],
      resource_documentation: `${issuer}/`,
      resource_policy_uri: `${issuer}/privacy`,
      resource_tos_uri: `${issuer}/terms`
    });
  });

  app.get("/.well-known/oauth-authorization-server", (_, res) => {
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      revocation_endpoint: `${issuer}/oauth/revoke`,
      authorization_response_iss_parameter_supported: true,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: [...allowedScopes],
      service_documentation: `${issuer}/`
    });
  });

  app.post("/oauth/register", (req, res) => {
    const redirectUris = Array.isArray(req.body.redirect_uris) ? [...new Set(req.body.redirect_uris.map(String))] : [];
    if (!redirectUris.length || redirectUris.length > 10 || redirectUris.some((uri) => !validRedirectUri(uri))) {
      return oauthError(res, 400, "invalid_redirect_uri", "Provide one to ten valid HTTPS or loopback redirect URIs.");
    }
    if (req.body.token_endpoint_auth_method && req.body.token_endpoint_auth_method !== "none") {
      return oauthError(res, 400, "invalid_client_metadata", "Only public clients with token_endpoint_auth_method=none are supported.");
    }

    const db = database();
    const store = normalizeOAuthStore(db);
    const client = {
      clientId: `skillmcp_${randomToken(18)}`,
      clientName: String(req.body.client_name || "MCP client").slice(0, 120),
      redirectUris,
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
      createdAt: Math.floor(Date.now() / 1000)
    };
    store.clients.push(client);
    save(db);
    res.status(201).json({
      client_id: client.clientId,
      client_id_issued_at: client.createdAt,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod
    });
  });

  app.get("/oauth/authorize", (req, res) => {
    const params = {
      response_type: String(req.query.response_type || ""),
      client_id: String(req.query.client_id || ""),
      redirect_uri: String(req.query.redirect_uri || ""),
      scope: String(req.query.scope || DEFAULT_SCOPES),
      state: String(req.query.state || ""),
      code_challenge: String(req.query.code_challenge || ""),
      code_challenge_method: String(req.query.code_challenge_method || ""),
      resource: String(req.query.resource || "")
    };
    const validation = validateAuthorization(params);
    if (validation.error) return res.status(400).type("html").send(loginPage(params, "Unknown client", validation.error));
    res.set("Cache-Control", "no-store");
    res.type("html").send(loginPage(params, validation.client.clientName));
  });

  app.post("/oauth/authorize", (req, res) => {
    const params = {
      response_type: String(req.body.response_type || ""),
      client_id: String(req.body.client_id || ""),
      redirect_uri: String(req.body.redirect_uri || ""),
      scope: String(req.body.scope || ""),
      state: String(req.body.state || ""),
      code_challenge: String(req.body.code_challenge || ""),
      code_challenge_method: String(req.body.code_challenge_method || ""),
      resource: String(req.body.resource || "")
    };
    const validation = validateAuthorization(params);
    if (validation.error) return res.status(400).type("html").send(loginPage(params, "Unknown client", validation.error));

    if (req.body.decision === "deny") {
      const redirect = new URL(params.redirect_uri);
      redirect.searchParams.set("error", "access_denied");
      redirect.searchParams.set("error_description", "The user declined the SkillMCP connection.");
      if (params.state) redirect.searchParams.set("state", params.state);
      redirect.searchParams.set("iss", issuer);
      return res.redirect(303, redirect.toString());
    }

    const authResult = authenticateCredentials(String(req.body.email || ""), String(req.body.password || ""));
    if (!authResult.user) {
      res.set("Cache-Control", "no-store");
      if (authResult.retryAfter) res.set("Retry-After", String(authResult.retryAfter));
      const message = authResult.error === "LOGIN_TEMPORARILY_BLOCKED"
        ? "로그인 시도가 잠시 차단되었습니다. 15분 후 다시 시도해주세요."
        : authResult.error === "EMAIL_NOT_VERIFIED"
          ? "먼저 가입 이메일의 확인 링크를 눌러주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다.";
      const status = authResult.error === "LOGIN_TEMPORARILY_BLOCKED" ? 429 : 401;
      return res.status(status).type("html").send(loginPage(params, validation.client.clientName, message, authResult.error === "EMAIL_NOT_VERIFIED"));
    }
    const user = authResult.user;

    const code = randomToken();
    const db = database();
    const store = normalizeOAuthStore(db);
    const now = Date.now();
    store.authorizationCodes = store.authorizationCodes.filter((candidate) => candidate.expiresAt > now);
    store.authorizationCodes.push({
      codeHash: tokenHash(code),
      userId: user.id,
      clientId: params.client_id,
      redirectUri: params.redirect_uri,
      codeChallenge: params.code_challenge,
      scopes: validation.scopes,
      resource,
      expiresAt: now + AUTH_CODE_TTL_MS
    });
    save(db);
    const redirect = new URL(params.redirect_uri);
    redirect.searchParams.set("code", code);
    if (params.state) redirect.searchParams.set("state", params.state);
    redirect.searchParams.set("iss", issuer);
    res.redirect(303, redirect.toString());
  });

  app.post("/oauth/token", (req, res) => {
    const grantType = String(req.body.grant_type || "");
    const clientId = String(req.body.client_id || "");
    if (!clientById(clientId)) return oauthError(res, 401, "invalid_client", "Unknown OAuth client.");

    if (grantType === "authorization_code") {
      const codeHash = tokenHash(String(req.body.code || ""));
      const db = database();
      const store = normalizeOAuthStore(db);
      const grantIndex = store.authorizationCodes.findIndex((candidate) => candidate.codeHash === codeHash);
      const grant = grantIndex >= 0 ? store.authorizationCodes[grantIndex] : null;
      if (grantIndex >= 0) store.authorizationCodes.splice(grantIndex, 1);
      save(db);
      if (!grant || grant.expiresAt <= Date.now()) return oauthError(res, 400, "invalid_grant", "The authorization code is invalid or expired.");
      if (grant.clientId !== clientId || grant.redirectUri !== String(req.body.redirect_uri || "")) {
        return oauthError(res, 400, "invalid_grant", "The authorization code does not match this client.");
      }
      if (String(req.body.resource || "") !== resource) return oauthError(res, 400, "invalid_target", "The resource is invalid.");
      const verifier = String(req.body.code_verifier || "");
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !safeEqual(challenge, grant.codeChallenge)) {
        return oauthError(res, 400, "invalid_grant", "PKCE verification failed.");
      }
      res.set("Cache-Control", "no-store");
      res.set("Pragma", "no-cache");
      return res.json(issueTokens({ userId: grant.userId, clientId, scopes: grant.scopes }));
    }

    if (grantType === "refresh_token") {
      const presentedToken = String(req.body.refresh_token || "");
      const db = database();
      const store = normalizeOAuthStore(db);
      const index = store.refreshTokens.findIndex((token) => token.tokenHash === tokenHash(presentedToken));
      const grant = index >= 0 ? store.refreshTokens[index] : null;
      if (!grant || grant.expiresAt <= Date.now() || grant.clientId !== clientId || String(req.body.resource || "") !== resource) {
        return oauthError(res, 400, "invalid_grant", "The refresh token is invalid or expired.");
      }
      store.refreshTokens.splice(index, 1);
      save(db);
      res.set("Cache-Control", "no-store");
      res.set("Pragma", "no-cache");
      return res.json(issueTokens({ userId: grant.userId, clientId, scopes: grant.scopes }));
    }

    return oauthError(res, 400, "unsupported_grant_type", "Use authorization_code or refresh_token.");
  });

  app.post("/oauth/revoke", (req, res) => {
    const presentedToken = String(req.body.token || "");
    const clientId = String(req.body.client_id || "");
    const db = database();
    const store = normalizeOAuthStore(db);
    if (clientById(clientId) && presentedToken) {
      const presentedHash = tokenHash(presentedToken);
      store.accessTokens = store.accessTokens.filter(
        (token) => token.tokenHash !== presentedHash || token.clientId !== clientId
      );
      store.refreshTokens = store.refreshTokens.filter(
        (token) => token.tokenHash !== presentedHash || token.clientId !== clientId
      );
      save(db);
    }
    res.set("Cache-Control", "no-store");
    return res.status(200).end();
  });

  return {
    challenge: `Bearer resource_metadata="${metadataUrl}", scope="${DEFAULT_SCOPES}"`,
    resolveAccessToken(token) {
      const record = accessTokenRecord(token);
      return record ? { userId: record.userId, scopes: record.scopes } : null;
    }
  };
}
