import logging
import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.controllers import skin

# Cargar variables de entorno del archivo .env
# Es bueno hacerlo lo antes posible
load_dotenv()

# Logs de la app (los de uvicorn tienen su propia configuración)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Crear la instancia de la aplicación FastAPI
app = FastAPI(
    title="PielSana IA",
    description="Sistema de análisis facial para clasificar condiciones cutáneas.",
    version="0.1.0"
)

# Rate limit (slowapi): el limiter vive en el controller y responde 429 al superarse
app.state.limiter = skin.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Habilitar CORS: en producción se restringe con ALLOWED_ORIGINS (separados por coma)
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check (lo usa el healthcheck de compose; Caddy no lo expone: solo proxya /skin/*)
@app.get("/")
async def health():
    return {"status": "ok"}

# Registrar routers de los controladores
app.include_router(skin.router, prefix="/skin", tags=["Skin Analysis API"])

if __name__ == "__main__":
    # Esta sección es útil para desarrollo, pero para producción usarás 'run.py'
    uvicorn.run(app, host="0.0.0.0", port=8080) 