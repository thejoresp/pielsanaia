# CLAUDE.md — contexto del proyecto PielSana IA

App web que analiza fotos de piel (lunares, acné, rosácea) con modelos Keras locales y usa un LLM (DeepSeek) para descripciones y recomendaciones. MVP de una persona; idioma del código, UI y docs: **español**.

## Stack
- **Backend:** Python 3.11, FastAPI, TensorFlow/Keras (solo CPU), SDK `openai` apuntando a **DeepSeek** (`base_url=https://api.deepseek.com`, modelo `deepseek-flash`, que acepta imágenes). No hay base de datos.
- **Frontend:** React 18 + Vite 6 + TypeScript + Tailwind + React Router 7 (`BrowserRouter`, modo declarativo: imports desde `react-router-dom`). Node ≥20.
- **Deploy:** VPS Contabo + DuckDNS con Docker Compose: `web` (Caddy: front estático + proxy `/skin/*` + HTTPS), `backend` (sin puertos públicos) y `duckdns`.

## Comandos
```bash
# Backend (desde la RAÍZ: los imports son backend.*)
uvicorn backend.main:app --reload --port 8080
python -m py_compile backend/controllers/skin.py

# Frontend
cd frontend && npm run dev            # requiere frontend/.env.local con VITE_API_URL=http://localhost:8080
cd frontend && npx tsc -b && npm run lint && npm run build

# Stack completo / producción
docker compose up -d --build          # .env en la raíz (plantilla .env.example)
./deploy/deploy.sh                    # en la VPS: git pull + rebuild
```

## Mapa del código
- `backend/main.py`: crea la app, configura CORS (`ALLOWED_ORIGINS`), expone `GET /` como health (`{"status": "ok"}`) y monta `skin.router` en `/skin`.
- `backend/controllers/skin.py`: todos los endpoints. Las imágenes pasan por `_leer_imagen()` (tipo y `MAX_IMAGE_MB`) y la inferencia por `_predecir()` (en threadpool). Las llamadas al LLM usan `await _llm_chat()` (`AsyncOpenAI`, cliente lazy, 503 si falla) y `_parse_llm_json()`. `limiter` (slowapi) aplica `RATE_LIMIT_IA` a los endpoints de IA (`/api/analyze-ia` y `/api/recomendaciones`).
- `backend/services/skin_analysis_service.py`: carga lazy de cada modelo y `predict_*_class(bytes) -> (label, probs)`.
- `backend/config/model_config.py`: rutas de los `.keras`, que se pueden sobrescribir por env.
- `frontend/src/api/client.ts`: única puerta al backend (`ENDPOINTS`, `ApiError` con `status`, `analizarImagen`, `pedirRecomendaciones`). No usar `fetch` suelto en componentes.
- `frontend/src/hooks/useRecommendations.ts`: pide descripción y recomendaciones al LLM (con `AbortController`).
- `frontend/src/pages/Results.tsx`: resultados de los modelos locales (`tipo` = `acne` | `rosacea` | `moles`, config en `RESULTADOS`). `ResultsIA.tsx`: resultado del análisis con IA.
- `frontend/src/components/ImageUploader.tsx`: selección del tipo de análisis → POST (mapa `ANALISIS`) → `navigate` a `/results-*` con `location.state` y copia en `sessionStorage` (`utils/analysisStorage.ts`).
- `frontend/src/data/conditions.ts`: contenido educativo de las condiciones (única fuente). Tipos de respuesta en `src/types/analysis.ts`.
- `deploy/`: `Caddyfile`, `web.Dockerfile`, `setup-vps.sh`, `deploy.sh`.

## Decisiones y restricciones
- **LLM = DeepSeek**, no OpenAI. No proponer gpt-4o. Variables: `DEEPSEEK_API_KEY` y, opcionales, `LLM_MODEL`, `LLM_BASE_URL`, `RATE_LIMIT_IA` y `MAX_IMAGE_MB`.
- **Nunca loguear secretos** ni el contenido completo de las respuestas del LLM.
- Los modelos `.keras` **no se versionan ni entran en la imagen** (`.gitignore` y `.dockerignore`). Se suben con `scp` a `backend/modelos/{ham10000,acne,rosacea}/` y se montan como volumen **de solo lectura** (`:ro`). Por eso `model_config.py` no crea carpetas (las crea `setup-vps.sh`) y un modelo faltante solo hace fallar su endpoint (500 genérico).
- El front y el back se sirven desde el mismo dominio. El build del front recibe `VITE_API_URL=https://${DOMAIN}`.
- El prefijo `/skin` lo usa el `Caddyfile`. Si cambia, hay que actualizar los dos lados.
- Errores hacia el cliente: mensajes genéricos. El detalle va a `logging` (no usar `print`).
- Nada bloqueante dentro de `async def`: el LLM va con `await` y `model.predict` con `run_in_threadpool`.
- Dependencias fijadas en `requirements.txt` (incluida `keras`, que TF acepta en cualquier `>=3.5`) y resueltas en `python:3.11-slim`; al actualizarlas, resolver en esa imagen y repetir `pip check` + `pip-audit`. Pillow 13 y Keras 3.15 exigen Python ≥3.11.
- Imágenes: el backend corre como usuario sin privilegios `app` y sin paquetes de sistema (todo sale de wheels). Caddy está fijado en `caddy:2.11-alpine`, Node en `node:20-alpine`.
- El backend recibe en compose solo sus variables (`environment:`), no el `.env` entero. Si se agrega una variable nueva, sumarla ahí. Las vacías toman el default del código: leer con `os.getenv("X") or "default"`, no con `os.getenv("X", "default")`.
- Repo y carpeta: `pielsanaia` (antes `PielSanaIA-MVP`). `docker-compose.yml` fija `name: pielsanaia`, así el proyecto Compose (volúmenes `pielsanaia_caddy_*`) no depende del nombre de la carpeta. Sin `container_name`: los contenedores son `pielsanaia-<servicio>-1`; en comandos usar el nombre del servicio (`docker compose logs backend`).
- Compose: `DOMAIN`, `DUCKDNS_SUBDOMAIN` y `DUCKDNS_TOKEN` son obligatorias (`${X:?mensaje}`, falla temprano). Los 3 servicios comparten `x-comunes` (restart, `no-new-privileges`, logs con rotación 10m×3). En local: `docker compose up --build backend web`.
- Caddy agrega encabezados de seguridad (sin HSTS, para no romper `localhost`), caché larga en `/assets/*` y `no-cache` en el resto. `deploy.sh` hace `build` antes de `up -d`. Migración de una VPS vieja: README → "Migrar una VPS existente".
- uvicorn corre con `--proxy-headers` para que el rate limit vea la IP real detrás de Caddy.
- El build del front es `tsc -b && vite build`: un error de tipos rompe el Docker build.

## Hoja de ruta (ver `docs/AUDITORIA.md`)
- [x] Fase 0: quitar el log de la API key y migrar a DeepSeek.
- [x] Hallazgos altos (A1–A8): dependencias fijadas, LLM async, rate limit, validación de imágenes, `lunares_results` eliminado, `conditions.ts` en el front, drag & drop, tsc/eslint en 0 y `setup-vps.sh`.
- [x] Puntos medios (M1–M4): vistas muertas borradas y `GET /` como health; `src/api/client.ts` + `useRecommendations`; `Results.tsx` genérico; rutas `/skin/openai-*` renombradas a `/skin/api/analyze-ia` y `/skin/api/recomendaciones`.
- [x] Puntos bajos (B1–B5): compose con `environment` explícito, healthcheck y duckdns fijado; `DarkModeToggle.tsx` en `components/`; limpieza de scripts de AWS/ngrok/gh-pages.
- [x] Infra reescrita desde cero (compose, Dockerfiles, Caddyfile, scripts) y backend en Python 3.11 sin vulnerabilidades (Pillow 13, TF 2.19.1, Keras 3.15.1).
- [x] Vulnerabilidades altas del frontend: `npm audit fix`, Vite 6.4.5 y React Router 7.18.5 (24 → 13, 0 altas).
- [ ] Moderadas/bajas residuales del frontend (eslint, typescript-eslint, tailwind → minimatch), solo desarrollo (`docs/AUDITORIA.md` §4).

## Pendiente conocido
- Los endpoints de IA son públicos (con rate limit por IP). Falta el tope de gasto en el panel de DeepSeek (manual).
- Si el LLM no responde, cada request espera hasta ~1 min (timeout 30 s + 1 reintento) antes del 503, pero ya no bloquea a los demás usuarios.
- Frontend: 13 vulnerabilidades residuales (12 moderadas, 1 baja), todas en herramientas de desarrollo (eslint, typescript-eslint, tailwind → sucrase → glob → minimatch). No llegan al bundle. Detalle en `docs/AUDITORIA.md` §4.
- Probar a mano en el navegador el salto a React Router 7 (navegación, resultados, F5, links).
- Tras el próximo deploy, verificar en la VPS que carguen los 3 modelos con Keras 3.15 (solo se probó `acne.keras`): ver `docs/AUDITORIA.md` §6.
