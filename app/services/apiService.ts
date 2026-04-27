import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/app/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    );
  }

  // ── Authentication ────────────────────────────────────────────────────────

  async login(username_or_email: string, password: string) {
    const response = await this.client.post('/auth/login', { username_or_email, password });
    return response.data;
  }

  async register(username: string, email: string, password: string, role: string) {
    const response = await this.client.post('/auth/register', { username, email, password, role });
    return response.data;
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  async getFolders() {
    const response = await this.client.get('/api/folders');
    return response.data;
  }

  async getFolder(folderId: number) {
    const response = await this.client.get(`/api/folders/${folderId}`);
    return response.data;
  }

  async createFolder(name: string, description: string | null = null, parent_id: number | null = null) {
    const response = await this.client.post('/api/folders', { name, description, parent_id });
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

  /** Returns a flat list of root folders (no nesting). */
  async getFolders_root() {
    const response = await this.client.get('/api/folders');
    return response.data;
  }

  /**
   * Returns an array of folder trees for all root folders.
   * Each node has shape: { id, name, description, parent_id, children: [...] }
   */
  async getFolderHierarchy(): Promise<any[]> {
    const response = await this.client.get('/api/folders/hierarchy');
    return response.data;
  }

  /** Get tree for a single folder (used when navigating into a folder). */
  async getFolderTree(folderId: number) {
    const response = await this.client.get(`/api/folders/${folderId}/hierarchy`);
    return response.data;
  }

  async getSubfolders(folderId: number) {
    const response = await this.client.get(`/api/folders/${folderId}/subfolders`);
    return response.data;
  }

  // ── Files ─────────────────────────────────────────────────────────────────

  async uploadFile(
    file: File,
    folderId: number,
    description: string = '',
    tags: string[] = []
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', String(folderId));
    if (description) formData.append('description', description);
    if (tags.length > 0) formData.append('tags', tags.join(','));

    const response = await this.client.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /** Get all files for the current user (no folder filter). */
  async getFiles(): Promise<any[]> {
    const response = await this.client.get('/api/files');
    return response.data;
  }

  /** Get files inside a specific folder. */
  async getFolderFiles(folderId: number): Promise<any[]> {
    const response = await this.client.get(`/api/files/folder/${folderId}`);
    return response.data;
  }

  async getFile(fileId: number) {
    const response = await this.client.get(`/api/files/${fileId}`);
    return response.data;
  }

  async updateFile(fileId: number, description?: string, tags?: string[]) {
    const response = await this.client.put(`/api/files/${fileId}`, { description, tags });
    return response.data;
  }

  async deleteFile(fileId: number) {
    const response = await this.client.delete(`/api/files/${fileId}`);
    return response.data;
  }

  async downloadFile(fileId: number): Promise<Blob> {
    const response = await this.client.get(`/api/files/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /** query param must be `query=` (not `q=`) */
  async searchFiles(query: string, fileType?: string, folderId?: number) {
    const params: Record<string, string | number> = { query };
    if (fileType) params.file_type = fileType;
    if (folderId) params.folder_id = folderId;
    const response = await this.client.get('/api/files/search', { params });
    return response.data;
  }

  async getUserFileStats() {
    const response = await this.client.get('/api/files/stats/user');
    return response.data;
  }

  async getRecentFiles(limit: number = 10) {
    const response = await this.client.get('/api/files/recent/modified', { params: { limit } });
    return response.data;
  }

  // ── RAG / Chat ────────────────────────────────────────────────────────────

  /**
   * Send a message to the RAG pipeline.
   * Uses /rag/ask which supports session tracking.
   *
   * file_id is optional — pass the first selected file id to scope the RAG query.
   * folder_id is optional — pass to scope to a whole folder.
   * session_id carries the conversation context across turns.
   */
  async queryRAG(
    query: string,
    fileIds?: number[],
    sessionId?: number
  ) {
    const body: Record<string, any> = { query };
    if (fileIds && fileIds.length > 0) body.file_id = fileIds[0];
    if (sessionId) body.session_id = sessionId;

    const response = await this.client.post('/rag/ask', body);
    return response.data;
  }

  // ── Admin: User management ────────────────────────────────────────────────

  async getUsers() {
    const response = await this.client.get('/admin/users');
    return response.data;
  }

  async createUser(username: string, email: string, password: string, role: string) {
    const response = await this.client.post('/auth/register', { username, email, password, role });
    return response.data;
  }

  async updateUser(userId: number, data: { role?: string; username?: string; email?: string }) {
    const response = await this.client.put(`/admin/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: number) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }
}

export const apiService = new ApiService();
