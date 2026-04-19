# Chand.AI Frontend - Developer Quick Reference

## Project Structure Quick Overview

```
app/
├── (auth pages) → Login, Signup
├── (dashboard) → Stats, Recent files
├── (documents) → File browser
├── (chat) → RAG interface
├── components/ → Reusable UI
├── stores/ → Zustand state
├── services/ → API client
└── lib/ → Utilities
```

## Common Tasks

### 1. Add a New Page

```typescript
// app/mypage/page.tsx
'use client';

import { useAuthStore } from '@/app/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MyPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user]);

  return <div>My Page</div>;
}
```

### 2. Call the API

```typescript
import { apiService } from '@/app/services/apiService';

// In component
const handleGetFiles = async () => {
  try {
    const files = await apiService.getFiles();
    console.log(files);
  } catch (error) {
    toast.error('Failed to load files');
  }
};
```

### 3. Update App State

```typescript
import { useAppStore } from '@/app/stores/appStore';

export default function MyComponent() {
  const { files, setFiles } = useAppStore();
  
  // Use and update state
  const handleUpdate = () => {
    setFiles([...files, newFile]);
  };

  return <div>{files.length} files</div>;
}
```

### 4. Show Notifications

```typescript
import { toast } from 'sonner';

toast.success('Success message');
toast.error('Error message');
toast.loading('Loading...');
```

### 5. Create a Modal/Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

## Important Files

| File | Purpose |
|------|---------|
| `stores/authStore.ts` | Auth state + login logic |
| `stores/appStore.ts` | App state (files, folders, chat) |
| `services/apiService.ts` | All API calls |
| `lib/schemas.ts` | Input validation |
| `components/Sidebar.tsx` | Main navigation |
| `components/Header.tsx` | Top navigation |
| `layout.tsx` | Root layout + providers |

## Zustand Store Usage

### Reading State
```typescript
const { user, token } = useAuthStore();
```

### Updating State
```typescript
const { setUser, setToken } = useAuthStore();
setUser(newUser);
setToken(newToken);
```

### Complex Updates
```typescript
const { files, setFiles } = useAppStore();
setFiles(files.map(f => f.id === id ? {...f, ...updates} : f));
```

## API Service Patterns

### GET Request
```typescript
const files = await apiService.getFiles();
const folder = await apiService.getFolder(folderId);
```

### POST Request
```typescript
const result = await apiService.createFolder(name, desc, parentId);
```

### File Upload
```typescript
const result = await apiService.uploadFile(file, folderId, desc, tags);
```

### Error Handling
```typescript
try {
  const result = await apiService.doSomething();
} catch (error) {
  console.error(error);
  toast.error('Operation failed');
}
```

## Component Patterns

### Protected Component
```typescript
'use client';

import { useAuthStore } from '@/app/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedComponent() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user]);

  if (!user) return null;

  return <div>Protected content</div>;
}
```

### Async Data Loading
```typescript
'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/app/services/apiService';

export default function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await apiService.getData();
        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
}
```

## Styling Quick Reference

### Tailwind Classes
```typescript
// Colors
bg-slate-800
text-slate-200
border-slate-700

// Layout
flex gap-4
grid grid-cols-3
p-4 px-6 py-2

// Effects
rounded-lg
shadow-lg
transition duration-200
hover:bg-slate-700
```

### shadcn/ui Components
```typescript
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';
```

### Icons
```typescript
import { FileText, Upload, LogOut, Menu, Search } from 'lucide-react';

<FileText className="w-4 h-4" />
```

## Debugging Tips

### Check State
```typescript
console.log(useAuthStore.getState());
console.log(useAppStore.getState());
```

### Check API Calls
```typescript
// Enable network tab in DevTools
// Check response in browser console
```

### Reset State
```typescript
// In console
useAuthStore.setState({ user: null, token: null });
```

### Test API Endpoint
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"admin","password":"admin123"}'
```

## Performance Optimization

### Memoize Components
```typescript
import { memo } from 'react';

const MyComponent = memo(function MyComponent({ prop }) {
  return <div>{prop}</div>;
});
```

### Lazy Load Routes
```typescript
import dynamic from 'next/dynamic';

const ChatPage = dynamic(() => import('./chat/page'), {
  loading: () => <div>Loading...</div>,
});
```

### Optimize Images
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={400}
  height={300}
  priority
/>
```

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Cannot read property of undefined" | Check if data is loaded before rendering |
| "Token is not defined" | Ensure user is logged in |
| "API 404" | Check backend is running |
| "CORS error" | Verify NEXT_PUBLIC_API_URL |
| "Hydration mismatch" | Add 'use client' directive |

## Environment Variables

```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional
NEXT_PUBLIC_APP_NAME=Chand.AI
NEXT_PUBLIC_APP_VERSION=1.0
```

## Useful Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run production locally
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

## Component Location Guide

| Component | Path |
|-----------|------|
| Authentication | `app/auth/` |
| Dashboard | `app/dashboard/` |
| Files | `app/documents/` |
| Chat | `app/chat/` |
| Navigation | `app/components/` |
| Forms | `app/components/ui/` |

## Testing Credentials

```
Email: admin@example.com (or) admin
Password: admin123
Role: admin
```

---

**Last Updated**: April 19, 2026  
**Version**: 1.0
