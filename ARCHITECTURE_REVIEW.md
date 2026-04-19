# Architecture Plan Review Checklist

## 📋 Review This Plan

Complete document: `ARCHITECTURE_PLAN.md`

---

## 🎯 Key Decisions to Confirm

### 1. **Service Layer Pattern**
- [ ] Approve using service classes (StorageService, FileService, FolderService)?
- [ ] OK to abstract storage (allows future S3 migration)?

**If NO**: Alternative is to keep all logic in routes (not recommended)

---

### 2. **Database Schema - New Tables**

#### Folder Table
- [ ] Unlimited folder nesting OK?
- [ ] Self-referential parent_id acceptable?
- [ ] Need description field for metadata?

#### File Table
- [ ] Replace Image table approach acceptable?
- [ ] JSON tags field for flexibility OK?
- [ ] Store both filename and original_filename?

#### FileMetadata Table
- [ ] Separate table for metadata (not bloating File)?
- [ ] JSON custom_metadata for extensibility OK?

#### SharedFolder Table (Future)
- [ ] OK to add now even if not implementing sharing yet?
- [ ] Permission levels (view, edit, admin) sufficient?

**If NO on any**: Tell us what to change

---

### 3. **Chat Table Modification**
- [ ] Change image_id → file_id acceptable?
- [ ] Keep image_id for backward compatibility?
- [ ] Migration script needed?

**Current**: Chat has image_id (FK to Image)  
**Proposed**: Chat has file_id (FK to File) + legacy image_id for compatibility

---

### 4. **RAG Pipeline - Zero Changes**
- [ ] Confirming RAG logic completely unchanged?
- [ ] File IDs simply replace Image IDs?
- [ ] Agents and retriever work as-is?

**CRITICAL**: We will NOT modify:
- ask_llm() function
- Query understanding agent
- Retriever agent
- ChromaDB integration

---

### 5. **API Endpoints**
- [ ] Folder endpoints design (create, read, move, hierarchy)?
- [ ] File endpoints design (upload, download, search, move)?
- [ ] Storage endpoints (serve files, thumbnails)?
- [ ] Enhanced chat endpoints with file_id?

---

### 6. **Storage Strategy**
- [ ] Keep local file system for now?
- [ ] Plan for S3/Supabase migration later?
- [ ] Abstraction layer via StorageService?

---

### 7. **File Organization**

Current:
```
storage/images/
  mission_alpha/
  mission_beta/
```

Proposed:
```
storage/files/
  {user_id}/{folder_id}/file.jpg
  {user_id}/thumbnails/thumb.jpg
```

- [ ] New structure acceptable?
- [ ] Migrate old images gradually?

---

### 8. **Frontend Support**
- [ ] Drag-and-drop file upload ready?
- [ ] Hierarchical folder browsing support?
- [ ] File metadata (tags, description) needed?
- [ ] Thumbnail generation wanted?

---

### 9. **Security & Access Control**
- [ ] User can only access own files/folders?
- [ ] Admin can see all files?
- [ ] File serving checks access before download?
- [ ] Path traversal attacks prevented?

---

### 10. **Backward Compatibility**
- [ ] Keep existing Image table?
- [ ] Gradual migration of old images?
- [ ] No breaking changes to existing APIs?

---

## 🔍 Technical Questions

### Q1: Async/Await Patterns
- [ ] Confirmed all services use async/await?
- [ ] Database operations async?
- [ ] File I/O async where possible?

### Q2: Error Handling
- [ ] Standard error responses across all endpoints?
- [ ] Validation errors clear?
- [ ] File-not-found vs access-denied clear?

### Q3: Performance Indexes
- [ ] (user_id, parent_id) on Folder table?
- [ ] (user_id, folder_id) on File table?
- [ ] (folder_id) index on File table?
- [ ] Performance OK for large file counts?

### Q4: Transaction Safety
- [ ] Folder deletion cascades properly?
- [ ] File deletion removes from storage and DB?
- [ ] Move operations atomic?

### Q5: Search Functionality
- [ ] Search by filename needed?
- [ ] Search by tags needed?
- [ ] Full-text search in file content (future)?

---

## 📊 Implementation Timeline

- [ ] **Week 1**: Database models + migration (Phase 1-2)
- [ ] **Week 2**: Service layer + routes (Phase 2-3)
- [ ] **Week 3**: RAG integration + testing (Phase 5)
- [ ] **Week 4**: Documentation + polish (Phase 6)

**Total**: 4 weeks for complete implementation

---

## 💡 Questions for You

1. **File Types**: Should backend support PDFs, DOCX, etc., or just images?
   - [ ] Images only (current)
   - [ ] All file types

2. **Metadata Extraction**: Should we extract metadata (OCR for images, pages for PDFs)?
   - [ ] Yes (more complex, Phase 7)
   - [ ] No (keep simple)

3. **Sharing Features**: Do users need to share files/folders?
   - [ ] Yes (need SharedFolder table, share endpoints)
   - [ ] No (single-user use)

4. **Versioning**: Should we track file versions?
   - [ ] Yes (more complex)
   - [ ] No (current version only)

5. **Search**: What search features needed?
   - [ ] Filename search
   - [ ] Tag search
   - [ ] Both
   - [ ] Neither (browsing only)

6. **Image Processing**: Resize/compress on upload?
   - [ ] Yes (need ImageProcessor service)
   - [ ] No (store originals only)

7. **Asynchronous Processing**: Use background jobs (Celery/Inngest)?
   - [ ] Yes (better UX, more complex)
   - [ ] No (synchronous for now)

---

## ✅ Ready to Proceed?

When you've reviewed:
1. Read [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md)
2. Review the three diagrams above
3. Answer the questions in this checklist
4. Let us know any changes needed

Then we'll proceed to **Phase 1: Implementation**

---

## 🚀 Once Approved

We will create detailed implementations for:
- [x] Database migrations
- [x] SQLAlchemy models
- [x] Service layer classes
- [x] Route implementations
- [x] Pydantic schemas
- [x] Error handling
- [x] Integration tests
- [x] API documentation

---

**Status**: ⏳ Awaiting Your Review & Approval
