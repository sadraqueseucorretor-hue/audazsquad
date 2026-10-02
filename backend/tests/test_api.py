from io import BytesIO
from PIL import Image
from pypdf import PdfWriter
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionFactory, SQLRepository


def create(client, admin, data):
    r = client.post("/api/admin/developments", json=data, headers=admin)
    assert r.status_code == 201, r.text
    return r.json()


def pdf():
    out = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=400, height=400)
    writer.write(out)
    return out.getvalue()


def test_public_catalog_and_auth(client, admin, property_data):
    p = create(client, admin, property_data)
    anon = TestClient(app)
    assert anon.get("/api/developments").json()[0]["price_cents"] == 25900000
    assert anon.get("/api/admin/users").status_code == 401
    assert anon.post("/api/admin/developments", json=property_data).status_code == 401
    assert client.post("/api/admin/developments", json=property_data).status_code == 403
    assert client.get("/api/developments/missing").status_code == 404
    assert "password_hash" not in client.get("/api/auth/me").text
    with SessionFactory() as db:
        assert SQLRepository(db).development(p["id"]).name == "Teste Fortaleza"


def test_draft_and_document_access(client, admin, property_data):
    p = create(client, admin, property_data | {"published": False})
    uploaded = client.post(
        f"/api/admin/developments/{p['id']}/assets",
        headers=admin,
        data={"kind": "book", "public": "false"},
        files={"file": ("book.pdf", pdf(), "application/pdf")},
    )
    assert uploaded.status_code == 201, uploaded.text
    asset = uploaded.json()["assets"][0]
    anon = TestClient(app)
    assert anon.get("/api/developments").json() == []
    assert anon.get(f"/api/developments/{p['id']}").status_code == 404
    assert anon.get(asset["url"]).status_code == 404
    client.put(f"/api/admin/developments/{p['id']}", headers=admin, json=property_data)
    assert len(anon.get(f"/api/developments/{p['id']}").json()["assets"]) == 1
    assert anon.get(asset["url"]).status_code == 200
    assert client.get(asset["url"]).status_code == 200


def test_permissions_are_explicit_and_sessions_revoked(client, admin, property_data):
    user = client.post(
        "/api/admin/users",
        headers=admin,
        json={
            "name": "Diretor sem permissões",
            "email": "diretor@example.com",
            "password": "director-password-123",
            "role": "gerente",
            "permissions": [],
        },
    ).json()
    other = TestClient(app)
    login = other.post(
        "/api/auth/login",
        json={"email": user["email"], "password": "director-password-123"},
    ).json()
    assert other.get("/api/admin/users").status_code == 403
    assert (
        other.post(
            "/api/admin/developments",
            headers={"X-CSRF-Token": login["csrf"]},
            json=property_data,
        ).status_code
        == 403
    )
    r = client.put(
        f"/api/admin/users/{user['id']}",
        headers=admin,
        json={
            "name": user["name"],
            "role": "gerente",
            "active": True,
            "permissions": ["assets.manage"],
        },
    )
    assert r.status_code == 200
    assert other.get("/api/auth/me").status_code == 401


def test_editor_permission_does_not_grant_uploads_or_users(
    client, admin, property_data
):
    client.post(
        "/api/admin/users",
        headers=admin,
        json={
            "name": "Gerente",
            "email": "gerente@example.com",
            "password": "manager-password-123",
            "role": "gerente",
            "permissions": ["catalog.edit"],
        },
    )
    other = TestClient(app)
    login = other.post(
        "/api/auth/login",
        json={"email": "gerente@example.com", "password": "manager-password-123"},
    ).json()
    headers = {"X-CSRF-Token": login["csrf"]}
    p = create(other, headers, property_data)
    assert (
        other.post(
            f"/api/admin/developments/{p['id']}/assets",
            headers=headers,
            data={"kind": "book"},
            files={"file": ("x.pdf", pdf(), "application/pdf")},
        ).status_code
        == 403
    )
    assert other.get("/api/admin/users").status_code == 403


def test_upload_validation_public_photos_and_deletion(client, admin, property_data):
    p = create(client, admin, property_data)
    path = f"/api/admin/developments/{p['id']}/assets"
    assert (
        client.post(
            path,
            headers=admin,
            data={"kind": "book"},
            files={"file": ("bad.pdf", b"not pdf", "application/pdf")},
        ).status_code
        == 400
    )
    assert (
        client.post(
            path,
            headers=admin,
            data={"kind": "photo"},
            files={"file": ("bad.jpg", b"<script/>", "image/jpeg")},
        ).status_code
        == 400
    )
    image = BytesIO()
    Image.new("RGB", (40, 40)).save(image, format="PNG")
    r = client.post(
        path,
        headers=admin,
        data={"kind": "photo"},
        files={"file": ("photo.png", image.getvalue(), "image/png")},
    )
    assert r.status_code == 201, r.text
    a = r.json()["assets"][0]
    assert "storage_key" not in a
    anon = TestClient(app)
    assert anon.get(a["url"]).status_code == 200
    assert anon.get(a["url"]).headers["content-type"] == "image/jpeg"
    assert (
        client.delete(f"/api/admin/assets/{a['id']}", headers=admin).status_code == 204
    )
    assert anon.get(a["url"]).status_code == 404


def test_cross_origin_and_invalid_domain_fields(client, admin, property_data):
    assert (
        client.post(
            "/api/auth/login",
            headers={"Origin": "https://evil.example"},
            json={"email": "admin@example.com", "password": "test-password-123"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/admin/developments",
            headers=admin,
            json=property_data | {"city": "Recife"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/admin/developments",
            headers=admin,
            json=property_data | {"area_max": 40},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/admin/developments", headers=admin, json=property_data | {"suites": 3}
        ).status_code
        == 400
    )


def test_session_logout_and_cookie_flags(client, admin):
    r = client.post("/api/auth/logout", headers=admin)
    assert r.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_disabled_account_and_login_budget(client, admin):
    r = client.post(
        "/api/admin/users",
        headers=admin,
        json={
            "name": "Inativo",
            "email": "inactive@example.com",
            "password": "inactive-password-123",
            "role": "gerente",
            "permissions": [],
        },
    )
    user = r.json()
    client.put(
        f"/api/admin/users/{user['id']}",
        headers=admin,
        json={
            "name": user["name"],
            "role": "gerente",
            "active": False,
            "permissions": [],
        },
    )
    assert (
        TestClient(app)
        .post(
            "/api/auth/login",
            json={"email": user["email"], "password": "inactive-password-123"},
        )
        .status_code
        == 401
    )
    other = TestClient(app)
    for _ in range(9):
        other.post(
            "/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"}
        )
    assert (
        other.post(
            "/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"}
        ).status_code
        == 400
    )
