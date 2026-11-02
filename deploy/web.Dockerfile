# Frontend de PielSana IA servido por Caddy (estático + proxy /skin/* + HTTPS).
# Se construye desde la raíz del repo.

# --- Etapa 1: build de React + Vite ---
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

# La URL de la API queda fija en el bundle: compose pasa https://${DOMAIN}.
ARG VITE_API_URL
RUN if [ -z "$VITE_API_URL" ]; then echo "ERROR: falta el build-arg VITE_API_URL" >&2; exit 1; fi
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Etapa 2: Caddy ---
FROM caddy:2.11-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
