from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os
import shutil
import uuid
from pathlib import Path

from app.database import get_db, init_db
from app import models, schemas
from app.auth import (
    get_current_user,
    get_password_hash,
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

app = FastAPI(title="TAG Diary Website API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directories
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "photos").mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)
(UPLOAD_DIR / "files").mkdir(exist_ok=True)
(UPLOAD_DIR / "documents").mkdir(exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def startup_event():
    init_db()


# Authentication routes
@app.post("/api/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/auth/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": schemas.User.model_validate(user)}


@app.get("/api/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# Vignettes routes
@app.post("/api/vignettes", response_model=schemas.Vignette)
def create_vignette(
    vignette: schemas.VignetteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_vignette = models.Vignette(
        title=vignette.title,
        content=vignette.content,
        author_id=current_user.id,
    )
    db.add(db_vignette)
    db.commit()
    db.refresh(db_vignette)
    
    # Add photos if provided
    if vignette.photo_ids:
        for idx, photo_id in enumerate(vignette.photo_ids):
            db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
            if db_photo and db_photo.uploaded_by_id == current_user.id:
                vignette_photo = models.VignettePhoto(
                    vignette_id=db_vignette.id,
                    photo_id=photo_id,
                    position=idx,
                )
                db.add(vignette_photo)
    
    db.commit()
    return db_vignette


@app.get("/api/vignettes", response_model=List[schemas.Vignette])
def get_vignettes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vignettes = db.query(models.Vignette).filter(
        models.Vignette.author_id == current_user.id
    ).order_by(models.Vignette.created_at.desc()).all()
    return vignettes


@app.get("/api/vignettes/{vignette_id}", response_model=schemas.Vignette)
def get_vignette(
    vignette_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id,
        models.Vignette.author_id == current_user.id
    ).first()
    if not vignette:
        raise HTTPException(status_code=404, detail="Vignette not found")
    return vignette


@app.put("/api/vignettes/{vignette_id}", response_model=schemas.Vignette)
def update_vignette(
    vignette_id: int,
    vignette: schemas.VignetteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id,
        models.Vignette.author_id == current_user.id
    ).first()
    if not db_vignette:
        raise HTTPException(status_code=404, detail="Vignette not found")
    
    db_vignette.title = vignette.title
    db_vignette.content = vignette.content
    db.commit()
    db.refresh(db_vignette)
    return db_vignette


@app.delete("/api/vignettes/{vignette_id}")
def delete_vignette(
    vignette_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id,
        models.Vignette.author_id == current_user.id
    ).first()
    if not vignette:
        raise HTTPException(status_code=404, detail="Vignette not found")
    db.delete(vignette)
    db.commit()
    return {"message": "Vignette deleted"}


# Photo routes
@app.post("/api/photos", response_model=schemas.Photo)
def upload_photo(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Save file
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / "photos" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create database record
    db_photo = models.Photo(
        filename=unique_filename,
        file_path=str(file_path),
        title=title or file.filename,
        description=description,
        uploaded_by_id=current_user.id,
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo


@app.get("/api/photos", response_model=List[schemas.Photo])
def get_photos(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    photos = db.query(models.Photo).filter(
        models.Photo.uploaded_by_id == current_user.id
    ).order_by(models.Photo.created_at.desc()).offset(skip).limit(limit).all()
    return photos


@app.get("/api/photos/{photo_id}")
def get_photo_file(
    photo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.uploaded_by_id == current_user.id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(photo.file_path)


# Album routes
@app.post("/api/albums", response_model=schemas.Album)
def create_album(
    album: schemas.AlbumCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_album = models.Album(
        name=album.name,
        description=album.description,
        created_by_id=current_user.id,
    )
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    
    if album.photo_ids:
        for photo_id in album.photo_ids:
            photo = db.query(models.Photo).filter(
                models.Photo.id == photo_id,
                models.Photo.uploaded_by_id == current_user.id
            ).first()
            if photo:
                album_photo = models.AlbumPhoto(
                    album_id=db_album.id,
                    photo_id=photo_id,
                )
                db.add(album_photo)
    
    db.commit()
    return db_album


@app.get("/api/albums", response_model=List[schemas.Album])
def get_albums(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    albums = db.query(models.Album).filter(
        models.Album.created_by_id == current_user.id
    ).all()
    return albums


# Audio recording routes
@app.post("/api/audio", response_model=schemas.AudioRecording)
def upload_audio(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / "audio" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    db_audio = models.AudioRecording(
        filename=unique_filename,
        file_path=str(file_path),
        title=title or file.filename,
        description=description,
        author_id=current_user.id,
    )
    db.add(db_audio)
    db.commit()
    db.refresh(db_audio)
    return db_audio


@app.get("/api/audio", response_model=List[schemas.AudioRecording])
def get_audio_recordings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recordings = db.query(models.AudioRecording).filter(
        models.AudioRecording.author_id == current_user.id
    ).order_by(models.AudioRecording.created_at.desc()).all()
    return recordings


@app.get("/api/audio/{audio_id}")
def get_audio_file(
    audio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audio = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == audio_id,
        models.AudioRecording.author_id == current_user.id
    ).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio recording not found")
    return FileResponse(audio.file_path)


# File upload routes (odds and ends)
@app.post("/api/files", response_model=schemas.File)
def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / "files" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    db_file = models.File(
        filename=unique_filename,
        file_path=str(file_path),
        title=title or file.filename,
        description=description,
        file_type=file.content_type,
        uploaded_by_id=current_user.id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@app.get("/api/files", response_model=List[schemas.File])
def get_files(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = db.query(models.File).filter(
        models.File.uploaded_by_id == current_user.id
    ).order_by(models.File.created_at.desc()).all()
    return files


@app.get("/api/files/{file_id}")
def get_file(
    file_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.uploaded_by_id == current_user.id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file.file_path)

