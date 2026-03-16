#!/usr/bin/env bash
set -e

# Inicia el frontend Next.js e instala dependencias si faltan.
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"

cd "$FRONTEND_DIR"

if [[ ! -f "package.json" ]]; then
  echo "No se encontro package.json en $FRONTEND_DIR"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "Instalando dependencias npm..."
  npm install
fi

echo "Iniciando frontend en http://localhost:3500"

npm run dev -- --hostname localhost --port 3500
