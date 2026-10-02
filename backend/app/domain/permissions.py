from enum import StrEnum


class Permission(StrEnum):
    CATALOG_EDIT = "catalog.edit"
    ASSETS_MANAGE = "assets.manage"
    USERS_MANAGE = "users.manage"


def effective_permissions(user) -> list[str]:
    if not user or not user.active:
        return []
    return list(Permission) if user.role == "admin" else list(user.permissions)


def allowed(user, permission: str) -> bool:
    return permission in effective_permissions(user)
