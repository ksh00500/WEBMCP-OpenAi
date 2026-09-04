import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "skillmcp-test-"));
const port = 31_000 + crypto.randomInt(1_000);
const origin = `http://127.0.0.1:${port}`;
const resource = `${origin}/mcp`;
const dataPath = path.join(temporaryDirectory, "users.json");
const challengeToken = `openai-domain-${crypto.randomBytes(12).toString("hex")}`;
const email = `review-${crypto.randomUUID()}@example.com`;
const password = "Review-only-password-2026!";
let server;
let sessionCookie;
let oauthClient;
let accessToken;
let refreshToken;
let testSkillId;

function jsonHeaders(extra = {}) {
  return { "content-type": "application/json", ...extra };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { response, body };
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw lastError || new Error("Timed out waiting for the SkillMCP test server.");
}

function pkce() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function authorizationCode({ verifier, challenge, scope = "skills:read skills:write" }) {
  const form = new URLSearchParams({
    response_type: "code",
    client_id: oauthClient.client_id,
    redirect_uri: "https://client.example/callback",
    scope,
    state: "submission-test-state",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource,
    email,
    password,
    decision: "allow"
  });
  const response = await fetch(`${origin}/oauth/authorize`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    redirect: "manual"
  });
  assert.equal(response.status, 303);
  const redirect = new URL(response.headers.get("location"));
  assert.equal(redirect.searchParams.get("state"), "submission-test-state");
  assert.equal(redirect.searchParams.get("iss"), origin);
  return { code: redirect.searchParams.get("code"), verifier };
}

async function mcp(method, params, token = accessToken) {
  const response = await fetch(resource, {
    method: "POST",
    headers: jsonHeaders({
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`
    }),
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomInt(1, 1_000_000), method, ...(params ? { params } : {}) })
  });
  assert.equal(response.status, 200);
  const text = await response.text();
  if (!response.headers.get("content-type")?.includes("text/event-stream")) return JSON.parse(text);
  const data = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
  assert.ok(data.length > 0, "MCP SSE response did not contain a data event.");
  return JSON.parse(data.at(-1));
}

test.before(async () => {
  server = spawn(process.execPath, ["server/index.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: String(port),
      PUBLIC_ORIGIN: origin,
      PUBLIC_MCP_URL: resource,
      SKILLMCP_DATA_PATH: dataPath,
      OPENAI_APPS_CHALLENGE: challengeToken,
      PUBLISHER_NAME: "SkillMCP Test",
      SUPPORT_EMAIL: "support@example.com",
      EMAIL_MODE: "capture",
      DEV_EXPOSE_AUTH_LINKS: "1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForServer();

  const registration = await requestJson(`${origin}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password, nickname: "Review Tester" })
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.body.verificationRequired, true);
  assert.equal(registration.body.user.nickname, "Review Tester");
  assert.ok(registration.body.developmentVerificationUrl);

  const blockedBeforeVerification = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password })
  });
  assert.equal(blockedBeforeVerification.response.status, 401);
  assert.equal(blockedBeforeVerification.body.error, "EMAIL_NOT_VERIFIED");

  const verification = await fetch(registration.body.developmentVerificationUrl);
  assert.equal(verification.status, 200);

  const login = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password })
  });
  assert.equal(login.response.status, 200);
  sessionCookie = login.response.headers.get("set-cookie").split(";")[0];
  assert.ok(sessionCookie.startsWith("skillmcp_session="));
  assert.match(login.response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(login.response.headers.get("set-cookie"), /SameSite=Lax/i);
  assert.equal(login.body.token, undefined);
  const me = await requestJson(`${origin}/api/me`, { headers: { cookie: sessionCookie } });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.user.email, email);
  assert.equal(me.body.user.responseLanguage, "auto");
  assert.deepEqual(me.body.user.skills, []);
  assert.deepEqual(me.body.user.activeSkillIds, []);
  const storedAfterLogin = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  assert.ok(!JSON.stringify(storedAfterLogin).includes(sessionCookie.split("=")[1]));

  const created = await requestJson(`${origin}/api/skills`, {
    method: "POST",
    headers: jsonHeaders({ cookie: sessionCookie }),
    body: JSON.stringify({
      name: "Submission test skill",
      description: "A real test-owned workflow created after registration.",
      instructions: "Follow the supplied acceptance criteria and report concrete evidence.",
      visibility: "private"
    })
  });
  assert.equal(created.response.status, 201);
  testSkillId = created.body.skill.id;
  const activated = await requestJson(`${origin}/api/skills/active`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: sessionCookie }),
    body: JSON.stringify({ skillId: testSkillId })
  });
  assert.equal(activated.response.status, 200);

  const dcr = await requestJson(`${origin}/oauth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      client_name: "SkillMCP submission test",
      redirect_uris: ["https://client.example/callback"],
      token_endpoint_auth_method: "none"
    })
  });
  assert.equal(dcr.response.status, 201);
  oauthClient = dcr.body;

  const grant = await authorizationCode(pkce());
  const token = await requestJson(`${origin}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oauthClient.client_id,
      code: grant.code,
      redirect_uri: "https://client.example/callback",
      code_verifier: grant.verifier,
      resource
    })
  });
  assert.equal(token.response.status, 200);
  accessToken = token.body.access_token;
  refreshToken = token.body.refresh_token;
});

test.after(() => {
  server?.kill();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("public review pages and exact domain challenge are available", async () => {
  for (const route of ["/privacy", "/terms", "/support", "/account-deletion", "/forgot-password", "/reset-password", "/resend-verification"]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type"), /text\/html/);
  }
  const challenge = await fetch(`${origin}/.well-known/openai-apps-challenge`);
  assert.equal(await challenge.text(), challengeToken);

  const forgotSent = await fetch(`${origin}/forgot-password?sent=1`);
  const forgotHtml = await forgotSent.text();
  assert.match(forgotHtml, /role="status"/);
  assert.match(forgotHtml, /data-loading-label="전송 중…"/);
  assert.match(forgotHtml, /재설정 링크 다시 보내기/);
  assert.match(forgotHtml, /src="\/form-feedback\.js"/);
  const resetHtml = await (await fetch(`${origin}/reset-password?token=test`)).text();
  assert.match(resetHtml, /minlength="11"/);

  const oauthPkce = pkce();
  const authorizeQuery = new URLSearchParams({
    response_type: "code",
    client_id: oauthClient.client_id,
    redirect_uri: "https://client.example/callback",
    scope: "skills:read skills:write",
    state: "page-test",
    code_challenge: oauthPkce.challenge,
    code_challenge_method: "S256",
    resource
  });
  const authorizeHtml = await (await fetch(`${origin}/oauth/authorize?${authorizeQuery}`)).text();
  assert.match(authorizeHtml, /data-submit-feedback/);
  assert.match(authorizeHtml, /data-loading-label="연결 중…"/);
  assert.match(authorizeHtml, /src="\/form-feedback\.js"/);

  const nginxTls = fs.readFileSync(path.join(root, "deploy/ec2/nginx-skillmcp-tls.conf"), "utf8");
  assert.match(nginxTls, /form-action 'self' https:\/\/chatgpt\.com http:\/\/127\.0\.0\.1:\* http:\/\/localhost:\*/);
});

test("marketplace contains only real public skills and ratings come from installers", async () => {
  const published = await requestJson(`${origin}/api/skills/${testSkillId}`, {
    method: "PATCH",
    headers: jsonHeaders({ cookie: sessionCookie }),
    body: JSON.stringify({ visibility: "public" })
  });
  assert.equal(published.response.status, 200);

  const initialMarket = await requestJson(`${origin}/api/marketplace`);
  assert.equal(initialMarket.body.skills.length, 1);
  assert.equal(initialMarket.body.skills[0].installs, 0);
  assert.equal(initialMarket.body.skills[0].rating, null);
  assert.equal(initialMarket.body.skills[0].ratingCount, 0);
  assert.equal(initialMarket.body.skills[0].author, "Review Tester");

  const consumerEmail = `consumer-${crypto.randomUUID()}@example.com`;
  const consumerPassword = "Consumer-password-2026!";
  const registration = await requestJson(`${origin}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: consumerEmail, password: consumerPassword, nickname: "Consumer Tester" })
  });
  await fetch(registration.body.developmentVerificationUrl);
  const login = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: consumerEmail, password: consumerPassword })
  });
  const consumerCookie = login.response.headers.get("set-cookie").split(";")[0];

  const install = await requestJson(`${origin}/api/marketplace/${testSkillId}/install`, {
    method: "POST",
    headers: jsonHeaders({ cookie: consumerCookie })
  });
  assert.equal(install.response.status, 201);
  assert.equal(install.body.marketplace[0].installs, 1);

  const rated = await requestJson(`${origin}/api/marketplace/${testSkillId}/rating`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: consumerCookie }),
    body: JSON.stringify({ rating: 4 })
  });
  assert.equal(rated.response.status, 200);
  assert.equal(rated.body.marketplace[0].rating, 4);
  assert.equal(rated.body.marketplace[0].ratingCount, 1);

  const updated = await requestJson(`${origin}/api/marketplace/${testSkillId}/rating`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: consumerCookie }),
    body: JSON.stringify({ rating: 5 })
  });
  assert.equal(updated.body.marketplace[0].rating, 5);
  assert.equal(updated.body.marketplace[0].ratingCount, 1);

  const ownRating = await requestJson(`${origin}/api/marketplace/${testSkillId}/rating`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: sessionCookie }),
    body: JSON.stringify({ rating: 5 })
  });
  assert.equal(ownRating.response.status, 403);
  assert.equal(ownRating.body.error, "CANNOT_RATE_OWN_SKILL");
});

test("OAuth discovery advertises PKCE, DCR, revocation, and supported scopes", async () => {
  const protectedResource = await requestJson(`${origin}/.well-known/oauth-protected-resource`);
  assert.equal(protectedResource.body.resource, resource);
  assert.deepEqual(protectedResource.body.authorization_servers, [origin]);

  const metadata = await requestJson(`${origin}/.well-known/oauth-authorization-server`);
  assert.equal(metadata.body.issuer, origin);
  assert.equal(metadata.body.registration_endpoint, `${origin}/oauth/register`);
  assert.equal(metadata.body.revocation_endpoint, `${origin}/oauth/revoke`);
  assert.deepEqual(metadata.body.code_challenge_methods_supported, ["S256"]);
  assert.ok(metadata.body.scopes_supported.includes("skills:write"));
});

test("profile updates and password changes preserve the current session while revoking others", async () => {
  const accountEmail = `account-${crypto.randomUUID()}@example.com`;
  const oldPassword = "Old-pass-11";
  const newPassword = "New-pass-11";
  assert.equal(oldPassword.length, 11);
  assert.equal(newPassword.length, 11);
  const shortRegistration = await requestJson(`${origin}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: `short-${crypto.randomUUID()}@example.com`, password: "1234567890", nickname: "Short Password" })
  });
  assert.equal(shortRegistration.response.status, 400);
  assert.equal(shortRegistration.body.error, "SHORT_PASSWORD");
  const registration = await requestJson(`${origin}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: accountEmail, password: oldPassword, nickname: "Initial Nickname" })
  });
  assert.equal(registration.response.status, 201);
  await fetch(registration.body.developmentVerificationUrl);

  const firstLogin = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: accountEmail, password: oldPassword })
  });
  const firstCookie = firstLogin.response.headers.get("set-cookie").split(";")[0];
  const secondLogin = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: accountEmail, password: oldPassword })
  });
  const secondCookie = secondLogin.response.headers.get("set-cookie").split(";")[0];

  const profile = await requestJson(`${origin}/api/account/profile`, {
    method: "PATCH",
    headers: jsonHeaders({ cookie: firstCookie }),
    body: JSON.stringify({ nickname: "Updated Nickname" })
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.user.nickname, "Updated Nickname");

  const rejected = await requestJson(`${origin}/api/account/password`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: firstCookie }),
    body: JSON.stringify({ currentPassword: "incorrect-password", newPassword })
  });
  assert.equal(rejected.response.status, 401);
  assert.equal(rejected.body.error, "INVALID_CURRENT_PASSWORD");

  const changed = await requestJson(`${origin}/api/account/password`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: firstCookie }),
    body: JSON.stringify({ currentPassword: oldPassword, newPassword })
  });
  assert.equal(changed.response.status, 200);
  assert.equal(changed.body.user.nickname, "Updated Nickname");
  const refreshedCookie = changed.response.headers.get("set-cookie").split(";")[0];

  const currentSession = await requestJson(`${origin}/api/me`, { headers: { cookie: refreshedCookie } });
  assert.equal(currentSession.response.status, 200);
  const revokedSession = await requestJson(`${origin}/api/me`, { headers: { cookie: secondCookie } });
  assert.equal(revokedSession.response.status, 401);

  const oldLogin = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: accountEmail, password: oldPassword })
  });
  assert.equal(oldLogin.response.status, 401);
  const newLogin = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: accountEmail, password: newPassword })
  });
  assert.equal(newLogin.response.status, 200);
});

test("unauthenticated MCP requests return the OAuth protected-resource challenge", async () => {
  const response = await fetch(resource, { method: "POST" });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /oauth-protected-resource/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.json();
  assert.equal(body.error.message, "로그인이 되어 있지 않습니다.");
  assert.deepEqual(body.error.data, {
    status: "sign_in_required",
    action: "SkillMCP 연결 설정에서 로그인을 완료해주세요."
  });
});

test("tool scan metadata has titles, schemas, and accurate required annotations", async () => {
  const body = await mcp("tools/list");
  const tools = body.result.tools;
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    ["skillmcp_get_active_skills", "skillmcp_list_skills", "skillmcp_set_skill_active"]
  );
  for (const tool of tools) {
    assert.ok(tool.title);
    assert.ok(tool.description.startsWith("Use this when"));
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    assert.equal(tool.securitySchemes?.[0]?.type, "oauth2");
    assert.ok(tool.securitySchemes[0].scopes.includes("skills:read"));
    assert.equal(typeof tool.annotations.readOnlyHint, "boolean");
    assert.equal(typeof tool.annotations.openWorldHint, "boolean");
    assert.equal(typeof tool.annotations.destructiveHint, "boolean");
  }
  const setter = tools.find((tool) => tool.name === "skillmcp_set_skill_active");
  const library = tools.find((tool) => tool.name === "skillmcp_list_skills");
  assert.match(library.description, /connected, signed in, or active/);
  assert.match(library.description, /selecting the connector alone does not prove authentication/);
  assert.deepEqual(
    {
      readOnlyHint: setter.annotations.readOnlyHint,
      openWorldHint: setter.annotations.openWorldHint,
      destructiveHint: setter.annotations.destructiveHint
    },
    { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
  );
});

test("active and library tools return minimal structured data without identity or auth secrets", async () => {
  const updatedLanguage = await requestJson(`${origin}/api/skills/response-language`, {
    method: "PUT",
    headers: jsonHeaders({ cookie: sessionCookie }),
    body: JSON.stringify({ responseLanguage: "ko" })
  });
  assert.equal(updatedLanguage.response.status, 200);
  assert.equal(updatedLanguage.body.user.responseLanguage, "ko");

  const listed = await mcp("tools/call", { name: "skillmcp_list_skills", arguments: {} });
  assert.equal(listed.result.structuredContent.skills.length, 1);
  assert.equal(listed.result.structuredContent.responseLanguage, "ko");
  assert.match(listed.result.structuredContent.responseLanguagePolicy, /translation/i);
  const active = await mcp("tools/call", { name: "skillmcp_get_active_skills", arguments: {} });
  assert.equal(active.result.structuredContent.status, "ok");
  assert.equal(active.result.structuredContent.responseLanguage, "ko");
  assert.match(active.result.structuredContent.combinedInstructions, /current request always takes priority/i);
  assert.match(active.result.structuredContent.combinedInstructions, /translation, transcription, quotation, proofreading/i);
  const serialized = JSON.stringify(active.result);
  assert.ok(!serialized.includes(email));
  assert.ok(!serialized.includes(accessToken));
  assert.ok(!serialized.includes(refreshToken));
});

test("activation is reversible and rejects fabricated cross-library identifiers", async () => {
  const deactivate = await mcp("tools/call", {
    name: "skillmcp_set_skill_active",
    arguments: { skillId: testSkillId, active: false }
  });
  assert.equal(deactivate.result.structuredContent.status, "skill_required");

  const invalid = await mcp("tools/call", {
    name: "skillmcp_set_skill_active",
    arguments: { skillId: "fake-skill", active: true }
  });
  assert.equal(invalid.result.isError, true);

  const reactivate = await mcp("tools/call", {
    name: "skillmcp_set_skill_active",
    arguments: { skillId: testSkillId, active: true }
  });
  assert.equal(reactivate.result.structuredContent.status, "ok");
});

test("write calls with a read-only token return the tool-level OAuth reauthorization hint", async () => {
  const readOnlyPkce = { ...pkce(), scope: "skills:read" };
  const grant = await authorizationCode(readOnlyPkce);
  const token = await requestJson(`${origin}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oauthClient.client_id,
      code: grant.code,
      redirect_uri: "https://client.example/callback",
      code_verifier: grant.verifier,
      resource
    })
  });
  assert.equal(token.response.status, 200);

  const denied = await mcp("tools/call", {
    name: "skillmcp_set_skill_active",
    arguments: { skillId: testSkillId, active: false }
  }, token.body.access_token);
  assert.equal(denied.result.isError, true);
  assert.match(denied.result._meta["mcp/www_authenticate"][0], /insufficient_scope/);
});

test("invalid PKCE is rejected and an authorization code cannot be reused", async () => {
  const expected = pkce();
  const grant = await authorizationCode(expected);
  const invalid = await requestJson(`${origin}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oauthClient.client_id,
      code: grant.code,
      redirect_uri: "https://client.example/callback",
      code_verifier: "x".repeat(43),
      resource
    })
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error, "invalid_grant");

  const reused = await requestJson(`${origin}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oauthClient.client_id,
      code: grant.code,
      redirect_uri: "https://client.example/callback",
      code_verifier: expected.verifier,
      resource
    })
  });
  assert.equal(reused.response.status, 400);
  assert.equal(reused.body.error, "invalid_grant");
});

test("login blocking and one-time password reset work without storing raw auth tokens", async () => {
  const lockedEmail = `locked-${crypto.randomUUID()}@example.com`;
  const oldPassword = "Old-password-for-reset-2026!";
  const newPassword = "Reset-pass1";
  assert.equal(newPassword.length, 11);
  const registration = await requestJson(`${origin}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: lockedEmail, password: oldPassword, nickname: "Locked Tester" })
  });
  assert.equal(registration.response.status, 201);
  await fetch(registration.body.developmentVerificationUrl);

  let failed;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    failed = await requestJson(`${origin}/api/auth/login`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email: lockedEmail, password: "wrong-password-value" })
    });
  }
  assert.equal(failed.response.status, 429);
  assert.equal(failed.body.error, "LOGIN_TEMPORARILY_BLOCKED");
  assert.ok(Number(failed.response.headers.get("retry-after")) > 0);

  const resetRequest = await requestJson(`${origin}/api/auth/password-reset/request`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: lockedEmail })
  });
  assert.equal(resetRequest.response.status, 202);
  const resetUrl = new URL(resetRequest.body.developmentResetUrl);
  const rawResetToken = resetUrl.searchParams.get("token");
  assert.ok(rawResetToken);

  const reset = await requestJson(`${origin}/api/auth/password-reset/confirm`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ token: rawResetToken, newPassword })
  });
  assert.equal(reset.response.status, 200);

  const reused = await requestJson(`${origin}/api/auth/password-reset/confirm`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ token: rawResetToken, newPassword })
  });
  assert.equal(reused.response.status, 400);

  const login = await requestJson(`${origin}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: lockedEmail, password: newPassword })
  });
  assert.equal(login.response.status, 200);

  const stored = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  assert.ok(stored.sessions.some((session) => session.userId === login.body.user.id));
  assert.ok(!JSON.stringify(stored).includes(rawResetToken));
  assert.ok(stored.sessions.every((session) => session.absoluteExpiresAt > session.expiresAt));
});

test("skill input size limits and account deletion remove user data and OAuth access", async () => {
  const oversized = await requestJson(`${origin}/api/skills`, {
    method: "POST",
    headers: jsonHeaders({ cookie: sessionCookie }),
    body: JSON.stringify({ name: "Too large", description: "test", instructions: "x".repeat(20_001) })
  });
  assert.equal(oversized.response.status, 400);
  assert.equal(oversized.body.error, "FIELD_TOO_LONG");

  const deletion = await fetch(`${origin}/account-deletion`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, confirmation: "DELETE" }),
    redirect: "manual"
  });
  assert.equal(deletion.status, 303);
  assert.match(deletion.headers.get("location"), /result=deleted/);

  const authenticatedMcp = await fetch(resource, {
    method: "POST",
    headers: jsonHeaders({ authorization: `Bearer ${accessToken}` }),
    body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "tools/list" })
  });
  assert.equal(authenticatedMcp.status, 401);
});
