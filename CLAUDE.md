# dr-terra-backend — CLAUDE.md

## Project Overview
FastAPI backend for Dr. Terra / Chand.AI — a RAG-based lunar terrain analysis system. Manages users, hierarchical project folders, file uploads (images + CSVs), and a RAG pipeline backed by ChromaDB + Groq LLM.

## Stack
- **Framework**: FastAPI + Uvicorn
- **Database**: PostgreSQL 15 via SQLAlchemy 2 (async, asyncpg driver)
- **Auth**: JWT (HS256, python-jose) + Argon2 password hashing (passlib)
- **Vector DB**: ChromaDB (persistent at `./chroma_db/`)
- **LLM**: Groq API (llama model via `groq` SDK)
- **Storage**: Local disk under `./storage/files/{user_id}/{folder_id}/`
- **Image processing**: Pillow

## Directory Structure
```
app/
├── main.py            FastAPI app + CORS + router registration
├── config.py          Pydantic Settings (reads from .env)
├── security.py        JWT create/verify, Argon2 hash/verify, verify_admin dep
├── schemas.py         All Pydantic request/response models
├── db/
│   ├── database.py    SQLAlchemy models (User, Folder, File, Chat, etc.) + get_db
│   └── init_db.py     DB table creation
├── routes/
│   ├── auth.py        POST /auth/login, POST /auth/register (admin only)
│   ├── folders.py     CRUD + hierarchy for /api/folders
│   ├── upload.py      File upload, list, search, delete for /api/files
│   ├── rag.py         POST /rag/ask, POST /rag/query, admin vectorize
│   ├── admin.py       GET/PUT/DELETE /admin/users (admin only)
│   └── chats.py       Chat session management /chats
├── services/
│   ├── file_service.py    File CRUD with user_id scoping
│   ├── folder_service.py  Folder CRUD + hierarchy builder
│   └── storage_service.py Disk I/O (save/get/delete files + thumbnails)
├── utils/
│   ├── image_processor.py  Validate, resize, thumbnail generation (Pillow)
│   ├── chroma_utils.py     ChromaDB add/query/list chunks
│   └── upload_document_utils.py  PDF/text chunk extraction
├── agents/
│   ├── query_understanding_agent.py  LLM query classification
│   └── retriever_agent.py            ChromaDB + BM25 retrieval
└── rag/
    ├── pipeline.py    ask_llm() — full RAG flow, creates Chat/Session records
    └── llm_client.py  Groq API wrapper
```

## Running the Server
```bash
cd dr-terra-backend
source terra_venv/Scripts/activate   # Windows: terra_venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

## Environment Variables (.env)
| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:hamdan4318@localhost:5432/lunar_db` | Async PostgreSQL |
| `JWT_SECRET_KEY` | `@..1817802ddf3b4f7e4f5` | Keep secret |
| `JWT_ALGORITHM` | `HS256` | |
| `JWT_EXP_MINUTES` | `1440` | 24 hours |
| `STORAGE_DIR` | `./storage` | File storage root |
| `GROQ_API_KEY` | `gsk_...` | Groq LLM API key |

## Database Models (app/db/database.py)
- **User**: id, username (unique), email (unique), hashed_password, role (admin/researcher/user), created_at
- **Folder**: id, name, description, parent_id (self-FK → hierarchy), user_id, created_at, updated_at
- **File**: id, filename, original_filename, folder_id, storage_path, file_type (image/csv), file_size, user_id, description, tags (JSON), is_processed, created_at, updated_at
- **FileMetadata**: file_id (1:1), width, height, image_features (JSON), csv_columns (JSON), csv_row_count
- **ChatSession**: id, title, user_id, created_at, is_deleted
- **Chat**: id, chat_session_id, file_id, question, response, time

## Authentication (app/security.py)
- `verify_token(credentials)` — decodes JWT, returns `TokenPayload(sub, user_id, role, exp)`
- `verify_admin(token)` — wraps `verify_token`, raises 403 if role != "admin"
- All protected routes use `Depends(verify_token)` or `Depends(verify_admin)`
- Login: POST `/auth/login` with `{username_or_email, password}` → `{access_token, token_type, user}`
- Register: POST `/auth/register` — **ADMIN TOKEN REQUIRED** — creates user/researcher roles only

## API Routes

### Auth (`/auth`)
- `POST /auth/login` — public, returns JWT
- `POST /auth/register` — admin only, creates user or researcher

### Folders (`/api/folders`)
All require Bearer token. Route order matters (see upload.py note below):
- `GET /api/folders` — root folders for current user
- `GET /api/folders/hierarchy` — full tree for all root folders
- `GET /api/folders/{id}` — single folder
- `GET /api/folders/{id}/hierarchy` — subtree
- `GET /api/folders/{id}/subfolders` — direct children
- `POST /api/folders` — create (body: `{name, description?, parent_id?}`)
- `PUT /api/folders/{id}` — update (query params: `name`, `description`)
- `DELETE /api/folders/{id}?cascade=true` — delete with contents
- `POST /api/folders/{id}/move` — move to new parent

### Files (`/api/files`)
All require Bearer token. **Static routes must come before `/{file_id}`** (FastAPI route order):
- `GET /api/files` — all files for current user
- `GET /api/files/search?query=...&file_type=...&folder_id=...` — search
- `GET /api/files/stats/user` — count/size stats
- `GET /api/files/recent/modified?limit=20` — recently modified
- `GET /api/files/{id}` — single file metadata
- `GET /api/files/download/{id}` — file content download
- `GET /api/files/thumbnail/{id}` — image thumbnail
- `GET /api/files/folder/{folder_id}` — files in folder
- `POST /api/files/upload` — multipart: `file`, `folder_id`, `description?`, `tags?`
- `PUT /api/files/{id}` — update description/tags (body: `{description?, tags?}`)
- `DELETE /api/files/{id}` — delete file + storage

### RAG (`/rag`)
- `POST /rag/ask` — body: `{query, session_id?, file_id?, folder_id?}` → `{response, chat_id, session_id, response_time_sec}`
- `POST /rag/query` — alternative endpoint, returns `{answer, source_files}`
- `POST /rag/upload_and_vectorize` — admin only, adds PDF to ChromaDB
- `GET /rag/chunks` — admin only, list vector chunks

### Admin (`/admin`)
All require admin Bearer token:
- `GET /admin/users` — list all users
- `PUT /admin/users/{id}` — update role/username/email
- `DELETE /admin/users/{id}` — delete user

## Service Layer
All services are static class methods with `(db: AsyncSession, ..., user_id: int)` signature. Access control is enforced at query level — every query is filtered by `user_id`, so users only see their own data.

## File Storage Layout
```
storage/files/{user_id}/{folder_id}/{filename}
storage/files/{user_id}/{folder_id}/processed_{filename}   (resized image)
storage/thumbnails/{user_id}/{file_id}/thumbnail_{file_id}.jpg
```

## RAG Pipeline (app/rag/pipeline.py)
`ask_llm(query, db, session_id, user_id)`:
1. Parse query intent with LLM (QueryUnderstandingAgent)
2. Retrieve relevant chunks (ChromaDB + BM25)
3. Build prompt with CNN features from DB + retrieved text
4. Call Groq API
5. Persist ChatSession + Chat record
6. Return `{result, chat_id, session_id}`

The RAG pipeline is constrained to lunar terrain/geology topics only.

## Important Notes
- `update_folder` takes name/description as **query parameters** (not body JSON)
- Route order in `upload.py`: `/search`, `/stats/user`, `/recent/modified` must be defined **before** `/{file_id}` to avoid FastAPI matching static paths as integer path params
- All DB sessions are async (`AsyncSession`) — use `await` on all DB calls
- Image upload triggers async processing (resize + thumbnail + metadata extraction); failures are non-fatal
- The `files.py` route file is legacy — all file routes are in `upload.py`
