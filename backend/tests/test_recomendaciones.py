"""POST /skin/api/recomendaciones: descripción y recomendaciones del LLM para una etiqueta."""
import pytest

from backend.controllers.skin import ERROR_IA
from backend.tests.conftest import URL_RECOMENDACIONES

RESPUESTA_OK = {
    "descripcion": "El acné es una afección común.",
    "recomendaciones": ["Lavar la cara", "No tocar", "Protector solar", "Hidratar", "Consultar"],
}


def _post(client, prediccion="Con acné"):
    return client.post(URL_RECOMENDACIONES, json={"prediccion": prediccion})


def test_respuesta_correcta(client, llm_falso):
    llm = llm_falso(RESPUESTA_OK)
    r = _post(client)
    assert r.status_code == 200
    assert r.json() == RESPUESTA_OK
    assert "Con acné" in llm.llamadas[0]["messages"][1]["content"]


def test_texto_que_no_es_json_devuelve_respaldo(client, llm_falso):
    llm_falso("no es json")
    datos = _post(client).json()
    assert isinstance(datos["descripcion"], str) and datos["descripcion"]
    assert datos["recomendaciones"] and all(isinstance(x, str) for x in datos["recomendaciones"])


# R3: JSON válido pero con otra forma -> siempre {descripcion, recomendaciones: [str]}
@pytest.mark.parametrize("respuesta", [
    ["una", "lista"],
    {"descripcion": "x"},
    {"descripcion": "x", "recomendaciones": "una sola en texto"},
    {"descripcion": 5, "recomendaciones": [None, 2, "ok"]},
])
def test_forma_inesperada_se_normaliza(client, llm_falso, respuesta):
    llm_falso(respuesta)
    r = _post(client)
    assert r.status_code == 200
    datos = r.json()
    assert set(datos) == {"descripcion", "recomendaciones"}
    assert isinstance(datos["descripcion"], str) and datos["descripcion"]
    assert isinstance(datos["recomendaciones"], list) and datos["recomendaciones"]
    assert all(isinstance(x, str) and x for x in datos["recomendaciones"])


@pytest.mark.parametrize("cuerpo", [
    {},
    {"prediccion": ""},
    {"prediccion": "x" * 101},
    {"otra": "cosa"},
])
def test_cuerpo_invalido_es_422(client, llm_falso, cuerpo):
    llm = llm_falso(RESPUESTA_OK)
    assert client.post(URL_RECOMENDACIONES, json=cuerpo).status_code == 422
    assert llm.llamadas == []


def test_sin_api_key_es_503(client, monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    r = _post(client)
    assert r.status_code == 503
    assert r.json() == {"detail": ERROR_IA}


def test_error_del_llm_es_503(client, llm_falso):
    llm_falso(error=TimeoutError("timeout"))
    r = _post(client)
    assert r.status_code == 503
    assert r.json() == {"detail": ERROR_IA}
