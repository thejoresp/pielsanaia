# Auditoría de arquitectura — PielSana IA

- **Auditoría inicial:** 2026-11-01 (foco: frontend dentro del backend).
- **Re-auditoría:** 2026-11-01, sobre los cambios de despliegue en VPS y de migración a DeepSeek.

**Stack:** Python 3.10 / FastAPI / TensorFlow-Keras / DeepSeek (SDK `openai`) · React 18 + Vite + TS + Tailwind · sin DB · Docker Compose + Caddy + DuckDNS (VPS Contabo).
**Patrón:** monolito por capas en el back (controllers/services/models/config), con `controllers/skin.py` sobrecargado. Front organizado por tipo, sin capa de API.

---

## 1. Auditoría inicial

### 🔴 Críticos
- [x] **Secretos:** la API key del LLM se imprimía en los logs (`backend/controllers/skin.py`). **Resuelto en la Fase 0.** Revocar la clave vieja de OpenAI.

### 🟠 Altos
- [ ] **Front en el back: contenido.** `conditions_data` (textos, causas, síntomas, imágenes) está en `skin.py` y duplicado con otros textos en `ConditionsOverview.tsx`, en `Results{Acne,Rosacea,Lunares}.tsx` y en el `conditionMap` de `ResultsOpenAI.tsx` → mover a `frontend/src/data/conditions.ts` y borrar `GET /skin/api/condition/{name}` y `backend/models/condition.py`.
- [ ] **Front en el back: estado de navegación.** `lunares_results` guarda resultados en RAM sin límite y los pierde al reiniciar → `analyze-lunares` debe devolver el resultado directo; el front lo guarda en `location.state` y `sessionStorage`.
- [ ] **Bug:** el drag & drop no carga la imagen (`ImageUploader.tsx`, `handleDrop`).

### 🟡 Medios
- [ ] Vistas muertas: `GET /skin/`, `GET /skin/results`, `POST /skin/upload`, `POST /skin/api/analyze`, y `GET /`, que redirige a un 404.
- [ ] `fetch` repartidos en 5 archivos → `src/api/client.ts` y un hook `useRecommendations`.
- [ ] `ResultsAcne` y `ResultsRosacea` son casi idénticos → un `Results.tsx` genérico.
- [ ] `detail=str(e)` muestra el error interno al cliente en los `analyze-*`.
- [ ] Llamadas bloqueantes (`model.predict`, LLM) dentro de `async def`.

### 🟢 Bajos
- [ ] Basura en el repo: `frontend/setup-lightshot.exe`, `.gitignore.bak`, `backend/datosusuarioUbuntu.txt`, scripts de AWS/ngrok y scripts de gh-pages.
- [ ] `DarkModeToggle.tsx` está suelto en `src/`.
- [x] README desactualizado (árbol con `templates/` y `routes.py`, que no existen; instrucciones de EC2/ngrok). **Resuelto.**
- [x] Imports repetidos dentro de `obtener_recomendaciones_openai`. **Resuelto en la Fase 0.**

---

## 2. Re-auditoría de los cambios (despliegue VPS + DeepSeek)

Archivos revisados: `docker-compose.yml`, `deploy/*`, `.dockerignore`, `.env.example`, `backend/main.py` (CORS) y `backend/controllers/skin.py` (bloque LLM).

### 🟠 Altos
- [ ] **Costo / abuso de la IA.** Con el dominio público, `/skin/openai-analizar` y `/skin/openai-recomendaciones` quedan abiertos a cualquiera, sin rate limit y con `prediccion` sin límite de largo. Cualquiera puede consumir el saldo de DeepSeek · 📍`backend/controllers/skin.py` → **Acción:** rate limit por IP (por ejemplo `slowapi`, 10/min), `prediccion` con `max_length=100` y un tope de gasto en el panel de DeepSeek.
- [ ] **Bloqueo del servidor.** `_llm_chat()` es síncrona y se llama desde `async def`. Con `timeout=60` y los 2 reintentos por defecto del SDK, una caída de DeepSeek puede congelar el único worker unos 3 minutos para **todos** los usuarios · 📍`skin.py:_llm_chat` → **Acción:** usar `AsyncOpenAI` con `await` y `max_retries=1`.
- [ ] **Build no reproducible.** `requirements.txt` fija `pydantic==1.10.15` pero deja `fastapi`, `uvicorn` y `openai` sin versión. En la prueba local, la combinación con versiones recientes falló al importar (`TypeAdapter`) · 📍`backend/requirements.txt` → **Acción:** fijar versiones probadas. El código solo usa `BaseModel` básico, así que puede pasar a pydantic 2.
- [ ] **Acceso SSH a `deploy`.** Si root entra con contraseña (lo habitual en Contabo), `setup-vps.sh` crea `deploy` sin `authorized_keys` y sin contraseña, y el paso `ssh deploy@IP` del README falla · 📍`deploy/setup-vps.sh` → **Acción:** que el script avise y se corte si no hay clave. Mientras tanto, el README ya documenta `ssh-copy-id`.

### 🟡 Medios
- [ ] **`apt-get upgrade` interactivo.** Corriendo con `curl | bash`, puede quedarse esperando respuesta en un prompt de configuración · 📍`deploy/setup-vps.sh` → **Acción:** `export DEBIAN_FRONTEND=noninteractive`.
- [ ] **Error de IA invisible en el front.** Las páginas de resultados no revisan `res.ok`. Ante un 503, las recomendaciones quedan vacías sin aviso · 📍`frontend/src/pages/Results*.tsx` → **Acción:** mostrar "Servicio de IA no disponible" (va en la Fase 2, en `api/client.ts`).
- [x] **Docs contradictorias.** El README decía que los modelos quedan dentro de la imagen, pero `.dockerignore` los excluye; y `cd backend && python main.py` falla por los imports `backend.*`. **Resuelto:** el README actualizado explica el volumen y el `uvicorn` desde la raíz.

### 🟢 Bajos
- [ ] El backend recibe todo el `.env` (incluido `DUCKDNS_TOKEN`) por `env_file` → pasarle solo las variables que usa.
- [ ] `lscr.io/linuxserver/duckdns:latest` sin versión fija.
- [ ] No hay `healthcheck` en compose; `GET /` todavía redirige a una ruta 404.
- [ ] Con la clave sin configurar, `logger.exception` imprime un traceback en cada request → avisar una sola vez al arrancar.

### ✅ Lo que está bien en los cambios
- La API key ya no aparece en los logs y los errores de IA llegan al cliente como un 503 genérico.
- El cliente LLM se crea lazy: el backend arranca aunque falte la clave, y los análisis locales siguen funcionando.
- El backend no publica puertos; solo Caddy expone el 80 y el 443. Combinado con ufw, la superficie expuesta es mínima.
- `.env`, `*.keras` y `*.pem` quedan fuera de las imágenes Docker.
- HTTPS automático, con los certificados guardados en un volumen (`caddy_data`).
- Con `LLM_BASE_URL` y `LLM_MODEL` se puede cambiar de proveedor sin tocar código.

### ⚡ Próximos quick wins
1. `AsyncOpenAI` + `max_retries=1` (unas 5 líneas).
2. Fijar `requirements.txt` antes del primer deploy.
3. `DEBIAN_FRONTEND=noninteractive` y el corte por falta de clave SSH en `setup-vps.sh`.
4. Rate limit en los endpoints de IA y tope de gasto en DeepSeek.
