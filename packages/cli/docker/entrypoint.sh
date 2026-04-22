#!/bin/sh
set -e

mkdir -p /root/.tc-agent

# Generate agent key if missing (idempotent) and print the DID for the user to copy.
tc-agent agent init >/dev/null

AGENT_DID=$(tc-agent agent did | jq -r .did)
echo ""
echo "=================================================================="
echo "  Agent DID: $AGENT_DID"
echo ""
echo "  Copy this DID into the 'Connect Agent' dialog in your app UI."
echo "  OpenCode web UI: http://localhost:4096"
echo "=================================================================="
echo ""

# Start the delegation-receiving HTTP server in the background.
delegation-endpoint &
DELEGATION_PID=$!

# Trap SIGTERM / SIGINT so compose can stop us cleanly.
trap "kill $DELEGATION_PID 2>/dev/null || true; exit 0" TERM INT

# Run OpenCode in the foreground; exiting here stops the container.
exec opencode serve --hostname 0.0.0.0 --port 4096
