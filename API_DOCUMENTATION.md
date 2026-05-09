# API Documentation — Dr. Terra / Chand.AI Backend v3.0

Base URL: `http://localhost:8000`  
Authentication: Bearer JWT token (obtained from `/auth/login`)

---

## Authentication

### POST `/auth/login`
Obtain a JWT access token.

**Request body**
```json
{ "username_or_email": "admin", "password": "admin123" }
```
**Response `200`**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2026-05-09T00:00:00"
  }
}
```

### POST `/auth/register`  *(Admin only)*
Create a new user or researcher account.

**Headers**: `Authorization: Bearer <admin_jwt>`

**Request body**
```json
{
  "username": "jane",
  "email": "jane@example.com",
  "password": "secure_pw",
  "role": "researcher"
}
```
**Response `201`** — `UserResponse` object.

---

## Folders (Projects)

All endpoints require `Authorization: Bearer <jwt>`.

### POST `/api/folders`
Create a new project folder.

**Request body**
```json
{
  "name": "Apollo Basin Survey",
  "description": "Crater analysis project",
  "parent_id": null,
  "specifications": {
    "mission_name": "Chang4",
    "meters_per_pixel": 0.3,
    "camera_angle_deg": 20.0,
    "camera_resolution_w": 2048,
    "camera_resolution_h": 2048,
    "camera_fov_deg": 60.0,
    "rover_height_m": 1.8,
    "notes": "Custom mission"
  }
}
```

> `specifications` is **optional**. When omitted, Chang'e 3 defaults are applied automatically.

**Response `201`** — `FolderResponse`
```json
{
  "id": 5,
  "name": "Apollo Basin Survey",
  "description": "Crater analysis project",
  "parent_id": null,
  "user_id": 1,
  "created_at": "2026-05-09T12:00:00",
  "updated_at": "2026-05-09T12:00:00"
}
```

### GET `/api/folders`
List all root-level folders for the authenticated user.

**Response `200`** — array of `FolderResponse`.

### GET `/api/folders/hierarchy`
Full tree of all folders.

### GET `/api/folders/{folder_id}`
Get a single folder.

### GET `/api/folders/{folder_id}/subfolders`
List direct children.

### GET `/api/folders/{folder_id}/hierarchy`
Subtree rooted at `folder_id`.

### PUT `/api/folders/{folder_id}`
Update name/description via **query parameters**.

`PUT /api/folders/5?name=New+Name&description=Updated`

### DELETE `/api/folders/{folder_id}?cascade=true`
Delete folder and (optionally) all its contents.

### POST `/api/folders/{folder_id}/move`
Move folder to a new parent.

`POST /api/folders/5/move?new_parent_id=2`

---

## Project Specifications

Each folder has one specification record. Three endpoints manage it.

### GET `/api/folders/{folder_id}/specifications`
Retrieve mission calibration parameters for a project.

Returns Chang'e 3 defaults if no custom specs exist.

**Response `200`** — `ProjectSpecificationResponse`
```json
{
  "id": 3,
  "folder_id": 5,
  "mission_name": "Chang3",
  "meters_per_pixel": 0.5,
  "camera_angle_deg": 15.0,
  "camera_resolution_w": 1024,
  "camera_resolution_h": 1024,
  "camera_fov_deg": 45.0,
  "rover_height_m": 1.5,
  "notes": "Lunar lander with Yutu rover, landed Dec 2013. Camera specs approximate.",
  "created_at": "2026-05-09T12:00:00",
  "updated_at": "2026-05-09T12:00:00"
}
```

### POST `/api/folders/{folder_id}/specifications`
Set (create or fully replace) specifications.

**Request body** — `ProjectSpecificationCreate`
```json
{
  "mission_name": "Chang5",
  "meters_per_pixel": 0.25,
  "camera_angle_deg": 10.0,
  "camera_resolution_w": 4096,
  "camera_resolution_h": 3072,
  "camera_fov_deg": 30.0,
  "rover_height_m": 2.0,
  "notes": "High resolution survey"
}
```
**Response `201`** — `ProjectSpecificationResponse`

### PUT `/api/folders/{folder_id}/specifications`
Partially update specifications. Only provided fields are changed.

**Request body** — `ProjectSpecificationUpdate` (all fields optional)
```json
{ "meters_per_pixel": 0.4 }
```
**Response `200`** — updated `ProjectSpecificationResponse`

---

## Files

All endpoints require `Authorization: Bearer <jwt>`.

### POST `/api/files/upload`
Upload an image or CSV file.

**Content-Type**: `multipart/form-data`

| Field         | Type   | Required | Description                |
|---------------|--------|----------|----------------------------|
| `file`        | binary | yes      | Image (jpg/png) or CSV     |
| `folder_id`   | int    | yes      | Target project folder      |
| `description` | string | no       | Optional description       |
| `tags`        | string | no       | JSON array string of tags  |

**Response `200`** — `FileUploadResponse`
```json
{
  "file_id": 12,
  "filename": "render0042.png",
  "original_filename": "render0042.png",
  "folder_id": 5,
  "status": "success",
  "file_size": 245760
}
```

### GET `/api/files`
List all files owned by the user.

### GET `/api/files/{file_id}`
Get file metadata.

### GET `/api/files/download/{file_id}`
Download raw file content.

### GET `/api/files/thumbnail/{file_id}`
Get image thumbnail (200×200 JPEG).

### GET `/api/files/folder/{folder_id}`
List all files in a specific folder.

### GET `/api/files/search?query=crater&file_type=image&folder_id=5`
Search files by name, description, or tags.

### PUT `/api/files/{file_id}`
Update description and/or tags.

**Request body**
```json
{ "description": "Updated", "tags": ["crater", "boulder"] }
```

### DELETE `/api/files/{file_id}`
Delete file from DB and storage.

---

## RAG — Chat with Lunar Terrain Analysis

### POST `/rag/ask`  *(Primary endpoint)*
Send a question to the assistant. When `file_id` is provided the full inference + geo-feature pipeline runs (or returns cached results).

**Headers**: `Authorization: Bearer <jwt>`

**Request body**
```json
{
  "query": "How many rocks are in this image and where are they located?",
  "file_id": 12,
  "session_id": null
}
```

| Field        | Type | Required | Description                                           |
|--------------|------|----------|-------------------------------------------------------|
| `query`      | str  | yes      | Natural language question                             |
| `file_id`    | int  | no       | Image file ID — triggers inference pipeline           |
| `session_id` | int  | no       | Existing chat session to append to (null = new)       |
| `folder_id`  | int  | no       | Scope RAG retrieval to files in this folder           |

**Response `200`**
```json
{
  "response": "The image shows 8 rocks distributed across the terrain, with the largest concentrated in the northwest and southwest quadrants...",
  "chat_id": 42,
  "session_id": 7,
  "response_time_sec": 3.21,
  "inference_cached": true
}
```

**`inference_cached` field**:
- `true` — geo-features were retrieved from the `lunar_features` DB cache.
- `false` — the inference pipeline ran fresh and the result was saved.
- `null` — no `file_id` was provided.

**Inference flow (when `file_id` provided)**:
```
1. Verify file ownership (404 if not found)
2. Query LunarFeatures table for cached result
   ├── Cache hit  → use cached features
   └── Cache miss →
         a. Load ProjectSpecification for the file's folder
         b. Run RF-DETR prediction (Roboflow API or local model)
         c. Run geo-feature extraction pipeline
         d. Save result to LunarFeatures table
3. Inject features into LLM prompt (RAG pipeline)
4. Return LLM response + save Chat record
```

### POST `/rag/query`
Lightweight RAG-only query without image inference.

**Request body** — same as `/rag/ask`  
**Response** — `{"answer": "...", "source_files": [...], "confidence": null}`

### POST `/rag/upload_and_vectorize`  *(Admin only)*
Upload a PDF document into ChromaDB for RAG retrieval.

**Content-Type**: `multipart/form-data`  
**Field**: `file` — PDF document

**Response**
```json
{ "detail": "Successfully vectorised paper.pdf", "chunks_added": 128 }
```

### GET `/rag/chunks`  *(Admin only)*
List all document chunks in ChromaDB.

---

## LunarFeatures — Cached Inference Results

These are not directly exposed as REST endpoints but are automatically managed by `/rag/ask`. The data is accessible via the database or can be inspected by retrieving file metadata.

**LunarFeatures JSON structure** (stored in `features` column):

```json
{
  "image_features": {
    "craters": {
      "1": { "diameter_m": 12.5, "location": {"x": 320.0, "y": 240.0}, "direction_zone": "NE" }
    },
    "rocks": {
      "1": { "size_m": 34.7, "location": {"x": 69.8, "y": 216.0}, "direction_zone": "NW" },
      "2": { "size_m": 29.0, "location": {"x": 110.8, "y": 358.1}, "direction_zone": "SW" }
    },
    "boulders": {
      "1": { "size_m": 238.6, "surface_area_m2": 14180.4, "location": {"x": 378.2, "y": 406.5}, "direction_zone": "S" }
    },
    "rocky_regions": {},
    "artifacts": {},
    "artifact_path": {},
    "confidence_score": [0.869, 0.837, 0.829]
  },
  "craters_count": 1,
  "rocks_count": 2,
  "boulders_count": 1,
  "rocky_regions_count": 0
}
```

**Direction zone values**: `N`, `S`, `E`, `W`, `NE`, `NW`, `SE`, `SW`

---

## Admin — User Management

All endpoints require admin JWT.

### GET `/admin/users`
List all registered users.

### PUT `/admin/users/{user_id}`
Update user role, username, or email.

### DELETE `/admin/users/{user_id}`
Delete a user account.

---

## Error Responses

All errors follow this format:
```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning                                      |
|--------|----------------------------------------------|
| 400    | Bad request (validation, wrong file type)    |
| 401    | Missing or invalid JWT                       |
| 403    | Insufficient role (admin required)           |
| 404    | Resource not found or access denied          |
| 500    | Internal error (inference, LLM, DB)          |

---

## Frontend Integration Guide

### Typical chat-with-image flow

```
1. User selects a project folder
   GET /api/folders → list projects

2. User uploads an image into the project
   POST /api/files/upload  { file, folder_id }
   → save file_id from response

3. (Optional) User views/edits project specifications
   GET /api/folders/{folder_id}/specifications
   PUT /api/folders/{folder_id}/specifications  { meters_per_pixel: 0.3 }

4. User types a question about the image
   POST /rag/ask  { query, file_id, session_id: null }
   → first call runs inference (may take 5–30 s)
   → subsequent calls on same image return instantly (cached)

5. User continues the conversation
   POST /rag/ask  { query, file_id, session_id: <from step 4> }
```

### Handling slow first inference

The first `/rag/ask` call for an image triggers the Roboflow API which may take several seconds. Recommend:
- Show a loading spinner while `inference_cached: false`.
- On `inference_cached: true` (subsequent calls), show the response immediately.

### Session management

- `session_id: null` in the first request → server creates a new session and returns `session_id`.
- Pass the returned `session_id` in all follow-up requests to maintain conversation history.

### Checking if an image has been analysed

Before the first chat, you can optimise UX by checking if features already exist:
- After uploading, store the `file_id`.
- When the first `/rag/ask` responds with `inference_cached: true`, the cache was populated in a previous session — show an indicator.

---

## Changelog

| Version | Change                                                            |
|---------|-------------------------------------------------------------------|
| 3.0.0   | RF-DETR inference pipeline integrated; LunarFeatures cache table; ProjectSpecification per folder; real features in LLM prompt |
| 2.0.0   | Modular RAG + file management refactor                            |
| 1.0.0   | Initial release                                                   |
