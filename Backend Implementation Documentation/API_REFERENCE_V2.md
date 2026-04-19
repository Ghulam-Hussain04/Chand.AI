# TerraBot Backend API v2.0.0 - Phase 2 Complete ✅

## Server Status
- **Status**: ✅ Running on http://0.0.0.0:8000
- **Interactive Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

## Quick Start

### 1. Login
```bash
POST /auth/login
Content-Type: application/json

{
  "username_or_email": "hamdanvohra5676@gmail.com",
  "password": "admin123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "hamdanvohra5676@gmail.com",
    "role": "admin"
  }
}
```

### 2. Create Folder
```bash
POST /api/folders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Mission Alpha",
  "description": "First mission images",
  "parent_id": null
}
```

### 3. Upload Image
```bash
POST /api/files/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

- file: <image_file>
- folder_id: 1
- description: "Soil sample analysis"
- tags: "soil,loamy,test"
```

### 4. Query RAG with File Scope
```bash
POST /rag/query
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "query": "What are the soil characteristics?",
  "file_id": 1,
  "session_id": null
}
```

## API Endpoints Reference

### 🔐 Authentication (`/auth`)

#### Register User (Admin Only)
```
POST /auth/register
Description: Create new user with role (admin only)
Auth: Required (admin)
Body:
{
  "username": "researcher1",
  "email": "researcher@example.com",
  "password": "secure_password",
  "role": "researcher"  // "user" or "researcher"
}
Response: 201 Created - User details
```

#### Login
```
POST /auth/login
Description: Authenticate user
Body:
{
  "username_or_email": "admin",
  "password": "admin123"
}
Response: 200 OK - JWT token + user info
```

---

### 📁 Folders (`/api/folders`)

#### Create Folder
```
POST /api/folders
Description: Create new folder in hierarchy
Auth: Required
Body:
{
  "name": "Mission Beta",
  "description": "Second mission",
  "parent_id": 1  // null for root folder
}
Response: 201 Created
```

#### Get Folder
```
GET /api/folders/{folder_id}
Description: Get folder details
Auth: Required
Response: 200 OK - Folder object
```

#### List Root Folders
```
GET /api/folders
Description: Get all root-level folders for user
Auth: Required
Response: 200 OK - Array of folders
```

#### List Subfolders
```
GET /api/folders/{folder_id}/subfolders
Description: Get all children of a folder
Auth: Required
Response: 200 OK - Array of subfolders
```

#### Get Folder Hierarchy (Tree)
```
GET /api/folders/{folder_id}/hierarchy
Description: Get complete tree structure with nested subfolders
Auth: Required
Response: 200 OK - Nested tree structure
Example Response:
{
  "id": 1,
  "name": "My Files",
  "parent_id": null,
  "file_count": 5,
  "subfolders": [
    {
      "id": 2,
      "name": "Mission Alpha",
      "file_count": 3,
      "subfolders": []
    }
  ]
}
```

#### Update Folder
```
PUT /api/folders/{folder_id}
Description: Update folder name/description
Auth: Required
Query Parameters:
- name: string (optional)
- description: string (optional)
Response: 200 OK - Updated folder
```

#### Move Folder
```
POST /api/folders/{folder_id}/move
Description: Move folder to new parent (with cycle detection)
Auth: Required
Query Parameters:
- new_parent_id: integer (null for root)
Response: 200 OK - Updated folder
```

#### Delete Folder
```
DELETE /api/folders/{folder_id}
Description: Delete folder
Auth: Required
Query Parameters:
- cascade: boolean (default: true)
  - true: Delete all contents
  - false: Only delete empty folders
Response: 204 No Content
```

#### Get Folder Stats
```
GET /api/folders/{folder_id}/stats
Description: Get file and subfolder counts
Auth: Required
Response: 200 OK
{
  "folder_id": 1,
  "files": 5,
  "subfolders": 3
}
```

---

### 📤 Files (`/api/files`)

#### Upload Single File
```
POST /api/files/upload
Description: Upload image or CSV file
Auth: Required
Form Data:
- file: UploadFile (required)
- folder_id: integer (required)
- description: string (optional)
- tags: string (optional, comma-separated)
Response: 201 Created
{
  "file_id": 123,
  "filename": "soil_sample_20260419_12ab34cd.jpg",
  "original_filename": "soil_sample.jpg",
  "folder_id": 1,
  "status": "success",
  "file_size": 102400
}

File Types Supported:
- Images: .jpg, .jpeg, .png
- Data: .csv

Auto Processing (Images):
- Resize to fit 4000x4000 px
- Compress JPEG quality
- Generate 200x200 thumbnails
- Extract image features
```

#### Upload Multiple Files
```
POST /api/files/upload-batch
Description: Upload multiple files at once
Auth: Required
Form Data:
- files: UploadFile[] (array, required)
- folder_id: integer (required)
Response: 201 Created
{
  "files": [
    { "file_id": 123, "status": "success", ... },
    { "file_id": 124, "status": "success", ... }
  ],
  "total_uploaded": 2,
  "total_failed": 0,
  "total_size": 204800
}
```

#### Get File Metadata
```
GET /api/files/{file_id}
Description: Get file details and metadata
Auth: Required
Response: 200 OK
{
  "id": 123,
  "filename": "soil_sample_20260419_12ab34cd.jpg",
  "original_filename": "soil_sample.jpg",
  "folder_id": 1,
  "file_type": "image",
  "file_size": 102400,
  "tags": ["soil", "loamy", "test"],
  "description": "Soil sample analysis",
  "is_processed": true,
  "created_at": "2026-04-19T10:30:00",
  "metadata": {
    "width": 800,
    "height": 600,
    "image_features": {
      "format": "JPEG",
      "mode": "RGB"
    }
  }
}
```

#### Download File
```
GET /api/files/download/{file_id}
Description: Download file content
Auth: Required
Response: 200 OK - File binary content
Headers: Content-Disposition: attachment
```

#### Get File Thumbnail
```
GET /api/files/thumbnail/{file_id}
Description: Download image thumbnail (200x200)
Auth: Required
Response: 200 OK - JPEG image
```

#### List Folder Files
```
GET /api/files/folder/{folder_id}
Description: Get all files in a folder
Auth: Required
Response: 200 OK - Array of files
```

#### Search Files
```
GET /api/files/search
Description: Search files by name, tags, description
Auth: Required
Query Parameters:
- query: string (required) - search term
- file_type: string (optional) - "image" or "csv"
- folder_id: integer (optional) - scope to folder
- limit: integer (optional, default: 50)
Response: 200 OK - Array of matching files
```

#### Update File Metadata
```
PUT /api/files/{file_id}
Description: Update file description and tags
Auth: Required
Query Parameters:
- description: string (optional)
- tags: string (optional, comma-separated)
Response: 200 OK - Updated file
```

#### Delete File
```
DELETE /api/files/{file_id}
Description: Delete file
Auth: Required
Query Parameters:
- delete_from_storage: boolean (default: true)
Response: 204 No Content
```

#### Get User File Statistics
```
GET /api/files/stats/user
Description: Get user's file statistics
Auth: Required
Response: 200 OK
{
  "total_files": 25,
  "total_images": 20,
  "total_csvs": 5,
  "total_size_bytes": 10485760,
  "total_size_mb": 10.0,
  "processed_files": 18,
  "unprocessed_files": 7
}
```

#### Get Recently Modified Files
```
GET /api/files/recent/modified
Description: Get recently modified files
Auth: Required
Query Parameters:
- limit: integer (default: 20)
Response: 200 OK - Array of files (sorted by updated_at DESC)
```

---

### 🤖 RAG Pipeline (`/rag`)

#### Query RAG (Enhanced)
```
POST /rag/query
Description: Query LLM with optional file/folder scoping
Auth: Required
Body:
{
  "query": "What type of soil is this?",
  "file_id": 123,      // optional - scope to specific file
  "folder_id": 1,      // optional - scope to folder
  "session_id": null   // optional - for multi-turn chat
}
Response: 200 OK
{
  "answer": "This appears to be a loamy soil with good organic content...",
  "source_files": ["soil_sample.jpg"],
  "confidence": null
}
```

#### Upload and Vectorize (Admin Only)
```
POST /rag/upload_and_vectorize
Description: Add document to ChromaDB vector store
Auth: Required (admin only)
Form Data:
- file: UploadFile (PDF/document)
Response: 200 OK
{
  "detail": "Successfully vectorized document.pdf",
  "chunks_added": 45,
  "docs": [...]
}
```

#### List Vector Chunks (Admin Only)
```
GET /rag/chunks
Description: List all chunks in vector database
Auth: Required (admin only)
Response: 200 OK
{
  "total_chunks": 450,
  "chunks": [...]
}
```

---

## User Roles & Permissions

### 👤 Admin Role
- ✅ All CRUD operations on own files/folders
- ✅ Register new users with roles
- ✅ Upload and vectorize documents
- ✅ View all vector chunks
- ✅ Access all management endpoints

### 🔬 Researcher Role
- ✅ All CRUD operations on own files/folders
- ✅ Query RAG pipeline
- ✅ Upload files
- ❌ Cannot register other users
- ❌ Cannot access admin endpoints

### 👥 User Role
- ✅ Query RAG pipeline (read-only)
- ✅ View own files/folders
- ❌ Cannot upload files
- ❌ Cannot modify files
- ❌ Cannot access admin functions

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Tokens are valid for: `JWT_EXP_MINUTES` (default: 30 minutes)

---

## File Size Limits

- **Maximum File Size**: 100 MB
- **Allowed Image Types**: .jpg, .jpeg, .png
- **Allowed Data Types**: .csv
- **Image Auto-Processing**:
  - Max dimensions: 4000x4000 px
  - JPEG quality: 90 (high quality)
  - Thumbnail: 200x200 px @ 85 quality

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "File type not allowed"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "detail": "Access denied"
}
```

### 404 Not Found
```json
{
  "detail": "File not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Upload failed: [error details]"
}
```

---

## Example Workflows

### Workflow 1: Admin Setup
```
1. Login with admin credentials
2. Create folder: "Mission Alpha"
3. Create subfolder: "Soil Samples"
4. Upload image to subfolder
5. Image auto-processed with thumbnail
6. Query RAG with file scope
```

### Workflow 2: Researcher Analysis
```
1. Login with researcher credentials
2. Navigate to folder hierarchy
3. Download image with thumbnail
4. Query RAG about specific image
5. Search all images by tags
6. Generate statistics
```

### Workflow 3: Batch Upload
```
1. Select multiple images
2. Upload batch to folder
3. System auto-processes all
4. Creates thumbnails
5. Extracts metadata
6. Ready for RAG queries
```

---

## Status & Performance

- ✅ Database: PostgreSQL (async)
- ✅ ORM: SQLAlchemy async
- ✅ Image Processing: PIL/Pillow
- ✅ Vector Store: ChromaDB
- ✅ LLM: Groq API
- ✅ File Storage: Local filesystem
- ⏳ Search: Filename + tags (future: full-text)
- ⏳ Sharing: SharedFolder table (future)
- ⏳ CSV parsing: Foundation ready

---

## Troubleshooting

### Import Error: `No module named 'app.routes.upload'`
**Solution**: Ensure `app/routes/upload.py` exists and `__init__.py` is in routes directory

### Token Expired
**Solution**: Call `/auth/login` again to get new token

### Folder Not Found
**Solution**: Verify folder_id belongs to current user

### Image Processing Failed
**Solution**: Check file is valid image. System returns original file if processing fails.

### File Size Exceeds Limit
**Solution**: Maximum file size is 100 MB. Compress or split larger files.

---

## Version History

- **v2.0.0** (Current) - Phase 2 Complete
  - Folder hierarchy management
  - File upload with auto-processing
  - Image thumbnails and features
  - RAG file scoping
  - Researcher role support
  - Batch operations

- **v1.0.0** - Initial release
  - Basic chat interface
  - Image upload (legacy)
  - RAG pipeline
