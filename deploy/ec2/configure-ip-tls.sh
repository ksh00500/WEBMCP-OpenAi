#!/usr/bin/env bash
set -euo pipefail

ip_address="${1:-3.107.100.171}"

if [[ "$ip_address" != "3.107.100.171" ]]; then
  echo "Unexpected IP address: $ip_address" >&2
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
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /var/lib/letsencrypt \
  --ip-address "$ip_address"

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
