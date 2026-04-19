# Image Serving & Role-Based Access Control - Implementation & Integration Guide

## Overview

This document describes two major enhancements made to the TerraBot backend:

1. **Image File Serving** - Direct access to image files via URL
2. **Role-Based Access Control (RBAC)** - Protected endpoints with JWT authentication and admin authorization

---

## Part 1: Image File Serving

### What Changed

The `/files/images/{path}` endpoint now serves image files directly when the path includes a filename.

### How It Works

**Before (Directory-Only):**
```
GET /files/images/mission_alpha
→ Returns directory listing with subfolders and image URLs
```

**Now (File + Directory):**
```
GET /files/images/mission_alpha/C3_TCAM_4_2C_048.png
→ Returns the actual image file for viewing in frontend
→ Browser displays image directly

GET /files/images/mission_alpha
→ Still returns directory listing (backward compatible)
```

### Implementation Details

#### Logic Flow

```python
@router.get("/images/{path:path}")
async def get_folder_contents(path: str, current_user: TokenPayload = Depends(verify_token)):
    
    # 1. Security validation
    full_path = construct_path(path)
    validate_path_safety(full_path)  # Prevent directory traversal
    
    # 2. Check if resource exists
    if not exists(full_path):
        return 404 Not Found
    
    # 3. Route based on resource type
    if is_file(full_path):
        # SERVE IMAGE FILE
        validate_image_type(full_path)
        return FileResponse(full_path)
    
    elif is_directory(full_path):
        # LIST DIRECTORY CONTENTS
        folders = list_subfolders(full_path)
        images = list_image_files(full_path)
        return FolderContents(folders, images)
```

#### File Serving Response

When serving an image file:

```python
return FileResponse(
    path=full_path,
    media_type="image/jpeg",
    filename=os.path.basename(full_path)
)
```

**Browser Behavior:**
- Displays image inline (not download)
- Shows in `<img src="/files/images/mission_alpha/image.png" />`
- Proper CORS handling

### Frontend Integration

#### Simple Image Display

```html
<!-- Direct image in HTML -->
<img src="/files/images/mission_alpha/C3_TCAM_4_2C_048.png" alt="Image" />
```

#### JavaScript Fetch

```javascript
// Get image URL from directory listing
async function getImages(missionPath) {
    const token = localStorage.getItem('access_token');
    const res = await fetch(
        `/files/images/${missionPath}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.images; // Contains URLs like: /files/images/mission_alpha/image.png
}

// Display in image tag
function displayImages(images) {
    images.forEach(img => {
        const imgElement = document.createElement('img');
        imgElement.src = img.url;  // URL from directory listing
        imgElement.title = img.name;
        document.body.appendChild(imgElement);
    });
}
```

#### Image Viewer Component (React)

```javascript
import React, { useState } from 'react';

function ImageViewer({ imagePath, token }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const viewImage = async () => {
        // Image URL from directory listing
        const imageUrl = `/files/images/${imagePath}`;
        
        // Just use the URL directly - browser handles display
        return imageUrl;
    };
    
    return (
        <div>
            <img 
                src={`/files/images/${imagePath}`}
                alt="Preview"
                onError={() => setError("Failed to load image")}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default ImageViewer;
```

#### Image Gallery with Click-to-View

```javascript
function ImageGallery({ missionPath, token }) {
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    
    useEffect(() => {
        loadImages();
    }, [missionPath]);
    
    const loadImages = async () => {
        const res = await fetch(
            `/files/images/${missionPath}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        setImages(data.images);
    };
    
    return (
        <div>
            <div className="thumbnails">
                {images.map(img => (
                    <div 
                        key={img.url}
                        onClick={() => setSelectedImage(img.url)}
                        className="thumbnail"
                    >
                        <img src={img.url} alt={img.name} width="100" />
                        <p>{img.name}</p>
                    </div>
                ))}
            </div>
            
            {selectedImage && (
                <div className="image-viewer">
                    <img src={selectedImage} alt="Selected" style={{ maxWidth: '800px' }} />
                </div>
            )}
        </div>
    );
}
```

### Security Considerations

✅ **Path Traversal Protection**
- All paths validated: `validatePathSafety()`
- Prevents `../../../etc/passwd` attacks
- Returns 403 Forbidden for invalid paths

✅ **File Type Validation**
- Only allowed image extensions served: `.jpg, .png, .gif, .bmp, .webp, .tiff`
- Other file types return 400 Bad Request

✅ **Authentication Required**
- All endpoints require valid JWT token
- User must be authenticated
- Token verified before serving any files

### API Examples

#### Serve an Image File

```bash
# Get the token first
TOKEN=$(curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"user","password":"pass"}' | jq -r '.access_token')

# Access image file with authorization
curl -X GET "http://localhost:8000/files/images/mission_alpha/C3_TCAM_4_2C_048.png" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded_image.png
```

#### List Directory and Get Image URLs

```bash
# Get directory listing with image URLs
curl -X GET "http://localhost:8000/files/images/mission_alpha" \
  -H "Authorization: Bearer $TOKEN"

# Response includes image URLs:
{
  "current_path": "mission_alpha",
  "folders": [],
  "images": [
    {
      "name": "C3_TCAM_4_2C_048.png",
      "url": "/files/images/mission_alpha/C3_TCAM_4_2C_048.png"
    }
  ]
}

# Access the image directly
curl -X GET "http://localhost:8000/files/images/mission_alpha/C3_TCAM_4_2C_048.png" \
  -H "Authorization: Bearer $TOKEN" \
  -o image.png
```

---

## Part 2: Role-Based Access Control (RBAC)

### What Changed

All endpoints now require JWT authentication. Additional role-based restrictions apply to certain endpoints.

### Access Control Rules

#### Public Endpoints (No Authentication Required)
- ❌ **NONE** - All endpoints require authentication

#### User-Level Endpoints (Any Authenticated User)
- ✅ `GET /files/images/{path}` - View images and browse folders
- ✅ `GET /chats/*` - Access chat features
- ✅ `POST /chats/*` - Create and manage chats

#### Admin-Only Endpoints
- ✅ `POST /auth/register` - Register new users (requires admin token)
- ✅ `POST /files/images/upload` - Upload images (requires admin token)

#### Public Endpoints (Always Open)
- ✅ `POST /auth/login` - User login (generates JWT token)

### Implementation Architecture

#### Security Module (`app/security.py`)

**TokenPayload Class**
```python
class TokenPayload:
    sub: str          # Username
    user_id: int      # User ID
    role: str         # 'user' or 'admin'
    exp: datetime     # Token expiration time
```

**Verification Functions**

```python
# Verify JWT token and extract payload
def verify_token(credentials: HTTPAuthCredentials) -> TokenPayload:
    - Decodes JWT token
    - Validates signature
    - Extracts user info (username, user_id, role)
    - Returns TokenPayload object
    - Raises 401 Unauthorized if invalid

# Verify admin role (extends verify_token)
def verify_admin(token: TokenPayload) -> TokenPayload:
    - Calls verify_token() first
    - Checks if token.role == "admin"
    - Returns token if admin
    - Raises 403 Forbidden if not admin
```

#### Dependency Injection in FastAPI

```python
# Require authentication
@router.get("/route")
async def function(current_user: TokenPayload = Depends(verify_token)):
    # Only authenticated users can access
    # current_user contains user info
    pass

# Require admin role
@router.post("/admin-route")
async def admin_function(admin: TokenPayload = Depends(verify_admin)):
    # Only admins can access
    # admin.role == "admin" is guaranteed
    pass
```

### Protected Routes

#### 1. Image Upload (`POST /files/images/upload`)

**Before:**
```python
@router.post("/images/upload")
async def upload_image(file: UploadFile, mission_name: str):
    # No protection
```

**After:**
```python
@router.post("/images/upload")
async def upload_image(
    file: UploadFile,
    mission_name: str,
    current_user: TokenPayload = Depends(verify_admin)  # ← Requires admin
):
    # Only admins can upload
```

**Response:**
- ✅ 200 OK (if admin uploads successfully)
- ❌ 401 Unauthorized (if not authenticated)
- ❌ 403 Forbidden (if authenticated but not admin)

#### 2. Directory Listing & Image Serving (`GET /files/images/{path}`)

**Before:**
```python
@router.get("/images/{path:path}")
async def get_folder_contents(path: str):
    # No protection
```

**After:**
```python
@router.get("/images/{path:path}")
async def get_folder_contents(
    path: str,
    current_user: TokenPayload = Depends(verify_token)  # ← Requires user token
):
    # Any authenticated user can view
```

**Response:**
- ✅ 200 OK (if authenticated, returns directory or image)
- ❌ 401 Unauthorized (if not authenticated)

#### 3. User Registration (`POST /auth/register`)

**Before:**
```python
@router.post("/register")
async def register(user_data: UserRegister, db: AsyncSession):
    # No protection
```

**After:**
```python
@router.post("/register")
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin)  # ← Requires admin
):
    # Only admins can register users
```

**Response:**
- ✅ 201 Created (if admin registers successfully)
- ❌ 401 Unauthorized (if not authenticated)
- ❌ 403 Forbidden (if authenticated but not admin)

#### 4. User Login (`POST /auth/login`) - ALWAYS PUBLIC

```python
@router.post("/login")
async def login(credentials: UserLogin, db: AsyncSession):
    # NO authentication required - users must be able to login!
    # Returns JWT token for subsequent requests
```

**Response:**
- ✅ 200 OK (with access_token if credentials valid)
- ❌ 401 Unauthorized (if credentials invalid)

### JWT Token Flow

#### 1. User Login (Get Token)

```
User Input: username/email + password
        ↓
POST /auth/login
        ↓
Backend validates credentials
        ↓
Backend creates JWT token with:
  - sub: username
  - user_id: user_id
  - role: 'user' or 'admin'
  - exp: expiration time
        ↓
Response: {
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {...}
}
        ↓
Frontend stores token (localStorage/sessionStorage)
```

#### 2. Use Token for Protected Endpoints

```
Frontend wants to access protected resource:
GET /files/images/mission_alpha

Frontend includes token in header:
Authorization: Bearer eyJhbGc...

        ↓
Backend receives request
        ↓
Extract token from Authorization header
        ↓
Verify JWT signature (using JWT_SECRET_KEY)
        ↓
Decode token payload
        ↓
Check role if needed (for admin-only endpoints)
        ↓
If valid: ✓ Process request
If invalid: ✗ Return 401 Unauthorized or 403 Forbidden
```

#### 3. Token Expiration

```
Token issued: 2:00 PM
Token valid for: 60 minutes (configurable in .env: JWT_EXP_MINUTES)
Token expires: 3:00 PM

After 3:00 PM:
- Token considered invalid
- Backend returns 401 Unauthorized
- Frontend should redirect to login
- User must login again to get new token
```

### Frontend Integration

#### Login and Store Token

```javascript
async function loginUser(username, password) {
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username_or_email: username,
            password: password
        })
    });
    
    if (!response.ok) {
        throw new Error('Login failed');
    }
    
    const data = await response.json();
    const token = data.access_token;
    
    // Store token
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
}
```

#### Use Token for Protected Requests

```javascript
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        // No token - redirect to login
        window.location.href = '/login';
        return;
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token invalid/expired - logout
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return;
    }
    
    return response;
}
```

#### Protected API Calls

```javascript
// View images (user-level access)
async function viewImages(missionPath) {
    const response = await fetchWithAuth(`/files/images/${missionPath}`);
    return response.json();
}

// Upload image (admin-only)
async function uploadImage(file, missionName) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(
        `/files/images/upload?mission_name=${missionName}`,
        {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );
    
    if (response.status === 403) {
        alert('Only admins can upload images');
        return null;
    }
    
    return response.json();
}

// Register user (admin-only)
async function registerUser(username, email, password, role) {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            username,
            email,
            password,
            role
        })
    });
    
    if (response.status === 403) {
        alert('Only admins can register users');
        return null;
    }
    
    return response.json();
}
```

#### React Component with Protected Routes

```javascript
import React, { useState, useEffect } from 'react';

function ProtectedApp() {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        // Check if already logged in
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);
    
    if (!token) {
        return <LoginPage onLogin={(tok, usr) => {
            setToken(tok);
            setUser(usr);
        }} />;
    }
    
    return (
        <div>
            <p>Welcome, {user.username} ({user.role})</p>
            
            <ImageGallery token={token} />
            
            {user.role === 'admin' && (
                <ImageUpload token={token} />
            )}
        </div>
    );
}
```

### Configuration

#### Environment Variables (`.env`)

```
# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXP_MINUTES=60

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/terrabot

# Storage
STORAGE_DIR=./storage
```

#### Token Expiration

Change in `.env`:
```
JWT_EXP_MINUTES=120  # Tokens valid for 120 minutes
```

### Error Handling

#### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Image retrieved or directory listed |
| 201 | Created | User registered |
| 400 | Bad Request | Invalid file type, malformed request |
| 401 | Unauthorized | No token, invalid token, expired token |
| 403 | Forbidden | Insufficient role (not admin) |
| 404 | Not Found | File/folder doesn't exist |
| 500 | Server Error | Unexpected error |

#### Frontend Error Handling

```javascript
async function makeAuthenticatedRequest(url, options) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        // Handle different status codes
        if (response.status === 401) {
            // Token invalid - redirect to login
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        } else if (response.status === 403) {
            // Access denied - show error
            alert('You do not have permission to perform this action');
        } else if (!response.ok) {
            // Other errors
            throw new Error(`API Error: ${response.status}`);
        }
        
        return response.json();
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}
```

---

## Testing & Verification

### Test Access Control

#### 1. Test Unauthenticated Access (Should Fail)

```bash
# Should return 401 Unauthorized
curl -X GET "http://localhost:8000/files/images/mission_alpha"

# Should return 401 Unauthorized
curl -X POST "http://localhost:8000/files/images/upload?mission_name=test" \
  -F "file=@image.jpg"
```

#### 2. Test User-Level Access

```bash
# Login as user
TOKEN=$(curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"testuser","password":"pass123"}' \
  | jq -r '.access_token')

# User can view images (200 OK)
curl -X GET "http://localhost:8000/files/images/mission_alpha" \
  -H "Authorization: Bearer $TOKEN"

# User cannot upload (403 Forbidden)
curl -X POST "http://localhost:8000/files/images/upload?mission_name=test" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.jpg"
```

#### 3. Test Admin-Level Access

```bash
# Login as admin
TOKEN=$(curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"adminterra","password":"terra1234"}' \
  | jq -r '.access_token')

# Admin can view images (200 OK)
curl -X GET "http://localhost:8000/files/images/mission_alpha" \
  -H "Authorization: Bearer $TOKEN"

# Admin can upload (200 OK)
curl -X POST "http://localhost:8000/files/images/upload?mission_name=test" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.jpg"

# Admin can register users (201 Created)
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "newuser",
    "email": "new@example.com",
    "password": "pass123",
    "role": "user"
  }'
```

#### 4. Test Image File Serving

```bash
# Get directory listing
curl -X GET "http://localhost:8000/files/images/mission_alpha" \
  -H "Authorization: Bearer $TOKEN" | jq '.images'

# Serve image file (if image.png exists in mission_alpha folder)
curl -X GET "http://localhost:8000/files/images/mission_alpha/image.png" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.png

# Verify image was downloaded
file downloaded.png
```

---

## Summary of Changes

### Code Modifications

| File | Changes | Impact |
|------|---------|--------|
| `app/security.py` | Added TokenPayload, verify_token, verify_admin | Enables JWT verification |
| `app/routes/auth.py` | Added verify_admin dependency to /register | Registration now admin-only |
| `app/routes/files.py` | Added file serving logic & token verification | Images can be served + all access protected |

### Endpoint Status

| Endpoint | Auth | Role | Function |
|----------|------|------|----------|
| POST /auth/login | ❌ No | - | Get JWT token |
| POST /auth/register | ✅ Yes | admin | Register user (admin only) |
| GET /files/images/{path} | ✅ Yes | user | View directory or serve image |
| POST /files/images/upload | ✅ Yes | admin | Upload image (admin only) |

### Security Summary

✅ **Authentication:** All endpoints protected with JWT except login
✅ **Authorization:** Role-based access (admin/user)
✅ **Image Serving:** Direct file serving with validation
✅ **Path Protection:** Directory traversal prevention
✅ **File Validation:** Only images allowed

---

## Next Steps

1. **Test the implementation:**
   - Run test commands above
   - Verify token generation and validation
   - Test image file serving

2. **Update frontend:**
   - Add authorization header to all API calls
   - Implement login/logout flow
   - Show different UI based on user role

3. **Monitor & maintain:**
   - Check logs for auth errors
   - Monitor token expiration
   - Handle 401/403 errors gracefully

---

## Support & Questions

For detailed information:
- JWT implementation: See `app/security.py`
- Route protection: See `app/routes/*.py` files
- Integration examples: See "Frontend Integration" sections above
