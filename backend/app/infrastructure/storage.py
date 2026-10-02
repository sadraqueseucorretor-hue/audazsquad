from io import BytesIO
from pathlib import Path
from uuid import uuid4
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader
from app.domain.entities import DomainError


class LocalFileStorage:
    def __init__(self, root: str, max_bytes: int):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes

    def put(self, content: bytes, kind: str):
        if not content or len(content) > self.max_bytes:
            raise DomainError("Arquivo vazio ou maior que o limite permitido.")
        if kind in ("photo", "logo"):
            try:
                with Image.open(BytesIO(content)) as source:
                    if (
                        source.format not in ("JPEG", "PNG", "WEBP")
                        or source.width * source.height > 25_000_000
                    ):
                        raise DomainError(
                            "Envie uma imagem JPG, PNG ou WebP com até 25 megapixels."
                        )
                    img = ImageOps.exif_transpose(source)
                    buf = BytesIO()
                    if kind == "logo":
                        # Logos keep transparency, so they are normalized as PNG.
                        img = img.convert("RGBA")
                        img.thumbnail((1200, 1200))
                        img.save(buf, format="PNG", optimize=True)
                        ext, mime = ".png", "image/png"
                    else:
                        img = img.convert("RGB")
                        img.thumbnail((2000, 2000))
                        img.save(buf, format="JPEG", quality=85)
                        ext, mime = ".jpg", "image/jpeg"
                    content = buf.getvalue()
            except (
                UnidentifiedImageError,
                OSError,
                Image.DecompressionBombError,
                Image.DecompressionBombWarning,
            ) as exc:
                raise DomainError("A imagem enviada não é válida.") from exc
        else:
            try:
                if not content.startswith(b"%PDF-"):
                    raise ValueError("header")
                pdf = PdfReader(BytesIO(content))
                if pdf.is_encrypted or not len(pdf.pages):
                    raise ValueError("encrypted or empty")
            except Exception as exc:
                raise DomainError("Envie um PDF válido, sem senha.") from exc
            ext, mime = ".pdf", "application/pdf"
        key = uuid4().hex + ext
        (self.root / key).write_bytes(content)
        return key, mime

    def path(self, key: str):
        path = (self.root / key).resolve()
        if path.parent != self.root:
            raise DomainError("Caminho inválido.")
        return path

    def delete(self, key: str):
        self.path(key).unlink(missing_ok=True)
