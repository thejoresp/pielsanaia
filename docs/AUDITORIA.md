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
- [x] Vistas muertas: `GET /skin/`, `GET /skin/results`, `POST /skin/upload`, `POST /skin/api/analyze`, y `GET /`, que redirige a un 404. **Resuelto:** borradas (404) y `GET /` responde `{"status": "ok"}`.
- [x] `fetch` repartidos en 5 archivos → `src/api/client.ts` y un hook `useRecommendations`. **Resuelto:** el único `fetch` está en `client.ts`.
- [x] `ResultsAcne` y `ResultsRosacea` son casi idénticos → un `Results.tsx` genérico. **Resuelto:** `Results.tsx` cubre acné, rosácea y lunares.
- [x] Rutas `/skin/openai-*` con el nombre del proveedor viejo. **Resuelto:** `/skin/api/analyze-ia` y `/skin/api/recomendaciones` (front: tipo `ia`, `/results-ia`).
- [x] `detail=str(e)` muestra el error interno al cliente en los `analyze-*`. **Resuelto:** 500 genérico + `logger.exception`.
- [x] Llamadas bloqueantes (`model.predict`, LLM) dentro de `async def`. **Resuelto:** `AsyncOpenAI` + `run_in_threadpool`.

### 🟢 Bajos
- [x] Basura en el repo: `frontend/setup-lightshot.exe`, `.gitignore.bak`, `backend/datosusuarioUbuntu.txt`, scripts de AWS/ngrok y scripts de gh-pages. **Resuelto:** borrados (siguen en el historial de git: `connect_aws.sh` tenía una IP de EC2).
- [x] `DarkModeToggle.tsx` está suelto en `src/`. **Resuelto:** movido a `src/components/`.
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
- [x] El backend recibe todo el `.env` (incluido `DUCKDNS_TOKEN`) por `env_file` → pasarle solo las variables que usa. **Resuelto:** `environment:` con 6 variables; el código usa `os.getenv(X) or default` para que las vacías tomen el default.
- [x] `lscr.io/linuxserver/duckdns:latest` sin versión fija. **Resuelto:** `8aabc87c-ls95` (mismo digest que `latest` al 2026-11-01).
- [x] No hay `healthcheck` en compose; `GET /` todavía redirige a una ruta 404. **Resuelto:** healthcheck con `python -c urllib` contra `GET /`. `web` no espera a `healthy` para que el front siga arriba si el backend cae.
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
- [x] 🟢 Scripts `predeploy`/`deploy` de gh-pages y `vite-plugin-gh-pages` en `frontend/package.json` (va con la Fase 3). **Resuelto.**

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
Medios y bajos de §1 y §2 resueltos (ver las tablas de pruebas abajo). Queda §4: vulnerabilidades de dependencias.

### Puntos medios (M1–M4) — pruebas detrás de Caddy
| Caso | Esperado | Resultado |
|---|---|---|
| `GET /` del backend (desde el contenedor) | `{"status":"ok"}` | ✅ |
| `POST /skin/api/recomendaciones` ×4 con `RATE_LIMIT_IA=3/minute`, sin clave | 503 ×3 y 429 | ✅ (1 warning, 0 tracebacks) |
| `POST /skin/api/analyze-ia` con 6 MB | 413 | ✅ |
| `/skin/openai-*`, `/skin/upload`, `/skin/api/analyze`, `GET /skin/`, `GET /skin/results` | 404 | ✅ |
| `/results-{acne,rosacea,lunares,ia}` | 200 (SPA) | ✅ |
| Bundle del front | solo rutas nuevas y clases de color de `Results.tsx` presentes | ✅ |

### Puntos bajos (B1–B5) — pruebas
| Caso | Esperado | Resultado |
|---|---|---|
| `docker compose config` (plugin vía `docker:27-cli`) | backend sin `DUCKDNS_TOKEN`, solo sus 6 variables | ✅ |
| Backend con `LLM_MODEL`, `RATE_LIMIT_IA`, `MAX_IMAGE_MB`, `LLM_BASE_URL` vacías | defaults: `deepseek-flash`, `10/minute`, 5 MB | ✅ |
| 11 × `POST /skin/api/recomendaciones` sin clave, detrás de Caddy | 503 ×10 y 429 | ✅ |
| Healthcheck (`python -c urllib` contra `GET /`) | `healthy` | ✅ |
| `/` y `/results-acne` desde Caddy; tsc, eslint y build | 200; 0 errores | ✅ |

---
## 4. Re-auditoría de dependencias (2026-11-01) — para más adelante

Las imágenes se construyeron con `docker build` y se probaron de punta a punta detrás de Caddy (413, 429, 503, IP real con `--proxy-headers` y un `X-Forwarded-For` falso que no saltea el límite). A1–A8 quedan verificados. Estos hallazgos se dejan para después de cerrar los medios y bajos de §1 y §2:

- [ ] 🔴 **Pillow 12.3.0: 39 vulnerabilidades conocidas** (`pip-audit`). Se corrigen en 13.0.0, que exige Python ≥3.11 → pasar `backend/Dockerfile` a `python:3.11-slim` (TF 2.19 soporta 3.9–3.12), re-resolver `requirements.txt` con `pip freeze` en esa imagen y actualizar la nota de Python 3.10 en `CLAUDE.md`. Es el más urgente: Pillow abre las imágenes que suben los usuarios.
- [ ] 🟠 **Keras 3.12.4: 4 vulnerabilidades**, corregidas en 3.15.0 (vía tensorflow/keras). Riesgo menor: solo se cargan `.keras` propios. Hacerlo junto con el cambio de Python.
- [ ] 🟠 **npm audit: 24 vulnerabilidades (16 altas)**, todas con arreglo. Directas: `vite`, `postcss`, `react-router-dom` (esta última llega al build). Revisar saltos de versión mayor. GitHub (Dependabot) informa 53 alertas.
- [ ] 🟢 **Carga lazy de modelos sin lock:** dos requests simultáneos en el threadpool pueden cargar el mismo `.keras` dos veces → `threading.Lock` en `load_*_model`.
- [ ] 🟢 **Imagen del backend de 3,73 GB**, casi todo TensorFlow → evaluar `tensorflow-cpu`.
