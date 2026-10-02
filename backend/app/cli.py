"""Explicit setup commands. Never creates a default password."""

import argparse
import getpass
import json
from pathlib import Path
from pydantic import TypeAdapter, EmailStr
from app.domain.entities import User, Role, Development, Asset, new_id
from app.infrastructure.database import SessionFactory, SQLRepository
from app.infrastructure.security import passwords
from app.infrastructure.storage import LocalFileStorage
from app.infrastructure.config import settings


def create_admin():
    name = input("Nome do administrador: ").strip()
    email = str(
        TypeAdapter(EmailStr).validate_python(input("E-mail: ").strip())
    ).lower()
    password = getpass.getpass("Senha (mínimo 12 caracteres): ")
    if len(name) < 2 or not 12 <= len(password) <= 128:
        raise SystemExit("Nome ou senha inválidos.")
    if password != getpass.getpass("Confirme a senha: "):
        raise SystemExit("As senhas não conferem.")
    with SessionFactory() as db:
        repo = SQLRepository(db)
        if repo.user_by_email(email):
            raise SystemExit("Este e-mail já existe.")
        repo.save_user(
            User(new_id(), name, email, passwords.hash(password), Role.ADMIN)
        )
        repo.commit()
    print("Administrador criado. Acesse /login no frontend.")


def seed_demo():
    source = Path(__file__).resolve().parents[1] / "seed"
    cfg = settings()
    storage = LocalFileStorage(cfg.storage_path, cfg.max_upload_mb * 1024 * 1024)
    with SessionFactory() as db:
        repo = SQLRepository(db)
        for data in json.loads((source / "developments.json").read_text()):
            files = data.pop("seed_files")
            if repo.development(data["id"]):
                continue
            p = Development(**data)
            repo.save_development(p)
            for f in files:
                file = source / f["file"]
                key, mime = storage.put(file.read_bytes(), f["kind"])
                repo.save_asset(
                    Asset(
                        new_id(),
                        p.id,
                        f["kind"],
                        file.name,
                        key,
                        mime,
                        file.stat().st_size,
                        True,
                    )
                )
            repo.commit()
    print("Seis empreendimentos demonstrativos carregados; nenhum usuário criado.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["create-admin", "seed-demo"])
    args = parser.parse_args()
    create_admin() if args.command == "create-admin" else seed_demo()
