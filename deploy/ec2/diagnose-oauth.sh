#!/usr/bin/env bash
set -euo pipefail

echo "RECENT_OAUTH_HTTP"
sudo tail -n 500 /var/log/nginx/access.log \
  | awk '$7 ~ /^\/oauth\// { split($7, uri, "?"); print $4, substr($6, 2), uri[1], $9 }' \
  | tail -n 40

echo "OAUTH_STORE_SUMMARY"
sudo -u skillmcp /usr/local/bin/node -e '
  const fs = require("node:fs");
  const db = JSON.parse(fs.readFileSync("/var/lib/skillmcp/users.json", "utf8"));
  const oauth = db.oauth || {};
  const clients = (oauth.clients || []).slice(-8).map((client) => ({
    name: client.clientName,
    redirectHosts: (client.redirectUris || []).map((value) => { try { return new URL(value).hostname; } catch { return "invalid"; } }),
    createdAt: client.createdAt ? new Date(client.createdAt * 1000).toISOString() : null
  }));
  console.log(JSON.stringify({
    clients,
    pendingAuthorizationCodes: (oauth.authorizationCodes || []).length,
    activeAccessTokens: (oauth.accessTokens || []).filter((token) => token.expiresAt > Date.now()).length,
    activeRefreshTokens: (oauth.refreshTokens || []).filter((token) => token.expiresAt > Date.now()).length
  }, null, 2));
'
