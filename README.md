# SkillMCP

SkillMCP brings reusable `SKILL.md` workflows to LLM conversations. Users can discover open-source skills, install or create workflows, activate multiple skills, and expose them through both a remote MCP endpoint and browser WebMCP tools.

## Features

- Korean and English interface across authentication, marketplace, library, and skill builder
- Community marketplace backed by public user-created skills, with search, categories, sorting, favorites, quick view, verified-installer ratings, and real install counts
- New accounts start with an empty library; review fixtures are created only for the dedicated submission account
- Library search and filters, active-skill selection, preview, duplication, editing, and deletion
- Guided skill builder with metadata, visibility, tags, localized templates, completion feedback, and live `SKILL.md` preview
- Verified-email accounts with required public nicknames, a profile page, in-session password changes, salted `scrypt` password hashes, login lockout, password reset, and durable HttpOnly sessions
- A Streamable HTTP MCP endpoint plus browser WebMCP tools for listing, activating, and retrieving workflows

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The React client proxies `/api` requests to the Node server on `http://localhost:3001`.

## Demo flow

1. Create an account, confirm the email link, and sign in.
2. Browse the marketplace and install a workflow, or create one in the builder.
3. Open **My library** and activate one or more skills.
4. Ask an MCP or WebMCP-enabled agent to call `skillmcp_get_active_skills`.
5. The tool returns the selected workflows and their combined instructions.

### Marketplace trust model

- The marketplace is generated from user-created skills whose visibility is `public`; no demo listings or synthetic counters are shipped.
- Install counts are the number of unique accounts that have installed a public skill. Reinstalling from the same account does not increase the count.
- Only a signed-in, email-verified account that installed the skill can submit a 1–5 rating.
- Each account has one rating per skill and may update it; updates do not increase the rating count.
- Creators cannot rate their own skills. Unrated skills display `No ratings` instead of a fabricated score.
- Removing a public skill or its creator account removes its marketplace ratings and install records.

## Remote MCP endpoint

The Node server exposes a stateless Streamable HTTP endpoint at `POST /mcp`.

The public deployment is available at:

- Web app: `https://skillmcp.kro.kr`
- MCP endpoint: `https://skillmcp.kro.kr/mcp`
- Connection guide: `https://skillmcp.kro.kr/connect`

In the desktop app, open **Settings → MCP servers → Add server**, choose **Streamable HTTP**, and enter the public MCP endpoint. Save, restart the client, and authenticate with a verified SkillMCP account. The connection page also provides copy-ready Codex CLI commands and links to the current official OpenAI MCP instructions.

The MCP server implements OAuth 2.1-compatible discovery, dynamic client registration, authorization-code flow, PKCE S256, access tokens, and rotating refresh tokens. MCP clients discover the authorization server through `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`.

Set `PUBLIC_ORIGIN` and `PUBLIC_MCP_URL` to the externally reachable HTTPS origin and MCP resource URL. Browser authentication uses a same-site HttpOnly cookie and is deliberately separate from MCP OAuth bearer tokens. For a temporary auth-free plugin test, explicitly set `MCP_ALLOW_INSECURE_DEV=1`. When there is more than one account, also set `MCP_DEV_USER_EMAIL` to the account the MCP endpoint should use. Never enable this flag in production.

```powershell
$env:MCP_ALLOW_INSECURE_DEV="1"
$env:MCP_DEV_USER_EMAIL="you@example.com"
npm run dev
```

Then connect an MCP client to `http://localhost:3001/mcp`, or expose that URL through a secure development tunnel.

### OAuth endpoints

| Endpoint | Purpose |
| --- | --- |
| `/.well-known/oauth-protected-resource` | MCP protected-resource metadata |
| `/.well-known/oauth-authorization-server` | OAuth authorization-server metadata |
| `/oauth/register` | Dynamic client registration |
| `/oauth/authorize` | SkillMCP sign-in and authorization |
| `/oauth/token` | Authorization-code and refresh-token exchange |

| MCP tool | Purpose |
| --- | --- |
| `skillmcp_get_active_skills` | Returns active skill summaries and their combined instructions. |
| `skillmcp_list_skills` | Lists installed skills and their active state. |
| `skillmcp_set_skill_active` | Sets one installed skill active or inactive. |

## WebMCP tools

| Tool | Purpose |
| --- | --- |
| `skillmcp_get_active_skill` | Returns the signed-in user's active workflows and instructions. |
| `skillmcp_list_skills` | Lists installed workflows and the active selection. |
| `skillmcp_activate_skill` | Activates an installed workflow by ID. |

## Public plugin submission

The server includes production-facing policy and review endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/privacy` | Privacy policy and disclosed MCP data handling |
| `/terms` | Terms of service |
| `/support` | Public support information |
| `/account-deletion` | Credential-confirmed account and data deletion |
| `/forgot-password` | Non-enumerating password-reset request |
| `/reset-password` | One-time password reset |
| `/verify-email` | One-time email verification |
| `/.well-known/openai-apps-challenge` | Exact plain-text OpenAI domain verification token |
| `/oauth/revoke` | OAuth token revocation |

Set `PUBLISHER_NAME`, `SUPPORT_EMAIL`, `POLICY_EFFECTIVE_DATE`, and `OPENAI_APPS_CHALLENGE` before submission. The complete listing copy, tool annotation justifications, starter prompts, five positive cases, three negative cases, review fixture, and launch checklist are in [`docs/plugin-submission.md`](docs/plugin-submission.md).

Run the automated review-readiness checks with:

```bash
npm test
```

Create or refresh the dedicated reviewer fixture account only on the production host. Use a unique password and never commit it:

```bash
SKILLMCP_DATA_PATH=/var/lib/skillmcp/users.json \
REVIEW_EMAIL=review@example.com \
REVIEW_PASSWORD='replace-with-a-unique-password' \
npm run review-account
```

## Local demo notes

Account data, hashed one-time tokens, OAuth records, and hashed browser sessions are stored in the ignored `data/users.json` file using atomic replacement writes. Browser sessions use a 30-day sliding lifetime and a 90-day absolute lifetime, survive Node restarts, and are invalidated by password reset. Configure SMTP with `EMAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`; AWS SES SMTP works with this generic configuration. The EC2 deployment adds Nginx TLS termination, request rate limiting, a systemd-managed Node service, and automatic certificate renewal. Before scaling beyond the initial low-volume deployment, migrate persistence to a managed database or established identity provider and add centralized redacted audit logging, backups, and managed secrets.

Social login, OIDC identity claims, and enterprise workspace domain restrictions are intentionally excluded from the initial release. Internal email verification is only for SkillMCP account ownership and is not advertised as an OIDC `email_verified` claim.
