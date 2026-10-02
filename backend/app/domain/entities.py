from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid4())


class Role(StrEnum):
    ADMIN = "admin"
    MANAGER = "gerente"


class City(StrEnum):
    FORTALEZA = "Fortaleza"
    CAUCAIA = "Caucaia"
    MARACANAU = "Maracanaú"
    EUSEBIO = "Eusébio"


class DomainError(Exception):
    pass


class Forbidden(DomainError):
    pass


class NotFound(DomainError):
    pass


@dataclass
class User:
    id: str
    name: str
    email: str
    password_hash: str
    role: str
    active: bool = True
    permissions: list[str] = field(default_factory=list)


@dataclass
class Development:
    id: str
    name: str
    builder: str
    neighborhood: str
    city: str
    address: str
    price_cents: int
    typology: str
    bedrooms: int
    suites: int
    area_min: float
    area_max: float
    parking: int
    towers: int
    units: int
    delivery: str
    status: str
    description: str = ""
    published: bool = False
    demo: bool = False
    updated_at: str = field(default_factory=now)

    def validate(self):
        if self.city not in City:
            raise DomainError("Selecione uma cidade atendida.")
        if self.area_max < self.area_min or self.suites > self.bedrooms:
            raise DomainError("Confira a metragem e a quantidade de suítes.")
        if self.price_cents < 0:
            raise DomainError("O valor não pode ser negativo.")


@dataclass
class Asset:
    id: str
    development_id: str
    kind: str
    filename: str
    storage_key: str
    content_type: str
    size: int
    public: bool = True
    updated_at: str = field(default_factory=now)


def require_permission(user: User, permission: str):
    from .permissions import allowed

    if not allowed(user, permission):
        raise Forbidden("Seu acesso não permite esta ação.")


def require_editor(user: User):
    require_permission(user, "catalog.edit")


def require_admin(user: User):
    if user.role != Role.ADMIN or not user.active:
        raise Forbidden("Somente o administrador pode gerenciar acessos.")
