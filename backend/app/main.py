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
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.database import get_db, init_db
from app import models, schemas
from app.auth import (
    get_current_user,
    get_current_admin,
    get_password_hash,
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

app = FastAPI(title="TAG Diary Website API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://mrtag.com",
        "https://mrtag.com",
        "http://www.mrtag.com",
        "https://www.mrtag.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["*"]
)

# Create upload directories
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "photos").mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)
(UPLOAD_DIR / "files").mkdir(exist_ok=True)
(UPLOAD_DIR / "documents").mkdir(exist_ok=True)

# Serve uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve frontend static files (built React app)
FRONTEND_BUILD_DIR = Path("../frontend/dist")
if FRONTEND_BUILD_DIR.exists():
    print(f"[STARTUP] Serving frontend from {FRONTEND_BUILD_DIR.absolute()}")
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "assets")), name="assets")
else:
    print(f"[STARTUP] Warning: Frontend build directory not found at {FRONTEND_BUILD_DIR.absolute()}")


@app.on_event("startup")
async def startup_event():
    init_db()


# ONE-TIME SETUP ENDPOINT - Remove after first use!
@app.post("/api/setup-admin")
def setup_admin(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    secret_key: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    ONE-TIME SETUP: Create the first admin user.
    SECURITY: Set SECRET_SETUP_KEY environment variable in Railway.
    Remove this endpoint after creating your admin account!
    """
    import os

    # Check secret key (set this in Railway environment variables)
    expected_key = os.getenv("SECRET_SETUP_KEY", "CHANGE_ME_IN_RAILWAY")
    if secret_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid setup key")

    # Check if any admin already exists
    existing_admin = db.query(models.User).filter(models.User.is_admin == True).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin user already exists. This endpoint is disabled.")

    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == username) | (models.User.email == email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with username '{username}' or email '{email}' already exists")

    # Create admin user
    user = models.User(
        username=username,
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        is_admin=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": f"Admin user '{username}' created successfully! IMPORTANT: Remove this endpoint now for security."}


# Invite code routes (admin only)
@app.post("/api/admin/invite-codes", response_model=schemas.InviteCode)
def create_invite_code(
    invite: schemas.InviteCodeCreate,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Generate a new invite code (admin only)"""
    import secrets
    from app.email import send_invite_email

    # Generate a secure random code
    code = secrets.token_urlsafe(16)

    # Calculate expiration
    expires_at = None
    if invite.expires_in_days:
        expires_at = datetime.now() + timedelta(days=invite.expires_in_days)

    db_invite = models.InviteCode(
        code=code,
        email=invite.email,
        created_by_id=current_admin.id,
        expires_at=expires_at,
    )
    db.add(db_invite)
    db.commit()
    db.refresh(db_invite)

    # Send email if requested and email is provided
    if invite.send_email and invite.email:
        try:
            send_invite_email(
                to_email=invite.email,
                invite_code=code,
                recipient_name=invite.recipient_name
            )
            print(f"[INVITE] Email sent to {invite.email}")
        except Exception as e:
            print(f"[INVITE] Failed to send email: {str(e)}")
            # Don't fail the whole request if email fails

    return db_invite


@app.get("/api/admin/invite-codes", response_model=List[schemas.InviteCodeWithUser])
def list_invite_codes(
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all invite codes with user information (admin only)"""
    codes = db.query(models.InviteCode).order_by(models.InviteCode.created_at.desc()).all()

    # Enrich with user information
    result = []
    for code in codes:
        code_dict = {
            "id": code.id,
            "code": code.code,
            "email": code.email,
            "created_by_id": code.created_by_id,
            "used_by_id": code.used_by_id,
            "created_at": code.created_at,
            "used_at": code.used_at,
            "expires_at": code.expires_at,
            "is_used": code.is_used,
            "used_by_username": None,
            "used_by_email": None,
            "used_by_full_name": None,
        }

        # Get user info if code was used
        if code.used_by_id:
            user = db.query(models.User).filter(models.User.id == code.used_by_id).first()
            if user:
                code_dict["used_by_username"] = user.username
                code_dict["used_by_email"] = user.email
                code_dict["used_by_full_name"] = user.full_name

        result.append(code_dict)

    return result


@app.get("/api/admin/users")
def list_users(
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all registered users (admin only)"""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "is_admin": user.is_admin,
            "created_at": user.created_at
        }
        for user in users
    ]


@app.delete("/api/admin/invite-codes/{code_id}")
def delete_invite_code(
    code_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete an invite code (admin only)"""
    invite = db.query(models.InviteCode).filter(models.InviteCode.id == code_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")

    db.delete(invite)
    db.commit()
    return {"message": "Invite code deleted"}


@app.delete("/api/admin/users/{user_id}")
def delete_user(
    user_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    # Prevent admin from deleting themselves
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete user's content first (cascade will handle some, but we'll be explicit)
    # This ensures referential integrity
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# Background image routes (admin only)
@app.post("/api/admin/background", response_model=schemas.BackgroundImage)
async def upload_background(
    file: UploadFile = File(...),
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Upload a background image (admin only)"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"bg_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / "photos" / unique_filename

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Deactivate all existing backgrounds
    db.query(models.BackgroundImage).update({"is_active": False})

    # Create new background record
    bg_image = models.BackgroundImage(
        filename=unique_filename,
        file_path=str(file_path),
        uploaded_by_id=current_admin.id,
        is_active=True
    )
    db.add(bg_image)
    db.commit()
    db.refresh(bg_image)

    return bg_image


@app.get("/api/background")
def get_active_background(db: Session = Depends(get_db)):
    """Get the currently active background image (public)"""
    bg = db.query(models.BackgroundImage).filter(
        models.BackgroundImage.is_active == True
    ).first()

    if not bg:
        return None

    return {
        "id": bg.id,
        "url": f"/uploads/photos/{bg.filename}"
    }


@app.delete("/api/admin/background/{bg_id}")
def delete_background(
    bg_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a background image (admin only)"""
    bg = db.query(models.BackgroundImage).filter(models.BackgroundImage.id == bg_id).first()
    if not bg:
        raise HTTPException(status_code=404, detail="Background not found")

    # Delete physical file
    try:
        file_path = Path(bg.file_path)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"[DELETE BACKGROUND] Error deleting file: {str(e)}")

    # Delete from database
    db.delete(bg)
    db.commit()
    return {"message": "Background deleted"}


# Database Backup routes (admin only)
@app.post("/api/admin/backup")
def create_backup(current_admin: models.User = Depends(get_current_admin)):
    """Create a database backup (admin only)"""
    import sqlite3
    from datetime import datetime

    DB_PATH = Path("tag_diary.db")
    BACKUP_DIR = Path("backups")
    BACKUP_DIR.mkdir(exist_ok=True)

    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database not found")

    try:
        # Create timestamp for backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"tag_diary_backup_{timestamp}.db"
        backup_path = BACKUP_DIR / backup_filename

        # Use SQLite backup API for safe backup
        source_conn = sqlite3.connect(str(DB_PATH))
        backup_conn = sqlite3.connect(str(backup_path))

        with backup_conn:
            source_conn.backup(backup_conn)

        source_conn.close()
        backup_conn.close()

        backup_size = backup_path.stat().st_size

        return {
            "message": "Backup created successfully",
            "filename": backup_filename,
            "size": backup_size,
            "timestamp": timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@app.get("/api/admin/backups")
def list_backups(current_admin: models.User = Depends(get_current_admin)):
    """List all available backups (admin only)"""
    BACKUP_DIR = Path("backups")

    if not BACKUP_DIR.exists():
        return {"backups": []}

    backup_files = sorted(
        BACKUP_DIR.glob("tag_diary_backup_*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )

    backups = []
    for backup_file in backup_files:
        backups.append({
            "filename": backup_file.name,
            "size": backup_file.stat().st_size,
            "created": datetime.fromtimestamp(backup_file.stat().st_mtime).isoformat()
        })

    return {"backups": backups}


@app.get("/api/admin/backup/{filename}")
def download_backup(
    filename: str,
    current_admin: models.User = Depends(get_current_admin)
):
    """Download a specific backup file (admin only)"""
    BACKUP_DIR = Path("backups")
    backup_path = BACKUP_DIR / filename

    # Security: ensure filename doesn't contain path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")

    return FileResponse(
        path=str(backup_path),
        filename=filename,
        media_type="application/x-sqlite3"
    )


# Authentication routes
@app.post("/api/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user with a valid invite code"""
    # Validate invite code
    invite = db.query(models.InviteCode).filter(
        models.InviteCode.code == user.invite_code,
        models.InviteCode.is_used == False
    ).first()

    if not invite:
        raise HTTPException(
            status_code=400,
            detail="Invalid or already used invite code"
        )

    # Check if code is expired
    if invite.expires_at and invite.expires_at < datetime.now():
        raise HTTPException(
            status_code=400,
            detail="Invite code has expired"
        )

    # Check if code is email-restricted
    if invite.email and invite.email != user.email:
        raise HTTPException(
            status_code=400,
            detail="This invite code is restricted to a specific email address"
        )

    # Check if username or email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )

    # Create the user
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Mark invite code as used
    invite.is_used = True
    invite.used_by_id = db_user.id
    invite.used_at = datetime.now()
    db.commit()

    return db_user


@app.post("/api/auth/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    print(f"[LOGIN] Attempt for username: '{username}'")

    # Validate input
    if not username or not password:
        print(f"[LOGIN] Failed - Missing credentials")
        raise HTTPException(
            status_code=400,
            detail="Username and password are required"
        )

    user = authenticate_user(db, username, password)
    if not user:
        print(f"[LOGIN] Failed - Invalid credentials for username: '{username}'")
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )

    print(f"[LOGIN] Success for username: '{username}'")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": schemas.User.model_validate(user)}


@app.get("/api/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.post("/api/auth/admin/create-user", response_model=schemas.User)
def admin_create_user(
    user: schemas.UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin-only endpoint to create a user without an invite code"""
    # Check if username or email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )

    # Create the user
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        is_admin=user.is_admin if hasattr(user, 'is_admin') else False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@app.post("/api/auth/admin/promote-user/{user_id}", response_model=schemas.User)
def promote_user_to_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin-only endpoint to promote a user to admin status"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = True
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/admin/demote-user/{user_id}", response_model=schemas.User)
def demote_user_from_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin-only endpoint to remove admin status from a user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent demoting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")

    user.is_admin = False
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/auth/health")
def auth_health(db: Session = Depends(get_db)):
    """Health check endpoint to verify database and user count"""
    try:
        user_count = db.query(models.User).count()
        return {
            "status": "ok",
            "database": "connected",
            "user_count": user_count
        }
    except Exception as e:
        print(f"[HEALTH CHECK] Database error: {str(e)}")
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }


@app.post("/api/auth/initialize", response_model=schemas.User)
def initialize_first_admin(user: schemas.UserInitialize, db: Session = Depends(get_db)):
    """Create the first admin user - only works when database has 0 users"""
    # Check if any users exist
    user_count = db.query(models.User).count()
    if user_count > 0:
        raise HTTPException(
            status_code=403,
            detail="Database already has users. Use regular registration."
        )

    print(f"[INIT] Creating first admin user: {user.username}")

    # Create first admin user
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        is_admin=True,
        is_active=True
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    print(f"[INIT] First admin user created successfully: {user.username}")
    return db_user


@app.post("/api/auth/password-reset-request")
def request_password_reset(
    request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request a password reset token"""
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
        # Don't reveal whether the email exists
        return {"message": "If an account exists with this email, a reset link has been sent."}

    # Generate a reset token (simple UUID-based token for this implementation)
    reset_token = str(uuid.uuid4())
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now() + timedelta(hours=1)

    db.commit()

    # In a real application, you would send an email here
    # For development/testing, we'll return the token
    print(f"[PASSWORD RESET] Token for {user.email}: {reset_token}")

    return {
        "message": "If an account exists with this email, a reset link has been sent.",
        "token": reset_token  # Only for development - remove in production!
    }


@app.post("/api/auth/password-reset")
def reset_password(
    reset_data: schemas.PasswordReset,
    db: Session = Depends(get_db)
):
    """Reset password using a valid token"""
    user = db.query(models.User).filter(
        models.User.reset_token == reset_data.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )

    # Check if token is expired
    if user.reset_token_expires and user.reset_token_expires < datetime.now():
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Reset token has expired"
        )

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {"message": "Password has been reset successfully"}


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
    db.refresh(db_vignette)

    # Load photos for response - manually build the list for serialization
    vignette_photos = db.query(models.VignettePhoto).filter(
        models.VignettePhoto.vignette_id == db_vignette.id
    ).order_by(models.VignettePhoto.position).all()

    # Return a dictionary instead of SQLAlchemy object to avoid relationship issues
    return {
        "id": db_vignette.id,
        "title": db_vignette.title,
        "content": db_vignette.content,
        "author_id": db_vignette.author_id,
        "created_at": db_vignette.created_at,
        "updated_at": db_vignette.updated_at,
        "photos": [vp.photo for vp in vignette_photos]
    }


@app.get("/api/vignettes", response_model=List[schemas.Vignette])
def get_vignettes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all vignettes to all users (family website - shared content)
    # Sort by sort_order (ascending), then by created_at (desc) as fallback
    vignettes = db.query(models.Vignette).order_by(
        models.Vignette.sort_order.asc(),
        models.Vignette.created_at.desc()
    ).all()

    # Add photos to each vignette - return as dictionaries
    result = []
    for vignette in vignettes:
        vignette_photos = db.query(models.VignettePhoto).filter(
            models.VignettePhoto.vignette_id == vignette.id
        ).order_by(models.VignettePhoto.position).all()
        result.append({
            "id": vignette.id,
            "title": vignette.title,
            "content": vignette.content,
            "author_id": vignette.author_id,
            "created_at": vignette.created_at,
            "updated_at": vignette.updated_at,
            "photos": [vp.photo for vp in vignette_photos]
        })

    return result


@app.get("/api/vignettes/{vignette_id}", response_model=schemas.Vignette)
def get_vignette(
    vignette_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all vignettes to all users (family website - shared content)
    vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id
    ).first()
    if not vignette:
        raise HTTPException(status_code=404, detail="Vignette not found")

    # Load photos for this vignette
    vignette_photos = db.query(models.VignettePhoto).filter(
        models.VignettePhoto.vignette_id == vignette.id
    ).order_by(models.VignettePhoto.position).all()

    # Return a dictionary instead of SQLAlchemy object to avoid relationship issues
    return {
        "id": vignette.id,
        "title": vignette.title,
        "content": vignette.content,
        "author_id": vignette.author_id,
        "created_at": vignette.created_at,
        "updated_at": vignette.updated_at,
        "photos": [vp.photo for vp in vignette_photos]
    }


@app.put("/api/vignettes/{vignette_id}", response_model=schemas.Vignette)
def update_vignette(
    vignette_id: int,
    vignette: schemas.VignetteCreate,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id
    ).first()
    if not db_vignette:
        raise HTTPException(status_code=404, detail="Vignette not found")

    db_vignette.title = vignette.title
    db_vignette.content = vignette.content
    db.commit()

    # Update photos - remove existing and add new ones
    # Delete existing photo associations
    existing_photos = db.query(models.VignettePhoto).filter(
        models.VignettePhoto.vignette_id == db_vignette.id
    ).all()
    for ep in existing_photos:
        db.delete(ep)
    db.commit()

    # Add new photo associations
    if vignette.photo_ids:
        for idx, photo_id in enumerate(vignette.photo_ids):
            vignette_photo = models.VignettePhoto(
                vignette_id=db_vignette.id,
                photo_id=photo_id,
                position=idx,
            )
            db.add(vignette_photo)
        db.commit()

    db.refresh(db_vignette)

    # Load photos for response - manually build the list for serialization
    vignette_photos = db.query(models.VignettePhoto).filter(
        models.VignettePhoto.vignette_id == db_vignette.id
    ).order_by(models.VignettePhoto.position).all()

    # Return a dictionary instead of SQLAlchemy object to avoid relationship issues
    return {
        "id": db_vignette.id,
        "title": db_vignette.title,
        "content": db_vignette.content,
        "author_id": db_vignette.author_id,
        "created_at": db_vignette.created_at,
        "updated_at": db_vignette.updated_at,
        "photos": [vp.photo for vp in vignette_photos]
    }


@app.patch("/api/vignettes/{vignette_id}", response_model=schemas.Vignette)
def patch_vignette(
    vignette_id: int,
    vignette: schemas.VignetteUpdate,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update specific fields of a vignette (admin only), including created_at date"""
    db_vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id
    ).first()
    if not db_vignette:
        raise HTTPException(status_code=404, detail="Vignette not found")

    # Update only provided fields
    if vignette.title is not None:
        db_vignette.title = vignette.title
    if vignette.content is not None:
        db_vignette.content = vignette.content
    if vignette.created_at is not None:
        db_vignette.created_at = vignette.created_at

    db.commit()
    db.refresh(db_vignette)
    return db_vignette


@app.delete("/api/vignettes/{vignette_id}")
def delete_vignette(
    vignette_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    print(f"[DELETE VIGNETTE] Attempt to delete vignette ID: {vignette_id} by admin: {current_admin.username}")

    vignette = db.query(models.Vignette).filter(
        models.Vignette.id == vignette_id
    ).first()
    if not vignette:
        print(f"[DELETE VIGNETTE] Vignette {vignette_id} not found")
        raise HTTPException(status_code=404, detail="Vignette not found")

    # Delete associated vignette_photos first
    vignette_photos = db.query(models.VignettePhoto).filter(
        models.VignettePhoto.vignette_id == vignette_id
    ).all()
    for vp in vignette_photos:
        db.delete(vp)

    print(f"[DELETE VIGNETTE] Deleted {len(vignette_photos)} associated photos")

    # Now delete the vignette
    db.delete(vignette)
    db.commit()

    print(f"[DELETE VIGNETTE] Successfully deleted vignette {vignette_id}")
    return {"message": "Vignette deleted"}


@app.post("/api/vignettes/reorder")
def reorder_vignettes(
    vignette_orders: List[dict],
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reorder vignettes by setting their sort_order values (admin only)

    Expects: [{"id": 1, "sort_order": 0}, {"id": 2, "sort_order": 1}, ...]
    """
    try:
        for item in vignette_orders:
            vignette = db.query(models.Vignette).filter(models.Vignette.id == item["id"]).first()
            if vignette:
                vignette.sort_order = item["sort_order"]

        db.commit()
        return {"message": "Vignettes reordered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to reorder vignettes: {str(e)}")


# Photo routes
@app.post("/api/photos", response_model=schemas.Photo)
def upload_photo(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from PIL import Image
    import io
    from datetime import datetime

    # Get file extension and check if it's HEIC
    file_extension = Path(file.filename).suffix.lower()
    is_heic = file_extension in ['.heic', '.heif']

    # Variable to store extracted photo date
    photo_taken_at = None

    # If HEIC, convert to JPEG
    if is_heic:
        from pillow_heif import register_heif_opener

        # Register HEIF opener with Pillow
        register_heif_opener()

        # Read the uploaded HEIC file
        file_content = file.file.read()

        # Open with Pillow and convert to JPEG
        img = Image.open(io.BytesIO(file_content))

        # Extract EXIF data before conversion
        try:
            exif = img.getexif()
            if exif:
                # EXIF tag 36867 is DateTimeOriginal (when photo was taken)
                # EXIF tag 306 is DateTime (when photo was last modified)
                date_taken = exif.get(36867) or exif.get(306)
                if date_taken:
                    # Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
                    photo_taken_at = datetime.strptime(date_taken, "%Y:%m:%d %H:%M:%S")
                    print(f"[UPLOAD PHOTO] Extracted EXIF date: {photo_taken_at}")
        except Exception as e:
            print(f"[UPLOAD PHOTO] Could not extract EXIF date: {str(e)}")

        # Convert to RGB if necessary (HEIC can have different color modes)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        # Save as JPEG
        file_extension = '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / "photos" / unique_filename

        img.save(file_path, 'JPEG', quality=95)
        print(f"[UPLOAD PHOTO] Converted HEIC to JPEG: {unique_filename}")
    else:
        # Save file normally for non-HEIC files
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / "photos" / unique_filename

        # Read file content to extract EXIF
        file_content = file.file.read()

        # Try to extract EXIF data from the image
        try:
            img = Image.open(io.BytesIO(file_content))
            exif = img.getexif()
            if exif:
                # EXIF tag 36867 is DateTimeOriginal (when photo was taken)
                # EXIF tag 306 is DateTime (when photo was last modified)
                date_taken = exif.get(36867) or exif.get(306)
                if date_taken:
                    # Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
                    photo_taken_at = datetime.strptime(date_taken, "%Y:%m:%d %H:%M:%S")
                    print(f"[UPLOAD PHOTO] Extracted EXIF date: {photo_taken_at}")
        except Exception as e:
            print(f"[UPLOAD PHOTO] Could not extract EXIF date: {str(e)}")

        # Write file to disk
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)

    # Create database record
    db_photo = models.Photo(
        filename=unique_filename,
        file_path=str(file_path),
        title=title or file.filename,
        description=description,
        uploaded_by_id=current_user.id,
        taken_at=photo_taken_at,
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
    # Show all photos to all users (family website - shared content)
    # Sort by sort_order (ascending), then by created_at (desc) as fallback
    photos = db.query(models.Photo).order_by(
        models.Photo.sort_order.asc(),
        models.Photo.created_at.desc()
    ).offset(skip).limit(limit).all()
    return photos


@app.get("/api/photos/{photo_id}")
def get_photo_file(
    photo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all photos to all users (family website - shared content)
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(photo.file_path)


@app.delete("/api/photos/{photo_id}")
def delete_photo(
    photo_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    print(f"[DELETE PHOTO] Attempt to delete photo ID: {photo_id} by admin: {current_admin.username}")

    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id
    ).first()

    if not photo:
        print(f"[DELETE PHOTO] Photo {photo_id} not found")
        raise HTTPException(status_code=404, detail="Photo not found")

    # Delete all related records first (to avoid foreign key constraint errors)

    # Delete from album_photos
    album_photos = db.query(models.AlbumPhoto).filter(
        models.AlbumPhoto.photo_id == photo_id
    ).all()
    for ap in album_photos:
        db.delete(ap)
    print(f"[DELETE PHOTO] Deleted {len(album_photos)} album associations")

    # Delete from vignette_photos
    vignette_photos = db.query(models.VignettePhoto).filter(
        models.VignettePhoto.photo_id == photo_id
    ).all()
    for vp in vignette_photos:
        db.delete(vp)
    print(f"[DELETE PHOTO] Deleted {len(vignette_photos)} vignette associations")

    # Delete from photo_people
    photo_people = db.query(models.PhotoPerson).filter(
        models.PhotoPerson.photo_id == photo_id
    ).all()
    for pp in photo_people:
        db.delete(pp)
    print(f"[DELETE PHOTO] Deleted {len(photo_people)} people tags")

    # Delete the physical file
    try:
        file_path = Path(photo.file_path)
        if file_path.exists():
            file_path.unlink()
            print(f"[DELETE PHOTO] Deleted file: {photo.file_path}")
    except Exception as e:
        print(f"[DELETE PHOTO] Error deleting file: {str(e)}")
        # Continue with database deletion even if file deletion fails

    # Delete from database
    db.delete(photo)
    db.commit()

    print(f"[DELETE PHOTO] Successfully deleted photo {photo_id}")
    return {"message": "Photo deleted successfully"}


@app.put("/api/photos/{photo_id}", response_model=schemas.Photo)
def update_photo(
    photo_id: int,
    photo_update: schemas.PhotoUpdate,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update photo title, description, and/or taken_at date (admin only)"""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id
    ).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Update only provided fields
    if photo_update.title is not None:
        photo.title = photo_update.title
    if photo_update.description is not None:
        photo.description = photo_update.description
    if photo_update.taken_at is not None:
        photo.taken_at = photo_update.taken_at

    db.commit()
    db.refresh(photo)
    return photo


@app.post("/api/photos/reorder")
def reorder_photos(
    photo_orders: List[dict],
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reorder photos by setting their sort_order values (admin only)

    Expects: [{"id": 1, "sort_order": 0}, {"id": 2, "sort_order": 1}, ...]
    """
    try:
        for item in photo_orders:
            photo = db.query(models.Photo).filter(models.Photo.id == item["id"]).first()
            if photo:
                photo.sort_order = item["sort_order"]

        db.commit()
        return {"message": "Photos reordered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to reorder photos: {str(e)}")


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
    # Show all albums to all users (family website - shared content)
    # Sort by sort_order (ascending), then by created_at (desc) as fallback
    albums = db.query(models.Album).order_by(
        models.Album.sort_order.asc(),
        models.Album.created_at.desc()
    ).all()

    # Add photo count to each album
    for album in albums:
        photo_count = db.query(models.AlbumPhoto).filter(
            models.AlbumPhoto.album_id == album.id
        ).count()
        album.photo_count = photo_count

    return albums


@app.get("/api/albums/{album_id}")
def get_album(
    album_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all albums to all users (family website - shared content)
    album = db.query(models.Album).filter(
        models.Album.id == album_id
    ).first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Get all photos in the album
    album_photos = db.query(models.AlbumPhoto).filter(
        models.AlbumPhoto.album_id == album_id
    ).all()

    photos = []
    for ap in album_photos:
        photo = db.query(models.Photo).filter(models.Photo.id == ap.photo_id).first()
        if photo:
            photos.append(photo)

    return {
        "id": album.id,
        "name": album.name,
        "description": album.description,
        "created_by_id": album.created_by_id,
        "created_at": album.created_at,
        "photo_count": len(photos),
        "photos": photos
    }


@app.post("/api/albums/{album_id}/photos/{photo_id}")
def add_photo_to_album(
    album_id: int,
    photo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify album ownership
    album = db.query(models.Album).filter(
        models.Album.id == album_id,
        models.Album.created_by_id == current_user.id
    ).first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Verify photo ownership
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.uploaded_by_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Check if photo is already in album
    existing = db.query(models.AlbumPhoto).filter(
        models.AlbumPhoto.album_id == album_id,
        models.AlbumPhoto.photo_id == photo_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Photo is already in this album")

    # Add photo to album
    album_photo = models.AlbumPhoto(
        album_id=album_id,
        photo_id=photo_id
    )
    db.add(album_photo)
    db.commit()

    return {"message": "Photo added to album"}


@app.delete("/api/albums/{album_id}/photos/{photo_id}")
def remove_photo_from_album(
    album_id: int,
    photo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify album ownership
    album = db.query(models.Album).filter(
        models.Album.id == album_id,
        models.Album.created_by_id == current_user.id
    ).first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Remove photo from album
    album_photo = db.query(models.AlbumPhoto).filter(
        models.AlbumPhoto.album_id == album_id,
        models.AlbumPhoto.photo_id == photo_id
    ).first()

    if not album_photo:
        raise HTTPException(status_code=404, detail="Photo not in album")

    db.delete(album_photo)
    db.commit()

    return {"message": "Photo removed from album"}


@app.delete("/api/albums/{album_id}")
def delete_album(
    album_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    album = db.query(models.Album).filter(
        models.Album.id == album_id,
        models.Album.created_by_id == current_user.id
    ).first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Delete all album_photo relationships
    db.query(models.AlbumPhoto).filter(
        models.AlbumPhoto.album_id == album_id
    ).delete()

    # Delete the album
    db.delete(album)
    db.commit()

    return {"message": "Album deleted successfully"}


@app.post("/api/albums/reorder")
def reorder_albums(
    album_orders: List[dict],
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reorder albums by setting their sort_order values (admin only)

    Expects: [{"id": 1, "sort_order": 0}, {"id": 2, "sort_order": 1}, ...]
    """
    try:
        for item in album_orders:
            album = db.query(models.Album).filter(models.Album.id == item["id"]).first()
            if album:
                album.sort_order = item["sort_order"]

        db.commit()
        return {"message": "Albums reordered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to reorder albums: {str(e)}")


@app.post("/api/albums/{album_id}/background")
def upload_album_background(
    album_id: int,
    file: UploadFile = File(...),
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Upload a background image for an album (admin only)"""
    # Get the album
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Validate file is an image
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    file_extension = Path(file.filename).suffix or '.jpg'
    unique_filename = f"album_bg_{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / "albums" / unique_filename

    # Create albums directory if it doesn't exist
    (UPLOAD_DIR / "albums").mkdir(parents=True, exist_ok=True)

    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Delete old background image if it exists
    if album.background_image:
        old_path = Path(album.background_image)
        if old_path.exists():
            old_path.unlink()

    # Update album with new background image path
    album.background_image = str(file_path)
    db.commit()
    db.refresh(album)

    return {"message": "Background uploaded successfully", "background_image": str(file_path)}


# Audio recording routes
@app.post("/api/audio", response_model=schemas.AudioRecording)
def upload_audio(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[UPLOAD AUDIO] User: {current_user.username}, Filename: {file.filename}, Content-Type: {file.content_type}")
    
    # Handle file extension - use .webm if no extension or if it's a blob
    file_extension = Path(file.filename).suffix if file.filename else '.webm'
    if not file_extension or file_extension == '':
        # Check content type to determine extension
        if file.content_type and 'webm' in file.content_type:
            file_extension = '.webm'
        elif file.content_type and 'mp3' in file.content_type:
            file_extension = '.mp3'
        elif file.content_type and 'wav' in file.content_type:
            file_extension = '.wav'
        else:
            file_extension = '.webm'  # Default to webm for browser recordings
    
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / "audio" / unique_filename
    
    print(f"[UPLOAD AUDIO] Saving to: {file_path}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = file_path.stat().st_size
        print(f"[UPLOAD AUDIO] File saved successfully, size: {file_size} bytes")
        
        db_audio = models.AudioRecording(
            filename=unique_filename,
            file_path=str(file_path),
            title=title or file.filename or f"Recording {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            description=description,
            author_id=current_user.id,
        )
        db.add(db_audio)
        db.commit()
        db.refresh(db_audio)
        
        print(f"[UPLOAD AUDIO] Database record created, ID: {db_audio.id}")
        return db_audio
    except Exception as e:
        print(f"[UPLOAD AUDIO] Error: {str(e)}")
        # Clean up file if it was created
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")


@app.get("/api/audio", response_model=List[schemas.AudioRecording])
def get_audio_recordings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all audio recordings to all users (family website - shared content)
    recordings = db.query(models.AudioRecording).order_by(models.AudioRecording.created_at.desc()).all()
    return recordings


@app.get("/api/audio/{audio_id}")
def get_audio_file(
    audio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all audio recordings to all users (family website - shared content)
    audio = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == audio_id
    ).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio recording not found")

    return FileResponse(
        audio.file_path,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.put("/api/audio/{audio_id}", response_model=schemas.AudioRecording)
def update_audio(
    audio_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    created_at: Optional[str] = Form(None),
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update audio recording title, description, and created date (admin only)"""
    audio = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == audio_id
    ).first()

    if not audio:
        raise HTTPException(status_code=404, detail="Audio recording not found")

    if title is not None:
        audio.title = title
    if description is not None:
        audio.description = description
    if created_at is not None:
        try:
            from datetime import datetime
            audio.created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    db.commit()
    db.refresh(audio)
    return audio


@app.delete("/api/audio/{audio_id}")
def delete_audio(
    audio_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    print(f"[DELETE AUDIO] Attempt to delete audio ID: {audio_id} by admin: {current_admin.username}")

    audio = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == audio_id
    ).first()

    if not audio:
        print(f"[DELETE AUDIO] Audio recording {audio_id} not found")
        raise HTTPException(status_code=404, detail="Audio recording not found")

    # Delete the physical file
    try:
        file_path = Path(audio.file_path)
        if file_path.exists():
            file_path.unlink()
            print(f"[DELETE AUDIO] Deleted file: {audio.file_path}")
    except Exception as e:
        print(f"[DELETE AUDIO] Error deleting file: {str(e)}")
        # Continue with database deletion even if file deletion fails

    # Delete from database
    db.delete(audio)
    db.commit()

    print(f"[DELETE AUDIO] Successfully deleted audio recording {audio_id}")
    return {"message": "Audio recording deleted successfully"}


# File upload routes (odds and ends)
@app.post("/api/files", response_model=schemas.File)
def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    source: Optional[str] = Form("vignettes"),
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
        source=source,
        uploaded_by_id=current_user.id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@app.get("/api/files", response_model=List[schemas.File])
def get_files(
    source: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Filter files by source if provided
    query = db.query(models.File)
    if source:
        query = query.filter(models.File.source == source)
    files = query.order_by(models.File.created_at.desc()).all()
    return files


@app.get("/api/files/{file_id}")
def get_file(
    file_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Show all files to all users (family website - shared content)
    file = db.query(models.File).filter(
        models.File.id == file_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = Path(file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Determine media type for proper download
    media_type = file.file_type or "application/octet-stream"

    # Get the original filename for download
    download_filename = file.title or file.filename

    return FileResponse(
        file.file_path,
        media_type=media_type,
        filename=download_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"'
        }
    )


@app.put("/api/files/{file_id}", response_model=schemas.File)
def update_file(
    file_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update file title and description (admin only)"""
    file = db.query(models.File).filter(
        models.File.id == file_id
    ).first()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if title is not None:
        file.title = title
    if description is not None:
        file.description = description

    db.commit()
    db.refresh(file)
    return file


@app.patch("/api/files/{file_id}", response_model=schemas.File)
def patch_file(
    file_id: int,
    file_update: schemas.FileUpdate,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update specific fields of a file (admin only), including created_at date"""
    file = db.query(models.File).filter(
        models.File.id == file_id
    ).first()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Update only provided fields
    if file_update.title is not None:
        file.title = file_update.title
    if file_update.description is not None:
        file.description = file_update.description
    if file_update.created_at is not None:
        file.created_at = file_update.created_at

    db.commit()
    db.refresh(file)
    return file


@app.delete("/api/files/{file_id}")
def delete_file(
    file_id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    print(f"[DELETE FILE] Attempt to delete file ID: {file_id} by admin: {current_admin.username}")

    file = db.query(models.File).filter(
        models.File.id == file_id
    ).first()

    if not file:
        print(f"[DELETE FILE] File {file_id} not found")
        raise HTTPException(status_code=404, detail="File not found")

    # Delete the physical file
    try:
        file_path = Path(file.file_path)
        if file_path.exists():
            file_path.unlink()
            print(f"[DELETE FILE] Deleted file: {file.file_path}")
    except Exception as e:
        print(f"[DELETE FILE] Error deleting file: {str(e)}")
        # Continue with database deletion even if file deletion fails

    # Delete from database
    db.delete(file)
    db.commit()

    print(f"[DELETE FILE] Successfully deleted file {file_id}")
    return {"message": "File deleted successfully"}


# Catch-all route to serve React app for client-side routing
# This MUST be at the end of all routes
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the React frontend for all non-API routes"""
    # If path starts with /api, it's already handled above, return 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # Serve index.html for all other routes (React Router will handle them)
    index_path = FRONTEND_BUILD_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    else:
        raise HTTPException(
            status_code=503,
            detail="Frontend not built. Run 'cd frontend && npm run build' first."
        )

