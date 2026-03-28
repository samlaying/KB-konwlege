from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


_orm_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ---- Themes ----

class ThemeCreate(BaseModel):
    name: str
    icon: str = "📚"
    description: str = ""


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None


class ThemeOut(BaseModel):
    model_config = _orm_config

    id: int
    name: str
    icon: str
    description: str
    document_count: int = Field(alias="documentCount")
    chunk_count: int = Field(alias="chunkCount")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


# ---- Documents ----

class DocumentByUrl(BaseModel):
    model_config = _orm_config

    theme_id: int = Field(alias="themeId")
    url: str
    title: Optional[str] = None


class DocumentByText(BaseModel):
    model_config = _orm_config

    theme_id: int = Field(alias="themeId")
    title: str
    content: str


class DocumentOut(BaseModel):
    model_config = _orm_config

    id: int
    theme_id: int = Field(alias="themeId")
    filename: str
    file_type: str = Field(alias="fileType")
    file_path: str = Field(alias="filePath")
    chunk_count: int = Field(alias="chunkCount")
    status: str
    error_message: Optional[str] = Field(None, alias="errorMessage")
    created_at: str = Field(alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")


# ---- Messages ----

class SourceItem(BaseModel):
    model_config = _orm_config

    document_id: Optional[int] = Field(None, alias="documentId")
    document_name: str = Field(alias="documentName")
    page_number: Optional[int] = Field(None, alias="pageNumber")
    chunk_index: int = Field(0, alias="chunkIndex")
    snippet: Optional[str] = None


class MessageOut(BaseModel):
    model_config = _orm_config

    id: int
    conversation_id: Optional[int] = Field(None, alias="conversationId")
    role: str
    content: str
    sources: Optional[list[SourceItem]] = None
    timestamp: str


# ---- Conversations ----

class ConversationCreate(BaseModel):
    model_config = _orm_config

    theme_id: int = Field(alias="themeId")
    title: str
    llm_model: str = Field("deepseek", alias="llmModel")


class ConversationOut(BaseModel):
    model_config = _orm_config

    id: int
    theme_id: int = Field(alias="themeId")
    title: str
    messages: list[MessageOut] = []
    llm_model: str = Field(alias="llmModel")
    message_count: Optional[int] = Field(None, alias="messageCount")
    last_message_at: Optional[str] = Field(None, alias="lastMessageAt")
    created_at: str = Field(alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")


class ConversationListItem(BaseModel):
    model_config = _orm_config

    id: int
    theme_id: int = Field(alias="themeId")
    title: str
    llm_model: str = Field(alias="llmModel")
    message_count: Optional[int] = Field(None, alias="messageCount")
    last_message_at: Optional[str] = Field(None, alias="lastMessageAt")
    created_at: str = Field(alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")


# ---- Settings ----

class SettingsOut(BaseModel):
    model_config = _orm_config

    llm_model: str = Field(alias="llmModel")
    embedding_model: str = Field(alias="embeddingModel")
    top_k: int = Field(alias="topK")
    temperature: float


class SettingsUpdate(BaseModel):
    model_config = _orm_config

    llm_model: Optional[str] = Field(None, alias="llmModel")
    embedding_model: Optional[str] = Field(None, alias="embeddingModel")
    top_k: Optional[int] = Field(None, alias="topK")
    temperature: Optional[float] = None
