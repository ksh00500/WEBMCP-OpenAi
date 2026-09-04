import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { handleMcpRequest } from "./mcp.js";
import { createMailer } from "./mailer.js";
import { installOAuthRoutes } from "./oauth.js";
import { installPublicPages } from "./public-pages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const dataPath = process.env.SKILLMCP_DATA_PATH || path.join(dataDir, "users.json");
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
const MAX_ACTIVE_SKILLS = 5;
const MAX_COMBINED_INSTRUCTIONS = 60_000;
const MAX_SKILL_INSTRUCTIONS = 20_000;
const allowedVisibilities = new Set(["private", "unlisted", "public"]);
const allowedResponseLanguages = new Set(["auto", "ko", "en", "ja"]);
const SESSION_SLIDING_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_MS = 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const EMAIL_VERIFICATION_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_MS = 30 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 11;
const SESSION_COOKIE = "skillmcp_session";

function cleanNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function validNickname(value) {
  const nickname = cleanNickname(value);
  return nickname.length >= 2 && nickname.length <= 24 && /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(nickname);
}

function database() {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({ users: [] }, null, 2), { mode: 0o600 });
  const db = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  db.users ||= [];
  db.sessions ||= [];
  db.emailVerificationTokens ||= [];
  db.passwordResetTokens ||= [];
  db.marketplaceInstalls ||= [];
  db.marketplaceRatings ||= [];
  return db;
}
function save(db) {
  const temporaryPath = `${dataPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, dataPath);
}
function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
const dummyCredential = hash("SkillMCP timing equalization credential");
function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}
function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}
function authenticateCredentials(email, password, { requireVerified = true } = {}) {
  const db = database();
  const user = db.users.find((item) => item.email === String(email).trim().toLowerCase());
  const now = Date.now();
  if (user?.loginLockUntil > now) {
    return { error: "LOGIN_TEMPORARILY_BLOCKED", retryAfter: Math.ceil((user.loginLockUntil - now) / 1000) };
  }
  const credential = user || { passwordSalt: dummyCredential.salt, passwordHash: dummyCredential.hash };
  const candidate = hash(String(password || ""), credential.passwordSalt).hash;
  const actual = Buffer.from(credential.passwordHash, "hex");
  const supplied = Buffer.from(candidate, "hex");
  const valid = Boolean(user && password) && actual.length === supplied.length && crypto.timingSafeEqual(supplied, actual);
  if (!valid) {
    if (user) {
      if (!user.loginFailureWindowStartedAt || user.loginFailureWindowStartedAt + LOGIN_WINDOW_MS <= now) {
        user.loginFailureWindowStartedAt = now;
        user.loginFailureCount = 0;
      }
      user.loginFailureCount = Number(user.loginFailureCount || 0) + 1;
      if (user.loginFailureCount >= LOGIN_MAX_FAILURES) user.loginLockUntil = now + LOGIN_LOCK_MS;
      save(db);
      if (user.loginLockUntil > now) {
        return { error: "LOGIN_TEMPORARILY_BLOCKED", retryAfter: Math.ceil((user.loginLockUntil - now) / 1000) };
      }
    }
    return { error: "INVALID_CREDENTIALS" };
  }
  user.loginFailureCount = 0;
  user.loginFailureWindowStartedAt = 0;
  user.loginLockUntil = 0;
  save(db);
  if (requireVerified && !user.emailVerified) return { error: "EMAIL_NOT_VERIFIED" };
  return { user: normalizeUser(user) };
}
function normalizeUser(user) {
  user.nickname ||= cleanNickname(String(user.email || "user").split("@")[0]).slice(0, 24) || "user";
  if (!allowedResponseLanguages.has(user.responseLanguage)) user.responseLanguage = "auto";
  user.favoriteSourceIds ||= [];
  user.skills ||= [];
  user.activeSkillIds ||= user.activeSkillId ? [user.activeSkillId] : [];
  user.activeSkillIds = user.activeSkillIds.filter((id) => user.skills.some((skill) => skill.id === id));
  for (const skill of user.skills) {
    skill.category ||= "Other";
    skill.tags ||= [];
    skill.language ||= "English";
    skill.visibility ||= skill.sourceId ? "public" : "private";
    skill.updatedAt ||= skill.createdAt || "";
  }
  return user;
}
function safeUser(user) {
  normalizeUser(user);
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    responseLanguage: user.responseLanguage,
    emailVerified: Boolean(user.emailVerified),
    activeSkillId: user.activeSkillIds[0] || "",
    activeSkillIds: user.activeSkillIds,
    favoriteSourceIds: user.favoriteSourceIds,
    skills: user.skills
  };
}

function findPublicMarketplaceSkill(db, id) {
  for (const owner of db.users) {
    normalizeUser(owner);
    const skill = owner.skills.find((item) => item.id === id && !item.sourceId && item.visibility === "public");
    if (skill) return { owner, skill };
  }
  return null;
}

function marketplacePayload(db = database()) {
  const listings = [];
  for (const owner of db.users) {
    normalizeUser(owner);
    for (const skill of owner.skills) {
      if (skill.sourceId || skill.visibility !== "public") continue;
      const ratings = db.marketplaceRatings.filter((rating) => rating.skillId === skill.id);
      const rating = ratings.length
        ? Math.round((ratings.reduce((sum, item) => sum + item.value, 0) / ratings.length) * 10) / 10
        : null;
      listings.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        tags: skill.tags,
        language: skill.language,
        updatedAt: skill.updatedAt,
        installs: new Set(db.marketplaceInstalls.filter((item) => item.skillId === skill.id).map((item) => item.userId)).size,
        rating,
        ratingCount: ratings.length,
        author: owner.nickname
      });
    }
  }
  return listings;
}
function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: publicOrigin.startsWith("https://"),
    path: "/",
    maxAge
  };
}
function createSession(res, userId) {
  const rawToken = randomToken();
  const now = Date.now();
  const db = database();
  db.sessions = db.sessions.filter((session) => session.expiresAt > now && session.absoluteExpiresAt > now);
  db.sessions.push({
    tokenHash: tokenHash(rawToken),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + SESSION_SLIDING_MS,
    absoluteExpiresAt: now + SESSION_ABSOLUTE_MS
  });
  save(db);
  res.cookie(SESSION_COOKIE, rawToken, cookieOptions(SESSION_SLIDING_MS));
  return { expiresAt: now + SESSION_SLIDING_MS, absoluteExpiresAt: now + SESSION_ABSOLUTE_MS };
}
function sessionTokenFromRequest(req) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return "";
}
function auth(req, res, next) {
  const rawToken = sessionTokenFromRequest(req);
  const now = Date.now();
  const db = database();
  const session = rawToken && db.sessions.find((item) => item.tokenHash === tokenHash(rawToken));
  const user = session && db.users.find((item) => item.id === session.userId);
  if (!session || !user || session.expiresAt <= now || session.absoluteExpiresAt <= now) {
    if (session) {
      db.sessions = db.sessions.filter((item) => item !== session);
      save(db);
    }
    res.clearCookie(SESSION_COOKIE, cookieOptions(0));
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }
  if (session.lastSeenAt + SESSION_TOUCH_MS <= now) {
    session.lastSeenAt = now;
    session.expiresAt = Math.min(now + SESSION_SLIDING_MS, session.absoluteExpiresAt);
    save(db);
    res.cookie(SESSION_COOKIE, rawToken, cookieOptions(Math.max(0, session.expiresAt - now)));
  }
  req.user = normalizeUser(user);
  req.sessionHash = session.tokenHash;
  next();
}
function findStoredUser(db, id) {
  return normalizeUser(db.users.find((item) => item.id === id));
}

function findUserById(id) {
  const user = database().users.find((item) => item.id === id);
  return user ? normalizeUser(user) : null;
}

function deleteAccountByCredentials({ email, password, confirmation }) {
  if (confirmation !== "DELETE") return false;
  const result = authenticateCredentials(String(email).trim().toLowerCase(), password, { requireVerified: false });
  if (!result.user) return false;
  const user = result.user;

  const db = database();
  const publishedSkillIds = new Set(user.skills.filter((skill) => !skill.sourceId && skill.visibility === "public").map((skill) => skill.id));
  db.users = db.users.filter((candidate) => candidate.id !== user.id);
  db.oauth ||= {};
  db.oauth.accessTokens = (db.oauth.accessTokens || []).filter((token) => token.userId !== user.id);
  db.oauth.refreshTokens = (db.oauth.refreshTokens || []).filter((token) => token.userId !== user.id);
  db.oauth.authorizationCodes = (db.oauth.authorizationCodes || []).filter((code) => code.userId !== user.id);
  db.sessions = db.sessions.filter((session) => session.userId !== user.id);
  db.emailVerificationTokens = db.emailVerificationTokens.filter((token) => token.userId !== user.id);
  db.passwordResetTokens = db.passwordResetTokens.filter((token) => token.userId !== user.id);
  db.marketplaceInstalls = db.marketplaceInstalls.filter((item) => item.userId !== user.id && !publishedSkillIds.has(item.skillId));
  db.marketplaceRatings = db.marketplaceRatings.filter((item) => item.userId !== user.id && !publishedSkillIds.has(item.skillId));
  save(db);
  return true;
}

function rateLimiter({ windowMs, max }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);
    if (buckets.size > 5000) {
      for (const [candidate, value] of buckets.entries()) {
        if (value.resetAt <= now) buckets.delete(candidate);
      }
    }
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count <= max) return next();
    res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: "RATE_LIMITED" });
  };
}

function mcpUserContext(req) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const oauthContext = oauth.resolveAccessToken(token);
  if (oauthContext && findUserById(oauthContext.userId)) return oauthContext;

  if (process.env.MCP_ALLOW_INSECURE_DEV !== "1") return null;
  const users = database().users;
  const requestedEmail = String(process.env.MCP_DEV_USER_EMAIL || "").trim().toLowerCase();
  const user = requestedEmail
    ? users.find((item) => item.email === requestedEmail)
    : users.length === 1
      ? users[0]
      : null;
  return user ? { userId: user.id, scopes: ["skills:read", "skills:write"] } : null;
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use((_, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== publicOrigin) return res.status(403).json({ error: "CROSS_ORIGIN_REQUEST_BLOCKED" });
  return next();
});
app.use(["/oauth", "/mcp", "/api/auth", "/api/me", "/api/skills"], (_, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(["/oauth", "/api/auth"], rateLimiter({ windowMs: 15 * 60 * 1000, max: 180 }));
app.use(
  ["/oauth/authorize", "/oauth/token", "/api/auth/login", "/api/auth/register", "/api/account/password", "/account-deletion"],
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 })
);

const publicOrigin = String(process.env.PUBLIC_ORIGIN || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, "");
const publicMcpUrl = String(process.env.PUBLIC_MCP_URL || `${publicOrigin}/mcp`);
const mailer = createMailer();

function createOneTimeToken(db, collectionName, userId, ttlMs) {
  const rawToken = randomToken();
  const now = Date.now();
  db[collectionName] = db[collectionName].filter((item) => item.expiresAt > now && item.userId !== userId);
  db[collectionName].push({ tokenHash: tokenHash(rawToken), userId, createdAt: now, expiresAt: now + ttlMs });
  return rawToken;
}

async function sendVerificationForUser(user) {
  const db = database();
  const storedUser = db.users.find((item) => item.id === user.id);
  if (!storedUser || storedUser.emailVerified) return null;
  const rawToken = createOneTimeToken(db, "emailVerificationTokens", user.id, EMAIL_VERIFICATION_MS);
  save(db);
  const actionUrl = `${publicOrigin}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await mailer.sendEmailVerification({ to: user.email, actionUrl });
  return actionUrl;
}

async function requestEmailVerification(email) {
  const user = database().users.find((item) => item.email === String(email).trim().toLowerCase());
  if (!user || user.emailVerified) return null;
  return sendVerificationForUser(user);
}

function confirmEmailVerification(rawToken) {
  const db = database();
  const now = Date.now();
  const index = db.emailVerificationTokens.findIndex((item) => item.tokenHash === tokenHash(rawToken));
  const record = index >= 0 ? db.emailVerificationTokens[index] : null;
  if (index >= 0) db.emailVerificationTokens.splice(index, 1);
  if (!record || record.expiresAt <= now) {
    save(db);
    return false;
  }
  const user = db.users.find((item) => item.id === record.userId);
  if (!user) {
    save(db);
    return false;
  }
  user.emailVerified = true;
  user.emailVerifiedAt = now;
  save(db);
  return true;
}

async function requestPasswordReset(email) {
  const db = database();
  const user = db.users.find((item) => item.email === String(email).trim().toLowerCase());
  if (!user?.emailVerified) return null;
  const rawToken = createOneTimeToken(db, "passwordResetTokens", user.id, PASSWORD_RESET_MS);
  save(db);
  const actionUrl = `${publicOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await mailer.sendPasswordReset({ to: user.email, actionUrl });
  return actionUrl;
}

function confirmPasswordReset(rawToken, newPassword) {
  if (String(newPassword).length < MIN_PASSWORD_LENGTH) return { error: "SHORT_PASSWORD" };
  const db = database();
  const now = Date.now();
  const index = db.passwordResetTokens.findIndex((item) => item.tokenHash === tokenHash(rawToken));
  const record = index >= 0 ? db.passwordResetTokens[index] : null;
  if (index >= 0) db.passwordResetTokens.splice(index, 1);
  if (!record || record.expiresAt <= now) {
    save(db);
    return { error: "INVALID_OR_EXPIRED_TOKEN" };
  }
  const user = db.users.find((item) => item.id === record.userId);
  if (!user) {
    save(db);
    return { error: "INVALID_OR_EXPIRED_TOKEN" };
  }
  const credential = hash(String(newPassword));
  user.passwordHash = credential.hash;
  user.passwordSalt = credential.salt;
  user.loginFailureCount = 0;
  user.loginFailureWindowStartedAt = 0;
  user.loginLockUntil = 0;
  user.passwordChangedAt = now;
  db.passwordResetTokens = db.passwordResetTokens.filter((item) => item.userId !== user.id);
  db.sessions = db.sessions.filter((session) => session.userId !== user.id);
  db.oauth ||= {};
  db.oauth.accessTokens = (db.oauth.accessTokens || []).filter((token) => token.userId !== user.id);
  db.oauth.refreshTokens = (db.oauth.refreshTokens || []).filter((token) => token.userId !== user.id);
  db.oauth.authorizationCodes = (db.oauth.authorizationCodes || []).filter((code) => code.userId !== user.id);
  save(db);
  return { ok: true };
}

const oauth = installOAuthRoutes({ app, database, save, authenticateCredentials, publicOrigin, publicMcpUrl });
installPublicPages({
  app,
  deleteAccountByCredentials,
  requestPasswordReset,
  confirmPasswordReset,
  confirmEmailVerification,
  requestEmailVerification
});

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const nickname = cleanNickname(req.body.nickname);
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "INVALID_EMAIL" });
  if (!validNickname(nickname)) return res.status(400).json({ error: "INVALID_NICKNAME" });
  if (password.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: "SHORT_PASSWORD" });
  const db = database();
  if (db.users.some((user) => user.email === email)) return res.status(409).json({ error: "ACCOUNT_EXISTS" });
  const credential = hash(password);
  const user = {
    id: crypto.randomUUID(),
    email,
    nickname,
    responseLanguage: "auto",
    emailVerified: false,
    passwordHash: credential.hash,
    passwordSalt: credential.salt,
    activeSkillId: "",
    activeSkillIds: [],
    favoriteSourceIds: [],
    skills: []
  };
  db.users.push(user);
  save(db);
  try {
    const verificationUrl = await sendVerificationForUser(user);
    res.status(201).json({
      user: safeUser(user),
      verificationRequired: true,
      ...(process.env.NODE_ENV !== "production" && process.env.DEV_EXPOSE_AUTH_LINKS === "1"
        ? { developmentVerificationUrl: verificationUrl }
        : {})
    });
  } catch (error) {
    console.error(`Registration email delivery failed: ${error.message}`);
    const rollback = database();
    rollback.users = rollback.users.filter((item) => item.id !== user.id);
    rollback.emailVerificationTokens = rollback.emailVerificationTokens.filter((item) => item.userId !== user.id);
    save(rollback);
    res.status(503).json({ error: "EMAIL_DELIVERY_FAILED" });
  }
});
app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const result = authenticateCredentials(email, password);
  if (!result.user) {
    if (result.retryAfter) res.set("Retry-After", String(result.retryAfter));
    return res.status(result.error === "LOGIN_TEMPORARILY_BLOCKED" ? 429 : 401).json({ error: result.error });
  }
  const session = createSession(res, result.user.id);
  res.json({ user: safeUser(result.user), session });
});
app.post("/api/auth/logout", auth, (req, res) => {
  const db = database();
  db.sessions = db.sessions.filter((session) => session.tokenHash !== req.sessionHash);
  save(db);
  res.clearCookie(SESSION_COOKIE, cookieOptions(0));
  res.status(204).end();
});
app.get("/api/me", auth, (req, res) => res.json({ user: safeUser(req.user) }));

app.patch("/api/account/profile", auth, (req, res) => {
  const nickname = cleanNickname(req.body.nickname);
  if (!validNickname(nickname)) return res.status(400).json({ error: "INVALID_NICKNAME" });
  const db = database();
  const user = findStoredUser(db, req.user.id);
  user.nickname = nickname;
  save(db);
  res.json({ user: safeUser(user) });
});

app.put("/api/account/password", auth, (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: "SHORT_PASSWORD" });
  if (currentPassword === newPassword) return res.status(400).json({ error: "PASSWORD_UNCHANGED" });
  const verified = authenticateCredentials(req.user.email, currentPassword);
  if (!verified.user) {
    const status = verified.error === "LOGIN_TEMPORARILY_BLOCKED" ? 429 : 401;
    return res.status(status).json({ error: verified.error === "LOGIN_TEMPORARILY_BLOCKED" ? verified.error : "INVALID_CURRENT_PASSWORD" });
  }
  const db = database();
  const user = findStoredUser(db, req.user.id);
  const credential = hash(newPassword);
  user.passwordHash = credential.hash;
  user.passwordSalt = credential.salt;
  user.passwordChangedAt = Date.now();
  user.loginFailureCount = 0;
  user.loginFailureWindowStartedAt = 0;
  user.loginLockUntil = 0;
  db.sessions = db.sessions.filter((session) => session.userId !== user.id);
  db.oauth ||= {};
  db.oauth.accessTokens = (db.oauth.accessTokens || []).filter((token) => token.userId !== user.id);
  db.oauth.refreshTokens = (db.oauth.refreshTokens || []).filter((token) => token.userId !== user.id);
  db.oauth.authorizationCodes = (db.oauth.authorizationCodes || []).filter((code) => code.userId !== user.id);
  save(db);
  const session = createSession(res, user.id);
  res.json({ user: safeUser(findUserById(user.id)), session });
});

app.post("/api/auth/email-verification/resend", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  let actionUrl = null;
  try { actionUrl = await requestEmailVerification(email); } catch { /* keep response non-enumerating */ }
  res.status(202).json({
    accepted: true,
    ...(process.env.NODE_ENV !== "production" && process.env.DEV_EXPOSE_AUTH_LINKS === "1" && actionUrl
      ? { developmentVerificationUrl: actionUrl }
      : {})
  });
});

app.post("/api/auth/password-reset/request", async (req, res) => {
  let actionUrl = null;
  try { actionUrl = await requestPasswordReset(req.body.email); } catch { /* do not reveal mail/account state */ }
  res.status(202).json({
    accepted: true,
    ...(process.env.NODE_ENV !== "production" && process.env.DEV_EXPOSE_AUTH_LINKS === "1" && actionUrl
      ? { developmentResetUrl: actionUrl }
      : {})
  });
});

app.post("/api/auth/password-reset/confirm", (req, res) => {
  const result = confirmPasswordReset(String(req.body.token || ""), String(req.body.newPassword || ""));
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.clearCookie(SESSION_COOKIE, cookieOptions(0));
  return res.json({ reset: true });
});

app.get("/api/marketplace", (_, res) => res.json({ skills: marketplacePayload() }));
app.put("/api/marketplace/:id/favorite", auth, (req, res) => {
  const db = database();
  if (!findPublicMarketplaceSkill(db, req.params.id)) return res.status(404).json({ error: "NOT_FOUND" });
  const user = findStoredUser(db, req.user.id);
  const exists = user.favoriteSourceIds.includes(req.params.id);
  user.favoriteSourceIds = exists
    ? user.favoriteSourceIds.filter((id) => id !== req.params.id)
    : [...user.favoriteSourceIds, req.params.id];
  save(db);
  res.json({ user: safeUser(user) });
});
app.post("/api/marketplace/:id/install", auth, async (req, res) => {
  const db = database();
  const listing = findPublicMarketplaceSkill(db, req.params.id);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND" });
  const user = findStoredUser(db, req.user.id);
  if (listing.owner.id === user.id) return res.status(409).json({ error: "OWN_SKILL" });
  if (user.skills.some((skill) => skill.sourceId === listing.skill.id)) return res.status(409).json({ error: "ALREADY_INSTALLED" });
  const today = new Date().toISOString().slice(0, 10);
  const skill = {
    id: crypto.randomUUID(),
    sourceId: listing.skill.id,
    name: listing.skill.name,
    description: listing.skill.description,
    instructions: listing.skill.instructions,
    icon: String(user.skills.length + 1).padStart(2, "0"),
    source: "SkillMCP community",
    author: listing.owner.nickname,
    category: listing.skill.category,
    tags: listing.skill.tags,
    language: listing.skill.language,
    visibility: "private",
    createdAt: today,
    updatedAt: listing.skill.updatedAt
  };
  user.skills.push(skill);
  if (!db.marketplaceInstalls.some((item) => item.skillId === listing.skill.id && item.userId === user.id)) {
    db.marketplaceInstalls.push({ skillId: listing.skill.id, userId: user.id, installedAt: Date.now() });
  }
  save(db);
  res.status(201).json({ user: safeUser(user), skill, marketplace: marketplacePayload(db) });
});

app.put("/api/marketplace/:id/rating", auth, (req, res) => {
  const value = Number(req.body.rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) return res.status(400).json({ error: "INVALID_RATING" });
  const db = database();
  const listing = findPublicMarketplaceSkill(db, req.params.id);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND" });
  const user = findStoredUser(db, req.user.id);
  if (listing.owner.id === user.id) return res.status(403).json({ error: "CANNOT_RATE_OWN_SKILL" });
  if (!user.skills.some((skill) => skill.sourceId === listing.skill.id)) {
    return res.status(403).json({ error: "INSTALL_REQUIRED" });
  }
  const existing = db.marketplaceRatings.find((rating) => rating.skillId === listing.skill.id && rating.userId === user.id);
  if (existing) {
    existing.value = value;
    existing.updatedAt = Date.now();
  } else {
    db.marketplaceRatings.push({ skillId: listing.skill.id, userId: user.id, value, updatedAt: Date.now() });
  }
  save(db);
  res.json({ rating: value, marketplace: marketplacePayload(db) });
});

function activeSkillPayload(user) {
  const activeSkills = user.skills.filter((skill) => user.activeSkillIds.includes(skill.id));
  const languagePreference = responseLanguagePayload(user);
  const languageBlock = ["# Response Language Policy", languagePreference.responseLanguagePolicy].join("\n");
  if (!activeSkills.length) {
    return {
      status: "skill_required",
      activeSkills: [],
      skillSummary: [],
      combinedInstructions: languageBlock,
      ...languagePreference
    };
  }
  const skillSummary = activeSkills.map(({ id, name, description }) => ({ id, name, description }));
  const combinedInstructions = [
    languageBlock,
    "",
    "# Active Skill Overview",
    ...skillSummary.map((skill, index) => `${index + 1}. ${skill.name}: ${skill.description}`),
    "",
    "# Active Skill Instructions",
    ...activeSkills.map((skill, index) => `\n## ${index + 1}. ${skill.name}\n${skill.instructions}`)
  ].join("\n");
  return {
    status: "ok",
    activeSkills,
    skillSummary,
    combinedInstructions,
    ...languagePreference,
    warning: activeSkills.length > 1 ? "Multiple skills increase token usage and may contain conflicting instructions." : null
  };
}

function responseLanguagePayload(user) {
  const code = allowedResponseLanguages.has(user?.responseLanguage) ? user.responseLanguage : "auto";
  const names = { auto: "Automatic", ko: "Korean", en: "English", ja: "Japanese" };
  const ordinaryTaskRule = code === "auto"
    ? "For ordinary tasks, choose the response language from the user's current request and conversation context."
    : `For ordinary tasks, write explanatory and final response text in ${names[code]}, regardless of the language used inside active skills.`;
  return {
    responseLanguage: code,
    responseLanguagePolicy: [
      ordinaryTaskRule,
      "The user's current request always takes priority when it explicitly specifies a target or output language.",
      "For translation, transcription, quotation, proofreading, language practice, or source-text preservation tasks, produce or preserve the language required by that task instead of forcing this preference onto the target material.",
      "Do not translate code, identifiers, filenames, URLs, or quoted source text unless the user asks for that translation. Surrounding explanations may use the preferred response language."
    ].join(" ")
  };
}

function mcpActiveSkillPayload(user) {
  const payload = activeSkillPayload(user);
  return {
    status: payload.status,
    activeSkills: payload.skillSummary,
    combinedInstructions: payload.combinedInstructions,
    responseLanguage: payload.responseLanguage,
    responseLanguagePolicy: payload.responseLanguagePolicy,
    warning: payload.warning || null
  };
}

function setSkillActiveForUser(userId, skillId, active) {
  const db = database();
  const user = findStoredUser(db, userId);
  if (!user?.skills.some((skill) => skill.id === skillId)) throw new Error("Skill not found in this user's library.");

  const isActive = user.activeSkillIds.includes(skillId);
  if (active && !isActive) {
    if (user.activeSkillIds.length >= MAX_ACTIVE_SKILLS) {
      throw new Error(`At most ${MAX_ACTIVE_SKILLS} skills can be active at the same time.`);
    }
    const nextInstructionsLength = user.skills
      .filter((skill) => user.activeSkillIds.includes(skill.id) || skill.id === skillId)
      .reduce((total, skill) => total + skill.instructions.length, 0);
    if (nextInstructionsLength > MAX_COMBINED_INSTRUCTIONS) {
      throw new Error("The active skill instructions would exceed the 60,000-character safety limit.");
    }
    user.activeSkillIds.push(skillId);
  }
  if (!active && isActive) user.activeSkillIds = user.activeSkillIds.filter((id) => id !== skillId);
  user.activeSkillId = user.activeSkillIds[0] || "";
  save(db);
  return mcpActiveSkillPayload(user);
}

app.get("/health", (_, res) => res.json({ status: "ok", service: "skillmcp" }));

app.post("/mcp", async (req, res) => {
  const context = mcpUserContext(req);
  if (!context) {
    res.set("WWW-Authenticate", oauth.challenge);
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "로그인이 되어 있지 않습니다.",
        data: {
          status: "sign_in_required",
          action: "SkillMCP 연결 설정에서 로그인을 완료해주세요."
        }
      },
      id: null
    });
  }

  await handleMcpRequest(req, res, {
    authChallenge: oauth.challenge,
    getActiveSkills: () => mcpActiveSkillPayload(findUserById(context.userId)),
    listSkills: () => {
      const user = findUserById(context.userId);
      return {
        skills: user.skills.map(({ id, name, description }) => ({
          id,
          name,
          description,
          active: user.activeSkillIds.includes(id)
        })),
        ...responseLanguagePayload(user)
      };
    },
    setSkillActive: (skillId, active) => {
      if (!context.scopes.includes("skills:write")) {
        const error = new Error("This connection does not have skills:write permission.");
        error.code = "INSUFFICIENT_SCOPE";
        throw error;
      }
      return setSkillActiveForUser(context.userId, skillId, active);
    }
  });
});

for (const method of ["get", "delete"]) {
  app[method]("/mcp", (_, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null
    });
  });
}

app.get("/api/skills", auth, (req, res) => res.json({
  skills: req.user.skills,
  activeSkillIds: req.user.activeSkillIds,
  ...responseLanguagePayload(req.user)
}));
app.get("/api/skills/active", auth, (req, res) => {
  res.json(activeSkillPayload(req.user));
});
app.put("/api/skills/active", auth, (req, res) => {
  const skillId = String(req.body.skillId || "");
  if (!req.user.skills.some((skill) => skill.id === skillId)) return res.status(404).json({ error: "NOT_FOUND" });
  try {
    const shouldActivate = !req.user.activeSkillIds.includes(skillId);
    setSkillActiveForUser(req.user.id, skillId, shouldActivate);
    const user = findUserById(req.user.id);
    res.json({ user: safeUser(user), ...activeSkillPayload(user) });
  } catch (error) {
    res.status(422).json({ error: error.message || "ACTIVATION_FAILED" });
  }
});
app.put("/api/skills/response-language", auth, (req, res) => {
  const responseLanguage = String(req.body.responseLanguage || "");
  if (!allowedResponseLanguages.has(responseLanguage)) return res.status(400).json({ error: "INVALID_RESPONSE_LANGUAGE" });
  const db = database();
  const user = findStoredUser(db, req.user.id);
  user.responseLanguage = responseLanguage;
  save(db);
  res.json({ user: safeUser(user), ...responseLanguagePayload(user) });
});
app.post("/api/skills", auth, (req, res) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  const instructions = String(req.body.instructions || "").trim();
  if (!name || !description || !instructions) return res.status(400).json({ error: "REQUIRED_FIELDS" });
  if (name.length > 60 || description.length > 180 || instructions.length > MAX_SKILL_INSTRUCTIONS) {
    return res.status(400).json({ error: "FIELD_TOO_LONG" });
  }
  const visibility = String(req.body.visibility || "private");
  if (!allowedVisibilities.has(visibility)) return res.status(400).json({ error: "INVALID_VISIBILITY" });
  const db = database();
  const user = findStoredUser(db, req.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const skill = {
    id: crypto.randomUUID(),
    name,
    description,
    instructions,
    icon: String(user.skills.length + 1).padStart(2, "0"),
    category: String(req.body.category || "Other").trim().slice(0, 40),
    tags: Array.isArray(req.body.tags)
      ? req.body.tags.map((tag) => String(tag).trim().slice(0, 32)).filter(Boolean).slice(0, 8)
      : [],
    language: String(req.body.language || "English").trim().slice(0, 40),
    visibility,
    createdAt: today,
    updatedAt: today
  };
  user.skills.push(skill);
  save(db);
  res.status(201).json({ user: safeUser(user), skill });
});
app.patch("/api/skills/:id", auth, (req, res) => {
  const db = database();
  const user = findStoredUser(db, req.user.id);
  const skill = user.skills.find((item) => item.id === req.params.id);
  if (!skill) return res.status(404).json({ error: "NOT_FOUND" });
  if (skill.sourceId) return res.status(403).json({ error: "MARKET_SKILL_READ_ONLY" });
  const limits = { name: 60, description: 180, instructions: MAX_SKILL_INSTRUCTIONS, category: 40, language: 40 };
  for (const field of ["name", "description", "instructions", "category", "language", "visibility"]) {
    if (req.body[field] === undefined) continue;
    const value = String(req.body[field]).trim();
    if (field === "visibility" && !allowedVisibilities.has(value)) return res.status(400).json({ error: "INVALID_VISIBILITY" });
    if (limits[field] && (!value || value.length > limits[field])) return res.status(400).json({ error: "INVALID_FIELD" });
    skill[field] = value;
  }
  if (Array.isArray(req.body.tags)) {
    skill.tags = req.body.tags.map((tag) => String(tag).trim().slice(0, 32)).filter(Boolean).slice(0, 8);
  }
  skill.updatedAt = new Date().toISOString().slice(0, 10);
  save(db);
  res.json({ user: safeUser(user), skill });
});
app.post("/api/skills/:id/duplicate", auth, (req, res) => {
  const db = database();
  const user = findStoredUser(db, req.user.id);
  const source = user.skills.find((item) => item.id === req.params.id);
  if (!source) return res.status(404).json({ error: "NOT_FOUND" });
  const today = new Date().toISOString().slice(0, 10);
  const copy = {
    ...source,
    id: crypto.randomUUID(),
    sourceId: undefined,
    source: undefined,
    repoUrl: undefined,
    name: source.name + " Copy",
    visibility: "private",
    createdAt: today,
    updatedAt: today
  };
  user.skills.push(copy);
  save(db);
  res.status(201).json({ user: safeUser(user), skill: copy });
});
app.delete("/api/skills/:id", auth, (req, res) => {
  const db = database();
  const user = findStoredUser(db, req.user.id);
  const index = user.skills.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "NOT_FOUND" });
  const [removed] = user.skills.splice(index, 1);
  user.activeSkillIds = user.activeSkillIds.filter((id) => id !== req.params.id);
  user.activeSkillId = user.activeSkillIds[0] || "";
  if (!removed.sourceId) {
    db.marketplaceInstalls = db.marketplaceInstalls.filter((item) => item.skillId !== removed.id);
    db.marketplaceRatings = db.marketplaceRatings.filter((item) => item.skillId !== removed.id);
  }
  save(db);
  res.json({ user: safeUser(user) });
});

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "INVALID_JSON" });
  }
  return next(error);
});

if (fs.existsSync(path.join(root, "dist"))) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*splat}", (_, res) => res.sendFile(path.join(root, "dist", "index.html")));
}
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => console.log(`SkillMCP API listening on http://${host}:${port}`));
