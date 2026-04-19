# TerraBot Backend - Implementation Guide

## Overview
This document provides a comprehensive guide to the TerraBot backend implementation, including authentication, chat management, and image handling features.

---

## Part 1: User Authentication

### Database Model (app/db/database.py)
- **User model** with username, email, hashed_password, role (user/admin)
- **RoleEnum** for role management
- Relationships to chat_sessions

### Authentication Routes (app/routes/auth.py)

**POST /auth/register**
- Register new users with username, email, password
- Automatic password hashing with bcrypt
- Validates unique username and email

**POST /auth/login**
- Login with username or email + password
- Returns JWT token and user data
- Token expires after configured time (default: 60 minutes)

### Setup
```bash
# Initialize database and create admin user
python -m app.init_db

# Admin credentials created:
# Username: adminterra
# Email: k224318@nu.edu.pk
# Password: terra1234
```

---

## Part 2: Chat Management

### Database Models (app/db/database.py)

**ChatSession**
- Belongs to a User
- Contains multiple Chat messages
- Has title, creation date, soft delete flag

**Chat**
- Belongs to a ChatSession and Image
- Stores question, response, inference_category
- InferenceCategoryEnum: "Soil Estimation" or "Lunar Terrain Detection"

**Image**
- Stores image metadata (path, description)
- Can be associated with multiple Chat messages

### Chat Routes (app/routes/chats.py)
- POST /chats/ - Create or save chat
- (More endpoints to be implemented as needed)

---

## Part 3: Image Upload & Management (NEW)

### Key Features
✓ Upload images to mission-specific folders
✓ Automatic directory creation
✓ File type validation (jpg, jpeg, png, gif, bmp, webp, tiff)
✓ Filename conflict handling (timestamp appending)
✓ Hierarchical folder navigation
✓ Security features (path traversal protection)
✓ Image URL generation for frontend

### Database Integration (Future)
Currently stores images on filesystem. Can integrate with Image model to:
- Store image metadata in database
- Track image ownership
- Create audit logs

---

## Image Management Endpoints

### 1. Upload Image
**Endpoint:** `POST /files/images/upload`

**Purpose:** Upload image to mission-specific folder

**Query Parameters:**
```
mission_name (required): string - Name of mission folder
```

**Request Body:**
```
file (required): multipart/form-data - Image file to upload
```

**Response (200):**
```json
{
  "filename": "terrain_scan.jpg",
  "mission_name": "mission_alpha",
  "path": "mission_alpha/terrain_scan.jpg",
  "created_at": "2025-12-10T14:30:00.123456"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/files/images/upload?mission_name=lunar_mission_1" \
  -H "accept: application/json" \
  -F "file=@terrain.jpg"
```

**Error Responses:**
- `400 Bad Request`: Invalid filename or unsupported file type
- `500 Internal Server Error`: File system error

---

### 2. Get Root Images Directory
**Endpoint:** `GET /files/images`

**Purpose:** Retrieve all top-level missions and files in images directory

**Response (200):**
```json
{
  "current_path": "images",
  "items": [
    {
      "name": "mission_alpha",
      "type": "folder",
      "path": "mission_alpha"
    },
    {
      "name": "mission_beta",
      "type": "folder",
      "path": "mission_beta"
    },
    {
      "name": "root_image.jpg",
      "type": "file",
      "path": "root_image.jpg"
    }
  ]
}
```

**Example:**
```bash
curl -X GET "http://localhost:8000/files/images"
```

---

### 3. Get Folder Contents
**Endpoint:** `GET /files/images/{path}`

**Purpose:** Navigate to folder and get subfolders + image URLs

**Path Parameters:**
```
path: Relative path within images directory
Examples: "mission_alpha", "mission_alpha/subfolder", "mission_alpha/subfolder/sub-subfolder"
```

**Response (200):**
```json
{
  "current_path": "mission_alpha",
  "folders": [
    {
      "name": "terrain_analysis",
      "type": "folder",
      "path": "mission_alpha/terrain_analysis"
    }
  ],
  "images": [
    {
      "name": "crater_scan_001.jpg",
      "url": "/images/mission_alpha/crater_scan_001.jpg"
    },
    {
      "name": "surface_map.png",
      "url": "/images/mission_alpha/surface_map.png"
    }
  ]
}
```

**Error Responses:**
- `403 Forbidden`: Attempted path traversal
- `404 Not Found`: Path doesn't exist
- `400 Bad Request`: Path is not a directory

**Example:**
```bash
curl -X GET "http://localhost:8000/files/images/mission_alpha"
curl -X GET "http://localhost:8000/files/images/mission_alpha/terrain_analysis"
```

---

## Frontend Integration Example

### 1. Initialize and show missions
```javascript
async function loadMissions() {
  const response = await fetch('/files/images');
  const data = await response.json();
  
  // Display missions as folders
  data.items.forEach(item => {
    if (item.type === 'folder') {
      const missionBtn = document.createElement('button');
      missionBtn.textContent = item.name;
      missionBtn.onclick = () => loadMissionContents(item.path);
      document.getElementById('missions').appendChild(missionBtn);
    }
  });
}
```

### 2. Upload image with mission
```javascript
async function uploadImage(file, missionName) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    `/files/images/upload?mission_name=${missionName}`,
    { method: 'POST', body: formData }
  );
  
  const result = await response.json();
  console.log('Upload complete:', result);
  return result;
}
```

### 3. Navigate and display images
```javascript
async function loadMissionContents(missionPath) {
  const response = await fetch(`/files/images/${missionPath}`);
  const data = await response.json();
  
  // Display subfolders
  const folderContainer = document.getElementById('folders');
  data.folders.forEach(folder => {
    const btn = document.createElement('button');
    btn.textContent = `📁 ${folder.name}`;
    btn.onclick = () => loadMissionContents(folder.path);
    folderContainer.appendChild(btn);
  });
  
  // Display images
  const imageContainer = document.getElementById('images');
  data.images.forEach(image => {
    const img = document.createElement('img');
    img.src = image.url;
    img.title = image.name;
    img.style.width = '200px';
    imageContainer.appendChild(img);
  });
}
```

---

## Directory Structure

```
storage/
├── images/
│   ├── mission_alpha/
│   │   ├── crater_scan_001.jpg
│   │   ├── crater_scan_002.jpg
│   │   └── terrain_analysis/
│   │       ├── analysis_1.jpg
│   │       └── analysis_2.jpg
│   ├── mission_beta/
│   │   ├── raw_data/
│   │   │   └── surface.jpg
│   │   └── processed/
│   │       ├── result_1.png
│   │       └── result_2.png
│   └── mission_gamma/
│       └── sample.jpg
```

---

## Utilities

### ImageManager Class (app/utils/image_manager.py)

Provides utility methods for image operations:

```python
from app.utils.image_manager import ImageManager

# Get images directory
images_dir = ImageManager.get_images_directory()

# Check if file is allowed
is_valid = ImageManager.is_allowed_file("image.jpg")

# Create mission directory
mission_dir = ImageManager.create_mission_directory("mission_name")

# Generate unique filename (handles conflicts)
unique_path = ImageManager.generate_unique_filename(file_path)

# List directory contents
folders, files = ImageManager.list_directory_contents(dir_path)

# Validate path safety (security)
is_safe = ImageManager.validate_path_safety(full_path)

# Convert path to URL format
url_path = ImageManager.get_relative_path_for_url(full_path)
```

---

## Schemas (app/schemas.py)

### Image-Related Schemas

```python
class ImageUploadResponse(BaseModel):
    filename: str
    mission_name: str
    path: str
    created_at: str

class DirectoryItem(BaseModel):
    name: str
    type: str  # "folder" or "file"
    path: str

class DirectoryStructure(BaseModel):
    current_path: str
    items: List[DirectoryItem]

class ImageFileResponse(BaseModel):
    name: str
    url: str

class FolderContents(BaseModel):
    current_path: str
    folders: List[DirectoryItem]
    images: List[ImageFileResponse]
```

---

## Configuration

### Environment Variables (.env)

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/terrabot
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXP_MINUTES=60
STORAGE_DIR=./storage
GROQ_API_KEY=your-groq-api-key
```

### Settings (app/config.py)

```python
class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_EXP_MINUTES: int
    STORAGE_DIR: str
    GROQ_API_KEY: str
    
    @property
    def STORAGE_PATH(self) -> str:
        """Get the full storage path"""
        return os.path.join(os.getcwd(), self.STORAGE_DIR)
```

---

## Testing

### Run Test Suite

```bash
# Install test dependencies
pip install requests pillow

# Run the test script
python test_image_endpoints.py
```

The test script covers:
1. Image upload
2. Multiple uploads
3. Root directory retrieval
4. Mission contents retrieval
5. Subfolder navigation
6. Error handling (invalid files, path traversal, non-existent folders)

---

## Security Features

1. **File Type Validation**
   - Only image files with whitelisted extensions allowed
   - MIME type validation

2. **Path Traversal Protection**
   - Validates that requested paths don't escape images directory
   - Normalizes paths to prevent attacks

3. **Atomic File Operations**
   - Files written safely with conflict detection
   - Timestamps used for unique filenames

4. **Directory Traversal**
   - All paths validated against base directory
   - 403 Forbidden returned for invalid paths

---

## Future Enhancements

1. **Database Integration**
   - Store image metadata in database
   - Link images to chat sessions
   - Track image versions

2. **Image Processing**
   - Automatic thumbnail generation
   - Image resizing and optimization
   - EXIF data extraction

3. **Access Control**
   - User-specific image folders
   - Permission-based access
   - Audit logging

4. **Advanced Features**
   - Image tagging and search
   - Image comparison
   - Bulk upload
   - Drag-and-drop support

---

## Troubleshooting

### Images not uploading
- Check `STORAGE_DIR` in `.env` is valid
- Ensure directory has write permissions
- Check file size limits

### Path not found errors
- Verify mission folder exists or is created on first upload
- Check path formatting (use forward slashes in URLs)
- Ensure proper URL encoding

### Permission errors
- Check storage directory permissions
- Ensure Python process has write access
- Verify folder ownership

---

## API Response Examples

### Successful Upload
```json
{
  "filename": "lunar_terrain.jpg",
  "mission_name": "apollo_11",
  "path": "apollo_11/lunar_terrain.jpg",
  "created_at": "2025-12-10T14:32:15.234567"
}
```

### Root Directory with Mixed Content
```json
{
  "current_path": "images",
  "items": [
    {
      "name": "apollo_11",
      "type": "folder",
      "path": "apollo_11"
    },
    {
      "name": "apollo_17",
      "type": "folder",
      "path": "apollo_17"
    },
    {
      "name": "sample_moon_rock.jpg",
      "type": "file",
      "path": "sample_moon_rock.jpg"
    }
  ]
}
```

### Folder with Images and Subfolders
```json
{
  "current_path": "apollo_11",
  "folders": [
    {
      "name": "high_resolution",
      "type": "folder",
      "path": "apollo_11/high_resolution"
    },
    {
      "name": "analysis",
      "type": "folder",
      "path": "apollo_11/analysis"
    }
  ],
  "images": [
    {
      "name": "landing_site.jpg",
      "url": "/images/apollo_11/landing_site.jpg"
    },
    {
      "name": "footprint.png",
      "url": "/images/apollo_11/footprint.png"
    },
    {
      "name": "equipment.jpg",
      "url": "/images/apollo_11/equipment.jpg"
    }
  ]
}
```

---

## Summary

This implementation provides a complete image management system with:
- ✓ Secure file upload with validation
- ✓ Hierarchical folder organization
- ✓ Flexible navigation through directory structures
- ✓ Image URL generation for frontend
- ✓ Comprehensive error handling
- ✓ Security features (path traversal protection)
- ✓ Reusable utility functions
- ✓ Complete API documentation

The system is production-ready and can be extended with database integration, access control, and advanced image processing features as needed.
