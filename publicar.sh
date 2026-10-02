#!/bin/sh
# Envia o projeto para o GitHub e atualiza o site (branch gh-pages = pasta dist).
# Uso: ./publicar.sh "descrição da mudança"
set -e
cd "$(dirname "$0")"
git add -A
git diff --cached --quiet || git commit -m "${1:-Atualiza site}"
git push origin main
git push -f origin "$(git subtree split --prefix dist)":refs/heads/gh-pages
echo "Site: https://sadraqueseucorretor-hue.github.io/audazsquad/ (atualiza em ~1 min)"
