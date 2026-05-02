from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional
from datetime import datetime
import os
import sys

class Patient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    age: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ScanRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patient.id")
    scan_date: datetime = Field(default_factory=datetime.utcnow)
    eye_type: str  # RETINA, ANTERIOR
    diagnosis: str
    confidence: float
    risk_score: float

# SQLite database — use persistent directory when running from frozen bundle
if getattr(sys, 'frozen', False):
    # Packaged app: store DB in user's Application Support directory
    if sys.platform == 'darwin':
        _data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'OcuSight AI')
    elif sys.platform == 'win32':
        _data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'OcuSight AI')
    else:
        _data_dir = os.path.join(os.path.expanduser('~'), '.ocusight-ai')
    os.makedirs(_data_dir, exist_ok=True)
    sqlite_file_name = os.path.join(_data_dir, "patients.db")
else:
    sqlite_file_name = "patients.db"

sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
