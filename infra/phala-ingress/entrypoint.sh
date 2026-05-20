#!/bin/bash

set -e

if [ -n "$DOMAIN" ] &&
  [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] &&
  [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
  echo "Existing certificate found for ${DOMAIN}; skipping DNS bootstrap"
  touch /.bootstrapped
fi

exec /scripts/entrypoint-original.sh "$@"
