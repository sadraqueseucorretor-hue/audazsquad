"""Initial schema: users, developments, assets, sessions and login attempts."""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False),
        sa.Column("permissions", sa.JSON, nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "developments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("data", sa.JSON, nullable=False),
    )
    op.create_table(
        "assets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "development_id",
            sa.String(36),
            sa.ForeignKey("developments.id"),
            nullable=False,
        ),
        sa.Column("data", sa.JSON, nullable=False),
    )
    op.create_index("ix_assets_development_id", "assets", ["development_id"])
    op.create_table(
        "sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("csrf", sa.String(100), nullable=False),
        sa.Column("expires_at", sa.Float, nullable=False),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_table(
        "login_attempts",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("count", sa.Integer, nullable=False),
        sa.Column("started_at", sa.Float, nullable=False),
    )


def downgrade():
    for table in ["login_attempts", "sessions", "assets", "developments", "users"]:
        op.drop_table(table)
