#!/usr/bin/env bash
set -euo pipefail

test "$(systemctl is-active skillmcp)" = "active"
test "$(systemctl is-active nginx)" = "active"
curl -fsS http://127.0.0.1:3001/health >/dev/null

for path in connect account marketplace; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://skillmcp.kro.kr/$path")"
  test "$code" = "200"
  echo "HTTPS_${path^^}=$code"
done

headers="$(mktemp)"
mcp_body="$(mktemp)"
trap 'rm -f "$headers" "$mcp_body"' EXIT
mcp_code="$(curl -sS -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' -D "$headers" -o "$mcp_body" -w '%{http_code}' https://skillmcp.kro.kr/mcp)"
test "$mcp_code" = "401"
grep -qi '^www-authenticate: Bearer' "$headers"
grep -Fq '"message":"로그인이 되어 있지 않습니다."' "$mcp_body"
grep -Fq '"status":"sign_in_required"' "$mcp_body"
echo "MCP_AUTH_CHALLENGE=$mcp_code"
echo "MCP_SIGN_IN_MESSAGE=ready"

sudo grep -q '^EMAIL_MODE=smtp' /etc/skillmcp/skillmcp.env
echo "SMTP_CONFIG=preserved"

forgot_html="$(curl -fsS 'https://skillmcp.kro.kr/forgot-password?sent=1')"
grep -Fq 'role="status"' <<<"$forgot_html"
grep -Fq 'data-loading-label="전송 중…"' <<<"$forgot_html"
grep -Fq '재설정 링크 다시 보내기' <<<"$forgot_html"
reset_html="$(curl -fsS 'https://skillmcp.kro.kr/reset-password?token=release-check')"
grep -Fq 'minlength="11"' <<<"$reset_html"
echo "PASSWORD_RESET_UI=ready"

csp_headers="$(curl -fsSI https://skillmcp.kro.kr/forgot-password)"
grep -Fiq "form-action 'self' https://chatgpt.com http://127.0.0.1:* http://localhost:*" <<<"$csp_headers"
feedback_script="$(curl -fsS https://skillmcp.kro.kr/form-feedback.js)"
grep -Fq 'data-submit-feedback' <<<"$feedback_script"
echo "OAUTH_CALLBACK_CSP=ready"
echo "FORM_FEEDBACK_SCRIPT=ready"

if grep -Rqs '실제 활동만 집계\|Install counts and ratings are calculated only from actual member activity' /srv/skillmcp/current/dist; then
  echo "REMOVED_MARKETPLACE_COPY=present" >&2
  exit 1
fi
echo "REMOVED_MARKETPLACE_COPY=absent"
grep -Rqs '답변 언어' /srv/skillmcp/current/dist
grep -Fq 'translation, transcription, quotation, proofreading' /srv/skillmcp/current/server/index.js
echo "RESPONSE_LANGUAGE_UI=ready"
echo "TRANSLATION_EXCEPTION_POLICY=ready"
echo "SKILLMCP=active"
echo "NGINX=active"
