# Chand.AI Frontend - Setup & Usage Guide

## Prerequisites

- Node.js 18+ and npm 8+
- Backend API running on `http://localhost:8000`
- `.env.local` file configured

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Demo Login
```
Username/Email: admin
Password: admin123
```

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Run production build locally
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

## Project Structure

```
app/
├── auth/              # Authentication pages
├── dashboard/         # Dashboard page
├── documents/         # File management
├── chat/              # RAG chat interface
├── components/        # Reusable components
├── stores/            # Zustand state stores
├── services/          # API service
├── lib/               # Utilities and schemas
├── context/           # React contexts (legacy)
└── layout.tsx         # Root layout
```

## Features Overview

### 🔐 Authentication
- Login with email/username
- User registration
- JWT token management
- Automatic logout on token expiry

### 📁 File Management
- Upload multiple files
- Organize in folders
- Delete files
- Search files
- View file metadata

### 📂 Folder Management
- Create folders
- Hierarchical structure
- Expand/collapse folder tree
- Navigate between folders

### 💬 AI Chat
- Select documents to query
- Ask questions about content
- View AI responses with citations
- Session management

### 🎨 UI Features
- Dark/light theme toggle
- Responsive design
- Toast notifications
- Loading indicators
- Error handling

## Backend Integration

The frontend connects to the TerraBot backend API. Make sure:

1. Backend is running on `http://localhost:8000`
2. All required endpoints are implemented
3. JWT authentication is enabled
4. CORS is configured to allow frontend requests

### Expected Backend Endpoints

See `FRONTEND_IMPLEMENTATION.md` for full API specification.

## Troubleshooting

### "Cannot connect to API"
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is enabled on backend

### "Login fails"
- Verify backend database has admin user
- Check JWT secret configuration
- Review backend logs

### "Files not uploading"
- Verify file upload endpoint `/api/files/upload`
- Check file size limits
- Review browser console for errors

### Styling issues
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Rebuild: `npm run build`

## Performance Tips

1. Use production build for benchmarking
2. Enable compression on backend
3. Implement pagination for large file lists
4. Consider caching strategies for API responses
5. Monitor bundle size: `npm run build && npm run analyze`

## Contributing

1. Follow existing code style
2. Use Zustand for state management
3. Keep components small and focused
4. Add proper error handling
5. Test across responsive breakpoints

## Documentation

- [Frontend Implementation Guide](./FRONTEND_IMPLEMENTATION.md)
- [Backend API Reference](./Backend%20Implementation%20Documentation/API_REFERENCE_V2.md)
- [Architecture Plan](./Backend%20Implementation%20Documentation/ARCHITECTURE_PLAN.md)

## Deployment

### Vercel (Recommended)
```bash
vercel login
vercel link
vercel deploy
```

### Self-hosted
```bash
npm run build
npm start
```

Environment variables needed in production:
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Need Help?

- Check [FRONTEND_IMPLEMENTATION.md](./FRONTEND_IMPLEMENTATION.md) for detailed docs
- Review component source code
- Check browser console for errors
- Enable verbose logging in development

---

**Last Updated**: April 19, 2026  
**Version**: 1.0  
**Status**: Beta
