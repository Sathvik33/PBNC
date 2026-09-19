import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import DocumentRelationshipType

if TYPE_CHECKING:
    from app.models.document import Document


class DocumentRelationship(Base):
    __tablename__ = "document_relationships"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    related_document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    relationship_type: Mapped[DocumentRelationshipType] = mapped_column(
        SQLEnum(DocumentRelationshipType, native_enum=False),
        nullable=False
    )

    document: Mapped["Document"] = relationship(
        "Document",
        foreign_keys=[document_id],
        back_populates="relationships"
    )
