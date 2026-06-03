#!/usr/bin/env bash
#
# init-firewall.sh — deny-all egress with a tiny allowlist for the Adcelerate sandbox.
#
# Mirrors Anthropic's devcontainer firewall pattern: while egress is still open,
# resolve every IP we are allowed to reach (Anthropic, GitHub ranges, npm/PyPI),
# load them into an ipset, THEN lock OUTPUT down to default-DROP — permitting only
# loopback, DNS (scoped to the configured resolver), established/related, and the
# allowlisted public IPs. RFC-1918, link-local, and the host gateway are explicitly
# dropped (anti DNS-rebind / LAN pivot), and the obs server on the host is therefore
# unreachable from the sandbox. The allowlist is IPv4-only, so IPv6 egress is denied
# wholesale (ip6tables default-DROP) to keep the deny-all guarantee on dual-stack nets.
#
# Runs as the non-root `node` user: cap_net_admin is granted to the iptables/ipset
# binaries via setcap in the Dockerfile, so no sudo / setuid is required.
#
# Usage:
#   init-firewall.sh              # apply the firewall
#   init-firewall.sh --self-test  # verify allow/deny (non-zero exit on any leak)
#
# Allowlist domains come from $SANDBOX_ALLOWLIST (space-separated) when set,
# otherwise the baked default below (kept in sync with sandbox/config.ts).

set -euo pipefail

DEFAULT_DOMAINS="api.anthropic.com statsig.anthropic.com github.com api.github.com codeload.github.com objects.githubusercontent.com raw.githubusercontent.com registry.npmjs.org pypi.org files.pythonhosted.org astral.sh"
DOMAINS="${SANDBOX_ALLOWLIST:-$DEFAULT_DOMAINS}"
IPSET_NAME="allowed-domains"

log() { echo "[firewall] $*"; }
err() { echo "[firewall] ERROR: $*" >&2; }

# ---------------------------------------------------------------------------
# Self-test: prove the allowlist allows what it should and blocks everything else.
# ---------------------------------------------------------------------------
self_test() {
  local fail=0

  log "self-test: allowed host api.anthropic.com:443 should be reachable"
  if curl -s -o /dev/null --max-time 12 https://api.anthropic.com/v1/models; then
    log "  PASS — reachable"
  else
    err "  FAIL — api.anthropic.com unreachable (allowlist or DNS broken)"
    fail=1
  fi

  log "self-test: disallowed host example.com:443 should be BLOCKED"
  if curl -s -o /dev/null --max-time 6 https://example.com; then
    err "  FAIL — example.com reachable (EGRESS LEAK)"
    fail=1
  else
    log "  PASS — blocked"
  fi

  log "self-test: LAN host 192.168.0.1 should be BLOCKED"
  if curl -s -o /dev/null --max-time 5 http://192.168.0.1; then
    err "  FAIL — 192.168.0.1 reachable (LAN PIVOT LEAK)"
    fail=1
  else
    log "  PASS — blocked"
  fi

  if [ "$fail" -ne 0 ]; then
    err "self-test FAILED"
    return 1
  fi
  log "self-test PASSED"
  return 0
}

if [ "${1:-}" = "--self-test" ]; then
  self_test
  exit $?
fi

# ---------------------------------------------------------------------------
# Phase 0: reset to a clean, OPEN state so we can resolve allowlist IPs.
# ---------------------------------------------------------------------------
log "resetting firewall to open state for resolution phase"
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT
iptables -F
iptables -X 2>/dev/null || true
ipset destroy "$IPSET_NAME" 2>/dev/null || true
ipset create "$IPSET_NAME" hash:net

add_net() {
  # Add an IP (treated as /32) or CIDR to the allowlist ipset, deduped.
  local n="$1"
  [ -z "$n" ] && return 0
  ipset add "$IPSET_NAME" "$n" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Phase 1: resolve GitHub's published ranges + each allowlisted domain.
# ---------------------------------------------------------------------------
log "resolving github.com/meta address ranges"
gh_meta="$(curl -fsSL --max-time 20 https://api.github.com/meta || true)"
if [ -n "$gh_meta" ]; then
  echo "$gh_meta" \
    | jq -r '[.web[]?, .api[]?, .git[]?, .packages[]?] | .[]' 2>/dev/null \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(/[0-9]+)?$' \
    | while read -r cidr; do add_net "$cidr"; done
else
  log "  (github meta unavailable — falling back to dig for github domains)"
fi

log "resolving allowlist domains via DNS"
for d in $DOMAINS; do
  ips="$(dig +short A "$d" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true)"
  if [ -z "$ips" ]; then
    log "  warning: no A records for $d"
    continue
  fi
  for ip in $ips; do add_net "$ip"; done
done

count="$(ipset list "$IPSET_NAME" | grep -cE '^[0-9]+\.' || true)"
log "allowlist populated with $count entries"
if [ "$count" -eq 0 ]; then
  err "allowlist is empty — refusing to lock down (would have zero egress)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Phase 2: lock down. Default-DROP OUTPUT; allow only the curated set.
# ---------------------------------------------------------------------------
log "applying deny-all egress with allowlist"
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Loopback (incl. Docker embedded DNS plumbing).
iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Return traffic for connections we initiated.
iptables -A INPUT  -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# DNS to Docker's embedded resolver (127.0.0.11, loopback range) — always allowed.
iptables -A OUTPUT -d 127.0.0.11 -j ACCEPT

# Drop private / link-local / host-gateway destinations BEFORE the port-53 accept
# (defeats DNS-rebinding an allowed name to a LAN IP, blocks the host obs server,
# and closes the LAN DNS-tunnel exfil channel — DNS to a LAN resolver is dropped here).
for net in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16; do
  iptables -A OUTPUT -d "$net" -j DROP
done

# DNS to the configured resolver(s) ONLY — never to arbitrary public IPs, which
# would reopen a deny-all-defeating exfiltration channel. Docker's embedded
# resolver is 127.0.0.11 (already allowed above); if /etc/resolv.conf points
# elsewhere we scope to exactly those nameservers. Any LAN resolver is dropped
# by the RFC-1918 rules above (intentional — no LAN DNS-tunnel pivot).
dns_servers="$(grep -E '^[[:space:]]*nameserver' /etc/resolv.conf 2>/dev/null \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' || true)"
[ -z "$dns_servers" ] && dns_servers="127.0.0.11"
for ns in $dns_servers; do
  iptables -A OUTPUT -d "$ns" -p udp --dport 53 -j ACCEPT
  iptables -A OUTPUT -d "$ns" -p tcp --dport 53 -j ACCEPT
done

# Allowlisted public destinations over HTTPS/HTTP.
iptables -A OUTPUT -p tcp -m set --match-set "$IPSET_NAME" dst --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -m set --match-set "$IPSET_NAME" dst --dport 80  -j ACCEPT

# IPv6: the allowlist above is IPv4-only, so on IPv6-enabled Docker networks
# outbound IPv6 would bypass everything. Enforce the same deny-all posture on
# IPv6 (default-DROP, loopback + established/related only). Guarded and
# best-effort: hosts without ip6tables or the ip6 NET_ADMIN path simply skip it.
if command -v ip6tables >/dev/null 2>&1; then
  ip6tables -F 2>/dev/null || true
  ip6tables -X 2>/dev/null || true
  ip6tables -P INPUT   DROP 2>/dev/null || true
  ip6tables -P FORWARD DROP 2>/dev/null || true
  ip6tables -A INPUT  -i lo -j ACCEPT 2>/dev/null || true
  ip6tables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true
  ip6tables -A INPUT  -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
  ip6tables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
  ip6tables -P OUTPUT DROP 2>/dev/null || true
  log "IPv6 egress denied (deny-all)"
else
  log "ip6tables unavailable — skipping IPv6 lockdown"
fi

# Everything else falls through to the default OUTPUT DROP policy.
log "firewall active — egress restricted to the allowlist (IPv4 allowlist + IPv6 deny-all)"
