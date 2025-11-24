#!/usr/bin/env python3
"""
Password Reset Script for TAG Diary Website
Run this script to reset a user's password.
"""

import sys
from app.database import SessionLocal
from app import models
from app.auth import get_password_hash

def reset_password(username, new_password):
    """Reset password for a user"""
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            print(f"❌ Error: User '{username}' not found!")
            print("\nAvailable users:")
            all_users = db.query(models.User).all()
            if all_users:
                for u in all_users:
                    print(f"  - {u.username} ({u.email or 'no email'})")
            else:
                print("  No users found in database.")
            return False
        
        # Hash the new password using the same method as auth system
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        
        print(f"✅ Password successfully reset for user: {username}")
        print(f"   New password: {new_password}")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error resetting password: {e}")
        return False
    finally:
        db.close()

def list_users():
    """List all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        if users:
            print("\n📋 Users in database:")
            for user in users:
                print(f"  - {user.username} ({user.email or 'no email'}) - {user.full_name or 'no name'}")
        else:
            print("\n📋 No users found in database.")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) == 1:
        print("🔐 Password Reset Tool for TAG Diary Website")
        print("=" * 50)
        print("\nUsage:")
        print("  python reset_password.py <username> <new_password>")
        print("\nExample:")
        print("  python reset_password.py john newpassword123")
        print("\nTo list all users:")
        print("  python reset_password.py --list")
        print()
        list_users()
    elif len(sys.argv) == 2 and sys.argv[1] == "--list":
        list_users()
    elif len(sys.argv) == 3:
        username = sys.argv[1]
        new_password = sys.argv[2]
        
        if len(new_password) < 4:
            print("❌ Error: Password must be at least 4 characters long!")
            sys.exit(1)
        
        reset_password(username, new_password)
    else:
        print("❌ Error: Invalid arguments!")
        print("Usage: python reset_password.py <username> <new_password>")
        print("   or: python reset_password.py --list")
        sys.exit(1)

