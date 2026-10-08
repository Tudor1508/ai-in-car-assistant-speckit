"""merge migration heads

Revision ID: 46e7fdda02e3
Revises: 0006_trip_history, 0008_vehicle_image_upload
Create Date: 2026-10-08 12:22:21.889247
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = '46e7fdda02e3'
down_revision: Union[str, None] = ('0006_trip_history', '0008_vehicle_image_upload')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
