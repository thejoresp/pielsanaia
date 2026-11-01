#!/bin/bash
# Actualiza la app en la VPS con lo último de main y reconstruye los contenedores.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
docker compose up -d --build
docker image prune -f
docker compose ps
