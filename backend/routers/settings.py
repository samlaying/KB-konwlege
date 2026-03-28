from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import SettingsORM
from schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _ensure_settings(db: Session) -> SettingsORM:
    settings = db.query(SettingsORM).filter(SettingsORM.id == 1).first()
    if not settings:
        settings = SettingsORM(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    s = _ensure_settings(db)
    return SettingsOut.model_validate(s).model_dump(by_alias=True)


@router.put("")
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    settings = _ensure_settings(db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return SettingsOut.model_validate(settings).model_dump(by_alias=True)
