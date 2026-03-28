from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ThemeORM
from schemas import ThemeCreate, ThemeOut, ThemeUpdate

router = APIRouter(prefix="/api/themes", tags=["themes"])


@router.get("")
def list_themes(db: Session = Depends(get_db)):
    themes = db.query(ThemeORM).order_by(ThemeORM.id).all()
    return [ThemeOut.model_validate(t).model_dump(by_alias=True) for t in themes]


@router.post("", status_code=201)
def create_theme(body: ThemeCreate, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    theme = ThemeORM(
        name=body.name,
        icon=body.icon,
        description=body.description,
        created_at=now,
        updated_at=now,
    )
    db.add(theme)
    db.commit()
    db.refresh(theme)
    return ThemeOut.model_validate(theme).model_dump(by_alias=True)


@router.put("/{theme_id}")
def update_theme(theme_id: int, body: ThemeUpdate, db: Session = Depends(get_db)):
    theme = db.query(ThemeORM).filter(ThemeORM.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(theme, field, value)
    theme.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(theme)
    return ThemeOut.model_validate(theme).model_dump(by_alias=True)


@router.delete("/{theme_id}")
def delete_theme(theme_id: int, db: Session = Depends(get_db)):
    theme = db.query(ThemeORM).filter(ThemeORM.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    db.delete(theme)
    db.commit()
    return {"ok": True}
