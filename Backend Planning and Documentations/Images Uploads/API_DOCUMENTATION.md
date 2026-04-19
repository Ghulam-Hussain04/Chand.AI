# TerraBot Backend API Documentation

## Image Management Endpoints

### 1. Upload Image
**Endpoint:** `POST /files/images/upload`

**Description:** Upload an image file to a mission-specific folder

**Query Parameters:**
- `mission_name` (required): Name of the mission/folder to organize images

**Request Body:**
- `file` (required): Image file (multipart/form-data)
  - Allowed formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`

**Response (200 OK):**
```json
{
  "filename": "image.jpg",
  "mission_name": "mission_alpha",
  "path": "mission_alpha/image.jpg",
  "created_at": "2025-12-10T14:30:00"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid filename or unsupported file type
- `500 Internal Server Error`: File upload error

**Example cURL:**
```bash
curl -X POST "http://localhost:8000/files/images/upload?mission_name=mission_alpha" \
  -H "accept: application/json" \
  -F "file=@/path/to/image.jpg"
```

---

### 2. Get Images Root Directory
**Endpoint:** `GET /files/images`

**Description:** Get the root directory structure of storage/images/. Returns all top-level missions (folders) and files.

**Response (200 OK):**
```json
{
  "current_path": "images",
  "items": [
    {
      "name": "mission_alpha",
      "type": "folder",
      "path": "mission_alpha"
    },
    {
      "name": "mission_beta",
      "type": "folder",
      "path": "mission_beta"
    },
    {
      "name": "root_image.jpg",
      "type": "file",
      "path": "root_image.jpg"
    }
  ]
}
```

**Error Responses:**
- `500 Internal Server Error`: Error reading directory

**Example cURL:**
```bash
curl -X GET "http://localhost:8000/files/images" \
  -H "accept: application/json"
```

---

### 3. Get Folder Contents
**Endpoint:** `GET /files/images/{path}`

**Description:** Get contents of a specific folder within the images directory. Returns subfolders and image files with their URLs.

**Path Parameters:**
- `path` (required): Relative path within images directory
  - Examples: `mission_alpha`, `mission_alpha/subfolder`, `mission_alpha/subfolder/sub-subfolder`

**Response (200 OK):**
```json
{
  "current_path": "mission_alpha",
  "folders": [
    {
      "name": "subfolder_1",
      "type": "folder",
      "path": "mission_alpha/subfolder_1"
    }
  ],
  "images": [
    {
      "name": "terrain_1.jpg",
      "url": "/images/mission_alpha/terrain_1.jpg"
    },
    {
      "name": "terrain_2.png",
      "url": "/images/mission_alpha/terrain_2.png"
    }
  ]
}
```

**Error Responses:**
- `403 Forbidden`: Attempt to access outside images directory
- `404 Not Found`: Path does not exist
- `400 Bad Request`: Path is not a directory
- `500 Internal Server Error`: Error reading directory

**Example cURL:**
```bash
curl -X GET "http://localhost:8000/files/images/mission_alpha" \
  -H "accept: application/json"
```

```bash
curl -X GET "http://localhost:8000/files/images/mission_alpha/subfolder_1" \
  -H "accept: application/json"
```

---

## Frontend Integration Guide

### Step 1: Upload Image
```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/files/images/upload?mission_name=mission_alpha', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Upload result:', result);
// {
//   filename: "image.jpg",
//   mission_name: "mission_alpha", 
//   path: "mission_alpha/image.jpg",
//   created_at: "2025-12-10T14:30:00"
// }
```

### Step 2: Get Root Images Directory
```javascript
const response = await fetch('/files/images');
const data = await response.json();
console.log('Root directories:', data);
// Shows all missions at root level
```

### Step 3: Navigate to Folder and Get Images
```javascript
const response = await fetch('/files/images/mission_alpha');
const data = await response.json();
console.log('Folder contents:', data);
// Shows:
// - List of subfolders (if any)
// - List of images with their URLs

// Display images
data.images.forEach(image => {
  const img = document.createElement('img');
  img.src = image.url;
  img.title = image.name;
  document.body.appendChild(img);
});

// Navigate to subfolder
if (data.folders.length > 0) {
  const subfolder = data.folders[0];
  const subResponse = await fetch(`/files/images/${subfolder.path}`);
  const subData = await subResponse.json();
  console.log('Subfolder contents:', subData);
}
```

---

## Directory Structure

```
storage/
├── images/
│   ├── mission_alpha/
│   │   ├── image1.jpg
│   │   ├── image2.png
│   │   └── subfolder/
│   │       ├── image3.jpg
│   │       └── image4.jpg
│   ├── mission_beta/
│   │   ├── terrain.jpg
│   │   └── analysis/
│   │       └── result.png
│   └── root_image.jpg
```

---

## File Upload Behavior

1. **Automatic Directory Creation**: If the mission folder doesn't exist, it's created automatically
2. **Filename Conflict Handling**: If a file with the same name already exists, a timestamp is appended
   - Example: `image.jpg` becomes `image_20251210_143000.jpg`
3. **File Validation**: Only allowed image formats are accepted
4. **Storage Location**: All images are stored under `storage/images/` (configurable in `.env`)

---

## Security Features

1. **Path Traversal Protection**: The API validates that requested paths don't escape the images directory
2. **File Type Validation**: Only image files with whitelisted extensions are accepted
3. **Atomic File Operations**: Files are written safely with conflict detection

---

## Environment Configuration

Ensure your `.env` file contains:
```
STORAGE_DIR=./storage
```

This will create the following directory structure automatically:
- `storage/images/` - Root images directory
- `storage/images/{mission_name}/` - Mission-specific folders (created on upload)

