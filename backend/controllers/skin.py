import base64
import json
import logging
import os
import re

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.services.skin_analysis_service import (
    predict_acne_class,
    predict_lunares_class,
    predict_rosacea_class,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Límite de peticiones por IP para los endpoints que consumen el LLM (sintaxis de slowapi).
RATE_LIMIT_IA = os.getenv("RATE_LIMIT_IA", "10/minute")
limiter = Limiter(key_func=get_remote_address)

# Tamaño máximo de imagen aceptado (Caddy corta en 15 MB; acá se aplica el límite real).
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_MB", "5")) * 1024 * 1024

ERROR_ANALISIS = "No se pudo analizar la imagen. Intenta nuevamente."

class PrediccionRequest(BaseModel):
    prediccion: str = Field(..., min_length=1, max_length=100)


async def _leer_imagen(file: UploadFile) -> bytes:
    """Valida tipo y tamaño de la imagen subida y devuelve sus bytes."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")
    image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="La imagen supera el tamaño máximo permitido.")
    return image_bytes


async def _predecir(predict_fn, file: UploadFile) -> dict:
    """Corre la inferencia del modelo local fuera del event loop."""
    image_bytes = await _leer_imagen(file)
    try:
        pred_label, probabilities = await run_in_threadpool(predict_fn, image_bytes)
    except Exception:
        logger.exception("Error en la inferencia (%s)", predict_fn.__name__)
        raise HTTPException(status_code=500, detail=ERROR_ANALISIS)
    if pred_label is None:
        logger.error("El modelo no devolvió predicción (%s)", predict_fn.__name__)
        raise HTTPException(status_code=500, detail=ERROR_ANALISIS)
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "prediccion": pred_label,
        "probabilidades": probabilities,
    }


@router.post("/api/analyze-lunares", tags=["Skin Analysis API"])
async def api_analyze_lunares(file: UploadFile = File(...)):
    """Analiza una imagen con el modelo de lunares (HAM10000) y devuelve el resultado directo."""
    return await _predecir(predict_lunares_class, file)


@router.post("/api/analyze-acne", tags=["Skin Analysis API"])
async def api_analyze_acne(file: UploadFile = File(...)):
    return await _predecir(predict_acne_class, file)


@router.post("/api/analyze-rosacea", tags=["Skin Analysis API"])
async def api_analyze_rosacea(file: UploadFile = File(...)):
    return await _predecir(predict_rosacea_class, file)


# --- Cliente LLM (DeepSeek, API compatible con el SDK de OpenAI) ---
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-flash")
_llm_client: AsyncOpenAI | None = None
_aviso_sin_clave = False
ERROR_IA = "Servicio de IA no disponible. Intenta nuevamente más tarde."


def _get_llm_client() -> AsyncOpenAI:
    """Crea el cliente lazy. Si falta la clave, avisa una sola vez y responde 503."""
    global _llm_client, _aviso_sin_clave
    if _llm_client is None:
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            if not _aviso_sin_clave:
                logger.warning("DEEPSEEK_API_KEY no configurada: los endpoints de IA responden 503")
                _aviso_sin_clave = True
            raise HTTPException(status_code=503, detail=ERROR_IA)
        _llm_client = AsyncOpenAI(
            api_key=api_key,
            base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com"),
            timeout=30,
            max_retries=1,
        )
    return _llm_client


async def _llm_chat(messages, max_tokens=500) -> str:
    """Envía un chat al LLM y devuelve el texto. Lanza 503 si el servicio no está disponible."""
    client = _get_llm_client()
    try:
        response = await client.chat.completions.create(
            model=LLM_MODEL, messages=messages, max_tokens=max_tokens
        )
        return response.choices[0].message.content or ""
    except Exception:
        logger.exception("Error llamando al servicio de IA")
        raise HTTPException(status_code=503, detail=ERROR_IA)


def _parse_llm_json(content: str):
    # Limpia los bloques de código si existen
    content = re.sub(r"^```json|^```|```$", "", content.strip(), flags=re.MULTILINE).strip()
    return json.loads(content)


@router.post("/api/analyze-ia", tags=["Skin Analysis API"])
@limiter.limit(RATE_LIMIT_IA)
async def analizar_imagen_ia(request: Request, file: UploadFile = File(...)):
    image_bytes = await _leer_imagen(file)
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{file.content_type};base64,{image_base64}"

    prompt = (
        "Analiza la imagen de piel que te envío. "
        "Dime qué tipo de afección ves (acné, lunares, rosácea, mancha solar, etc.). Que inicie con mayúscula. "
        "Dame una breve descripción educativa de la afección detectada. "
        "Dame también 5 recomendaciones para esa afección. "
        "Responde en formato JSON con los campos 'afeccion', 'descripcion' y 'recomendaciones' (lista de strings)."
    )

    content = await _llm_chat([
        {"role": "system", "content": "Eres un dermatólogo experto."},
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_data_url}}
        ]}
    ])
    try:
        return _parse_llm_json(content)
    except Exception:
        return {
            "afeccion": "No se pudo analizar",
            "recomendaciones": ["Intenta con otra imagen o consulta a un dermatólogo."]
        }


@router.post("/api/recomendaciones", tags=["Skin Analysis API"])
@limiter.limit(RATE_LIMIT_IA)
async def obtener_recomendaciones(request: Request, body: PrediccionRequest):
    prompt = (
        f"Tengo un paciente con la siguiente condición dermatológica: '{body.prediccion}'. "
        "Dame una breve descripción educativa de la condición detectada y 5 recomendaciones para el paciente. "
        "Responde en formato JSON con los campos 'descripcion' (string) y 'recomendaciones' (lista de strings)."
    )
    content = await _llm_chat([
        {"role": "system", "content": "Eres un dermatólogo experto."},
        {"role": "user", "content": prompt}
    ])
    try:
        return _parse_llm_json(content)
    except Exception:
        return {"descripcion": "No se pudo generar la descripción.", "recomendaciones": ["No se pudieron generar recomendaciones. Intenta nuevamente."]}

