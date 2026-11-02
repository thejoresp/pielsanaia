# Backend de PielSana IA: FastAPI + TensorFlow (solo CPU).
# Se construye desde la raíz del repo (los imports son backend.*).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TF_CPP_MIN_LOG_LEVEL=2

WORKDIR /app

# Dependencias primero: la capa se reutiliza mientras requirements.txt no cambie.
# Todo se instala desde wheels, no hacen falta paquetes del sistema.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip setuptools \
 && pip install -r requirements.txt

# Usuario sin privilegios. Los modelos .keras se montan como volumen de solo lectura.
RUN useradd --create-home --uid 1000 app
COPY backend ./backend
USER app

EXPOSE 8080

# --proxy-headers: toma la IP real del cliente desde Caddy (la usa el rate limit por IP).
# Aceptar cualquier proxy es seguro porque el backend no publica puertos.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
