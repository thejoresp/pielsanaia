"""Integración con el acne.keras real (se saltea si no está en ACNE_MODEL_PATH).

Corre la predicción de punta a punta: endpoint -> Pillow -> Keras.
"""
import os

import pytest

from backend.config.model_config import ACNE_MODEL_PATH
from backend.tests.conftest import imagen_bytes

pytestmark = [
    pytest.mark.modelo_real,
    pytest.mark.skipif(not os.path.isfile(ACNE_MODEL_PATH), reason=f"no está {ACNE_MODEL_PATH}"),
]

URL = "/skin/api/analyze-acne"
ETIQUETAS = {"Con acné", "Sin acné"}


@pytest.mark.parametrize("formato,modo,mime", [
    ("JPEG", "RGB", "image/jpeg"),
    ("PNG", "RGBA", "image/png"),
    ("PNG", "L", "image/png"),
    ("WEBP", "RGB", "image/webp"),
])
def test_prediccion_real_coherente(client, formato, modo, mime):
    r = client.post(URL, files={"file": ("foto", imagen_bytes(formato, modo, (300, 200)), mime)})
    assert r.status_code == 200
    datos = r.json()
    probs = datos["probabilidades"]
    assert set(probs) == ETIQUETAS
    assert all(0.0 <= p <= 1.0 for p in probs.values())
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-5)
    # La etiqueta es la de mayor probabilidad (umbral 0.5 de la salida sigmoid)
    assert datos["prediccion"] == max(probs, key=probs.get)


def test_prediccion_real_es_determinista(client):
    img = imagen_bytes(tamano=(224, 224), color=(180, 90, 80))
    a = client.post(URL, files={"file": ("a.jpg", img, "image/jpeg")}).json()
    b = client.post(URL, files={"file": ("b.jpg", img, "image/jpeg")}).json()
    assert a["prediccion"] == b["prediccion"]
    assert a["probabilidades"] == pytest.approx(b["probabilidades"], abs=1e-6)
