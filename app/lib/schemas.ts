import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  username_or_email: z.string().min(1, 'Username or email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    role: z.enum(['user', 'researcher']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Folder Schemas
export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  description: z.string().optional().nullable(),
  parent_id: z.number().optional().nullable(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  description: z.string().optional().nullable(),
});

// File Schemas
export const uploadFileSchema = z.object({
  file: z.instanceof(File),
  folder_id: z.number().optional().nullable(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateFileSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Chat Schemas
export const queryRAGSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  file_ids: z.array(z.number()).optional(),
  session_id: z.string().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type QueryRAGInput = z.infer<typeof queryRAGSchema>;
