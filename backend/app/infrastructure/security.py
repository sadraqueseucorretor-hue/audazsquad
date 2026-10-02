import hashlib
import secrets
import time
from pwdlib import PasswordHash
from sqlalchemy import delete
from app.domain.entities import DomainError
from .database import AttemptRow, SessionRow

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("dummy-password-not-used-for-any-account")


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


class Authentication:
    def __init__(self, db, repository, session_hours: int):
        self.db, self.repo, self.hours = db, repository, session_hours

    def login(self, email: str, password: str, peer: str):
        # Both account and source budgets persist across process restarts/workers.
        keys = [digest("email:" + email.lower()), digest("peer:" + peer)]
        current = time.time()
        attempts = []
        for key in keys:
            r = self.db.get(AttemptRow, key)
            if not r:
                r = AttemptRow(key=key, count=0, started_at=current)
                self.db.add(r)
            if current - r.started_at > 900:
                r.count, r.started_at = 0, current
            if r.count >= 10:
                raise DomainError(
                    "Muitas tentativas. Aguarde 15 minutos e tente novamente."
                )
            attempts.append(r)
        user = self.repo.user_by_email(email)
        valid = passwords.verify(password, user.password_hash if user else DUMMY_HASH)
        if not valid or not user or not user.active:
            for r in attempts:
                r.count += 1
            self.db.commit()
            return None
        for r in attempts:
            r.count = 0
        self.db.execute(delete(SessionRow).where(SessionRow.expires_at < current))
        token, csrf = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
        self.db.add(
            SessionRow(
                token_hash=digest(token),
                user_id=user.id,
                csrf=csrf,
                expires_at=current + self.hours * 3600,
            )
        )
        self.db.commit()
        return user, token, csrf

    def session(self, token: str | None):
        if not token:
            return None, None
        row = self.db.get(SessionRow, digest(token))
        if not row or row.expires_at <= time.time():
            return None, None
        user = self.repo.user(row.user_id)
        return (user, row) if user and user.active else (None, None)
