import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin
from app.models.enums import WarningType, WarningSeverity

if TYPE_CHECKING:
    from app.models.question import Question


class QuestionWarning(Base, TimestampMixin):
    __tablename__ = "question_warnings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    question_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    warning_type: Mapped[WarningType] = mapped_column(
        SQLEnum(WarningType, native_enum=False),
        nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[WarningSeverity] = mapped_column(
        SQLEnum(WarningSeverity, native_enum=False),
        default=WarningSeverity.MEDIUM,
        nullable=False
    )
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped["Question"] = relationship("Question", back_populates="warnings")
