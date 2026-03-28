import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ConversationORM, MessageORM
from schemas import ConversationCreate, ConversationOut, ConversationListItem, MessageOut

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def _message_to_dict(msg: MessageORM) -> dict:
    sources = None
    if msg.sources:
        try:
            sources = json.loads(msg.sources)
        except (json.JSONDecodeError, TypeError):
            sources = None
    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        role=msg.role,
        content=msg.content,
        sources=sources,
        timestamp=msg.timestamp,
    ).model_dump(by_alias=True)


def _conv_to_dict(conv: ConversationORM, include_messages: bool = True) -> dict:
    messages = [_message_to_dict(m) for m in conv.messages] if include_messages else []
    return ConversationOut(
        id=conv.id,
        theme_id=conv.theme_id,
        title=conv.title,
        messages=messages,
        llm_model=conv.llm_model,
        message_count=conv.message_count,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    ).model_dump(by_alias=True)


@router.get("")
def list_conversations(db: Session = Depends(get_db)):
    convs = db.query(ConversationORM).order_by(ConversationORM.id.desc()).all()
    result = []
    for c in convs:
        result.append(ConversationListItem(
            id=c.id,
            theme_id=c.theme_id,
            title=c.title,
            llm_model=c.llm_model,
            message_count=c.message_count,
            last_message_at=c.last_message_at,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ).model_dump(by_alias=True))
    return result


@router.get("/{conv_id}")
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    conv = db.query(ConversationORM).filter(ConversationORM.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _conv_to_dict(conv)


@router.post("", status_code=201)
def create_conversation(body: ConversationCreate, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    conv = ConversationORM(
        theme_id=body.theme_id,
        title=body.title,
        llm_model=body.llm_model,
        message_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return _conv_to_dict(conv)


@router.delete("/{conv_id}")
def delete_conversation(conv_id: int, db: Session = Depends(get_db)):
    conv = db.query(ConversationORM).filter(ConversationORM.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"ok": True}
