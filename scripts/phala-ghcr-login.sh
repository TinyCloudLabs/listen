#!/bin/sh
set -eu

if [ -z "${GHCR_TOKEN:-}" ]; then
  echo "GHCR_TOKEN is not set; skipping ghcr.io login"
  exit 0
fi

echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-skgbafa}" --password-stdin
