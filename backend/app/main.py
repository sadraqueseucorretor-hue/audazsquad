from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from app.domain.entities import DomainError, Forbidden, NotFound
from app.infrastructure.config import settings
from app.presentation.api import router

app = FastAPI(
    title="AUDAZ SQUAD API",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.include_router(router)


@app.middleware("http")
async def request_protection(request: Request, call_next):
    # API is served on the same origin by Next.js / the reverse proxy.
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin and origin not in settings().allowed_origins.split(","):
            return JSONResponse({"detail": "Origem não autorizada."}, status_code=403)
        try:
            if (
                int(request.headers.get("content-length", "0"))
                > (settings().max_upload_mb + 1) * 1024 * 1024
            ):
                return JSONResponse(
                    {"detail": "Arquivo excede o limite permitido."}, status_code=413
                )
        except ValueError:
            return JSONResponse({"detail": "Tamanho inválido."}, status_code=400)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "private, no-store")
    return response


@app.exception_handler(DomainError)
async def domain_error(request: Request, exc: DomainError):
    code = (
        403 if isinstance(exc, Forbidden) else 404 if isinstance(exc, NotFound) else 400
    )
    return JSONResponse({"detail": str(exc)}, status_code=code)


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    return JSONResponse(
        {"detail": "O cadastro entra em conflito com um registro existente."},
        status_code=409,
    )
