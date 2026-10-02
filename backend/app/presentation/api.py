import secrets
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Annotated, Literal
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy import delete
from sqlalchemy.orm import Session as DatabaseSession
from app.application.services import CatalogService, UserService
from app.domain.entities import require_admin, User
from app.domain.permissions import effective_permissions
from app.infrastructure.config import settings
from app.infrastructure.database import SessionFactory, SQLRepository, SessionRow
from app.infrastructure.security import Authentication, digest, passwords
from app.infrastructure.storage import LocalFileStorage
from .schemas import DevelopmentInput, LoginInput, UserInput, UserUpdate

router = APIRouter(prefix="/api")


@dataclass
class RequestContext:
    db: DatabaseSession
    repo: SQLRepository
    auth: Authentication
    user: User | None
    session: SessionRow | None


def context(request: Request):
    cfg = settings()
    with SessionFactory() as db:
        repo = SQLRepository(db)
        auth = Authentication(db, repo, cfg.session_hours)
        user, session = auth.session(request.cookies.get("audaz_session"))
        yield RequestContext(db, repo, auth, user, session)


Context = Annotated[RequestContext, Depends(context)]


def authenticated(ctx):
    if not ctx.user:
        raise HTTPException(401, "Entre para continuar.")
    return ctx.user


def mutation(request: Request, ctx):
    user = authenticated(ctx)
    token = request.headers.get("x-csrf-token", "")
    if not secrets.compare_digest(token, ctx.session.csrf):
        raise HTTPException(
            403, "Sessão inválida. Atualize a página e tente novamente."
        )
    return user


def storage():
    cfg = settings()
    return LocalFileStorage(cfg.storage_path, cfg.max_upload_mb * 1024 * 1024)


def catalog(ctx):
    return CatalogService(ctx.repo, storage())


def public_user(user):
    return {k: v for k, v in asdict(user).items() if k != "password_hash"} | {
        "permissions": effective_permissions(user)
    }


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/auth/login")
def login(body: LoginInput, request: Request, response: Response, ctx: Context):
    result = ctx.auth.login(
        str(body.email),
        body.password,
        request.client.host if request.client else "unknown",
    )
    if not result:
        raise HTTPException(401, "E-mail ou senha inválidos.")
    user, token, csrf = result
    old_token = request.cookies.get("audaz_session")
    if old_token:
        ctx.db.execute(
            delete(SessionRow).where(SessionRow.token_hash == digest(old_token))
        )
        ctx.db.commit()
    response.set_cookie(
        "audaz_session",
        token,
        httponly=True,
        secure=settings().cookie_secure,
        samesite="lax",
        max_age=settings().session_hours * 3600,
        path="/",
    )
    return {"user": public_user(user), "csrf": csrf}


@router.get("/auth/me")
def me(ctx: Context):
    user = authenticated(ctx)
    return {"user": public_user(user), "csrf": ctx.session.csrf}


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, ctx: Context):
    mutation(request, ctx)
    ctx.db.delete(ctx.session)
    ctx.db.commit()
    response.delete_cookie(
        "audaz_session",
        path="/",
        secure=settings().cookie_secure,
        httponly=True,
        samesite="lax",
    )


@router.get("/developments")
def list_developments(ctx: Context):
    return catalog(ctx).list(ctx.user)


@router.get("/developments/{development_id}")
def get_development(development_id: str, ctx: Context):
    service = catalog(ctx)
    return service.present(service.get(development_id, ctx.user), ctx.user)


@router.get("/admin/developments")
def admin_developments(ctx: Context):
    return catalog(ctx).list(authenticated(ctx), administrative=True)


@router.post("/admin/developments", status_code=201)
def create_development(body: DevelopmentInput, request: Request, ctx: Context):
    return catalog(ctx).save(mutation(request, ctx), body.model_dump(mode="json"))


@router.put("/admin/developments/{development_id}")
def update_development(
    development_id: str, body: DevelopmentInput, request: Request, ctx: Context
):
    return catalog(ctx).save(
        mutation(request, ctx), body.model_dump(mode="json"), development_id
    )


@router.post("/admin/developments/{development_id}/assets", status_code=201)
async def upload(
    development_id: str,
    request: Request,
    ctx: Context,
    file: UploadFile = File(...),
    kind: Literal[
        "photo",
        "book",
        "tabela",
        "plantas",
        "implantacao",
        "memorial",
        "comerciais",
        "outros",
    ] = Form(...),
):
    user = mutation(request, ctx)
    limit = settings().max_upload_mb * 1024 * 1024
    content = await file.read(limit + 1)
    await file.close()
    if len(content) > limit:
        raise HTTPException(
            413, f"Limite de {settings().max_upload_mb} MB por arquivo."
        )
    filename = Path(file.filename or "arquivo").name[:160]
    return catalog(ctx).attach(user, development_id, content, filename, kind)


@router.delete("/admin/assets/{asset_id}", status_code=204)
def delete_asset(asset_id: str, request: Request, ctx: Context):
    catalog(ctx).remove_asset(mutation(request, ctx), asset_id)


@router.get("/assets/{asset_id}")
def download_asset(asset_id: str, ctx: Context):
    asset = catalog(ctx).readable_asset(asset_id, ctx.user)
    path = storage().path(asset.storage_key)
    if not path.is_file():
        raise HTTPException(404, "Arquivo indisponível.")
    # Documents download rather than executing active PDF content inside our origin.
    return FileResponse(
        path,
        media_type=asset.content_type,
        filename=asset.filename,
        content_disposition_type="inline" if asset.kind == "photo" else "attachment",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/admin/users")
def list_users(ctx: Context):
    require_admin(authenticated(ctx))
    return [public_user(u) for u in ctx.repo.users()]


@router.post("/admin/users", status_code=201)
def create_user(body: UserInput, request: Request, ctx: Context):
    user = UserService(ctx.repo, passwords).create(
        mutation(request, ctx), **body.model_dump(mode="json")
    )
    return public_user(user)


@router.put("/admin/users/{user_id}")
def update_user(user_id: str, body: UserUpdate, request: Request, ctx: Context):
    user = UserService(ctx.repo, passwords).update(
        mutation(request, ctx), user_id, **body.model_dump(mode="json")
    )
    # Role, status and password changes revoke old sessions immediately.
    ctx.db.execute(delete(SessionRow).where(SessionRow.user_id == user_id))
    ctx.db.commit()
    return public_user(user)
