# Image Upload & Retrieval System - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React/Vue)                     │
│  - Image Upload Form                                            │
│  - Mission Selection Dropdown                                   │
│  - Image Gallery                                                │
│  - Folder Navigation                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTP Requests
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              app/routes/files.py                        │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  POST /files/images/upload                      │   │   │
│  │  │    └─ Upload image to mission folder            │   │   │
│  │  │                                                 │   │   │
│  │  │  GET /files/images                              │   │   │
│  │  │    └─ List all missions                          │   │   │
│  │  │                                                 │   │   │
│  │  │  GET /files/images/{path}                       │   │   │
│  │  │    └─ Browse folder & get image URLs            │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                    ↓                                    │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │     app/utils/image_manager.py                  │   │   │
│  │  │  - File validation                              │   │   │
│  │  │  - Path management                              │   │   │
│  │  │  - Security checks                              │   │   │
│  │  │  - Directory operations                         │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                    ↓                                    │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │     app/schemas.py                              │   │   │
│  │  │  - ImageUploadResponse                          │   │   │
│  │  │  - DirectoryStructure                           │   │   │
│  │  │  - FolderContents                               │   │   │
│  │  │  - DirectoryItem                                │   │   │
│  │  │  - ImageFileResponse                            │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ File System Operations
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    File System                                   │
│  storage/                                                        │
│  └── images/                                                     │
│      ├── mission_alpha/                                          │
│      │   ├── image1.jpg                                          │
│      │   ├── image2.png                                          │
│      │   └── subfolder/                                          │
│      │       └── deep_image.jpg                                  │
│      ├── mission_beta/                                           │
│      │   └── data.jpg                                            │
│      └── mission_gamma/                                          │
│          └── result.png                                          │
└─────────────────────────────────────────────────────────────────┘
```
---

## File Organization Example

```
Scenario: User uploads images for 2 missions with subfolders

After uploads, filesystem looks like:

storage/
└── images/
    ├── mission_alpha/
    │   ├── crater_scan_1.jpg         ← Direct upload
    │   ├── crater_scan_2.jpg         ← Direct upload
    │   ├── terrain_analysis/         ← Auto-created subfolder
    │   │   ├── analysis_1.jpg
    │   │   └── analysis_2.jpg
    │   └── detailed_maps/            ← Auto-created subfolder
    │       └── map.png
    │
    └── mission_beta/
        ├── raw_data/
        │   ├── image_001.jpg
        │   ├── image_002.jpg
        │   └── image_003.jpg
        └── processed/
            ├── result_1.png
            └── result_2.png


API Navigation Example:

GET /files/images
→ Returns: [mission_alpha folder, mission_beta folder]

GET /files/images/mission_alpha
→ Returns: [terrain_analysis folder, detailed_maps folder]
           [crater_scan_1.jpg, crater_scan_2.jpg URLs]

GET /files/images/mission_alpha/terrain_analysis
→ Returns: [analysis_1.jpg, analysis_2.jpg URLs]
```
---

## Code Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    files.py Routes                        │
│  (Endpoint handlers, request/response handling)           │
└──────────────────┬───────────────────────────────────────┘
                   │
          depends on / calls
                   ↓
┌──────────────────────────────────────────────────────────┐
│              image_manager.py Utilities                   │
│  (Reusable business logic)                               │
│                                                          │
│  • File validation                                       │
│  • Path management                                       │
│  • Directory operations                                  │
│  • Security checks                                       │
└──────────────────┬───────────────────────────────────────┘
                   │
          uses / returns
                   ↓
┌──────────────────────────────────────────────────────────┐
│               schemas.py Models                           │
│  (Data validation & serialization)                       │
└──────────────────┬───────────────────────────────────────┘
                   │
           returns to frontend
                   ↓
┌──────────────────────────────────────────────────────────┐
│                  Frontend (JSON)                          │
└──────────────────────────────────────────────────────────┘
```
---

## Integration Points

### With Authentication
```
Future: Add @router.get() with Depends(get_current_user)
This would:
- Restrict image access per user
- Track image ownership
- Enable sharing controls
```

### With Database
```
Future: Link to Image model in database.py
This would:
- Store metadata (uploaded_by, upload_time, etc.)
- Enable search and filtering
- Create audit trails
- Support image versioning
```

### With Chat Sessions
```
Future: Reference images in Chat model
This would:
- Associate images with specific chats
- Enable image-based analysis
- Store analysis results
- Create image-chat relationships
```

---

## Summary

The image system provides:

✅ **Simple API** - Just 3 main endpoints
✅ **Secure** - Path traversal & file type protection
✅ **Scalable** - Handles unlimited files and folders
✅ **Intuitive** - Mission-based organization
✅ **Extensible** - Ready for database integration
✅ **User-friendly** - Clear error messages

Perfect foundation for image management in TerraBot! 🚀
