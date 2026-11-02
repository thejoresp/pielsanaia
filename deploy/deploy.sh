#!/bin/bash
# Actualiza PielSana IA en la VPS con lo último de main.
# Uso (como el usuario de deploy, desde cualquier carpeta): ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: falta .env en $(pwd) (copiar .env.example y completarlo)" >&2
  exit 1
fi

echo ">> git pull"
git pull --ff-only

# Se construye primero: la versión actual sigue atendiendo mientras compila.
echo ">> Build"
docker compose build

echo ">> Reemplazando contenedores"
docker compose up -d

echo ">> Limpiando imágenes viejas"
docker image prune -f

docker compose ps
echo "El backend tarda ~1 min en quedar (healthy)."
