import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import DocumentORM
from schemas import DocumentByUrl, DocumentByText, DocumentOut

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("")
def list_documents(themeId: Optional[int] = Query(None, alias="themeId"), db: Session = Depends(get_db)):
    query = db.query(DocumentORM)
    if themeId is not None:
        query = query.filter(DocumentORM.theme_id == themeId)
    docs = query.order_by(DocumentORM.id).all()
    return [DocumentOut.model_validate(d).model_dump(by_alias=True) for d in docs]


@router.post("/upload", status_code=201)
async def upload_document(
    themeId: int = Form(..., alias="themeId"),
    file: UploadFile = None,
    db: Session = Depends(get_db),
):
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename or "unknown")[1].lower()
    file_type_map = {".pdf": "pdf", ".docx": "docx", ".md": "md", ".txt": "txt"}
    file_type = file_type_map.get(ext, "txt")

    saved_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOAD_DIR, saved_name)

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    now = datetime.now(timezone.utc).isoformat()
    doc = DocumentORM(
        theme_id=themeId,
        filename=file.filename or saved_name,
        file_type=file_type,
        file_path=f"/uploads/{saved_name}",
        chunk_count=0,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Simulate indexing completion
    doc.status = "done"
    doc.chunk_count = max(1, len(content) // 500)
    doc.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(doc)

    return DocumentOut.model_validate(doc).model_dump(by_alias=True)


@router.post("/url", status_code=201)
def create_document_by_url(body: DocumentByUrl, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    doc = DocumentORM(
        theme_id=body.theme_id,
        filename=body.title or body.url,
        file_type="url",
        file_path=body.url,
        chunk_count=0,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    doc.status = "done"
    doc.chunk_count = 5
    doc.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc).model_dump(by_alias=True)


@router.post("/text", status_code=201)
def create_document_by_text(body: DocumentByText, db: Session = Depends(get_db)):
    saved_name = f"{uuid.uuid4().hex}.txt"
    save_path = os.path.join(UPLOAD_DIR, saved_name)
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(body.content)

    now = datetime.now(timezone.utc).isoformat()
    doc = DocumentORM(
        theme_id=body.theme_id,
        filename=body.title,
        file_type="txt",
        file_path=f"/uploads/{saved_name}",
        chunk_count=0,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    doc.status = "done"
    doc.chunk_count = max(1, len(body.content) // 500)
    doc.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc).model_dump(by_alias=True)


@router.get("/{doc_id}/status")
def get_document_status(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentORM).filter(DocumentORM.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc).model_dump(by_alias=True)


@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentORM).filter(DocumentORM.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_path and doc.file_type != "url":
        file_name = os.path.basename(doc.file_path)
        abs_path = os.path.join(UPLOAD_DIR, file_name)
        if os.path.exists(abs_path):
            os.remove(abs_path)

    db.delete(doc)
    db.commit()
    return {"ok": True}
