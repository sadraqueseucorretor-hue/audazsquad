from urllib.parse import quote
from dataclasses import asdict
from app.domain.entities import (
    Asset,
    Branding,
    Development,
    DomainError,
    Forbidden,
    NotFound,
    Role,
    User,
    new_id,
    now,
    require_admin,
    require_editor,
    require_permission,
)
from app.domain.permissions import allowed, effective_permissions
from app.domain.ports import (
    BrandingRepository,
    FileStorage,
    PasswordHasher,
    CatalogRepository,
    UserRepository,
)


class CatalogService:
    def __init__(self, repo: CatalogRepository, storage: FileStorage):
        self.repo, self.storage = repo, storage

    def list(self, user: User | None = None, administrative: bool = False):
        if administrative:
            if not user:
                raise Forbidden("Entre para acessar a administração.")
            if not (allowed(user, "catalog.edit") or allowed(user, "assets.manage")):
                raise Forbidden("Seu acesso não permite administrar empreendimentos.")
        return [
            self.present(p, user)
            for p in self.repo.developments()
            if p.published or administrative
        ]

    def get(self, development_id: str, user: User | None = None):
        p = self.repo.development(development_id)
        if not p or (
            not p.published
            and not (allowed(user, "catalog.edit") or allowed(user, "assets.manage"))
        ):
            raise NotFound("Empreendimento não encontrado.")
        return p

    def present(self, p: Development, user: User | None):
        result = asdict(p)
        result["assets"] = [
            {k: v for k, v in asdict(a).items() if k != "storage_key"}
            | {"url": f"/api/assets/{a.id}"}
            for a in self.repo.assets(p.id)
        ]
        return result

    def save(self, user: User, values: dict, development_id: str | None = None):
        require_editor(user)
        previous = self.get(development_id, user) if development_id else None
        p = Development(
            id=development_id or new_id(),
            **values,
            demo=previous.demo if previous else False,
        )
        p.validate()
        self.repo.save_development(p)
        self.repo.commit()
        return self.present(p, user)

    def attach(
        self,
        user: User,
        development_id: str,
        content: bytes,
        filename: str,
        kind: str,
    ):
        require_permission(user, "assets.manage")
        p = self.get(development_id, user)
        if (
            kind == "photo"
            and len([a for a in self.repo.assets(p.id) if a.kind == "photo"]) >= 15
        ):
            raise DomainError("Limite de 15 fotos por empreendimento.")
        key, mime = self.storage.put(content, kind)
        a = Asset(new_id(), p.id, kind, filename, key, mime, len(content), True)
        try:
            self.repo.save_asset(a)
            p.updated_at = now()
            self.repo.save_development(p)
            self.repo.commit()
        except Exception:
            self.storage.delete(key)
            raise
        return self.present(p, user)

    def remove_asset(self, user: User, asset_id: str):
        require_permission(user, "assets.manage")
        a = self.repo.asset(asset_id)
        if not a:
            raise NotFound("Arquivo não encontrado.")
        p = self.get(a.development_id, user)
        p.updated_at = now()
        self.repo.save_development(p)
        self.repo.delete_asset(a.id)
        self.repo.commit()
        self.storage.delete(a.storage_key)

    def readable_asset(self, asset_id: str, user: User | None):
        a = self.repo.asset(asset_id)
        if not a:
            raise NotFound("Arquivo não encontrado.")
        self.get(a.development_id, user)
        return a


class UserService:
    def __init__(self, repo: UserRepository, passwords: PasswordHasher):
        self.repo, self.passwords = repo, passwords

    def create(
        self,
        actor: User,
        name: str,
        email: str,
        password: str,
        role: str,
        permissions: list[str],
    ):
        require_admin(actor)
        self.check_grant(actor, role, permissions)
        if self.repo.user_by_email(email.lower()):
            raise DomainError("Este e-mail já está cadastrado.")
        user = User(
            new_id(),
            name,
            email.lower(),
            self.passwords.hash(password),
            role,
            permissions=permissions,
        )
        self.repo.save_user(user)
        self.repo.commit()
        return user

    def update(
        self,
        actor: User,
        user_id: str,
        name: str,
        role: str,
        active: bool,
        password: str | None,
        permissions: list[str],
    ):
        require_admin(actor)
        user = self.repo.user(user_id)
        if not user:
            raise NotFound("Usuário não encontrado.")
        self.check_grant(actor, role, permissions)
        if user.role == Role.ADMIN and actor.role != Role.ADMIN:
            raise Forbidden(
                "Somente um administrador pode alterar outro administrador."
            )
        if user.id == actor.id and (
            not active
            or role != user.role
            or (
                user.role != Role.ADMIN
                and set(permissions) != set(effective_permissions(user))
            )
        ):
            raise DomainError(
                "Você não pode remover ou alterar suas próprias permissões."
            )
        user.name, user.role, user.active, user.permissions = (
            name,
            role,
            active,
            permissions,
        )
        if password:
            user.password_hash = self.passwords.hash(password)
        self.repo.save_user(user)
        self.repo.commit()
        return user

    def check_grant(self, actor: User, role: str, permissions: list[str]):
        if actor.role != Role.ADMIN and (
            role == Role.ADMIN
            or not set(permissions).issubset(effective_permissions(actor))
        ):
            raise Forbidden("Você não pode conceder permissões superiores às suas.")


class BrandingService:
    def __init__(self, repo: BrandingRepository, storage: FileStorage):
        self.repo, self.storage = repo, storage

    def present(self):
        b = self.repo.branding()
        return {
            "logo_url": f"/api/branding/logo?v={quote(b.updated_at)}"
            if b.logo_key
            else None
        }

    def logo(self) -> Branding:
        b = self.repo.branding()
        if not b.logo_key:
            raise NotFound("Nenhuma logo cadastrada.")
        return b

    def set_logo(self, actor: User, content: bytes):
        require_admin(actor)
        previous = self.repo.branding().logo_key
        key, mime = self.storage.put(content, "logo")
        try:
            self.repo.save_branding(Branding(key, mime))
            self.repo.commit()
        except Exception:
            self.storage.delete(key)
            raise
        if previous:
            self.storage.delete(previous)
        return self.present()

    def remove_logo(self, actor: User):
        require_admin(actor)
        previous = self.repo.branding().logo_key
        self.repo.save_branding(Branding())
        self.repo.commit()
        if previous:
            self.storage.delete(previous)
        return self.present()
