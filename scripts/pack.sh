#!/bin/sh
# Zip every plugin folder into dist/<id>.zip (or only the folders given as arguments).
# Each zip contains the folder itself, so it can be imported into shading.app as-is.
set -eu
cd "$(dirname "$0")/.."
mkdir -p dist
if [ "$#" -gt 0 ]; then
    plugins="$*"
else
    plugins=$(for manifest in */shading-plugin.json; do dirname "$manifest"; done)
fi
for plugin in $plugins; do
    plugin=${plugin%/}
    if [ ! -f "$plugin/shading-plugin.json" ]; then
        echo "skip $plugin: no shading-plugin.json" >&2
        continue
    fi
    rm -f "dist/$plugin.zip"
    zip -qr -X "dist/$plugin.zip" "$plugin" -x '*.DS_Store' -x '__MACOSX/*'
    echo "dist/$plugin.zip"
done
