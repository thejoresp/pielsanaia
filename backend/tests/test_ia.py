"""POST /skin/api/analyze-ia: análisis de la imagen con el LLM (DeepSeek)."""
import pytest

from backend.controllers import skin
from backend.controllers.skin import ERROR_IA
from backend.tests.conftest import URL_IA, imagen_bytes

RESPUESTA_OK = {
    "afeccion": "Acné",
    "descripcion": "Inflamación de los folículos.",
    "recomendaciones": ["Lavar la cara", "No tocar", "Protector solar", "Hidratar", "Consultar"],
}


def _post(client, contenido, mime="image/jpeg", nombre="foto.jpg"):
    return client.post(URL_IA, files={"file": (nombre, contenido, mime)})


def test_respuesta_correcta(client, llm_falso, jpeg):
    llm = llm_falso(RESPUESTA_OK)
    r = _post(client, jpeg)
    assert r.status_code == 200
    assert r.json() == RESPUESTA_OK
    assert len(llm.llamadas) == 1


def test_envia_la_imagen_como_data_url(client, llm_falso, jpeg):
    llm = llm_falso(RESPUESTA_OK)
    _post(client, jpeg)
    contenido_usuario = llm.llamadas[0]["messages"][1]["content"]
    imagen = next(p for p in contenido_usuario if p["type"] == "image_url")
    assert imagen["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_acepta_json_en_bloque_de_codigo(client, llm_falso, jpeg):
    import json
    llm_falso("```json\n" + json.dumps(RESPUESTA_OK, ensure_ascii=False) + "\n```")
    r = _post(client, jpeg)
    assert r.status_code == 200
    assert r.json() == RESPUESTA_OK


def test_texto_que_no_es_json_devuelve_respaldo(client, llm_falso, jpeg):
    llm_falso("Lo siento, no puedo analizar esta imagen.")
    r = _post(client, jpeg)
    assert r.status_code == 200
    datos = r.json()
    assert datos["afeccion"] == "No se pudo analizar"
    assert isinstance(datos["descripcion"], str)
    assert datos["recomendaciones"] and all(isinstance(x, str) for x in datos["recomendaciones"])


# R3: JSON válido pero con otra forma -> siempre {afeccion, descripcion, recomendaciones: [str]}
@pytest.mark.parametrize("respuesta", [
    ["Acné", "otra cosa"],                                     # lista en vez de objeto
    {"afeccion": "Acné"},                                      # faltan campos
    {"afeccion": "Acné", "descripcion": "x", "recomendaciones": "Lavar la cara"},  # texto en vez de lista
    {"afeccion": 123, "descripcion": None, "recomendaciones": [1, None, "ok"]},    # tipos incorrectos
    "\"solo un string\"",
])
def test_forma_inesperada_se_normaliza(client, llm_falso, jpeg, respuesta):
    llm_falso(respuesta)
    r = _post(client, jpeg)
    assert r.status_code == 200
    datos = r.json()
    assert set(datos) == {"afeccion", "descripcion", "recomendaciones"}
    assert isinstance(datos["afeccion"], str) and datos["afeccion"]
    assert isinstance(datos["descripcion"], str)
    assert isinstance(datos["recomendaciones"], list) and datos["recomendaciones"]
    assert all(isinstance(x, str) and x for x in datos["recomendaciones"])


def test_campos_extra_del_llm_no_se_devuelven(client, llm_falso, jpeg):
    llm_falso({**RESPUESTA_OK, "diagnostico_medico": "inventado"})
    assert set(_post(client, jpeg).json()) == {"afeccion", "descripcion", "recomendaciones"}


def test_sin_api_key_es_503(client, monkeypatch, jpeg):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    r = _post(client, jpeg)
    assert r.status_code == 503
    assert r.json() == {"detail": ERROR_IA}


def test_error_del_llm_es_503_sin_filtrar_detalle(client, llm_falso, jpeg):
    llm_falso(error=RuntimeError("api key sk-secreta invalida"))
    r = _post(client, jpeg)
    assert r.status_code == 503
    assert r.json() == {"detail": ERROR_IA}
    assert "secreta" not in r.text


def test_tipo_que_no_es_imagen_es_400_sin_llamar_al_llm(client, llm_falso):
    llm = llm_falso(RESPUESTA_OK)
    assert _post(client, b"texto", "text/plain", "a.txt").status_code == 400
    assert llm.llamadas == []


def test_imagen_demasiado_grande_es_413_sin_llamar_al_llm(client, llm_falso, monkeypatch):
    llm = llm_falso(RESPUESTA_OK)
    monkeypatch.setattr(skin, "MAX_IMAGE_BYTES", 1024)
    assert _post(client, imagen_bytes(tamano=(400, 400))).status_code == 413
    assert llm.llamadas == []


# R1 y R2: no se gasta una llamada al LLM con algo que no es una imagen
@pytest.mark.parametrize("contenido", [b"", b"hola, esto es texto", b"\x89PNG\r\n\x1a\nroto"])
def test_contenido_invalido_es_400_sin_llamar_al_llm(client, llm_falso, contenido):
    llm = llm_falso(RESPUESTA_OK)
    assert _post(client, contenido).status_code == 400
    assert llm.llamadas == []


def test_sin_archivo_es_422(client):
    assert client.post(URL_IA).status_code == 422
