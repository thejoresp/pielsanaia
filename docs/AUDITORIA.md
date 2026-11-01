# Auditoría de arquitectura — PielSana IA

- **Auditoría inicial:** 2026-11-01 (foco: frontend dentro del backend).
- **Re-auditoría:** 2026-11-01, sobre los cambios de despliegue en VPS y de migración a DeepSeek.
- **Auditoría verificada + hallazgos altos resueltos:** 2026-11-01 (ver §3).

**Stack:** Python 3.10 / FastAPI / TensorFlow-Keras / DeepSeek (SDK `openai`) · React 18 + Vite + TS + Tailwind · sin DB · Docker Compose + Caddy + DuckDNS (VPS Contabo).
**Patrón:** monolito por capas en el back (controllers/services/models/config), con `controllers/skin.py` sobrecargado. Front organizado por tipo, sin capa de API.

---

## 1. Auditoría inicial

### 🔴 Críticos
- [x] **Secretos:** la API key del LLM se imprimía en los logs (`backend/controllers/skin.py`). **Resuelto en la Fase 0.** Revocar la clave vieja de OpenAI.

### 🟠 Altos
- [x] **Front en el back: contenido.** `conditions_data` (textos, causas, síntomas, imágenes) está en `skin.py` y duplicado con otros textos en `ConditionsOverview.tsx`, en `Results{Acne,Rosacea,Lunares}.tsx` y en el `conditionMap` de `ResultsOpenAI.tsx` → mover a `frontend/src/data/conditions.ts` y borrar `GET /skin/api/condition/{name}` y `backend/models/condition.py`. **Resuelto:** `frontend/src/data/conditions.ts`; endpoint y `models/condition.py` eliminados.
- [x] **Front en el back: estado de navegación.** `lunares_results` guarda resultados en RAM sin límite y los pierde al reiniciar → `analyze-lunares` debe devolver el resultado directo; el front lo guarda en `location.state` y `sessionStorage`. **Resuelto.**
- [x] **Bug:** el drag & drop no carga la imagen (`ImageUploader.tsx`, `handleDrop`). **Resuelto:** `procesarArchivo()` compartido por el input y el drop.

### 🟡 Medios
- [ ] Vistas muertas: `GET /skin/`, `GET /skin/results`, `POST /skin/upload`, `POST /skin/api/analyze`, y `GET /`, que redirige a un 404.
- [ ] `fetch` repartidos en 5 archivos → `src/api/client.ts` y un hook `useRecommendations`.
- [ ] `ResultsAcne` y `ResultsRosacea` son casi idénticos → un `Results.tsx` genérico.
- [x] `detail=str(e)` muestra el error interno al cliente en los `analyze-*`. **Resuelto:** 500 genérico + `logger.exception`.
- [x] Llamadas bloqueantes (`model.predict`, LLM) dentro de `async def`. **Resuelto:** `AsyncOpenAI` + `run_in_threadpool`.

### 🟢 Bajos
- [ ] Basura en el repo: `frontend/setup-lightshot.exe`, `.gitignore.bak`, `backend/datosusuarioUbuntu.txt`, scripts de AWS/ngrok y scripts de gh-pages.
- [ ] `DarkModeToggle.tsx` está suelto en `src/`.
- [x] README desactualizado (árbol con `templates/` y `routes.py`, que no existen; instrucciones de EC2/ngrok). **Resuelto.**
- [x] Imports repetidos dentro de `obtener_recomendaciones_openai`. **Resuelto en la Fase 0.**

---

## 2. Re-auditoría de los cambios (despliegue VPS + DeepSeek)

Archivos revisados: `docker-compose.yml`, `deploy/*`, `.dockerignore`, `.env.example`, `backend/main.py` (CORS) y `backend/controllers/skin.py` (bloque LLM).

### 🟠 Altos
- [x] **Costo / abuso de la IA.** Con el dominio público, `/skin/openai-analizar` y `/skin/openai-recomendaciones` quedan abiertos a cualquiera, sin rate limit y con `prediccion` sin límite de largo. Cualquiera puede consumir el saldo de DeepSeek · 📍`backend/controllers/skin.py` → **Acción:** rate limit por IP (por ejemplo `slowapi`, 10/min), `prediccion` con `max_length=100` y un tope de gasto en el panel de DeepSeek. **Resuelto:** `slowapi` (`RATE_LIMIT_IA`), `max_length=100` y validación de imagen también en `openai-analizar`. Pendiente manual: tope de gasto en DeepSeek.
- [x] **Bloqueo del servidor.** `_llm_chat()` es síncrona y se llama desde `async def`. Con `timeout=60` y los 2 reintentos por defecto del SDK, una caída de DeepSeek puede congelar el único worker unos 3 minutos para **todos** los usuarios · 📍`skin.py:_llm_chat` → **Acción:** usar `AsyncOpenAI` con `await` y `max_retries=1`. **Resuelto:** `AsyncOpenAI(timeout=30, max_retries=1)`; verificado que un análisis local responde mientras el LLM está colgado.
- [x] **Build no reproducible.** `requirements.txt` fija `pydantic==1.10.15` pero deja `fastapi`, `uvicorn` y `openai` sin versión. En la prueba local, la combinación con versiones recientes falló al importar (`TypeAdapter`) · 📍`backend/requirements.txt` → **Acción:** fijar versiones probadas. El código solo usa `BaseModel` básico, así que puede pasar a pydantic 2. **Resuelto:** versiones fijadas con `pip freeze` en `python:3.10-slim`; pydantic 2.14.
- [x] **Acceso SSH a `deploy`.** Si root entra con contraseña (lo habitual en Contabo), `setup-vps.sh` crea `deploy` sin `authorized_keys` y sin contraseña, y el paso `ssh deploy@IP` del README falla · 📍`deploy/setup-vps.sh` → **Acción:** que el script avise y se corte si no hay clave. Mientras tanto, el README ya documenta `ssh-copy-id`. **Resuelto:** el script se corta si `/root/.ssh/authorized_keys` falta o está vacío.

### 🟡 Medios
- [x] **`apt-get upgrade` interactivo.** Corriendo con `curl | bash`, puede quedarse esperando respuesta en un prompt de configuración · 📍`deploy/setup-vps.sh` → **Acción:** `export DEBIAN_FRONTEND=noninteractive`. **Resuelto.**
- [x] **Error de IA invisible en el front.** Las páginas de resultados no revisan `res.ok`. Ante un 503, las recomendaciones quedan vacías sin aviso · 📍`frontend/src/pages/Results*.tsx` → **Acción:** mostrar "Servicio de IA no disponible" (va en la Fase 2, en `api/client.ts`). **Resuelto** en las páginas de resultados (`res.ok` + aviso). `api/client.ts` sigue pendiente.
- [x] **Docs contradictorias.** El README decía que los modelos quedan dentro de la imagen, pero `.dockerignore` los excluye; y `cd backend && python main.py` falla por los imports `backend.*`. **Resuelto:** el README actualizado explica el volumen y el `uvicorn` desde la raíz.

### 🟢 Bajos
- [ ] El backend recibe todo el `.env` (incluido `DUCKDNS_TOKEN`) por `env_file` → pasarle solo las variables que usa.
- [ ] `lscr.io/linuxserver/duckdns:latest` sin versión fija.
- [ ] No hay `healthcheck` en compose; `GET /` todavía redirige a una ruta 404.
- [x] Con la clave sin configurar, `logger.exception` imprime un traceback en cada request → avisar una sola vez al arrancar. **Resuelto:** un único `logger.warning` al primer uso.

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

---

## 3. Auditoría verificada (2026-11-01)

Se re-auditó corriendo herramientas en lugar de solo leer: `tsc --noEmit`, `eslint`, `py_compile`, la resolución de dependencias en `python:3.10-slim` y pruebas con `curl` contra uvicorn en contenedor.

### 🆕 Hallazgos nuevos
- [x] 🟠 **El chequeo del front fallaba:** `tsc` daba 8 errores y `eslint` 7, invisibles porque `build` era solo `vite build` · 📍`frontend/package.json` → **Resuelto:** 0 errores y `build = tsc -b && vite build`.
- [x] 🟠 **`/openai-analizar` sin validación:** aceptaba cualquier archivo de hasta 15 MB y lo mandaba en base64 al LLM → **Resuelto** con `_leer_imagen()`.
- [x] 🟠 **`fastapi` sin versión exige `pydantic>=2.9`** y chocaba con `pydantic==1.10.15`. Además, `python-multipart` y `Pillow` recientes exigen Python ≥3.11 → **Resuelto** (ver §2).
- [x] 🟡 **`transformers` en `requirements.txt` sin usarse** (cientos de MB en la imagen) → **Resuelto:** se quitó.
- [x] 🟡 **`print()` en vez de `logging`** en el controller y el service → **Resuelto.**
- [x] 🟢 **`setup-vps.sh` pedía `OPENAI_API_KEY`** en el mensaje final → **Resuelto.**
- [ ] 🟢 Scripts `predeploy`/`deploy` de gh-pages y `vite-plugin-gh-pages` en `frontend/package.json` (va con la Fase 3).

### Pruebas realizadas (backend en `python:3.10-slim`)
| Caso | Esperado | Resultado |
|---|---|---|
| `.txt` en `analyze-acne` | 400 | ✅ 400 |
| Imagen de 6 MB en `analyze-acne` / `openai-analizar` | 413 | ✅ 413 / 413 |
| `prediccion` de 200 caracteres | 422 | ✅ 422 |
| Sin `DEEPSEEK_API_KEY` ×3 | 503, un solo warning | ✅ 503 ×3, 1 warning, 0 tracebacks |
| LLM colgado + `analyze-acne` en paralelo | El análisis local no espera | ✅ 3 ms (el LLM: 503 a los ~56 s) |
| 4 requests con `RATE_LIMIT_IA=3/minute` | 429 en el 4.º | ✅ |
| `GET /api/condition/acne`, `GET /api/analyze-lunares/x` | 404 (eliminados) | ✅ |

### Siguen pendientes
Medios y bajos de §1 y §2: vistas muertas, `api/client.ts` y `Results.tsx` genérico, `env_file` completo en el backend, duckdns sin versión fija, healthcheck en compose, `DarkModeToggle.tsx` suelto y la limpieza de la Fase 3.
