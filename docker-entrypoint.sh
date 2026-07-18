#!/bin/sh
set -eu

mkdir -p /app/data /app/backups
chown -R node:node /app/data /app/backups

exec su-exec node "$@"
