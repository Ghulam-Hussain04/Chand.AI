# dr-terra-frontend — CLAUDE.md

## Project Overview
Next.js 15 (App Router) + TypeScript frontend for Dr. Terra / Chand.AI — a RAG-based lunar terrain analysis platform. Users upload images/CSVs, organize them into projects (folders), and query them via an LLM-powered chat interface.

## Stack
- **Framework**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI primitives
- **State**: Zustand 4 (authStore + appStore); authStore persists to localStorage via `persist` middleware
- **HTTP**: Axios singleton (`app/services/apiService.ts`) with JWT interceptor
- **Forms**: React Hook Form + Zod
- **Notifications**: Sonner toast
- **Markdown**: react-markdown (chat responses)

## Directory Structure
```
app/
├── auth/login/        Login page (username or email + password)
├── auth/signup/       Signup page (admin-only backend — shows notice)
├── dashboard/         Stats overview + recent files
├── documents/         File upload, list, delete, download
├── chat/              RAG chat interface with file selection
├── admin/             Admin: user/file/folder management (admin role only)
├── components/        Shared UI components
│   ├── ui/            Radix-based primitives (Button, Card, Input…)
│   ├── admin/         Admin tab components (UserManagementTab, etc.)
│   ├── Sidebar.tsx    Navigation + folder tree (loads /api/folders/hierarchy)
│   ├── Header.tsx     Top bar
│   └── ProtectedRoute.tsx  Redirects unauthenticated users
├── services/
│   └── apiService.ts  Axios singleton — all backend calls go here
├── stores/
│   ├── authStore.ts   JWT token + user (persisted to localStorage)
│   └── appStore.ts    Files, folders, chat messages, UI state
├── lib/
│   ├── rbac.ts        Role permissions matrix
│   └── theme.ts       Tailwind class constants (card, btn, badge…)
└── layout.tsx         Root layout
```

## Authentication
- **Login**: POST `/auth/login` → `{access_token, user}` stored in Zustand persist
- **Token injection**: `apiService.ts` request interceptor reads `useAuthStore.getState().token` and adds `Authorization: Bearer {token}`
- **401 handling**: apiService response interceptor calls `logout()` + redirects to `/auth/login`
- **Route protection**: `dashboard/layout.tsx` and `admin/page.tsx` check `token` and `user`; redirect to login if absent
- **JWT expiry**: 24 hours (set in backend `.env`)

## RBAC (app/lib/rbac.ts)
| Permission       | user | researcher | admin |
|-----------------|------|-----------|-------|
| create_folder   | ✗    | ✓         | ✓     |
| upload_file     | ✗    | ✓         | ✓     |
| delete_file     | ✗    | ✓         | ✓     |
| manage_users    | ✗    | ✗         | ✓     |
| access_chat     | ✓    | ✓         | ✓     |

Use `hasPermission(user.role, 'action')` to gate UI elements.

## Backend API Base URL
Set in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Defaults to `http://localhost:8000` if not set. `apiService.ts` reads it at module load time.

## Key API Calls (app/services/apiService.ts)
| Method | Description |
|--------|-------------|
| `login(username_or_email, password)` | POST /auth/login |
| `getFolders()` | GET /api/folders (root folders) |
| `getFolderHierarchy()` | GET /api/folders/hierarchy (nested tree) |
| `createFolder(name, description?, parent_id?)` | POST /api/folders |
| `updateFolder(id, name, description?)` | PUT /api/folders/:id (query params) |
| `deleteFolder(id)` | DELETE /api/folders/:id |
| `getFiles()` | GET /api/files |
| `uploadFile(file, folderId, description?, tags?)` | POST /api/files/upload (FormData) |
| `deleteFile(id)` | DELETE /api/files/:id |
| `downloadFile(id)` | GET /api/files/download/:id → Blob |
| `searchFiles(query, fileType?, folderId?)` | GET /api/files/search |
| `getUserFileStats()` | GET /api/files/stats/user |
| `getRecentFiles(limit?)` | GET /api/files/recent/modified |
| `queryRAG(query, fileIds?, sessionId?)` | POST /rag/ask |
| `getUsers()` | GET /admin/users (admin only) |
| `updateUser(id, data)` | PUT /admin/users/:id (admin only) |
| `deleteUser(id)` | DELETE /admin/users/:id (admin only) |
| `createUser(username, email, password, role)` | POST /auth/register (admin token required) |

## State Management
**authStore** (persisted):
- `token: string | null` — JWT
- `user: {id, username, email, role}` — current user
- `login(username_or_email, password)` — calls backend, stores token+user
- `logout()` — clears token+user

**appStore** (in-memory):
- `files`, `folders`, `folderHierarchy` — loaded by pages on mount
- `chatMessages`, `isLoading` — chat state
- `selectedFileIds` — multi-select for bulk actions
- `uploadProgress` — 0-100 during upload

## Theme System (app/lib/theme.ts)
Export Tailwind class strings: `card`, `btn.primary`, `btn.secondary`, `badge.blue`, `badge.slate`, `inputBase`, `fileTypeBadge`, `text.*`, `bg.*`. Use these instead of raw Tailwind strings for consistency.

## Running Locally
```bash
npm install
cp .env.local.example .env.local   # already created
npm run dev                         # http://localhost:3000
```

## Common Patterns
- All pages fetch data in `useEffect` on mount and catch errors with `toast.error()`
- Files are filtered client-side (search query in documents page)
- `Promise.allSettled` used on dashboard to prevent one failed stat from blocking others
- Folder operations reload the full hierarchy after each mutation
- Chat sessions are tracked via `session_id` returned by `/rag/ask`

## Notes
- The `user` role has no upload/create permissions — this is intentional
- `/auth/register` requires an admin JWT — signup is admin-only
- `updateFolder` sends name/description as query params (not body) — matches backend signature
- The sidebar fires `getFolderHierarchy()` on every mount inside the dashboard layout
