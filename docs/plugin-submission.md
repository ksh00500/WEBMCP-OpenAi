# SkillMCP plugin submission packet

This packet follows the OpenAI plugin submission flow for an MCP-only plugin. Replace every `{...}` placeholder before submission.

## Submission type

- Type: **With MCP**
- MCP URL type: **Universal**
- Custom MCP UI: **No**
- Static skill import: **No** — SkillMCP returns the signed-in user's private, dynamic skill library through tools.
- Authentication: OAuth 2.1 authorization code with PKCE S256 and dynamic client registration

## Listing

- Name: `SkillMCP`
- Suggested category: Productivity
- Short description: `내가 고른 스킬을 ChatGPT와 Codex 대화에 불러오고 활성 상태를 관리합니다.`
- Long description:

  `SkillMCP는 반복해서 사용하는 작업 지침을 개인 라이브러리에 저장하고 필요한 스킬만 활성화할 수 있게 합니다. ChatGPT 또는 Codex에서 설치된 스킬 목록과 활성 상태를 확인하고, 사용자가 명시적으로 요청하면 특정 스킬을 활성화하거나 비활성화합니다. 활성 스킬을 적용해 달라는 요청에는 선택된 스킬의 이름·설명·지침을 불러와 현재 작업에 맞게 사용합니다. 여러 스킬을 동시에 활성화할 수 있으며, 이 경우 토큰 사용량과 지침 충돌 가능성을 안내합니다.`

- Website: `https://skillmcp.kro.kr/`
- Support: `https://skillmcp.kro.kr/support`
- Privacy: `https://skillmcp.kro.kr/privacy`
- Terms: `https://skillmcp.kro.kr/terms`
- Account deletion: `https://skillmcp.kro.kr/account-deletion`
- Logo: `SkillMCP-thumbnail-v2.png` (confirm the portal's final size and format requirements before upload)
- Publisher: `{VERIFIED_DEVELOPER_OR_BUSINESS_NAME}`

## MCP and OAuth

- MCP server URL: `https://skillmcp.kro.kr/mcp`
- Protected resource metadata: `https://skillmcp.kro.kr/.well-known/oauth-protected-resource`
- Authorization server metadata: `https://skillmcp.kro.kr/.well-known/oauth-authorization-server`
- OAuth scopes: `skills:read skills:write`
- Reviewer email: `{REVIEW_EMAIL}`
- Reviewer password: `{REVIEW_PASSWORD}`
- MFA/email/SMS confirmation: none for the dedicated review account
- End-user account verification: email link required; the dedicated review fixture is preverified so review is not blocked
- Domain challenge: set `OPENAI_APPS_CHALLENGE` to the exact portal token; the server returns it as plain text from `/.well-known/openai-apps-challenge`.

Do not submit until the review account works from an external network and contains the fixture skills listed below.

## Tool metadata and annotation justifications

### `skillmcp_get_active_skills`

- Purpose: retrieve the signed-in user's active skill summaries and combined instructions.
- `readOnlyHint: true`: performs no create, update, delete, logging, job, or external side effect.
- `openWorldHint: false`: only reads private first-party SkillMCP data.
- `destructiveHint: false`: does not modify data.

### `skillmcp_list_skills`

- Purpose: list installed private-library skills and activation state without returning full instructions.
- `readOnlyHint: true`: performs a private library lookup only.
- `openWorldHint: false`: does not access or change public internet state.
- `destructiveHint: false`: does not modify data.

### `skillmcp_set_skill_active`

- Purpose: set one installed skill active or inactive after an explicit user request.
- `readOnlyHint: false`: changes the user's private activation setting.
- `openWorldHint: false`: the change remains inside the user's SkillMCP account and is never published.
- `destructiveHint: false`: the change is reversible and does not delete or overwrite skill content.
- Safeguards: exact installed skill ID required; server authorization and `skills:write` scope enforced; at most five active skills and 60,000 combined instruction characters.

## Starter prompts

1. `내 SkillMCP 라이브러리에 설치된 스킬과 활성 상태를 보여줘.`
2. `현재 활성화된 SkillMCP 스킬을 적용해서 이 프로젝트의 리서치 계획을 작성해줘.`
3. `내 라이브러리에서 Technical Writer를 찾아 활성화해줘.`
4. `현재 켜진 SkillMCP 스킬이 여러 개인지 확인하고 충돌 가능성을 알려줘.`

## Review fixture

The dedicated review account should contain:

| Skill | State | Purpose |
| --- | --- | --- |
| Evidence-led research | Active | Produce a cited, decision-ready brief |
| Technical Writer | Inactive | Create concise technical documentation |
| Code Reviewer | Inactive | Review correctness, security, tests, and maintainability |

Create this account immediately before submission with `npm run review-account`. Pass `REVIEW_EMAIL`, `REVIEW_PASSWORD`, and the production `SKILLMCP_DATA_PATH` as environment variables. Never commit the credentials.

## Positive test cases

### P1 — list installed skills

- Prompt: `내 SkillMCP 라이브러리에 어떤 스킬이 있고 무엇이 활성화되어 있어?`
- Expected tools: `skillmcp_list_skills`
- Expected result: exactly the review fixture skills with `id`, `name`, `description`, and boolean `active`; no full instructions, email, token, or internal logs.
- Fixture: review account above.

### P2 — retrieve active instructions

- Prompt: `현재 활성화된 SkillMCP 스킬을 적용해서 의사결정용 조사 체크리스트를 만들어줘.`
- Expected tools: `skillmcp_get_active_skills`
- Expected result: `status: ok`, Evidence-led research summary, non-empty `combinedInstructions`, and no warning when only one skill is active.
- Fixture: Evidence-led research active.

### P3 — activate an installed skill

- Prompt: `내 SkillMCP의 Technical Writer 스킬을 활성화해줘.`
- Expected tools: `skillmcp_list_skills`, then `skillmcp_set_skill_active` with the returned ID and `active: true`.
- Expected result: Technical Writer appears in `activeSkills`; the multiple-skill token/conflict warning is present.
- Fixture: Technical Writer inactive before the test.

### P4 — deactivate an installed skill

- Prompt: `Technical Writer는 이제 사용하지 않을게. SkillMCP에서 비활성화해줘.`
- Expected tools: `skillmcp_list_skills`, then `skillmcp_set_skill_active` with `active: false`.
- Expected result: Technical Writer is absent from `activeSkills`; its content remains installed.
- Fixture: run P3 first or activate Technical Writer before this case.

### P5 — no active skill fallback

- Prompt: `현재 활성화된 SkillMCP 스킬을 적용해줘.`
- Expected tools: `skillmcp_get_active_skills`.
- Expected result: after all fixture skills are inactive, `status: skill_required`, an empty active list, and a clarification asking which installed skill to activate. The model must not invent active instructions.
- Fixture: deactivate every fixture skill before this case.

## Negative test cases

### N1 — public marketplace search

- Prompt: `인터넷에서 가장 인기 있는 영상 편집 스킬을 찾아 설치해줘.`
- Expected behavior: do not call any of the three MCP tools because they neither search the public marketplace nor install skills. Explain the limitation or direct the user to the SkillMCP website.
- Reason: no submitted tool supports marketplace search or installation.

### N2 — delete a skill

- Prompt: `내 SkillMCP 라이브러리의 모든 스킬을 영구 삭제해줘.`
- Expected behavior: refuse or explain that the plugin cannot delete skill content; do not misuse the activation tool as deletion.
- Reason: the submitted MCP contract intentionally has no delete tool.

### N3 — activate an unknown skill

- Prompt: `존재하지 않는 ID fake-skill을 SkillMCP에서 활성화해줘.`
- Expected behavior: `skillmcp_set_skill_active` returns an error and makes no state change; the assistant should list valid installed skills or ask the user to choose one.
- Reason: cross-account and fabricated identifiers must not be accepted.

## Data returned by MCP tools

- Stable skill ID (needed for a later activation call)
- User-authored skill name and description
- Activation state
- Active user-authored skill instructions
- Multiple-skill warning

MCP tools do not return account email, passwords, OAuth tokens, session IDs, request IDs, IP addresses, timestamps, logs, marketplace analytics, or unrelated profile fields. Social login, OIDC `openid`/`email` scopes, UserInfo, and enterprise workspace domain restrictions are intentionally excluded from this submission. SkillMCP's own email verification is account security only and is not an OIDC identity assertion.

## Initial release notes

`Initial SkillMCP submission. Provides an authenticated private skill library with read-only listing and active-instruction retrieval, plus a reversible activation-state tool. Includes OAuth 2.1 discovery, DCR, PKCE S256, token rotation/revocation, public privacy/terms/support/account-deletion pages, scoped tool metadata, and reviewer fixtures. No custom MCP UI and no static skill import are included in this version.`

## Human-owned steps before submission

1. Point the final domain to a stable Elastic IP.
2. Set `PUBLIC_ORIGIN`, `PUBLIC_MCP_URL`, `PUBLISHER_NAME`, `SUPPORT_EMAIL`, and `POLICY_EFFECTIVE_DATE`.
3. Configure and test the production SMTP sender (`EMAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Keep `DEV_EXPOSE_AUTH_LINKS` disabled in production.
4. Have a lawyer or qualified privacy professional review the policy text, including the final publisher, infrastructure provider, processing country, email processor, and retention details.
5. Configure domain TLS and Nginx routes for MCP, OAuth, account recovery, policy pages, and the OpenAI challenge endpoint.
6. Complete OpenAI developer/business identity verification and confirm Apps Management Write access in a global-data-residency project.
7. Create and externally test the dedicated preverified review account without MFA or verification prompts.
8. Set the portal challenge token and verify the endpoint returns only that token.
9. Run `npm test`, connect in Developer mode, replay all eight cases, and record actual results.
10. Scan Tools in the submission portal and verify every schema and annotation before submitting.
