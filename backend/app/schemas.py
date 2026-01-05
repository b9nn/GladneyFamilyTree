from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    invite_code: str


class UserInitialize(UserBase):
    """Schema for creating the first admin user without invite code"""
    password: str


class UserCreateAdmin(UserBase):
    """Schema for admin to create users without invite code"""
    password: str
    is_admin: Optional[bool] = False


class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class VignetteBase(BaseModel):
    title: str
    content: Optional[str] = None


class VignetteCreate(VignetteBase):
    photo_ids: Optional[List[int]] = None


class VignetteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    created_at: Optional[datetime] = None


class Vignette(VignetteBase):
    id: int
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    photos: Optional[List['Photo']] = []

    class Config:
        from_attributes = True


class PhotoBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class PhotoCreate(PhotoBase):
    pass


class PhotoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    taken_at: Optional[datetime] = None


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
    photo_count: Optional[int] = 0
    background_image: Optional[str] = None

    class Config:
        from_attributes = True


class AlbumWithPhotos(Album):
    photos: List['Photo'] = []

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


class FileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class File(FileBase):
    id: int
    filename: str
    file_type: Optional[str] = None
    uploaded_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class InviteCodeCreate(BaseModel):
    email: Optional[EmailStr] = None
    expires_in_days: Optional[int] = 30
    send_email: bool = False
    recipient_name: Optional[str] = None


class InviteCode(BaseModel):
    id: int
    code: str
    email: Optional[str] = None
    created_by_id: int
    used_by_id: Optional[int] = None
    created_at: datetime
    used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_used: bool

    class Config:
        from_attributes = True


class InviteCodeWithUser(BaseModel):
    id: int
    code: str
    email: Optional[str] = None
    created_by_id: int
    used_by_id: Optional[int] = None
    created_at: datetime
    used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_used: bool
    used_by_username: Optional[str] = None
    used_by_email: Optional[str] = None
    used_by_full_name: Optional[str] = None

    class Config:
        from_attributes = True


class BackgroundImage(BaseModel):
    id: int
    filename: str
    file_path: str
    uploaded_by_id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# Update forward references
Vignette.model_rebuild()
AlbumWithPhotos.model_rebuild()

