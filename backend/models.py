from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship

from database import Base


def _now():
    return datetime.now(timezone.utc).isoformat()


class ThemeORM(Base):
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    icon = Column(String(16), nullable=False, default="📚")
    description = Column(Text, default="")
    document_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    created_at = Column(String, default=_now)
    updated_at = Column(String, default=_now, onupdate=_now)

    documents = relationship("DocumentORM", back_populates="theme", cascade="all, delete-orphan")
    conversations = relationship("ConversationORM", back_populates="theme", cascade="all, delete-orphan")


class DocumentORM(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    theme_id = Column(Integer, ForeignKey("themes.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(256), nullable=False)
    file_type = Column(String(16), nullable=False)
    file_path = Column(String(512), nullable=False)
    chunk_count = Column(Integer, default=0)
    status = Column(String(16), default="pending")  # pending | indexing | done | failed
    error_message = Column(Text, nullable=True)
    created_at = Column(String, default=_now)
    updated_at = Column(String, default=_now, onupdate=_now)

    theme = relationship("ThemeORM", back_populates="documents")


class ConversationORM(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    theme_id = Column(Integer, ForeignKey("themes.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(256), nullable=False)
    llm_model = Column(String(64), default="deepseek")
    message_count = Column(Integer, default=0)
    last_message_at = Column(String, nullable=True)
    created_at = Column(String, default=_now)
    updated_at = Column(String, default=_now, onupdate=_now)

    theme = relationship("ThemeORM", back_populates="conversations")
    messages = relationship("MessageORM", back_populates="conversation", cascade="all, delete-orphan")


class MessageORM(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(Text, nullable=True)  # JSON string
    timestamp = Column(String, default=_now)

    conversation = relationship("ConversationORM", back_populates="messages")


class SettingsORM(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    llm_model = Column(String(64), default="deepseek")
    embedding_model = Column(String(128), default="bge-large-zh-v1.5")
    top_k = Column(Integer, default=5)
    temperature = Column(Float, default=0.7)
