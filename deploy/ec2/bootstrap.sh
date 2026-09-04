#!/usr/bin/env bash
set -euo pipefail

release_archive="${1:-/tmp/skillmcp-release.tgz}"
release_root="/srv/skillmcp"
release_dir="$release_root/releases/$(date -u +%Y%m%d%H%M%S)"
data_dir="/var/lib/skillmcp"

if [[ ! -f "$release_archive" ]]; then
  echo "Release archive not found: $release_archive" >&2
  exit 1
fi

sudo dnf install -y nginx xz tar

if ! command -v node >/dev/null 2>&1 || [[ "$(node --version)" != v22.* ]]; then
  checksums="$(mktemp)"
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$checksums"
  node_file="$(awk '/linux-x64.tar.xz$/ { print $2; exit }' "$checksums")"
  node_sum="$(awk -v file="$node_file" '$2 == file { print $1; exit }' "$checksums")"
  test -n "$node_file"
  test -n "$node_sum"
  node_archive="/tmp/$node_file"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$node_file" -o "$node_archive"
  echo "$node_sum  $node_archive" | sha256sum -c -
  node_folder="${node_file%.tar.xz}"
  if [[ ! -d "/opt/$node_folder" ]]; then
    sudo tar -xJf "$node_archive" -C /opt
  fi
  sudo ln -sfn "/opt/$node_folder/bin/node" /usr/local/bin/node
  sudo ln -sfn "/opt/$node_folder/bin/npm" /usr/local/bin/npm
  sudo ln -sfn "/opt/$node_folder/bin/npx" /usr/local/bin/npx
fi

if ! sudo swapon --show --noheadings | grep -q .; then
  if [[ ! -f /swapfile ]]; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
  fi
  sudo swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
fi

if ! getent passwd skillmcp >/dev/null; then
  sudo useradd --system --home-dir "$data_dir" --shell /sbin/nologin skillmcp
fi

sudo mkdir -p "$release_dir" "$data_dir" /etc/skillmcp
sudo tar -xzf "$release_archive" -C "$release_dir"
sudo chown -R root:root "$release_dir"
sudo chown -R skillmcp:skillmcp "$data_dir"

cd "$release_dir"
sudo /usr/local/bin/npm ci --omit=dev --ignore-scripts

sudo ln -sfn "$release_dir" "$release_root/current"
sudo install -m 0644 /tmp/skillmcp.service /etc/systemd/system/skillmcp.service
nginx_config="/tmp/nginx-skillmcp.conf"
if sudo test -f /etc/letsencrypt/live/skillmcp.kro.kr/fullchain.pem && [[ -f /tmp/nginx-skillmcp-tls.conf ]]; then
  nginx_config="/tmp/nginx-skillmcp-tls.conf"
fi
sudo install -m 0644 "$nginx_config" /etc/nginx/conf.d/skillmcp.conf

if [[ ! -f /etc/skillmcp/skillmcp.env ]]; then
  sudo install -m 0600 -o root -g root /tmp/skillmcp.env /etc/skillmcp/skillmcp.env
else
  while IFS= read -r setting; do
    [[ -z "$setting" || "$setting" == \#* ]] && continue
    setting_name="${setting%%=*}"
    if ! sudo grep -q "^${setting_name}=" /etc/skillmcp/skillmcp.env; then
      echo "$setting" | sudo tee -a /etc/skillmcp/skillmcp.env >/dev/null
    fi
  done < /tmp/skillmcp.env
fi

sudo rm -f /etc/nginx/conf.d/default.conf
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable --now skillmcp nginx
sudo systemctl restart skillmcp
sudo systemctl reload nginx

healthy=0
for _ in {1..20}; do
  if curl -fsS http://127.0.0.1:3001/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 0.5
done

if [[ "$healthy" != "1" ]]; then
  sudo journalctl -u skillmcp -n 50 --no-pager
  exit 1
fi

echo "NODE=$(/usr/local/bin/node --version)"
echo "NPM=$(/usr/local/bin/npm --version)"
echo "SKILLMCP=$(systemctl is-active skillmcp)"
echo "NGINX=$(systemctl is-active nginx)"
curl -fsS http://127.0.0.1:3001/health
echo
