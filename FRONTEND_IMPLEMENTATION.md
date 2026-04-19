# Chand.AI Frontend - Implementation Guide

## 📋 Overview

This is a production-ready Next.js 16 frontend for the Chand.AI RAG (Retrieval Augmented Generation) document intelligence platform. It integrates with the TerraBot backend API to provide file management, folder organization, and AI-powered document querying.

## 🎯 Features Implemented

### Authentication
- ✅ User login with email/username
- ✅ User registration with role selection (user/researcher)
- ✅ JWT token persistence with Zustand
- ✅ Protected routes with auth guards
- ✅ Auto-redirect to login on auth failures

### File Management
- ✅ Multi-file upload with progress tracking
- ✅ File browser with grid/list view
- ✅ File selection and bulk operations
- ✅ File deletion with confirmation
- ✅ File metadata display (size, date, tags)
- ✅ Search functionality

### Folder Management
- ✅ Hierarchical folder structure
- ✅ Folder tree sidebar with expand/collapse
- ✅ Navigate between folders
- ✅ Folder creation (UI ready, backend integration needed)

### RAG Chat Interface
- ✅ Document selection sidebar
- ✅ Message display with markdown support
- ✅ User/assistant message styling
- ✅ Citation/source display
- ✅ Real-time typing indicators
- ✅ Session management for context

### Dashboard
- ✅ Statistics overview (files, folders)
- ✅ Recent files display
- ✅ Quick action cards
- ✅ Responsive design

### UI/UX
- ✅ Dark/light theme toggle
- ✅ Gradient backgrounds and animations
- ✅ Responsive layout (mobile-first)
- ✅ Toast notifications (Sonner)
- ✅ Loading states and error handling
- ✅ Accessible components (Radix UI)

## 🏗️ Architecture

### Directory Structure
```
app/
├── stores/              # Zustand state management
│   ├── authStore.ts    # Authentication state
│   └── appStore.ts     # App state (files, folders, chat)
├── services/            # API integration
│   └── apiService.ts   # Centralized API client
├── lib/                 # Utilities
│   └── schemas.ts      # Zod validation schemas
├── components/          # Reusable UI components
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── Header.tsx      # Header with search
│   ├── ThemeToggle.tsx # Theme switcher
│   └── ui/             # shadcn/ui components
├── auth/                # Authentication pages
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/           # Main dashboard
│   ├── layout.tsx      # Protected layout
│   └── page.tsx        # Dashboard page
├── documents/           # File management
│   ├── layout.tsx
│   └── page.tsx
└── chat/                # RAG chat interface
    ├── layout.tsx
    └── page.tsx
```

### State Management (Zustand)

**Auth Store** - `app/stores/authStore.ts`
```typescript
- user: User | null
- token: string | null
- isLoading: boolean
- error: string | null
- login(username, password): Promise<void>
- logout(): void
- setUser(), setToken(), setError(), clearError()
```

**App Store** - `app/stores/appStore.ts`
```typescript
- folders: Folder[]
- files: File[]
- chatMessages: ChatMessage[]
- selectedFileIds: number[]
- searchQuery: string
- sidebarOpen: boolean
- [actions for all above]
```

### API Service - `app/services/apiService.ts`

Centralized axios instance with:
- Base URL configuration
- JWT token interceptor
- Error handling and auto-logout on 401
- Methods for all backend endpoints

**Authentication**
- `login(username_or_email, password)`
- `register(username, email, password, role)`

**Folders**
- `getFolders()` - Root level
- `getFolderHierarchy()` - Full tree
- `getSubfolders(id)` - Children only
- `createFolder(name, description, parent_id)`
- `updateFolder(id, name, description)`
- `deleteFolder(id)`

**Files**
- `uploadFile(file, folder_id, description, tags)`
- `getFiles(folder_id?)`
- `getFile(id)`
- `updateFile(id, description, tags)`
- `deleteFile(id)`
- `searchFiles(query)`

**RAG**
- `queryRAG(query, file_ids, session_id)`
- `streamRAGQuery(query, file_ids, session_id)`
- `getChatHistory(session_id)`
- `createChatSession(file_ids)`

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Demo Credentials
```
Username: admin
Password: admin123
```

## 🔌 Integration with Backend

The frontend expects the backend API at `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`).

### Required Backend Endpoints

All endpoints require `Authorization: Bearer <token>` header

**Auth**
- `POST /auth/login` → `{ access_token, token_type, user }`
- `POST /auth/register` → `{ user }`

**Folders**
- `GET /api/folders` → `Folder[]`
- `GET /api/folders/:id` → `Folder`
- `GET /api/folders/:id/hierarchy` → `Folder (nested)`
- `GET /api/folders/:id/subfolders` → `Folder[]`
- `POST /api/folders` → `Folder`
- `PUT /api/folders/:id` → `Folder`
- `DELETE /api/folders/:id` → `{ success: bool }`

**Files**
- `GET /api/files` → `File[]`
- `GET /api/files/:id` → `File`
- `POST /api/files/upload` → `File`
- `PUT /api/files/:id` → `File`
- `DELETE /api/files/:id` → `{ success: bool }`
- `GET /api/files/search?q=query` → `File[]`

**RAG**
- `POST /rag/query` → `{ response, citations, session_id }`
- `POST /rag/query/stream` → Stream response
- `GET /rag/sessions/:id` → Chat history
- `POST /rag/sessions` → `{ session_id }`

## 📝 Validation Schemas

All input validation uses Zod schemas in `app/lib/schemas.ts`:

```typescript
- loginSchema
- registerSchema
- createFolderSchema
- updateFolderSchema
- uploadFileSchema
- updateFileSchema
- queryRAGSchema
```

## 🎨 Styling

- **Framework**: Tailwind CSS v4
- **Components**: shadcn/ui (built on Radix UI)
- **Icons**: Lucide React
- **Theme**: Dark-first with light mode support (next-themes)
- **Color Scheme**: Slate/blue/cyan gradient theme

## 📱 Responsive Design

- Mobile: Single-column, sidebar toggleable
- Tablet: Sidebar collapsible
- Desktop: Sidebar always visible
- Touch-friendly button sizes and interactions

## 🔐 Security

- JWT tokens stored in Zustand (localStorage-backed)
- Auto-logout on 401 responses
- Protected routes via auth guards
- Environment variables for API URL
- XSS prevention via React escaping

## 🚦 Error Handling

- Toast notifications for user feedback
- Error states in API calls
- Loading indicators for async operations
- Graceful fallbacks for network failures
- User-friendly error messages

## 📊 Performance

- Code splitting via Next.js dynamic imports
- Memoized components to prevent re-renders
- Optimized images and assets
- Zustand for efficient state management
- API response caching strategies

## 🔄 State Flow

```
User Action
    ↓
Component Handler
    ↓
API Service Call
    ↓
Backend Response
    ↓
Zustand Store Update
    ↓
Component Re-render
    ↓
UI Update
```

## 🧪 Testing

Currently no tests implemented. To add:

1. Install dependencies
   ```bash
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
   ```

2. Create test files alongside components

3. Run tests
   ```bash
   npm run test
   ```

## 🐛 Known Limitations

- No offline support yet
- Chat messages not persisted across sessions
- No file preview functionality
- Streaming responses need implementation
- No bulk download feature
- No collaborative features

## 📈 Future Enhancements

1. **Features**
   - File preview/viewer (PDF, images, docs)
   - Real-time collaboration
   - Advanced search filters
   - Saved searches/queries
   - Document tagging system
   - User preferences/settings

2. **Performance**
   - Infinite scroll for file lists
   - Image lazy loading
   - API response caching
   - Service worker for offline support

3. **UX**
   - Keyboard shortcuts
   - Command palette
   - Customizable dashboard
   - Email notifications
   - Activity feed

## 🤝 Contributing

To modify this frontend:

1. Follow the existing component structure
2. Use Zustand for state management
3. Keep styles in Tailwind classes
4. Add validation schemas for new inputs
5. Handle errors with toast notifications
6. Test across responsive breakpoints

## 📄 License

Same as parent project (check root LICENSE)

## 🆘 Support

For issues or questions:
1. Check Backend Implementation Documentation
2. Review API_REFERENCE_V2.md
3. Check environment configuration
4. Verify backend is running on correct port
