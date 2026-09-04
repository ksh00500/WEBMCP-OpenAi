import fs from "node:fs";

const dataPath = process.env.SKILLMCP_DATA_PATH;
if (!dataPath || !fs.existsSync(dataPath)) {
  console.error("Set SKILLMCP_DATA_PATH to an existing SkillMCP data file.");
  process.exit(1);
}

const demoSourceIds = new Set(["research-agent", "code-reviewer", "security-engineer", "system-design", "technical-writer"]);
const db = JSON.parse(fs.readFileSync(dataPath, "utf8"));
db.users ||= [];
let removedSkills = 0;
let cleanedFavorites = 0;

for (const user of db.users) {
  if (user.reviewAccount === true) continue;
  user.skills ||= [];
  const removedIds = new Set(
    user.skills
      .filter((skill) => skill.id === "starter-research" || demoSourceIds.has(skill.sourceId))
      .map((skill) => skill.id)
  );
  removedSkills += removedIds.size;
  user.skills = user.skills.filter((skill) => !removedIds.has(skill.id));
  user.activeSkillIds = (user.activeSkillIds || []).filter((id) => !removedIds.has(id));
  user.activeSkillId = user.activeSkillIds[0] || "";
  const before = (user.favoriteSourceIds || []).length;
  user.favoriteSourceIds = (user.favoriteSourceIds || []).filter((id) => !demoSourceIds.has(id));
  cleanedFavorites += before - user.favoriteSourceIds.length;
}

db.marketplaceInstalls = (db.marketplaceInstalls || []).filter((item) => !demoSourceIds.has(item.skillId));
db.marketplaceRatings = (db.marketplaceRatings || []).filter((item) => !demoSourceIds.has(item.skillId));

const temporaryPath = `${dataPath}.${process.pid}.tmp`;
fs.writeFileSync(temporaryPath, JSON.stringify(db, null, 2), { mode: 0o600 });
fs.renameSync(temporaryPath, dataPath);
console.log(`Removed ${removedSkills} demo skill(s) and ${cleanedFavorites} stale favorite(s).`);
