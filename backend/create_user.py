#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create User Script
Allows creating users with specific passwords directly in the database
"""

import sys
import io
from app.database import SessionLocal
from app import models
from app.auth import get_password_hash

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def create_user(username, password, email=None, full_name=None, is_admin=False):
    """Create a new user with specified password"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(
            models.User.username == username
        ).first()

        if existing_user:
            print(f"Error: User '{username}' already exists!")
            return False

        # Create new user
        user = models.User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            is_admin=is_admin,
            is_active=True
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Success! Created user:")
        print(f"  Username: {username}")
        print(f"  Email: {email or 'None'}")
        print(f"  Full Name: {full_name or 'None'}")
        print(f"  Admin: {'Yes' if is_admin else 'No'}")
        print(f"  Password: {password}")

        return True

    except Exception as e:
        db.rollback()
        print(f"Error creating user: {e}")
        return False
    finally:
        db.close()


def list_users():
    """List all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        if users:
            print("\nUsers in database:")
            print("-" * 80)
            for user in users:
                admin_badge = " [ADMIN]" if user.is_admin else ""
                active_badge = " [ACTIVE]" if user.is_active else " [INACTIVE]"
                print(f"  {user.username}{admin_badge}{active_badge}")
                print(f"    Email: {user.email or 'None'}")
                print(f"    Full Name: {user.full_name or 'None'}")
                print(f"    Created: {user.created_at}")
                print()
        else:
            print("\nNo users found in database.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) == 1 or sys.argv[1] in ['-h', '--help']:
        print("Create User Tool")
        print("=" * 50)
        print("\nUsage:")
        print("  python create_user.py <username> <password> [email] [full_name] [--admin]")
        print("\nExamples:")
        print("  python create_user.py john SecurePass123")
        print("  python create_user.py jane MyPassword jane@email.com \"Jane Doe\"")
        print("  python create_user.py admin AdminPass admin@site.com \"Admin User\" --admin")
        print("\nTo list all users:")
        print("  python create_user.py --list")
        print()
        sys.exit(0)

    if sys.argv[1] == "--list":
        list_users()
        sys.exit(0)

    if len(sys.argv) < 3:
        print("Error: Username and password are required!")
        print("Usage: python create_user.py <username> <password> [email] [full_name] [--admin]")
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]
    email = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else None
    full_name = sys.argv[4] if len(sys.argv) > 4 and not sys.argv[4].startswith('--') else None
    is_admin = '--admin' in sys.argv

    if len(password) < 4:
        print("Error: Password must be at least 4 characters long!")
        sys.exit(1)

    create_user(username, password, email, full_name, is_admin)
