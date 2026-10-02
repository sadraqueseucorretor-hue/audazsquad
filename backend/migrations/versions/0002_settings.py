"""Settings table for site-wide configuration such as the logo."""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "settings",
        sa.Column("key", sa.String(50), primary_key=True),
        sa.Column("data", sa.JSON, nullable=False),
    )


def downgrade():
    op.drop_table("settings")
