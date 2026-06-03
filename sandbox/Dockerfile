# Adcelerate disposable agent-sandbox image.
#
# Layers a deny-all egress firewall + a headless Claude Code agent on top of a
# non-root Debian/node base. The agent runs as the unprivileged `node` user with
# ALL Linux capabilities dropped except NET_ADMIN; the firewall binaries are
# granted cap_net_admin via file capabilities (setcap) so NO sudo / setuid is
# needed — the strict `--cap-drop ALL --cap-add NET_ADMIN` cap set still works.
#
# Heavy media tooling (ffmpeg, etc.) is opt-in via `--build-arg WITH_MEDIA=1`.

FROM node:20-bookworm-slim

ARG WITH_MEDIA=0
ENV DEBIAN_FRONTEND=noninteractive

# Base system: git, network/firewall tooling, JSON + DNS utils, setcap support.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      curl \
      ca-certificates \
      iptables \
      ipset \
      dnsutils \
      jq \
      unzip \
      libcap2-bin \
      python3 \
  && rm -rf /var/lib/apt/lists/*

# Optional heavy media stack (autoCaption / MoodBoarder workloads).
RUN if [ "$WITH_MEDIA" = "1" ]; then \
      apt-get update && \
      apt-get install -y --no-install-recommends ffmpeg && \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Headless Claude Code agent (the only thing that spends the subscription).
RUN npm install -g @anthropic-ai/claude-code

# bun (TS/apps runtime + package manager), installed system-wide.
ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash && bun --version

# uv (Python runtime + package manager for python sidecars / hooks).
RUN curl -fsSL https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh && uv --version

# just (command runner) — task-runner.sh prefers `just test` when a justfile is
# present, so without this repos that expose tests only via justfile never run them.
RUN curl -fsSL https://just.systems/install.sh | bash -s -- --to /usr/local/bin && just --version

# Grant cap_net_admin to the firewall binaries so the non-root `node` user can
# program iptables/ipset using the container's NET_ADMIN cap — without sudo.
RUN set -eux; \
    for b in iptables ip6tables ipset; do \
      p="$(command -v "$b" || true)"; \
      if [ -n "$p" ]; then \
        rp="$(readlink -f "$p")"; \
        setcap cap_net_admin,cap_net_raw+ep "$rp" || true; \
      fi; \
    done

# Firewall + lifecycle scripts.
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
COPY task-runner.sh   /usr/local/bin/task-runner.sh
RUN chmod 0755 /usr/local/bin/init-firewall.sh /usr/local/bin/task-runner.sh

# Per-run workspace (bind-mounted by the host orchestrator at runtime).
RUN mkdir -p /work && chown node:node /work
WORKDIR /work

# Drop to the unprivileged agent user. No sudo, no setuid path.
USER node

# Claude Code stores config under $HOME. Containers run as the host UID:GID
# (see buildDockerArgs in orchestrator.ts), so $HOME must be writable by an
# arbitrary uid — point it at the host-owned /work bind mount rather than the
# node-owned home dir (which only uid 1000 can write). It sits beside /work/repo,
# so it never lands in the agent's `git add -A`. task-runner.sh creates it.
# OAuth token arrives via env at runtime.
ENV HOME=/work/.home

ENTRYPOINT ["/usr/local/bin/task-runner.sh"]
