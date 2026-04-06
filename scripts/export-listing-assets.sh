#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE_DIR="$ROOT_DIR/assets/marketplace"
EXPORT_DIR="$SOURCE_DIR"

CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -f "$CHROME_PATH" ]; then
  echo "Google Chrome is required to export listing assets smoothly."
  exit 1
fi

mkdir -p "$EXPORT_DIR"

"$CHROME_PATH" --headless --disable-gpu --window-size=1024,1024 --screenshot="$EXPORT_DIR/icon.png" "file://$SOURCE_DIR/icon.svg" >/dev/null 2>&1
"$CHROME_PATH" --headless --disable-gpu --window-size=1600,900 --screenshot="$EXPORT_DIR/banner.png" "file://$SOURCE_DIR/banner.svg" >/dev/null 2>&1

echo "Exported marketplace icon and banner cleanly into assets/marketplace"