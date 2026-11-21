#!/bin/sh
# Dev-only: generate any missing Strapi secrets on first start and persist them
# in the data volume, so `docker compose up` works without a hand-made env file.
# Values given through the environment (see the root example file) always win.
set -eu

SECRETS_FILE="${DATA_DIR:-/data}/dev-secrets.sh"
mkdir -p "$(dirname "$SECRETS_FILE")"

gen() { node -e "process.stdout.write(require('crypto').randomBytes(16).toString('base64'))"; }

if [ ! -f "$SECRETS_FILE" ]; then
  {
    echo "GEN_APP_KEYS='$(gen),$(gen),$(gen),$(gen)'"
    echo "GEN_ADMIN_JWT_SECRET='$(gen)'"
    echo "GEN_API_TOKEN_SALT='$(gen)'"
    echo "GEN_TRANSFER_TOKEN_SALT='$(gen)'"
    echo "GEN_ENCRYPTION_KEY='$(gen)'"
    echo "GEN_JWT_SECRET='$(gen)'"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
fi
# shellcheck disable=SC1090
. "$SECRETS_FILE"

export APP_KEYS="${APP_KEYS:-$GEN_APP_KEYS}"
export ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET:-$GEN_ADMIN_JWT_SECRET}"
export API_TOKEN_SALT="${API_TOKEN_SALT:-$GEN_API_TOKEN_SALT}"
export TRANSFER_TOKEN_SALT="${TRANSFER_TOKEN_SALT:-$GEN_TRANSFER_TOKEN_SALT}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-$GEN_ENCRYPTION_KEY}"
export JWT_SECRET="${JWT_SECRET:-$GEN_JWT_SECRET}"

exec "$@"
