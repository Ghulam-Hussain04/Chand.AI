import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/app/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add authorization interceptor
    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(username_or_email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      username_or_email,
      password,
    });
    return response.data;
  }

  async register(username: string, email: string, password: string, role: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
      role,
    });
    return response.data;
  }

  // Folders
  async getFolders() {
    const response = await this.client.get('/api/folders');
    return response.data;
  }

  async getFolder(folderId: number) {
    const response = await this.client.get(`/api/folders/${folderId}`);
    return response.data;
  }

  async createFolder(name: string, description: string | null = null, parent_id: number | null = null) {
    const response = await this.client.post('/api/folders', {
      name,
      description,
      parent_id,
    });
    return response.data;
  }

  async updateFolder(folderId: number, name: string, description: string | null = null) {
    const params: Record<string, string> = { name };
    if (description !== null) params.description = description;
    const response = await this.client.put(`/api/folders/${folderId}`, null, { params });
    return response.data;
  }

  async deleteFolder(folderId: number) {
    const response = await this.client.delete(`/api/folders/${folderId}`);
    return response.data;
  }

  async getFolderHierarchy(folderId?: number) {
    const url = folderId ? `/api/folders/${folderId}/hierarchy` : '/api/folders/hierarchy';
    const response = await this.client.get(url);
    return response.data;
  }

  async getSubfolders(folderId: number) {
    const response = await this.client.get(`/api/folders/${folderId}/subfolders`);
    return response.data;
  }

  // Files
  async uploadFile(
    file: File,
    folderId: number | null = null,
    description: string = '',
    tags: string[] = []
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', String(folderId));
    }
    formData.append('description', description);
    formData.append('tags', JSON.stringify(tags));

    const response = await this.client.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getFiles(folderId?: number) {
    const url = folderId ? `/api/files/folder/${folderId}` : '/api/files';
    const response = await this.client.get(url);
    return response.data;
  }

  async getFile(fileId: number) {
    const response = await this.client.get(`/api/files/${fileId}`);
    return response.data;
  }

  async updateFile(fileId: number, description?: string, tags?: string[]) {
    const response = await this.client.put(`/api/files/${fileId}`, {
      description,
      tags,
    });
    return response.data;
  }

  async deleteFile(fileId: number) {
    const response = await this.client.delete(`/api/files/${fileId}`);
    return response.data;
  }

  async searchFiles(query: string) {
    const response = await this.client.get(`/api/files/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // RAG Chat
  async queryRAG(
    query: string,
    fileIds?: number[],
    sessionId?: string
  ) {
    const response = await this.client.post('/rag/query', {
      query,
      file_ids: fileIds,
      session_id: sessionId,
    });
    return response.data;
  }

  async streamRAGQuery(
    query: string,
    fileIds?: number[],
    sessionId?: string
  ) {
    const response = await this.client.post('/rag/query/stream', {
      query,
      file_ids: fileIds,
      session_id: sessionId,
    });
    return response.data;
  }

  async getChatHistory(sessionId: string) {
    const response = await this.client.get(`/rag/sessions/${sessionId}`);
    return response.data;
  }

  async createChatSession(fileIds?: number[]) {
    const response = await this.client.post('/rag/sessions', {
      file_ids: fileIds,
    });
    return response.data;
  }

  // Admin: User management
  async getUsers() {
    const response = await this.client.get('/admin/users');
    return response.data;
  }

  // Uses /auth/register which is admin-only per API spec
  async createUser(username: string, email: string, password: string, role: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
      role,
    });
    return response.data;
  }

  async updateUser(userId: number, data: { role?: string }) {
    const response = await this.client.put(`/admin/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: number) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  // File stats for the current user
  async getUserFileStats() {
    const response = await this.client.get('/api/files/stats/user');
    return response.data;
  }
}

export const apiService = new ApiService();
