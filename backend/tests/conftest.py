import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + tempfile.mkdtemp() + "/test.db"
os.environ["STORAGE_PATH"] = tempfile.mkdtemp()
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import Base, engine, SessionFactory, SQLRepository
from app.infrastructure.security import passwords
from app.domain.entities import User, Role


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionFactory() as db:
        repo = SQLRepository(db)
        repo.save_user(
            User(
                "admin-id",
                "Administrador",
                "admin@example.com",
                passwords.hash("test-password-123"),
                Role.ADMIN,
            )
        )
        repo.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


@pytest.fixture
def admin(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "test-password-123"},
    )
    assert r.status_code == 200
    return {"X-CSRF-Token": r.json()["csrf"]}


@pytest.fixture
def property_data():
    return {
        "name": "Teste Fortaleza",
        "builder": "Construtora Teste",
        "neighborhood": "Passaré",
        "city": "Fortaleza",
        "address": "Rua de Teste, 100",
        "price_cents": 25900000,
        "typology": "2 quartos",
        "bedrooms": 2,
        "suites": 1,
        "area_min": 45,
        "area_max": 52,
        "parking": 1,
        "towers": 2,
        "units": 100,
        "delivery": "2028",
        "status": "Em obras",
        "published": True,
    }
