import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from openai import OpenAI
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from config import SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL, DEFAULT_LLM_MODEL
from database import get_db
from models import ConversationORM, MessageORM

router = APIRouter(prefix="/api", tags=["chat"])


@router.get("/chat")
async def stream_chat(
    themeId: int = Query(..., alias="themeId"),
    question: str = Query(...),
    conversationId: Optional[int] = Query(None, alias="conversationId"),
    settings: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """SSE streaming chat endpoint. Returns events: start, delta, sources, done."""

    async def event_generator():
        parsed_settings = {}
        if settings:
            try:
                parsed_settings = json.loads(settings)
            except json.JSONDecodeError:
                pass

        now = datetime.now(timezone.utc).isoformat()

        # Find or create conversation
        conv = None
        if conversationId:
            conv = db.query(ConversationORM).filter(ConversationORM.id == conversationId).first()

        if not conv:
            conv = ConversationORM(
                theme_id=themeId,
                title=question[:50],
                llm_model=parsed_settings.get("llmModel", "deepseek"),
                message_count=0,
                created_at=now,
                updated_at=now,
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)

        # Save user message
        user_msg = MessageORM(
            conversation_id=conv.id,
            role="user",
            content=question,
            timestamp=now,
        )
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # Send start event
        yield {
            "event": "start",
            "data": json.dumps({
                "conversationId": conv.id,
                "messageId": user_msg.id + 1,
            }),
        }

        # Call LLM API with streaming
        full_text = ""
        try:
            client = OpenAI(
                api_key=SILICONFLOW_API_KEY,
                base_url=SILICONFLOW_BASE_URL,
            )

            # Build message history
            history_msgs = []
            for msg in conv.messages:
                history_msgs.append({"role": msg.role, "content": msg.content})
            history_msgs.append({"role": "user", "content": question})

            temperature = parsed_settings.get("temperature", 0.7)

            stream = client.chat.completions.create(
                model=DEFAULT_LLM_MODEL,
                messages=history_msgs,
                stream=True,
                temperature=temperature,
            )

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta_text = chunk.choices[0].delta.content
                    full_text += delta_text
                    yield {
                        "event": "delta",
                        "data": json.dumps({"delta": delta_text}),
                    }

        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"message": f"LLM API error: {str(e)}"}),
            }
            return

        # Send sources (placeholder for RAG integration)
        sources = []
        yield {
            "event": "sources",
            "data": json.dumps({"sources": sources}),
        }

        # Save assistant message
        now_done = datetime.now(timezone.utc).isoformat()
        assistant_msg = MessageORM(
            conversation_id=conv.id,
            role="assistant",
            content=full_text,
            sources=json.dumps(sources),
            timestamp=now_done,
        )
        db.add(assistant_msg)

        conv.message_count = (conv.message_count or 0) + 2
        conv.last_message_at = now_done
        conv.updated_at = now_done
        db.commit()
        db.refresh(assistant_msg)

        # Send done event
        yield {
            "event": "done",
            "data": json.dumps({
                "messageId": assistant_msg.id,
                "finishedAt": now_done,
            }),
        }

    return EventSourceResponse(event_generator())
