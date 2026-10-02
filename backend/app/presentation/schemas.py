from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.domain.entities import City, Role
from app.domain.permissions import Permission


class DevelopmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120)
    builder: str = Field(min_length=2, max_length=120)
    neighborhood: str = Field(min_length=2, max_length=120)
    city: City
    address: str = Field(min_length=3, max_length=300)
    price_cents: int = Field(ge=0, le=100_000_000_000)
    typology: str = Field(min_length=2, max_length=120)
    bedrooms: int = Field(ge=0, le=30)
    suites: int = Field(ge=0, le=30)
    area_min: float = Field(gt=0, le=100_000, allow_inf_nan=False)
    area_max: float = Field(gt=0, le=100_000, allow_inf_nan=False)
    parking: int = Field(ge=0, le=100)
    towers: int = Field(ge=1, le=1000)
    units: int = Field(ge=1, le=100_000)
    delivery: str = Field(min_length=2, max_length=80)
    status: Literal["Lançamento", "Em obras", "Pronto para morar"]
    description: str = Field(default="", max_length=5000)
    published: bool = False


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: Role
    permissions: list[Permission] = Field(default_factory=list)


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120)
    role: Role
    permissions: list[Permission] = Field(default_factory=list)
    active: bool
    password: str | None = Field(default=None, min_length=12, max_length=128)
