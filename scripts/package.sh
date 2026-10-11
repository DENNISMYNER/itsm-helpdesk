#!/usr/bin/env bash
# Creates a clean, shareable archive of the project (no dependencies, build output,
# generated code or secrets).
#
#   npm run archive                 -> ../itsm-helpdesk.zip
#   bash scripts/package.sh out.zip -> out.zip
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(basename "$ROOT")"
OUT="${1:-$ROOT/../$NAME.zip}"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' is not installed (macOS/Linux: install zip; Windows: use Git Bash or WSL)." >&2
  exit 1
fi

cd "$ROOT/.."
rm -f "$OUT"
zip -rq "$OUT" "$NAME" \
  -x "$NAME/node_modules/*" "$NAME/*/node_modules/*" \
  -x "$NAME/*/dist/*" \
  -x "$NAME/server/src/generated/*" \
  -x "$NAME/.env" "$NAME/*/.env" \
  -x "$NAME/*.tsbuildinfo" "$NAME/*/*.tsbuildinfo" \
  -x "$NAME/.git/*" "$NAME/.DS_Store" "$NAME/*/.DS_Store"

echo "Created $(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
