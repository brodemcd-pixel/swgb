#!/bin/sh
# Concatenates src/ into public/index.html — the whole build.
# Vercel runs this automatically on every push (see vercel.json).
set -e
OUT="${1:-public/index.html}"
mkdir -p "$(dirname "$OUT")"
cat src/01-shell.html \
    src/02-data.js src/10-state.js src/11-map.js src/12-path.js src/13-entities.js \
    src/14-fog.js src/15-orders.js src/16-behaviour.js src/20-campaign.js \
    src/30-ai.js src/31-update.js src/32-render.js src/33-ui.js src/34-sound.js \
    src/35-save.js src/36-input.js src/37-loop.js src/99-footer.html > "$OUT"
echo "built $OUT ($(wc -c < "$OUT") bytes)"
