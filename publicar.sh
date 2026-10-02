#!/bin/sh
# Envia o projeto para o GitHub. O GitHub Pages publica a pasta docs/ da branch main.
# Uso: ./publicar.sh "descrição da mudança"
set -e
cd "$(dirname "$0")"
git add -A
git diff --cached --quiet || git commit -m "${1:-Atualiza site}"
# Traz antes o que foi salvo pelo painel admin, para não sobrescrever.
git pull --rebase origin main
git push origin main
echo "Site: https://sadraqueseucorretor-hue.github.io/audazsquad/ (atualiza em ~1 min)"
