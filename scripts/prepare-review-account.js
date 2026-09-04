import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dataPath = process.env.SKILLMCP_DATA_PATH;
const email = String(process.env.REVIEW_EMAIL || "").trim().toLowerCase();
const password = String(process.env.REVIEW_PASSWORD || "");

if (!dataPath || !/^\S+@\S+\.\S+$/.test(email) || password.length < 11) {
  console.error("Set SKILLMCP_DATA_PATH, REVIEW_EMAIL, and a REVIEW_PASSWORD of at least 11 characters.");
  process.exit(1);
}

const fixtureSkills = [
  {
    id: "review-evidence-research",
    name: "Evidence-led research",
    description: "Turn a question into a cited, decision-ready brief.",
    instructions: "Clarify the decision, prefer primary sources, distinguish facts from inference, cite consequential claims, and end with recommendations and open questions.",
    icon: "01",
    category: "Research",
    tags: ["research", "citations"],
    language: "English",
    visibility: "private",
    createdAt: "2026-09-04",
    updatedAt: "2026-09-04"
  },
  {
    id: "review-technical-writer",
    name: "Technical Writer",
    description: "Create concise documentation with clear structure and audience-aware language.",
    instructions: "Identify the intended reader and goal, organize content with descriptive headings, define unfamiliar terms, include concrete examples where useful, and finish with an actionable next step.",
    icon: "02",
    category: "Writing",
    tags: ["writing", "documentation"],
    language: "English",
    visibility: "private",
    createdAt: "2026-09-04",
    updatedAt: "2026-09-04"
  },
  {
    id: "review-code-reviewer",
    name: "Code Reviewer",
    description: "Review correctness, security, tests, and maintainability.",
    instructions: "Review the supplied code for concrete correctness, security, testing, and maintainability issues. Prioritize findings by impact, cite exact locations, and avoid speculative style-only feedback.",
    icon: "03",
    category: "Engineering",
    tags: ["code", "review"],
    language: "English",
    visibility: "private",
    createdAt: "2026-09-04",
    updatedAt: "2026-09-04"
  }
];

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
const db = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf8")) : { users: [] };
db.users ||= [];
const existing = db.users.find((user) => user.email === email);
if (existing && existing.reviewAccount !== true) {
  console.error("Refusing to overwrite a non-review account with this email.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
const user = existing || { id: crypto.randomUUID() };
Object.assign(user, {
  email,
  nickname: "SkillMCP Review",
  emailVerified: true,
  emailVerifiedAt: Date.now(),
  passwordHash,
  passwordSalt: salt,
  reviewAccount: true,
  loginFailureCount: 0,
  loginFailureWindowStartedAt: 0,
  loginLockUntil: 0,
  activeSkillId: fixtureSkills[0].id,
  activeSkillIds: [fixtureSkills[0].id],
  favoriteSourceIds: [],
  skills: fixtureSkills
});
if (!existing) db.users.push(user);

db.oauth ||= {};
db.oauth.accessTokens = (db.oauth.accessTokens || []).filter((token) => token.userId !== user.id);
db.oauth.refreshTokens = (db.oauth.refreshTokens || []).filter((token) => token.userId !== user.id);
db.oauth.authorizationCodes = (db.oauth.authorizationCodes || []).filter((code) => code.userId !== user.id);
db.sessions = (db.sessions || []).filter((session) => session.userId !== user.id);
db.emailVerificationTokens = (db.emailVerificationTokens || []).filter((token) => token.userId !== user.id);
db.passwordResetTokens = (db.passwordResetTokens || []).filter((token) => token.userId !== user.id);

const temporaryPath = `${dataPath}.${process.pid}.tmp`;
fs.writeFileSync(temporaryPath, JSON.stringify(db, null, 2), { mode: 0o600 });
fs.renameSync(temporaryPath, dataPath);
console.log(`Review account prepared for ${email} with ${fixtureSkills.length} fixture skills.`);
