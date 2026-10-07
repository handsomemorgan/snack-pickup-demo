#!/bin/zsh
cd -- "${0:A:h}" || exit 1
runtime="$(command -v node)"
if [[ -z "$runtime" ]]; then
  print "需要安装 Node.js 22.13 或以上版本。"
  exit 1
fi
"$runtime" scripts/start-local.mjs "$@"
