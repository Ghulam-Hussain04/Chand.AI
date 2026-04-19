# TerraBot Backend - Modular RAG + File Management Architecture

## 📊 Executive Summary

This plan outlines a **modular, scalable backend architecture** that:
- ✅ Keeps RAG pipeline logic **completely untouched**
- ✅ Adds hierarchical folder management with metadata
- ✅ Supports image uploads with drag-and-drop
- ✅ Maintains clean separation between RAG and file management
- ✅ Prepares for easy frontend integration
- ✅ Allows future migration to cloud storage (S3, Supabase)

---

## 🏗️ Architecture Overview

### Current State
```
FastAPI Backend
├── Auth (JWT, SQLAlchemy User)
├── RAG Pipeline (Unchanged)
│   ├── Query Understanding Agent
│   └── Retriever Agent (ChromaDB)
├── Image Upload (Mission-based only)
└── Chat Sessions
```

### Proposed State
```
FastAPI Backend (Modular)
├── Auth (JWT, SQLAlchemy User) ✓ Keep as-is
├── Core Services Layer (NEW)
│   ├── StorageService (abstraction)
│   ├── FolderService (hierarchy)
│   └── FileService (CRUD)
├── RAG Pipeline (UNCHANGED) ✓ Zero changes to logic
│   ├── Query Understanding Agent
│   └── Retriever Agent (ChromaDB)
├── Enhanced Chat/RAG Routes
│   └── Now linked to File instead of Image
├── File Management Routes (NEW)
│   ├── Folder CRUD
│   ├── File CRUD
│   └── Storage endpoints
└── Enhanced Image Upload (NEW)
    ├── Support for any file type
    ├── Hierarchical organization
    └── Drag-and-drop support
```

---

## 📋 Database Schema Changes

### New Tables

#### **Folder Table**
```sql
Folder {
  id: Int PRIMARY KEY
  name: String (255)
  parent_id: Int (FK to Folder, NULL for root)
  user_id: Int (FK to User)
  description: String (optional metadata)
  created_at: DateTime
  updated_at: DateTime
  
  Indexes:
  - (user_id, parent_id) for listing
  - (parent_id) for traversal
}
```
**Purpose**: Enables unlimited folder nesting, metadata, and hierarchy.

#### **File Table**
```sql
File {
  id: Int PRIMARY KEY
  filename: String (required)
  original_filename: String (for display)
  folder_id: Int (FK to Folder)
  storage_path: String (relative path)
  file_type: String (MIME type)
  file_size: Int (bytes)
  user_id: Int (FK to User)
  description: String (metadata)
  tags: JSON[] (searchable)
  created_at: DateTime
  updated_at: DateTime
  
  Indexes:
  - (user_id, folder_id) for listing
  - (folder_id) for folder contents
}
```
**Purpose**: Replaces Image table, supports all file types, links to RAG/Chat.

#### **FileMetadata Table**
```sql
FileMetadata {
  id: Int PRIMARY KEY
  file_id: Int (FK to File, UNIQUE)
  width: Int (images only)
  height: Int (images only)
  pages: Int (PDFs only)
  extracted_text: Text (OCR result)
  custom_metadata: JSON (extensible)
  created_at: DateTime
}
```
**Purpose**: Extensible metadata storage without bloating File table.

#### **SharedFolder Table** (for future)
```sql
SharedFolder {
  id: Int PRIMARY KEY
  folder_id: Int (FK to Folder)
  shared_with_user_id: Int (FK to User)
  permission_level: ENUM(view, edit, admin)
  created_at: DateTime
  
  Unique: (folder_id, shared_with_user_id)
}
```
**Purpose**: Multi-user collaboration (future phase).

### Modified Tables

#### **Chat Table** (update)
```
Replace:
  - image_id: Int → file_id: Int (FK to File)

Benefits:
  - Supports all file types, not just images
  - Links to File table for metadata
  - Works seamlessly with RAG
```

---

## 🎯 API Endpoints Design

### Folder Management (NEW)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/folders` | Create folder |
| GET | `/folders/{id}` | Get folder + contents |
| GET | `/folders/{id}/hierarchy` | Get full tree recursively |
| PUT | `/folders/{id}` | Update folder metadata |
| DELETE | `/folders/{id}` | Delete folder (cascade) |
| GET | `/folders/user/root` | List root folders for user |
| POST | `/folders/{id}/move` | Move folder under new parent |

### File Management (ENHANCED)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/files/upload` | Upload file(s) to folder |
| GET | `/files/{id}` | Get file metadata |
| GET | `/files/{id}/download` | Download file |
| GET | `/files/{id}/preview` | Get thumbnail/preview |
| PUT | `/files/{id}` | Update file metadata |
| DELETE | `/files/{id}` | Delete file |
| POST | `/files/search` | Search files by name/tags/content |
| POST | `/files/{id}/move` | Move file to folder |

### File Serving (NEW)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/storage/files/{id}` | Serve actual file |
| GET | `/storage/thumbnails/{id}` | Serve thumbnail |

### Enhanced RAG/Chat

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/chats` | Create chat (now with file_id) |
| POST | `/rag/ask` | Query RAG (with file scope) |
| GET | `/rag/` | List chunks (filtered by file) |

---

## 🔧 Code Structure

### Directory Organization

```
app/
├── db/
│   ├── models/              (NEW)
│   │   ├── folder.py
│   │   ├── file.py
│   │   └── file_metadata.py
│   └── database.py          (existing, enhanced)
│
├── services/                (NEW)
│   ├── storage_service.py   - File I/O abstraction
│   ├── folder_service.py    - Folder hierarchy logic
│   └── file_service.py      - File CRUD & metadata
│
├── routes/
│   ├── auth.py              (unchanged)
│   ├── chats.py             (enhanced for File)
│   ├── rag.py               (enhanced for File)
│   ├── files.py             (heavily enhanced)
│   └── folders.py           (NEW)
│
├── utils/
│   ├── image_manager.py     (refactored)
│   ├── validators.py        (NEW)
│   ├── file_handler.py      (NEW)
│   └── hierarchy.py         (NEW)
│
├── rag/                     (UNCHANGED)
│   ├── pipeline.py
│   └── llm_client.py
│
└── agents/                  (UNCHANGED)
    ├── query_understanding_agent.py
    └── retriever_agent.py
```

### Service Layer Pattern

```python
# StorageService - Abstraction for file operations
class StorageService:
    async def save_file(path: str, content: bytes) -> Path
    async def delete_file(path: str) -> bool
    async def get_file(path: str) -> bytes
    async def get_url(path: str) -> str

# FolderService - Hierarchy operations
class FolderService:
    async def create(user_id, name, parent_id) -> Folder
    async def get_hierarchy(folder_id) -> TreeStructure
    async def move(folder_id, new_parent_id) -> Folder

# FileService - File CRUD
class FileService:
    async def upload(folder_id, file, metadata) -> File
    async def get(file_id) -> FileWithMetadata
    async def search(user_id, query) -> List[File]
    async def move(file_id, folder_id) -> File
```

---

## 🔗 RAG Pipeline Integration

### Current State (No Changes Required)
```
RAG Routes → ask_llm() → Query Agent → Retriever Agent → ChromaDB
```

### With New File System (Seamless Integration)
```
User uploads image → Stored as File record → Chat.file_id = File.id
                                               ↓
User asks question → RAG scope to File.id → Query Agent → Retriever
                                          (ChromaDB vectors tagged with file_id)
```

**Key Points:**
- ✅ RAG pipeline logic **completely unchanged**
- ✅ File table ID simply replaces Image ID
- ✅ Metadata available to agents via File object
- ✅ Folder context available for scoped searches
- ✅ Future-proof for document types beyond images

---

## 📁 Storage Directory Structure

### Current
```
storage/
└── images/
    ├── mission_alpha/
    └── mission_beta/
```

### Proposed
```
storage/
├── files/                          # New centralized location
│   └── {user_id}/
│       ├── {folder_id}/
│       │   ├── file_abc123.jpg
│       │   ├── file_def456.png
│       │   └── doc_ghi789.pdf
│       └── thumbnails/
│           ├── file_abc123_thumb.jpg
│           └── file_def456_thumb.jpg
│
└── images/                         # Keep for backward compatibility
    ├── mission_alpha/              # Migrate gradually
    └── mission_beta/
```

**Benefits:**
- Clear user-folder separation
- Secure (can't access other user files)
- Scalable (easy to migrate to S3)
- Thumbnail generation support

---

## 🔐 Security & Access Control

### Folder Access Control
```python
# User can only:
- See own folders
- Create subfolders in own folders
- Share folders (future feature)

# Admin can:
- See all folders
- Delete any folder
```

### File Serving Security
```python
@router.get("/storage/files/{file_id}")
async def serve_file(file_id: int, current_user = Depends(verify_token)):
    file = get_file_by_id(file_id)
    
    # Check: User owns file's folder
    if file.folder.user_id != current_user.user_id:
        raise HTTPException(403, "Access denied")
    
    return FileResponse(file.storage_path)
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Models (Week 1)
- [ ] Create SQLAlchemy models (Folder, File, FileMetadata, SharedFolder)
- [ ] Create migration scripts
- [ ] Setup backward compatibility layer
- [ ] Test schema with sample data

### Phase 2: Service Layer (Week 1-2)
- [ ] Implement StorageService (local fs abstraction)
- [ ] Implement FolderService (hierarchy logic)
- [ ] Implement FileService (CRUD + metadata)
- [ ] Unit tests for all services

### Phase 3: Routes & Endpoints (Week 2)
- [ ] Create `/folders.py` route
- [ ] Enhance `/files.py` route
- [ ] Update `/chats.py` to use File instead of Image
- [ ] Update `/rag.py` for File integration
- [ ] Integration tests

### Phase 4: Frontend Support (Week 2-3)
- [ ] CORS headers for downloads
- [ ] Progress tracking schema
- [ ] Batch operation handling
- [ ] Error handling patterns

### Phase 5: RAG Integration (Week 3)
- [ ] Link Chat table to File instead of Image
- [ ] Test chat creation with files
- [ ] Test RAG queries with file scope
- [ ] Verify no RAG logic changes

### Phase 6: Documentation & Testing (Week 3-4)
- [ ] API documentation
- [ ] Postman collection
- [ ] Frontend integration guide
- [ ] Full test suite

---

## 📊 Key Design Decisions

### 1. Service Layer Pattern ✅
- **Why**: Abstracts storage implementation, allows future S3 migration
- **Impact**: Easy to swap backends without changing routes

### 2. Hierarchical Folders ✅
- **Why**: Reference project uses same, user-friendly
- **Impact**: Unlimited nesting depth with performance indexes

### 3. File vs Image Table ✅
- **Why**: Supports all file types, not just images
- **Impact**: RAG can work with PDFs, documents, etc.

### 4. JSON Metadata Field ✅
- **Why**: Extensible without schema changes
- **Impact**: Easy to add OCR, ML tags, custom properties

### 5. Zero RAG Changes ✅
- **Why**: RAG logic is complex and working well
- **Impact**: Focus on file management layer, RAG integration is just ID linking

### 6. Backward Compatibility ✅
- **Why**: Don't break existing Image table usage
- **Impact**: Can migrate gradually, test thoroughly

---

## 🎨 Frontend Integration Ready

This backend design supports:

### File Upload
```
Drag & drop files → Multiple folder selection
                 ↓
Form submission → POST /files/upload?folder_id=X
                 ↓
Progress tracking → { status, progress_percent, file_id }
```

### File Browser
```
GET /folders/{id} → { subfolders, files }
                  ↓
Tree view component ← Recursive hierarchy
```

### File Operations
```
Right-click menu:
- Move to folder
- Rename
- Add tags
- Delete
- Share (future)
```

### Chat with Files
```
Select file(s) → Create chat → POST /chats?file_ids=1,2,3
                             ↓
RAG scoped to files → Better context
```

---

## ✨ Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Organization** | Mission folders only | Unlimited hierarchy |
| **Metadata** | Minimal | Extensible JSON |
| **File Types** | Images only | Any file type |
| **RAG Integration** | Tightly coupled | Clean interface |
| **Scalability** | Local storage only | Abstracted for cloud |
| **Frontend Ready** | Partial | Full support |
| **RAG Logic** | Works | Completely unchanged |
| **Modularity** | Low | High (service layer) |

---

## ⚠️ Important Notes

### RAG Pipeline Protection
- ✅ Zero changes to RAG logic
- ✅ RAG agents work exactly as before
- ✅ File IDs simply replace Image IDs
- ✅ Can verify by running existing test suite

### Backward Compatibility
- ✅ Image table remains accessible
- ✅ Gradual migration path available
- ✅ No breaking changes to existing APIs (yet)

### Frontend Branch
- ✅ Backend complete and tested first
- ✅ Then switch frontend branch
- ✅ Integration will be straightforward

---

## 📝 Approval Checklist

Before implementation, confirm:

- [ ] Architecture approach approved
- [ ] Database schema changes acceptable
- [ ] Service layer pattern makes sense
- [ ] API endpoint design matches requirements
- [ ] RAG pipeline protection confirmed
- [ ] Timeline acceptable
- [ ] Storage strategy OK (can migrate later to cloud)

---

## 🎯 Next Steps

1. **Review** this document
2. **Provide feedback** on any changes needed
3. **Approve** the architecture
4. **Start Phase 1** implementation
5. **Test thoroughly** before moving to Phase 2

---

**Created**: April 19, 2026  
**Status**: Ready for Review  
**Review By**: User  
