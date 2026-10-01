"""Establish the empty foundation baseline.

Revision ID: 0001_foundation
Revises:
"""

revision = "0001_foundation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Alembic's version table is the only schema object in this feature.
    pass


def downgrade() -> None:
    pass
