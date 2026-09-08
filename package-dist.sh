#!/usr/bin/env bash
set -e

echo "🚀 Building Astro Type distributions..."

# 1. Clean previous release folders
rm -rf release dist
mkdir -p release/mac
mkdir -p release/windows

# 2. Build macOS artifacts (.dmg, .zip, .app)
echo "🍏 Compiling macOS release..."
npm run dist:mac

# Move Mac installers
mv dist/*.dmg release/mac/ 2>/dev/null || true
mv dist/*-mac.zip release/mac/ 2>/dev/null || true

# If raw .app directory exists, package clean zip archive
if [ -d "dist/mac-arm64/Astro Type.app" ]; then
  cd dist/mac-arm64
  ditto -c -k --sequesterRsrc --keepParent "Astro Type.app" "../../release/mac/Astro-Type-macOS-arm64.zip"
  cd ../..
elif [ -d "dist/mac/Astro Type.app" ]; then
  cd dist/mac
  ditto -c -k --sequesterRsrc --keepParent "Astro Type.app" "../../release/mac/Astro-Type-macOS.zip"
  cd ../..
fi

# 3. Build Windows artifacts (.exe)
echo "🪟 Compiling Windows release..."
npm run dist:win || echo "⚠️ Local Windows build skipped (requires Wine/Mono or GitHub Actions)."

# Move Windows installers if generated
mv dist/*.exe release/windows/ 2>/dev/null || true

# Zip Windows folder if an installer exists
if ls release/windows/*.exe 1> /dev/null 2>&1; then
  cd release/windows
  zip -r "Astro-Type-Windows.zip" ./*.exe
  cd ../..
fi

echo "✅ Distribution bundles ready in ./release"
open release/
