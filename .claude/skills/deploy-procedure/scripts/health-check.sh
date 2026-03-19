#!/usr/bin/env bash
# Universal Health Check Script
# Reads HEALTH_CHECKS from deploy.conf in the same directory.
#
# Supported check types:
#   pm2:name             — PM2 process is online
#   http:Label=url       — HTTP endpoint returns 2xx
#   systemd:name         — systemd unit is active
#   supervisor:name      — supervisor process is RUNNING
#   tcp:Label=host:port  — TCP port is open
#
# Usage: bash health-check.sh
# Exit: 0 = all healthy, 1 = failures found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$SCRIPT_DIR/deploy.conf"

if [[ ! -f "$CONF" ]]; then
  echo "ERROR: deploy.conf not found at $CONF"
  exit 1
fi

# shellcheck source=/dev/null
source "$CONF"

FAIL=0

ok()   { echo "[OK]   $1"; }
fail() { echo "[FAIL] $1"; FAIL=1; }

check_pm2() {
  local name="$1"
  local status
  status=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
data=json.load(sys.stdin)
for p in data:
    if p['name']=='$name':
        print(p['pm2_env']['status']); break
else: print('missing')
" 2>/dev/null || echo "error")
  [[ "$status" == "online" ]] && ok "$name: online" || fail "$name: $status"
}

check_http() {
  local label="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo "000")
  [[ "$code" =~ ^2[0-9][0-9]$ ]] && ok "$label: HTTP $code" || fail "$label: HTTP $code"
}

check_systemd() {
  local name="$1"
  local status
  status=$(systemctl is-active "$name" 2>/dev/null || echo "inactive")
  [[ "$status" == "active" ]] && ok "$name: active" || fail "$name: $status"
}

check_supervisor() {
  local name="$1"
  local status
  status=$(sudo supervisorctl status "$name" 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
  [[ "$status" == "RUNNING" ]] && ok "$name: RUNNING" || fail "$name: $status"
}

check_tcp() {
  local label="$1" target="$2"
  local host="${target%%:*}" port="${target#*:}"
  if timeout 3 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
    ok "$label: $host:$port open"
  else
    fail "$label: $host:$port closed"
  fi
}

echo "=== Health Check ==="

for entry in ${HEALTH_CHECKS:-}; do
  type="${entry%%:*}"
  rest="${entry#*:}"

  case "$type" in
    pm2)        check_pm2 "$rest" ;;
    http)       check_http "${rest%%=*}" "${rest#*=}" ;;
    systemd)    check_systemd "$rest" ;;
    supervisor) check_supervisor "$rest" ;;
    tcp)        check_tcp "${rest%%=*}" "${rest#*=}" ;;
    *)          fail "Unknown check type: $type" ;;
  esac
done

echo "===================="
[[ $FAIL -eq 0 ]] && echo "All services healthy" || { echo "Some services FAILED"; exit 1; }
