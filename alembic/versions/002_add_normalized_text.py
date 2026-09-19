"""add normalized_text to document_pages

Revision ID: 002_add_normalized_text
Revises: 001_initial_schema
Create Date: 2026-09-19 14:03:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_add_normalized_text'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('document_pages', sa.Column('normalized_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('document_pages', 'normalized_text')
