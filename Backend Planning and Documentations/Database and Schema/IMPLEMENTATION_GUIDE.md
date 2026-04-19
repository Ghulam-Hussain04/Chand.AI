# Chatbot Backend - User Authentication Setup

## Changes Made

### 1. **Database Model** (`app/database.py`)
- Created `User` SQLAlchemy model with the following attributes:
  - `id`: Primary key (Integer)
  - `username`: String, unique, indexed
  - `email`: String, unique, indexed
  - `hashed_password`: String for secure password storage
  - `role`: ENUM field with values 'user' or 'admin'
- Added `RoleEnum` class to define role options
- Added `init_db()` function for database initialization
- Created `Base` declarative base for ORM models

### 2. **Pydantic Schemas** (`app/schemas.py`) - NEW FILE
Request/response validation schemas:
- `UserBase`: Base user info (username, email, role)
- `UserRegister`: Registration data (includes password)
- `UserResponse`: API response format for user data
- `UserLogin`: Login credentials (username_or_email, password)
- `LoginResponse`: Login response with token and user data

### 3. **Security Updates** (`app/security.py`)
- Fixed JWT_SECRET_KEY reference (was JWT_SECRET)
- Already had password hashing and verification functions in place

### 4. **Authentication Routes** (`app/routes/auth.py`)
Implemented two endpoints:

**POST /auth/register** (HTTP 201)
- Accept: `username`, `email`, `password`, `role` (optional, defaults to 'user')
- Returns: User data with id, username, email, role
- Validates: Username and email uniqueness
- Hashes password before storing

**POST /auth/login** (HTTP 200)
- Accept: `username_or_email`, `password`
- Returns: JWT access token and user data
- Supports login with either username or email
- Returns error if credentials are invalid

### 5. **Database Initialization Script** (`app/init_db.py`) - NEW FILE
- Creates all database tables
- Creates initial admin user:
  - Username: `adminterra`
  - Email: `k224318@nu.edu.pk`
  - Password: `terra1234` (hashed with bcrypt)
  - Role: `admin`
  - ID: `1`

## Setup Instructions

### 1. **Update `.env` file**
Ensure your `.env` file has these variables:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/terrabot
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXP_MINUTES=60
STORAGE_DIR=./storage
```

### 2. **Initialize Database**
Run the initialization script to create tables and admin user:
```bash
cd dr-terra-prototype
python -m app.init_db
```

### 3. **Test the Endpoints**

**Register a new user:**
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "user"
  }'
```

**Login:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "adminterra",
    "password": "terra1234"
  }'
```

The login response will include:
- `access_token`: JWT token to use in subsequent requests
- `token_type`: "bearer"
- `user`: User object with id, username, email, role

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with username/email and password |

## Next Steps
Ready to implement:
- Chat entity and routes
- Chat history tracking
- Images/File uploads integration
- RAG pipeline integration

