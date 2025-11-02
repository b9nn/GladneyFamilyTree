from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class VignetteBase(BaseModel):
    title: str
    content: Optional[str] = None


class VignetteCreate(VignetteBase):
    photo_ids: Optional[List[int]] = None


class Vignette(VignetteBase):
    id: int
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PhotoBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class PhotoCreate(PhotoBase):
    pass


class Photo(PhotoBase):
    id: int
    filename: str
    uploaded_by_id: int
    created_at: datetime
    taken_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AlbumBase(BaseModel):
    name: str
    description: Optional[str] = None


class AlbumCreate(AlbumBase):
    photo_ids: Optional[List[int]] = None


class Album(AlbumBase):
    id: int
    created_by_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PersonBase(BaseModel):
    name: str


class Person(PersonBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class AudioRecordingBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class AudioRecordingCreate(AudioRecordingBase):
    pass


class AudioRecording(AudioRecordingBase):
    id: int
    filename: str
    author_id: int
    duration_seconds: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class FileBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class FileCreate(FileBase):
    pass


class File(FileBase):
    id: int
    filename: str
    file_type: Optional[str] = None
    uploaded_by_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

