#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$DIST_DIR/portable-app"
ARCHIVE="$DIST_DIR/resume-builder.tar.gz"
RUN_FILE="$DIST_DIR/resume-builder-portable.run"

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR/public" "$DIST_DIR"

cp "$ROOT_DIR/server.js" "$STAGING_DIR/server.js"
cp "$ROOT_DIR/package.json" "$STAGING_DIR/package.json"
cp "$ROOT_DIR/README.md" "$STAGING_DIR/README.md"
cp "$ROOT_DIR/public/index.html" "$STAGING_DIR/public/index.html"
cp "$ROOT_DIR/public/styles.css" "$STAGING_DIR/public/styles.css"
cp "$ROOT_DIR/public/app.js" "$STAGING_DIR/public/app.js"

cat > "$STAGING_DIR/run.sh" <<'RUNEOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node server.js
RUNEOF
chmod +x "$STAGING_DIR/run.sh"

tar -czf "$ARCHIVE" -C "$DIST_DIR" portable-app

cat > "$RUN_FILE" <<'RUNEHEADER'
#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run this app."
  exit 1
fi

TARGET_DIR="${1:-$PWD/resume-builder-app}"
mkdir -p "$TARGET_DIR"

ARCHIVE_LINE=$(awk '/^__ARCHIVE_BELOW__$/ {print NR + 1; exit 0; }' "$0")
if [[ -z "$ARCHIVE_LINE" ]]; then
  echo "Unable to locate embedded archive."
  exit 1
fi

tail -n +"$ARCHIVE_LINE" "$0" | tar -xz -C "$TARGET_DIR"
cd "$TARGET_DIR/portable-app"
echo "Extracted to: $TARGET_DIR/portable-app"
echo "Starting app on http://localhost:${PORT:-3000}"
exec node server.js

__ARCHIVE_BELOW__
RUNEHEADER

cat "$ARCHIVE" >> "$RUN_FILE"
chmod +x "$RUN_FILE"

echo "Created portable self-extracting runner: $RUN_FILE"
