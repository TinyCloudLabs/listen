#!/bin/sh
set -e

# The sidecar owns agent-key generation + DID printing now; it also runs
# the background delegation-refresh loop. We background it and let it stay
# alive for the container's lifetime.
delegation-endpoint &
DELEGATION_PID=$!

# Trap SIGTERM / SIGINT so compose can stop us cleanly.
trap "kill $DELEGATION_PID 2>/dev/null || true; exit 0" TERM INT

# Run OpenCode in the foreground; exiting here stops the container.
exec opencode serve --hostname 0.0.0.0 --port 4096
