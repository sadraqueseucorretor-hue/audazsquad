from dataclasses import asdict
from pathlib import Path
from sqlalchemy import JSON, Boolean, Float, ForeignKey, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from app.domain.entities import Asset, Development, User
from .config import settings


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(Boolean)
    permissions: Mapped[list] = mapped_column(JSON, default=list)


class DevelopmentRow(Base):
    __tablename__ = "developments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class AssetRow(Base):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    development_id: Mapped[str] = mapped_column(
        ForeignKey("developments.id"), index=True
    )
    data: Mapped[dict] = mapped_column(JSON)


class SessionRow(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    csrf: Mapped[str] = mapped_column(String(100))
    expires_at: Mapped[float] = mapped_column(Float)


class AttemptRow(Base):
    __tablename__ = "login_attempts"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int]
    started_at: Mapped[float] = mapped_column(Float)


cfg = settings()
if cfg.database_url.startswith("sqlite:///"):
    Path(cfg.database_url.removeprefix("sqlite:///")).parent.mkdir(
        parents=True, exist_ok=True
    )
engine = create_engine(
    cfg.database_url,
    connect_args={"check_same_thread": False}
    if cfg.database_url.startswith("sqlite")
    else {},
    pool_pre_ping=True,
)
SessionFactory = sessionmaker(engine, expire_on_commit=False)


class SQLRepository:
    def __init__(self, db):
        self.db = db

    def users(self):
        return [
            self._user(r)
            for r in self.db.scalars(select(UserRow).order_by(UserRow.name))
        ]

    def _user(self, r):
        return (
            User(
                r.id, r.name, r.email, r.password_hash, r.role, r.active, r.permissions
            )
            if r
            else None
        )

    def user(self, user_id):
        return self._user(self.db.get(UserRow, user_id))

    def user_by_email(self, email):
        return self._user(
            self.db.scalar(select(UserRow).where(UserRow.email == email.lower()))
        )

    def save_user(self, user):
        self.db.merge(UserRow(**asdict(user)))

    def developments(self):
        return sorted(
            [Development(**r.data) for r in self.db.scalars(select(DevelopmentRow))],
            key=lambda p: p.updated_at,
            reverse=True,
        )

    def development(self, development_id):
        r = self.db.get(DevelopmentRow, development_id)
        return Development(**r.data) if r else None

    def save_development(self, development):
        self.db.merge(DevelopmentRow(id=development.id, data=asdict(development)))
        self.db.flush()

    def assets(self, development_id):
        return sorted(
            [
                Asset(**r.data)
                for r in self.db.scalars(
                    select(AssetRow).where(AssetRow.development_id == development_id)
                )
            ],
            key=lambda a: (a.updated_at, a.id),
        )

    def asset(self, asset_id):
        r = self.db.get(AssetRow, asset_id)
        return Asset(**r.data) if r else None

    def save_asset(self, asset):
        self.db.merge(
            AssetRow(
                id=asset.id, development_id=asset.development_id, data=asdict(asset)
            )
        )

    def delete_asset(self, asset_id):
        r = self.db.get(AssetRow, asset_id)
        if r:
            self.db.delete(r)

    def commit(self):
        self.db.commit()
