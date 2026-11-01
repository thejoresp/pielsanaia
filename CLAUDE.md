# CLAUDE.md — contexto del proyecto PielSana IA

App web que analiza fotos de piel (lunares, acné, rosácea) con modelos Keras locales y usa un LLM (DeepSeek) para descripciones y recomendaciones. MVP de una persona; idioma del código, UI y docs: **español**.

## Stack
- **Backend:** Python 3.10, FastAPI, TensorFlow/Keras (solo CPU), SDK `openai` apuntando a **DeepSeek** (`base_url=https://api.deepseek.com`, modelo `deepseek-flash`, que acepta imágenes). No hay base de datos.
- **Frontend:** React 18 + Vite + TypeScript + Tailwind + React Router (`BrowserRouter`).
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
- `backend/main.py`: crea la app, configura CORS (`ALLOWED_ORIGINS`) y monta `skin.router` en `/skin`.
- `backend/controllers/skin.py`: todos los endpoints. Las imágenes pasan por `_leer_imagen()` (tipo y `MAX_IMAGE_MB`) y la inferencia por `_predecir()` (en threadpool). Las llamadas al LLM usan `await _llm_chat()` (`AsyncOpenAI`, cliente lazy, 503 si falla) y `_parse_llm_json()`. `limiter` (slowapi) aplica `RATE_LIMIT_IA` a los endpoints de IA.
- `backend/services/skin_analysis_service.py`: carga lazy de cada modelo y `predict_*_class(bytes) -> (label, probs)`.
- `backend/config/model_config.py`: rutas de los `.keras`, que se pueden sobrescribir por env.
- `frontend/src/components/ImageUploader.tsx`: selección del tipo de análisis → POST (mapa `ANALISIS`) → `navigate` a `/results-*` con `location.state` y copia en `sessionStorage` (`utils/analysisStorage.ts`).
- `frontend/src/data/conditions.ts`: contenido educativo de las condiciones (única fuente). Tipos de respuesta en `src/types/analysis.ts`.
- `deploy/`: `Caddyfile`, `web.Dockerfile`, `setup-vps.sh`, `deploy.sh`.

## Decisiones y restricciones
- **LLM = DeepSeek**, no OpenAI. No proponer gpt-4o. Variables: `DEEPSEEK_API_KEY` y, opcionales, `LLM_MODEL`, `LLM_BASE_URL`, `RATE_LIMIT_IA` y `MAX_IMAGE_MB`. Las rutas todavía se llaman `/skin/openai-*` por compatibilidad con el front; se renombran en la Fase 2.
- **Nunca loguear secretos** ni el contenido completo de las respuestas del LLM.
- Los modelos `.keras` **no se versionan ni entran en la imagen** (`.gitignore` y `.dockerignore`). Se suben con `scp` a `backend/modelos/{ham10000,acne,rosacea}/` y se montan como volumen.
- El front y el back se sirven desde el mismo dominio. El build del front recibe `VITE_API_URL=https://${DOMAIN}`.
- El prefijo `/skin` lo usa el `Caddyfile`. Si cambia, hay que actualizar los dos lados.
- Errores hacia el cliente: mensajes genéricos. El detalle va a `logging` (no usar `print`).
- Nada bloqueante dentro de `async def`: el LLM va con `await` y `model.predict` con `run_in_threadpool`.
- Dependencias fijadas en `requirements.txt` según `pip freeze` en `python:3.10-slim`; al actualizarlas, resolver en esa imagen (varias libs nuevas ya exigen Python ≥3.11).
- uvicorn corre con `--proxy-headers` para que el rate limit vea la IP real detrás de Caddy.
- El build del front es `tsc -b && vite build`: un error de tipos rompe el Docker build.

## Hoja de ruta (ver `docs/AUDITORIA.md`)
- [x] Fase 0: quitar el log de la API key y migrar a DeepSeek.
- [x] Hallazgos altos (A1–A8): dependencias fijadas, LLM async, rate limit, validación de imágenes, `lunares_results` eliminado, `conditions.ts` en el front, drag & drop, tsc/eslint en 0 y `setup-vps.sh`.
- [ ] Fase 1 (resto): borrar las vistas muertas (`GET /skin/`, `/skin/results`, `POST /skin/upload`, `POST /skin/api/analyze`) y que `GET /` sea un health.
- [ ] Fase 2 (resto): `src/api/client.ts` + `useRecommendations`, un `Results.tsx` genérico y renombrar las rutas `/skin/openai-*`.
- [ ] Fase 3: limpieza (scripts de AWS/ngrok, `setup-lightshot.exe`, `.gitignore.bak`).

## Pendiente conocido
- Los endpoints de IA son públicos (con rate limit por IP). Falta el tope de gasto en el panel de DeepSeek (manual).
- Si el LLM no responde, cada request espera hasta ~1 min (timeout 30 s + 1 reintento) antes del 503, pero ya no bloquea a los demás usuarios.
- Pendientes medios/bajos en `docs/AUDITORIA.md` (compose: `env_file` completo, duckdns sin versión fija, sin healthcheck).
