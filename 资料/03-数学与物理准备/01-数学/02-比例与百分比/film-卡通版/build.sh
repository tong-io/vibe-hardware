#!/bin/sh
# 比例与百分比— rebuild the film from this folder.   sh build.sh [--vo]
set -e
LIB=${LIB:-/Users/tongcao/lemo-opuscar}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
HERE=$(cd "$(dirname "$0")" && pwd); PY="$LIB/.venv/bin/python"; NAME=bili-baifenbi
cd "$LIB"
if [ "$1" = "--vo" ]; then
  "$PY" "$HERE/tools/make_lines.py"
  "$PY" core/tts/tts_zh.py "$HERE/lines.json" "$HERE/voices"
  WHISPER_MODEL=small "$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices" --lang zh
fi
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/music.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 5 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 3
node "$HERE/tools/subs.mjs" && "$PY" core/render/srt.py "$HERE/out/subs.json" "$HERE/$NAME.srt"
node core/render/still.mjs "$HERE" 22 --q nosubs=1 --prefix po_ --out "$HERE/out/stills" && cp "$HERE/out/stills/po_22.jpg" "$HERE/poster.jpg"
echo "built $HERE/$NAME.mp4"
