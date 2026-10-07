"""Add producer brand and a database-enforced singleton administrator."""
from alembic import op
import sqlalchemy as sa

revision = "0005_admin_dashboard"
down_revision = "0004_trip_favorites"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    count = bind.execute(sa.text("SELECT count(*) FROM accounts WHERE role = 'admin'")).scalar_one()
    if count > 1:
        raise RuntimeError("Multiple admin accounts exist; resolve them before applying 0005_admin_dashboard")
    with op.get_context().autocommit_block():
        op.get_bind().exec_driver_sql("PRAGMA foreign_keys=OFF")
    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("brand", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("admin_slot", sa.String(length=16), nullable=True))
    bind.execute(sa.text("UPDATE accounts SET admin_slot = 'primary' WHERE role = 'admin'"))
    with op.batch_alter_table("accounts") as batch:
        batch.create_unique_constraint("uq_accounts_admin_slot", ["admin_slot"])
        batch.create_check_constraint("ck_accounts_admin_slot_role", "(role = 'admin' AND admin_slot = 'primary') OR (role != 'admin' AND admin_slot IS NULL)")
    with op.get_context().autocommit_block():
        op.get_bind().exec_driver_sql("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.get_bind().exec_driver_sql("PRAGMA foreign_keys=OFF")
    with op.batch_alter_table("accounts") as batch:
        batch.drop_constraint("ck_accounts_admin_slot_role", type_="check")
        batch.drop_constraint("uq_accounts_admin_slot", type_="unique")
        batch.drop_column("admin_slot")
        batch.drop_column("brand")
    with op.get_context().autocommit_block():
        op.get_bind().exec_driver_sql("PRAGMA foreign_keys=ON")
