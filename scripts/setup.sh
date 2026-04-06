#!/bin/bash
# Setup script for the static Ecwid admin dashboard.
# Run: bash scripts/setup.sh

set -e

echo "=== Live Checkout Friction Monitor for Ecwid ==="
echo ""

NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "Node.js 20+ is required. Current: $(node -v 2>/dev/null || echo 'not installed')"
  exit 1
fi

echo "Node.js $(node -v)"
echo ""
echo "Installing package metadata..."
npm install

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Run: npm run check"
echo "  2. Serve the public/ directory with any static host or VS Code Live Server"
echo "  3. Point your Ecwid app page URL at public/index.html on that static host"
echo ""
