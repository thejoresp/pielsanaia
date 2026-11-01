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
- `backend/controllers/skin.py`: todos los endpoints. Las llamadas al LLM pasan por `_llm_chat()`, que crea el cliente lazy y devuelve 503 si falla, y por `_parse_llm_json()`.
- `backend/services/skin_analysis_service.py`: carga lazy de cada modelo y `predict_*_class(bytes) -> (label, probs)`.
- `backend/config/model_config.py`: rutas de los `.keras`, que se pueden sobrescribir por env.
- `frontend/src/components/ImageUploader.tsx`: selección del tipo de análisis → POST → `navigate` a `/results-*` con `location.state`.
- `deploy/`: `Caddyfile`, `web.Dockerfile`, `setup-vps.sh`, `deploy.sh`.

## Decisiones y restricciones
- **LLM = DeepSeek**, no OpenAI. No proponer gpt-4o. Variables: `DEEPSEEK_API_KEY` y, opcionales, `LLM_MODEL` y `LLM_BASE_URL`. Las rutas todavía se llaman `/skin/openai-*` por compatibilidad con el front; se renombran en la Fase 2.
- **Nunca loguear secretos** ni el contenido completo de las respuestas del LLM.
- Los modelos `.keras` **no se versionan ni entran en la imagen** (`.gitignore` y `.dockerignore`). Se suben con `scp` a `backend/modelos/{ham10000,acne,rosacea}/` y se montan como volumen.
- El front y el back se sirven desde el mismo dominio. El build del front recibe `VITE_API_URL=https://${DOMAIN}`.
- El prefijo `/skin` lo usa el `Caddyfile`. Si cambia, hay que actualizar los dos lados.
- Errores hacia el cliente: mensajes genéricos. El detalle va a `logging`.

## Hoja de ruta (ver `docs/AUDITORIA.md`)
- [x] Fase 0: quitar el log de la API key y migrar a DeepSeek.
- [ ] Fase 1: dejar el backend solo como API. Sacar el contenido de UI (`conditions_data`), las vistas HTML muertas y el store en memoria `lunares_results`. Endpoints `def`/async correctos y dependencias fijadas.
- [ ] Fase 2: frontend como única fuente (`src/data/conditions.ts`, `src/api/client.ts`, un `Results.tsx` genérico) y arreglo del drag & drop.
- [ ] Fase 3: limpieza (scripts de AWS/ngrok, `setup-lightshot.exe`, `.gitignore.bak`).

## Pendiente conocido
- `backend/requirements.txt` fija `pydantic==1.10.15` y deja `fastapi` y `openai` sin versión, así que el build puede romperse.
- Los endpoints de IA son públicos y no tienen rate limit (riesgo de costo).
