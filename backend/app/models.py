from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    vignettes = relationship("Vignette", back_populates="author")
    photos = relationship("Photo", back_populates="uploaded_by_user")
    audio_recordings = relationship("AudioRecording", back_populates="author")
    files = relationship("File", back_populates="uploaded_by_user")


class Vignette(Base):
    __tablename__ = "vignettes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    content = Column(Text)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    author = relationship("User", back_populates="vignettes")
    photos = relationship("VignettePhoto", back_populates="vignette")


class VignettePhoto(Base):
    __tablename__ = "vignette_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    vignette_id = Column(Integer, ForeignKey("vignettes.id"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    position = Column(Integer, default=0)  # Order within vignette
    
    vignette = relationship("Vignette", back_populates="photos")
    photo = relationship("Photo")


class Photo(Base):
    __tablename__ = "photos"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    title = Column(String)
    description = Column(Text)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    taken_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    uploaded_by_user = relationship("User", back_populates="photos")
    albums = relationship("AlbumPhoto", back_populates="photo")
    people_tags = relationship("PhotoPerson", back_populates="photo")


class Album(Base):
    __tablename__ = "albums"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    photos = relationship("AlbumPhoto", back_populates="album")


class AlbumPhoto(Base):
    __tablename__ = "album_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey("albums.id"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    album = relationship("Album", back_populates="photos")
    photo = relationship("Photo")


class Person(Base):
    __tablename__ = "people"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    photo_tags = relationship("PhotoPerson", back_populates="person")


class PhotoPerson(Base):
    __tablename__ = "photo_people"
    
    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    
    photo = relationship("Photo", back_populates="people_tags")
    person = relationship("Person", back_populates="photo_tags")


class AudioRecording(Base):
    __tablename__ = "audio_recordings"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    title = Column(String)
    description = Column(Text)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration_seconds = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    author = relationship("User", back_populates="audio_recordings")


class File(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    title = Column(String)
    description = Column(Text)
    file_type = Column(String)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    uploaded_by_user = relationship("User", back_populates="files")

