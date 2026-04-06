#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE_DIR="$ROOT_DIR/assets/marketplace"
EXPORT_DIR="$SOURCE_DIR"

if ! command -v qlmanage >/dev/null 2>&1; then
  echo "qlmanage is required to export listing assets on macOS."
  exit 1
fi

mkdir -p "$EXPORT_DIR"
rm -f "$EXPORT_DIR"/*.png "$EXPORT_DIR"/*.svg.png

qlmanage -t -s 512 -o "$EXPORT_DIR" "$SOURCE_DIR/icon.svg" >/dev/null
qlmanage -t -s 1600 -o "$EXPORT_DIR" "$SOURCE_DIR/banner.svg" >/dev/null

for file in "$EXPORT_DIR"/*.svg.png; do
  mv "$file" "${file%.svg.png}.png"
done

echo "Exported marketplace icon and banner into assets/marketplace"