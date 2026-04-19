# TerraBot Backend - Architecture Plan Summary

**Date**: April 19, 2026  
**Status**: ✅ PLANNING COMPLETE - Ready for Review & Approval

---

## 📋 What I've Created For You

### 1. **ARCHITECTURE_PLAN.md** (Comprehensive Guide)
A detailed document covering:
- Executive summary
- Architecture overview (current vs. proposed)
- Complete database schema design
- API endpoints specification
- Code structure and organization
- Service layer pattern
- RAG integration (UNCHANGED)
- Storage strategy
- Security considerations
- Implementation phases
- Design decisions explained

**Read Time**: 20 minutes  
**Action**: Review for technical soundness

---

### 2. **ARCHITECTURE_REVIEW.md** (Approval Checklist)
A structured checklist for you to:
- Confirm key design decisions
- Answer technical questions
- Specify requirements
- Approve before implementation starts

**Read Time**: 15 minutes  
**Action**: Fill out and provide feedback

---

### 3. **Visual Diagrams** (Above in chat)
Three Mermaid diagrams showing:
- **Component Architecture**: How all pieces fit together
- **Database Schema**: Table relationships and structure
- **Data Flow**: User scenarios and integration points

**View**: Already rendered above  
**Action**: Reference for understanding architecture

---

## 🎯 Key Points of The Plan

### ✅ What We're KEEPING (No Changes)
```
- RAG Pipeline logic (completely untouched)
- Query Understanding Agent
- Retriever Agent  
- ChromaDB integration
- Auth system (JWT, User model)
- Chat session model (just updating to use File instead of Image)
```

### 🆕 What We're ADDING
```
- Hierarchical folder management
- File table (replaces limited Image table)
- FileMetadata table (extensible metadata)
- StorageService (abstraction layer)
- FolderService (hierarchy logic)
- FileService (CRUD operations)
- New routes: /folders, enhanced /files
- Search capabilities
```

### 🔄 What We're ENHANCING
```
- Chat table: image_id → file_id
- /files routes: more comprehensive
- /rag routes: file scoping support
- File upload: support all types, not just images
```

---

## 🏗️ Architecture Highlights

### Modular Design
- Service layer abstracts business logic from routes
- StorageService allows future cloud migration (S3, Supabase)
- Each service has clear responsibility
- Easy to test independently

### Database Smart Design
- Hierarchical folders with self-referential parent_id
- File table replaces Image table (more flexible)
- FileMetadata separates complex metadata
- Strategic indexes for performance
- Backward compatibility with existing Image table

### RAG Protection
- **ZERO changes to RAG pipeline logic**
- RAG simply receives file_id instead of image_id
- File metadata available to RAG agents
- Folder context available for scoped searches

### Security First
- User can only access own files/folders
- Access control checked on file serving
- Path traversal attacks prevented
- Admin can see all files

### Frontend Ready
- Drag-and-drop upload support
- Hierarchical folder browsing
- File search and filter
- Batch operations
- Progress tracking

---

## 📊 Technical Stack Remains

```
- Backend: FastAPI (async)
- Database: PostgreSQL + SQLAlchemy ORM
- Vector DB: ChromaDB (RAG)
- LLM: Groq API
- Auth: JWT tokens
- Storage: Local filesystem (with abstraction for cloud)
```

**No new external dependencies needed** (can add later if wanted - Celery, Inngest, etc.)

---

## 🎯 Implementation Roadmap

### Phase 1: Database & Models (1 week)
- SQLAlchemy models for Folder, File, FileMetadata
- Database migrations
- Backward compatibility layer

### Phase 2: Service Layer (1 week)
- StorageService, FolderService, FileService
- Unit tests for services

### Phase 3: Routes & Endpoints (1 week)
- /folders routes (create, read, update, delete, move)
- Enhanced /files routes
- Enhanced /chats and /rag routes
- Integration tests

### Phase 4-6: Polish & Testing (1 week)
- Frontend support (CORS, errors, etc.)
- Documentation
- Full test suite

**Total**: 4 weeks for production-ready implementation

---

## ✨ Benefits You Get

| Aspect | Impact |
|--------|--------|
| **Organization** | Users can create unlimited nested folders |
| **Flexibility** | Support any file type (images, PDFs, documents) |
| **Metadata** | Extensible JSON fields for future enhancements |
| **RAG Integration** | Seamless - RAG queries scoped to files |
| **Scalability** | Service layer allows cloud storage migration |
| **Modularity** | Clean separation between RAG and file management |
| **Frontend Ready** | API designed for drag-and-drop, tree views |
| **Future Proof** | Easy to add sharing, versioning, OCR, etc. |
| **Performance** | Strategic database indexes for large file counts |
| **Security** | Access control, no path traversal attacks |

---

## ❓ Before We Start - Your Decisions Needed

I need you to confirm/clarify:

### 1. **File Types**
Should we support all file types or just images?
- [ ] Images only (`.jpg`, `.png`)
- [ ] All types (add `.pdf`, `.docx`, `.txt`, etc.)

### 2. **Search Features**
What search capabilities needed?
- [ ] Search by filename
- [ ] Search by tags
- [ ] Full-text search in files (future, complex)
- [ ] Browse only (no search)

### 3. **Metadata Extraction**
Extract file metadata (OCR, page counts, etc.)?
- [ ] Yes (more features, Phase 7)
- [ ] No (keep simple for now)

### 4. **Async Processing**
Background job processing for heavy operations?
- [ ] Yes (Celery/Inngest later, better UX)
- [ ] No (synchronous for now, simpler)

### 5. **Sharing**
Multi-user file/folder sharing?
- [ ] Yes (need SharedFolder table)
- [ ] No (single-user for now)

### 6. **Image Processing**
Resize/compress images on upload?
- [ ] Yes (need image processor)
- [ ] No (store originals only)

---

## 🚀 Next Steps

### For You:
1. ✅ Read `ARCHITECTURE_PLAN.md` (20 min)
2. ✅ Review visual diagrams (above in chat)
3. ✅ Fill out `ARCHITECTURE_REVIEW.md` checklist
4. ✅ Answer the 6 questions above
5. ✅ Give approval or ask for changes

### Then I Will:
1. Make any requested changes to the plan
2. Start Phase 1 implementation (database models)
3. Create detailed code files per phase
4. Test thoroughly before moving to next phase
5. Update you regularly on progress

---

## 💬 Questions or Concerns?

Feel free to:
- Ask for clarifications on any architecture decisions
- Suggest changes to the design
- Request different approach for any component
- Point out issues or concerns
- Share specific requirements I may have missed

**Goal**: Get the architecture 100% approved before starting implementation

---

## 📝 Files Created

1. **`ARCHITECTURE_PLAN.md`** - Complete architecture document
2. **`ARCHITECTURE_REVIEW.md`** - Review checklist
3. **Diagrams** - Visual representations (rendered above)

All files are in the project root: `c:\Users\Dell\Desktop\FYP\Backend\dr-terra-prototype\`

---

## ✅ Architecture Principle

> **"Keep RAG pipeline untouched. Add modularity around it."**

The RAG system works well. We're not changing it. We're adding a professional file management layer around it that will:
- Make it easier to organize files
- Support the frontend features you need
- Allow future scaling to cloud storage
- Keep the code clean and maintainable

---

**Status**: 🎯 Ready for Your Review & Approval  
**Next Action**: Your Feedback & Approval
**Then**: Implementation Begins!

---

## 📞 Ready to Proceed?

Let me know:
1. ✅ Any changes needed?
2. ✅ Answers to the 6 questions above?
3. ✅ Approval to proceed with Phase 1?

Once you confirm, I'll start implementation immediately!

