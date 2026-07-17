#!/usr/bin/env python3
"""
Sidra Video Downloader - Create Admin User

Standalone script to create an admin user.
Can be run with CLI arguments or environment variables.

Usage:
    python create_admin.py
    python create_admin.py --username admin --email admin@example.com --password secret
    
Environment variables (fallback):
    ADMIN_USERNAME  (default: admin)
    ADMIN_EMAIL     (default: admin@sidra.local)
    ADMIN_PASSWORD  (default: admin123)
"""

import argparse
import os
import sys


def create_admin(username: str, email: str, password: str) -> None:
    """Create an admin user if one doesn't already exist."""
    # Import inside function to ensure app context is available
    try:
        from app import create_app, db
        from app.models.user import User
    except ImportError:
        print("Error: Could not import app modules.")
        print("Make sure you're running this from the backend directory")
        print("and that the application is properly set up.")
        sys.exit(1)

    app = create_app()

    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            if existing_user.username == username:
                print(f"User '{username}' already exists.")
            else:
                print(f"A user with email '{email}' already exists.")
            print("No changes made.")
            return

        # Create the admin user
        admin = User(
            username=username,
            email=email,
            role="admin",
            is_active=True,
        )
        admin.set_password(password)

        db.session.add(admin)
        db.session.commit()

        print(f"Admin user created successfully!")
        print(f"  Username: {username}")
        print(f"  Email:    {email}")
        print(f"  Role:     admin")


def main():
    parser = argparse.ArgumentParser(
        description="Create an admin user for Sidra Video Downloader"
    )
    parser.add_argument(
        "--username",
        default=os.environ.get("ADMIN_USERNAME", "admin"),
        help="Admin username (default: admin or ADMIN_USERNAME env var)",
    )
    parser.add_argument(
        "--email",
        default=os.environ.get("ADMIN_EMAIL", "admin@sidra.local"),
        help="Admin email (default: admin@sidra.local or ADMIN_EMAIL env var)",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("ADMIN_PASSWORD", "admin123"),
        help="Admin password (default: admin123 or ADMIN_PASSWORD env var)",
    )

    args = parser.parse_args()

    print("=" * 40)
    print(" Sidra Video Downloader - Create Admin")
    print("=" * 40)
    print()

    create_admin(
        username=args.username,
        email=args.email,
        password=args.password,
    )


if __name__ == "__main__":
    main()
