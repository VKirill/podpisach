#!/usr/bin/env bash
# Universal Build & Deploy Script
# Reads config from deploy.conf in the same directory.
#
# Usage: bash deploy.sh [type:service ...]
# Examples:
#   bash deploy.sh                     # build + restart defaults
#   bash deploy.sh pm2:bot             # build + restart bot via PM2
#   bash deploy.sh sudo-pm2:directus   # build + restart via root PM2
#   bash deploy.sh systemd:nginx       # build + restart nginx via systemd
#   bash deploy.sh supervisor:worker   # build + restart via supervisor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$SCRIPT_DIR/deploy.conf"

if [[ ! -f "$CONF" ]]; then
  echo "ERROR: deploy.conf not found at $CONF"
  exit 1
fi

# shellcheck source=/dev/null
source "$CONF"

: "${PROJECT_DIR:?PROJECT_DIR not set in deploy.conf}"
: "${BUILD_CMD:?BUILD_CMD not set in deploy.conf}"

cd "$PROJECT_DIR"

# Services: from args or config default
if [[ $# -gt 0 ]]; then
  services=("$@")
else
  read -ra services <<< "${DEFAULT_SERVICES:-}"
fi

# Build
echo "==> Building ($BUILD_CMD)..."
eval "$BUILD_CMD"
echo "==> Build OK"

# Restart services
restart_service() {
  local spec="$1"
  local type="${spec%%:*}"
  local name="${spec#*:}"

  case "$type" in
    pm2)
      echo "==> Restarting $name (PM2)..."
      pm2 restart "$name"
      ;;
    sudo-pm2)
      echo "==> Restarting $name (root PM2)..."
      sudo pm2 restart "$name"
      ;;
    systemd)
      echo "==> Restarting $name (systemd)..."
      sudo systemctl restart "$name"
      ;;
    supervisor)
      echo "==> Restarting $name (supervisor)..."
      sudo supervisorctl restart "$name"
      ;;
    *)
      echo "WARN: Unknown service type '$type' for $name, trying pm2..."
      pm2 restart "$name"
      ;;
  esac
}

for svc in "${services[@]}"; do
  restart_service "$svc"
done

# Health check
delay="${STARTUP_DELAY:-3}"
echo "==> Waiting ${delay}s for startup..."
sleep "$delay"

bash "$SCRIPT_DIR/health-check.sh"
