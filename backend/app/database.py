from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tag_diary.db")

# Convert postgresql:// to postgresql+psycopg:// for psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)

# Ensure the database directory exists for SQLite
if "sqlite" in DATABASE_URL:
    # Extract the file path from the SQLite URL
    if DATABASE_URL.startswith("sqlite:///"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        db_dir = Path(db_path).parent
        if db_dir and str(db_dir) not in [".", ""]:
            try:
                db_dir.mkdir(parents=True, exist_ok=True)
                print(f"[DATABASE] Ensured directory exists: {db_dir}")
            except PermissionError:
                print(f"[DATABASE] Warning: Cannot create directory {db_dir}, using current directory")
                # Fall back to current directory
                DATABASE_URL = "sqlite:///./tag_diary.db"

# Create engine with appropriate settings for SQLite or PostgreSQL
if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL - no special connect_args needed
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)

