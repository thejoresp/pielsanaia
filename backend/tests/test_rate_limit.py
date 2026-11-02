"""Rate limit por IP (RATE_LIMIT_IA, por defecto 10/minute) en los endpoints de IA."""
import pytest

from backend.controllers import skin
from backend.tests.conftest import URL_IA, URL_RECOMENDACIONES

LIMITE = int(skin.RATE_LIMIT_IA.split("/")[0])


@pytest.mark.parametrize("url", [URL_IA, URL_RECOMENDACIONES])
def test_supera_el_limite_es_429(client, llm_falso, jpeg, url):
    llm_falso({"afeccion": "A", "descripcion": "d", "recomendaciones": ["r"]})

    def pedir():
        if url == URL_IA:
            return client.post(url, files={"file": ("a.jpg", jpeg, "image/jpeg")})
        return client.post(url, json={"prediccion": "Con acné"})

    codigos = [pedir().status_code for _ in range(LIMITE)]
    assert codigos == [200] * LIMITE
    assert pedir().status_code == 429


def test_el_limite_es_por_endpoint(client, llm_falso, jpeg):
    llm_falso({"descripcion": "d", "recomendaciones": ["r"]})
    for _ in range(LIMITE):
        client.post(URL_RECOMENDACIONES, json={"prediccion": "Con acné"})
    assert client.post(URL_RECOMENDACIONES, json={"prediccion": "Con acné"}).status_code == 429
    assert client.post(URL_IA, files={"file": ("a.jpg", jpeg, "image/jpeg")}).status_code != 429
