#!/usr/bin/env bash
# Run the Playwright e2e suite against a running stack, with the documented defaults.
# Exists so that nobody (human or agent) has to rebuild the env line by hand: a hand-built
# `env $VARS` line silently broke the gate once (zsh does not word-split unquoted variables).
#
#   scripts/e2e.sh                     full suite
#   scripts/e2e.sh -g 'AC-24' --repeat-each=10
#   scripts/e2e.sh e2e/us-01-security.spec.ts
#
# Any variable already set in the environment wins over the defaults below. The admin values are
# the fictitious dev defaults from docker-compose.yml (never real credentials).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)/frontend"

export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
export E2E_STRAPI_URL="${E2E_STRAPI_URL:-http://localhost:1337}"
export STRAPI_ADMIN_EMAIL="${STRAPI_ADMIN_EMAIL:-dev.admin@example.com}"
export STRAPI_ADMIN_PASSWORD="${STRAPI_ADMIN_PASSWORD:-DevOnly-Passw0rd}"

exec npx playwright test --reporter=line "$@"
