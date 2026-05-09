import { create } from 'zustand';

export interface FileMetadata {
  width?: number;
  height?: number;
  image_features?: Record<string, any>;
  csv_columns?: string[];
  csv_row_count?: number;
  custom_metadata?: Record<string, any>;
}

/** Matches the backend FileResponse schema */
export interface File {
  id: number;
  filename: string;           // generated/stored filename
  original_filename: string;  // original name as uploaded
  file_type: string;          // 'image' | 'csv'
  file_size: number;          // bytes
  folder_id: number;
  description: string | null;
  tags: string[];
  is_processed: boolean;
  created_at: string;
  updated_at: string;
  metadata: FileMetadata | null;
}

export interface Folder {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  file_count?: number;
  children?: Folder[];
  files?: File[];
}

/** Mission calibration parameters — matches backend ProjectSpecificationResponse */
export interface ProjectSpecification {
  id: number;
  folder_id: number;
  mission_name: string;
  meters_per_pixel: number;
  camera_angle_deg: number;
  camera_resolution_w: number;
  camera_resolution_h: number;
  camera_fov_deg: number;
  rover_height_m: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Values the user fills in to create or update specifications */
export interface ProjectSpecificationInput {
  mission_name: string;
  meters_per_pixel: number;
  camera_angle_deg: number;
  camera_resolution_w: number;
  camera_resolution_h: number;
  camera_fov_deg: number;
  rover_height_m: number;
  notes?: string | null;
}

export const DEFAULT_SPECIFICATION: ProjectSpecificationInput = {
  mission_name: 'Chang3',
  meters_per_pixel: 0.5,
  camera_angle_deg: 15.0,
  camera_resolution_w: 1024,
  camera_resolution_h: 1024,
  camera_fov_deg: 45.0,
  rover_height_m: 1.5,
  notes: 'Lunar lander with Yutu rover, landed Dec 2013. Camera specs approximate.',
};

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  citations?: { file_id: number; page?: number }[];
  /** True when geo-features were served from the DB cache (no inference ran). */
  inference_cached?: boolean;
  /** Total response time in seconds returned by the backend. */
  response_time_sec?: number;
}

export interface AppState {
  // Folder Management
  folders: Folder[];
  selectedFolderId: number | null;
  /** Array of root folder trees returned by GET /api/folders/hierarchy */
  folderHierarchy: Folder[] | null;

  // File Management
  files: File[];
  selectedFileIds: number[];
  uploadProgress: number;

  // Chat State
  chatMessages: ChatMessage[];
  isLoading: boolean;

  // UI State
  sidebarOpen: boolean;
  searchQuery: string;

  // Actions
  setFolders: (folders: Folder[]) => void;
  setSelectedFolderId: (id: number | null) => void;
  setFolderHierarchy: (hierarchy: Folder[] | null) => void;
  setFiles: (files: File[]) => void;
  setSelectedFileIds: (ids: number[]) => void;
  toggleFileSelection: (id: number) => void;
  setUploadProgress: (progress: number) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  folders: [],
  selectedFolderId: null,
  folderHierarchy: null,
  files: [],
  selectedFileIds: [],
  uploadProgress: 0,
  chatMessages: [],
  isLoading: false,
  sidebarOpen: true,
  searchQuery: '',

  setFolders: (folders) => set({ folders }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setFolderHierarchy: (hierarchy) => set({ folderHierarchy: hierarchy }),
  setFiles: (files) => set({ files }),
  setSelectedFileIds: (ids) => set({ selectedFileIds: ids }),
  toggleFileSelection: (id) =>
    set((state) => ({
      selectedFileIds: state.selectedFileIds.includes(id)
        ? state.selectedFileIds.filter((fid) => fid !== id)
        : [...state.selectedFileIds, id],
    })),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
