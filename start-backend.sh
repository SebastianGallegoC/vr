#!/usr/bin/env bash
set -e

# Inicia el backend FastAPI usando el .venv local.
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"

cd "$BACKEND_DIR"

if [[ ! -f ".venv/Scripts/activate" ]]; then
  echo "No se encontro .venv en $BACKEND_DIR"
  echo "Crea el entorno con: python -m venv .venv"
  exit 1
fi

source .venv/Scripts/activate

echo "Iniciando backend en http://127.0.0.1:8000"
echo "Docs en http://127.0.0.1:8000/docs"

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
