#!/usr/bin/env bash
set -euo pipefail

domain="${1:-skillmcp.kro.kr}"

if [[ "$domain" != "skillmcp.kro.kr" ]]; then
  echo "Unexpected domain: $domain" >&2
  exit 1
fi

resolved_ip="$(getent ahostsv4 "$domain" | awk 'NR == 1 { print $1 }')"
if [[ "$resolved_ip" != "3.107.100.171" ]]; then
  echo "Domain does not resolve to this server: $resolved_ip" >&2
  exit 1
fi

sudo dnf install -y python3.12 python3.12-pip
sudo mkdir -p /var/lib/letsencrypt
sudo chown root:root /var/lib/letsencrypt
sudo chmod 755 /var/lib/letsencrypt

if [[ ! -x /opt/certbot312/bin/certbot ]]; then
  sudo python3.12 -m venv /opt/certbot312
fi
sudo /opt/certbot312/bin/pip install --upgrade pip 'certbot>=5.4,<6'

sudo install -m 0644 /tmp/nginx-skillmcp.conf /etc/nginx/conf.d/skillmcp.conf
sudo nginx -t
sudo systemctl reload nginx

sudo /opt/certbot312/bin/certbot certonly \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --webroot \
  --webroot-path /var/lib/letsencrypt \
  --domain "$domain"

sudo install -m 0644 /tmp/nginx-skillmcp-tls.conf /etc/nginx/conf.d/skillmcp.conf
sudo install -m 0644 /tmp/skillmcp-certbot-renew.service /etc/systemd/system/skillmcp-certbot-renew.service
sudo install -m 0644 /tmp/skillmcp-certbot-renew.timer /etc/systemd/system/skillmcp-certbot-renew.timer
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable --now skillmcp-certbot-renew.timer

echo "CERTBOT=$(sudo /opt/certbot312/bin/certbot --version 2>&1)"
echo "CERTIFICATE=$(sudo /opt/certbot312/bin/certbot certificates | awk '/Certificate Name:/ {print $3; exit}')"
echo "RENEWAL_TIMER=$(systemctl is-active skillmcp-certbot-renew.timer)"
