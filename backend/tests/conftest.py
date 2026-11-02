"""Fixtures comunes: cliente HTTP, imágenes de prueba, modelos y LLM falsos.

Los tests no usan red ni los .keras reales (salvo test_modelo_real.py):
- los modelos locales se reemplazan con monkeypatch sobre skin.predict_*_class;
- DeepSeek se reemplaza con un cliente falso en skin._llm_client.
"""
import io
import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.controllers import skin
from backend.main import app

# Endpoint -> nombre de la función de predicción que usa
ENDPOINTS_MODELOS = {
    "/skin/api/analyze-lunares": "predict_lunares_class",
    "/skin/api/analyze-acne": "predict_acne_class",
    "/skin/api/analyze-rosacea": "predict_rosacea_class",
}
URL_IA = "/skin/api/analyze-ia"
URL_RECOMENDACIONES = "/skin/api/recomendaciones"


def imagen_bytes(formato="JPEG", modo="RGB", tamano=(64, 64), color=(200, 120, 100)) -> bytes:
    """Genera una imagen válida en memoria."""
    if modo == "L":
        color = 128
    elif modo == "RGBA":
        color = (*color, 255)
    buf = io.BytesIO()
    Image.new(modo, tamano, color).save(buf, format=formato)
    return buf.getvalue()


@pytest.fixture
def jpeg() -> bytes:
    return imagen_bytes()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reiniciar_estado(monkeypatch):
    """Cada test arranca con el rate limit vacío y sin cliente LLM cacheado."""
    skin.limiter.reset()
    monkeypatch.setattr(skin, "_llm_client", None)
    yield
    skin.limiter.reset()


class ModeloFalso:
    """Reemplaza una predict_*_class y registra si se llamó."""

    def __init__(self, resultado=("Etiqueta", {"Etiqueta": 0.9, "Otra": 0.1}), error=None):
        self.resultado = resultado
        self.error = error
        self.llamadas = 0
        self.__name__ = "modelo_falso"  # el controller lo usa en los logs

    def __call__(self, image_bytes):
        self.llamadas += 1
        if self.error:
            raise self.error
        return self.resultado


@pytest.fixture
def modelo_falso(monkeypatch):
    """Instala un ModeloFalso en las tres funciones de predicción."""
    def _instalar(**kwargs):
        falso = ModeloFalso(**kwargs)
        for nombre in ENDPOINTS_MODELOS.values():
            monkeypatch.setattr(skin, nombre, falso)
        return falso
    return _instalar


class LLMFalso:
    """Imita AsyncOpenAI: client.chat.completions.create(...) devuelve `respuesta`."""

    def __init__(self, respuesta="", error=None):
        self.respuesta = respuesta
        self.error = error
        self.llamadas = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.llamadas.append(kwargs)
        if self.error:
            raise self.error
        mensaje = SimpleNamespace(content=self.respuesta)
        return SimpleNamespace(choices=[SimpleNamespace(message=mensaje)])


@pytest.fixture
def llm_falso(monkeypatch):
    """Instala un LLMFalso. Acepta un dict/list (se serializa a JSON) o texto crudo."""
    def _instalar(respuesta="", error=None):
        if not isinstance(respuesta, str):
            respuesta = json.dumps(respuesta, ensure_ascii=False)
        falso = LLMFalso(respuesta, error)
        monkeypatch.setattr(skin, "_llm_client", falso)
        return falso
    return _instalar
