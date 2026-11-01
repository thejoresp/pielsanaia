import logging
import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.controllers import skin

# Cargar variables de entorno del archivo .env
# Es bueno hacerlo lo antes posible
load_dotenv()

# Logs de la app (los de uvicorn tienen su propia configuración)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Opcional: Verificar si el token se cargó (para depuración)
# print(f"HF_TOKEN desde el entorno: {os.getenv('HF_TOKEN')}")

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

#       "http://localhost:5173",            # Para desarrollo local
#       "http://127.0.0.1:5173",
#       "https://pielsana-ia.vercel.app",
    

# Endpoint de prueba
@app.get("/")
async def read_root():
    # Redirigir a la página de carga de la aplicación de piel
    return RedirectResponse(url="/skin/")

# Registrar routers de los controladores
app.include_router(skin.router, prefix="/skin", tags=["Skin Analysis Frontend"])

if __name__ == "__main__":
    # Esta sección es útil para desarrollo, pero para producción usarás 'run.py'
    uvicorn.run(app, host="0.0.0.0", port=8080) 