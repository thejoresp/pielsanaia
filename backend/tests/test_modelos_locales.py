"""Endpoints de los modelos locales: /skin/api/analyze-{lunares,acne,rosacea}."""
import pytest

from backend.controllers import skin
from backend.controllers.skin import ERROR_ANALISIS
from backend.tests.conftest import ENDPOINTS_MODELOS, imagen_bytes

URLS = list(ENDPOINTS_MODELOS)


@pytest.mark.parametrize("url", URLS)
def test_imagen_valida_devuelve_prediccion(client, modelo_falso, jpeg, url):
    modelo = modelo_falso(resultado=("Con acné", {"Con acné": 0.8, "Sin acné": 0.2}))
    r = client.post(url, files={"file": ("foto.jpg", jpeg, "image/jpeg")})
    assert r.status_code == 200
    assert r.json() == {
        "filename": "foto.jpg",
        "content_type": "image/jpeg",
        "prediccion": "Con acné",
        "probabilidades": {"Con acné": 0.8, "Sin acné": 0.2},
    }
    assert modelo.llamadas == 1


@pytest.mark.parametrize("url", URLS)
@pytest.mark.parametrize("formato,modo,mime", [
    ("PNG", "RGBA", "image/png"),
    ("PNG", "L", "image/png"),
    ("WEBP", "RGB", "image/webp"),
])
def test_acepta_otros_formatos_de_imagen(client, modelo_falso, url, formato, modo, mime):
    modelo_falso()
    r = client.post(url, files={"file": ("foto", imagen_bytes(formato, modo), mime)})
    assert r.status_code == 200


@pytest.mark.parametrize("url", URLS)
def test_rechaza_tipo_que_no_es_imagen(client, modelo_falso, url):
    modelo = modelo_falso()
    r = client.post(url, files={"file": ("doc.pdf", b"%PDF-1.4", "application/pdf")})
    assert r.status_code == 400
    assert modelo.llamadas == 0


@pytest.mark.parametrize("url", URLS)
def test_sin_archivo_es_422(client, url):
    assert client.post(url).status_code == 422


@pytest.mark.parametrize("url", URLS)
def test_imagen_demasiado_grande_es_413(client, modelo_falso, monkeypatch, url):
    modelo = modelo_falso()
    monkeypatch.setattr(skin, "MAX_IMAGE_BYTES", 1024)
    grande = imagen_bytes(tamano=(400, 400))
    assert len(grande) > 1024
    r = client.post(url, files={"file": ("g.jpg", grande, "image/jpeg")})
    assert r.status_code == 413
    assert modelo.llamadas == 0


# R1: el Content-Type dice imagen pero el contenido no lo es
@pytest.mark.parametrize("url", URLS)
@pytest.mark.parametrize("contenido", [b"hola, esto es texto", b"%PDF-1.4 falso", b"\xff\xd8\xff\x00roto"])
def test_contenido_que_no_es_imagen_es_400_sin_llamar_al_modelo(client, modelo_falso, url, contenido):
    modelo = modelo_falso()
    r = client.post(url, files={"file": ("trucho.jpg", contenido, "image/jpeg")})
    assert r.status_code == 400
    assert modelo.llamadas == 0


# R2: archivo vacío
@pytest.mark.parametrize("url", URLS)
def test_archivo_vacio_es_400_sin_llamar_al_modelo(client, modelo_falso, url):
    modelo = modelo_falso()
    r = client.post(url, files={"file": ("vacio.jpg", b"", "image/jpeg")})
    assert r.status_code == 400
    assert modelo.llamadas == 0


@pytest.mark.parametrize("url", URLS)
def test_modelo_sin_prediccion_es_500_generico(client, modelo_falso, jpeg, url):
    modelo_falso(resultado=(None, None))
    r = client.post(url, files={"file": ("a.jpg", jpeg, "image/jpeg")})
    assert r.status_code == 500
    assert r.json() == {"detail": ERROR_ANALISIS}


@pytest.mark.parametrize("url", URLS)
def test_excepcion_del_modelo_es_500_sin_filtrar_detalle(client, modelo_falso, jpeg, url):
    modelo_falso(error=RuntimeError("ruta interna /app/backend/modelos secreta"))
    r = client.post(url, files={"file": ("a.jpg", jpeg, "image/jpeg")})
    assert r.status_code == 500
    assert r.json() == {"detail": ERROR_ANALISIS}
    assert "secreta" not in r.text


@pytest.mark.parametrize("url", URLS)
def test_modelos_locales_no_tienen_rate_limit(client, modelo_falso, jpeg, url):
    modelo_falso()
    for _ in range(15):
        assert client.post(url, files={"file": ("a.jpg", jpeg, "image/jpeg")}).status_code == 200
