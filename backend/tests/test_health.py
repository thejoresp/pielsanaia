def test_health_responde_ok(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_rutas_viejas_no_existen(client, jpeg):
    """Las rutas eliminadas en M1/M4 no deben volver."""
    for url in ("/skin/", "/skin/results", "/skin/openai-analizar", "/skin/openai-recomendaciones"):
        assert client.post(url, files={"file": ("a.jpg", jpeg, "image/jpeg")}).status_code in (404, 405)
