# TerraBot Image Upload & Retrieval System - Complete Documentation

## 🎯 What This Does

Your TerraBot backend now has a **complete image management system** that allows users to:

- ✅ Upload images organized by mission name
- ✅ Browse hierarchical folder structures
- ✅ Retrieve image URLs for frontend display
- ✅ Navigate through nested folders
- ✅ Benefit from automatic organization and security

---

## 🚀 Quick Start (30 seconds)

### 1. Ensure `.env` has:
```
STORAGE_DIR=./storage
```

### 2. Start your server:
```bash
uvicorn app.main:app --reload
```

### 3. Test upload:
```bash
curl -X POST "http://localhost:8000/files/images/upload?mission_name=test" \
  -F "file=@your_image.jpg"
```

### 4. List missions:
```bash
curl -X GET "http://localhost:8000/files/images"
```

### 5. View images:
```bash
curl -X GET "http://localhost:8000/files/images/test"
```

**Done!** Your image system is working! 🎉

---

## 📋 Core Endpoints

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | `/files/images/upload?mission_name=X` | Upload image to mission |
| GET | `/files/images` | List all missions |
| GET | `/files/images/{path}` | View folder contents |

---

## 📁 File Organization

### Automatic Folder Structure
```
storage/
└── images/
    ├── mission_alpha/          ← Created on first upload
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── analysis/           ← User can organize into subfolders
    │       └── result.jpg
    └── mission_beta/           ← Another mission
        └── data.jpg
```

### No setup needed! Folders created automatically on first upload.

---

## 🔧 Implementation Details

### Modified Files
- **app/config.py** - Added `STORAGE_PATH` property
- **app/schemas.py** - Added image-related schemas
- **app/routes/files.py** - Implemented 3 main endpoints

### New Files
- **app/utils/image_manager.py** - Reusable image utilities
- **test_image_endpoints.py** - Test suite
- **API_DOCUMENTATION.md** - Complete API reference
- **UPDATED_IMPLEMENTATION_GUIDE.md** - Detailed guide
- **QUICK_START_GUIDE.md** - Quick reference

---

## 💻 API Examples

### Upload Image
```bash
# Request
curl -X POST "http://localhost:8000/files/images/upload?mission_name=lunar" \
  -F "file=@crater.jpg"

# Response
{
  "filename": "crater.jpg",
  "mission_name": "lunar",
  "path": "lunar/crater.jpg",
  "created_at": "2025-12-10T14:30:00.000000"
}
```

### List All Missions
```bash
# Request
curl -X GET "http://localhost:8000/files/images"

# Response
{
  "current_path": "images",
  "items": [
    {"name": "lunar", "type": "folder", "path": "lunar"},
    {"name": "mars", "type": "folder", "path": "mars"}
  ]
}
```

### Browse Mission Folder
```bash
# Request
curl -X GET "http://localhost:8000/files/images/lunar"

# Response
{
  "current_path": "lunar",
  "folders": [
    {"name": "terrain", "type": "folder", "path": "lunar/terrain"}
  ],
  "images": [
    {"name": "crater.jpg", "url": "/images/lunar/crater.jpg"},
    {"name": "surface.png", "url": "/images/lunar/surface.png"}
  ]
}
```

---

## 🎨 Frontend Integration

### React Example
```javascript
import React, { useState, useEffect } from 'react';

function ImageGallery() {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [images, setImages] = useState([]);

  useEffect(() => {
    // Load missions on mount
    loadMissions();
  }, []);

  const loadMissions = async () => {
    const res = await fetch('/files/images');
    const data = await res.json();
    const missionList = data.items.filter(item => item.type === 'folder');
    setMissions(missionList);
  };

  const selectMission = async (missionPath) => {
    const res = await fetch(`/files/images/${missionPath}`);
    const data = await res.json();
    setSelectedMission(data.current_path);
    setImages(data.images);
  };

  return (
    <div>
      <h2>Missions</h2>
      <div>
        {missions.map(mission => (
          <button key={mission.path} onClick={() => selectMission(mission.path)}>
            {mission.name}
          </button>
        ))}
      </div>

      {selectedMission && (
        <div>
          <h3>Images in {selectedMission}</h3>
          <div className="image-grid">
            {images.map(image => (
              <div key={image.url}>
                <img src={image.url} alt={image.name} width="200" />
                <p>{image.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
```

---

## 📤 Upload Form Example
```javascript
function ImageUploadForm() {
  const [file, setFile] = useState(null);
  const [mission, setMission] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file || !mission) {
      alert('Please select file and mission');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
      `/files/images/upload?mission_name=${mission}`,
      { method: 'POST', body: formData }
    );

    if (res.ok) {
      const result = await res.json();
      console.log('Upload successful:', result);
      alert(`Image uploaded to ${result.mission_name}/${result.filename}`);
    } else {
      alert('Upload failed');
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input
        type="text"
        placeholder="Mission name"
        value={mission}
        onChange={(e) => setMission(e.target.value)}
        required
      />
      
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />
      
      <button type="submit">Upload</button>
    </form>
  );
}
```

---

## ✅ Features Summary

### Core Features
- ✅ Image upload with mission organization
- ✅ Automatic directory creation
- ✅ Hierarchical folder navigation
- ✅ Image URL generation
- ✅ File type validation
- ✅ Filename conflict handling

### Security Features
- ✅ Path traversal protection
- ✅ File type validation
- ✅ Secure file operations
- ✅ Access control validation

### Developer Features
- ✅ Reusable utilities
- ✅ Comprehensive error handling
- ✅ Type hints throughout
- ✅ Detailed documentation
- ✅ Test suite included

---

## 🧪 Testing

### Run Test Suite
```bash
pip install requests pillow
python test_image_endpoints.py
```

### Manual Testing
```bash
# Test 1: Upload
curl -X POST "http://localhost:8000/files/images/upload?mission_name=test" \
  -F "file=@image.jpg"

# Test 2: List
curl -X GET "http://localhost:8000/files/images"

# Test 3: Browse
curl -X GET "http://localhost:8000/files/images/test"
```

---

## 🔒 Security

### Protections Implemented
1. **File Type Validation** - Only images allowed
2. **Path Traversal Protection** - Can't escape storage directory
3. **Safe File Operations** - No overwrites, timestamps used
4. **Input Validation** - All inputs validated

### Allowed Image Types
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`

---

## ⚙️ Configuration

### Environment Variables
```
STORAGE_DIR=./storage
```

### Automatic Behavior
- Creates `storage/` if missing
- Creates `storage/images/` on first access
- Creates mission folders on first upload
- **Zero setup required!**

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `API_DOCUMENTATION.md` | Complete API reference with examples |
| `UPDATED_IMPLEMENTATION_GUIDE.md` | Detailed implementation details |
| `QUICK_START_GUIDE.md` | Quick reference for developers |
| `VISUAL_GUIDE.md` | Visual diagrams and flows |
| `IMPLEMENTATION_SUMMARY.md` | Overview of all changes |
| `README.md` | This file |

---

## 🎯 Use Cases

### Use Case 1: Lunar Mission Analysis
```
1. Upload moon photos → mission_alpha
2. Browse photos in gallery
3. Show in chat for analysis
4. Store analysis results
```

### Use Case 2: Multi-Mission Project
```
1. Multiple missions → separate folders
2. Navigate between missions
3. Compare images side-by-side
4. Track changes over time
```

### Use Case 3: Collaborative Work
```
1. Team uploads mission images
2. Review and organize in folders
3. Share URLs for external viewing
4. Link to chat discussions
```

---

## 🐛 Troubleshooting

### "Cannot upload file"
- Check `STORAGE_DIR` in `.env`
- Ensure write permissions on storage folder
- Try with a different image file

### "Images not displaying"
- Check image URL format: `/images/mission_name/image.jpg`
- Verify image files exist in storage folder
- Check frontend CORS settings

### "Path not found"
- Verify mission folder exists
- Use forward slashes in paths: `mission/subfolder`
- Check exact folder name spelling

### "Permission denied"
```bash
# Fix permissions
chmod 755 storage/
chmod 755 storage/images/
```

---

## 🚀 Next Steps

1. **Test the API**
   - Use curl or Postman to test endpoints
   - Run `python test_image_endpoints.py`

2. **Integrate Frontend**
   - Copy React components from this guide
   - Test file upload flow
   - Test image gallery display

3. **Extend Features**
   - Add database integration
   - Implement image search
   - Add user permissions
   - Generate thumbnails

4. **Deploy to Production**
   - Set up proper storage permissions
   - Configure backup strategy
   - Monitor disk usage
   - Consider cloud storage (S3, Azure Blob)

---

## 📞 Support

### For API Usage
→ See `API_DOCUMENTATION.md`

### For Implementation Details
→ See `UPDATED_IMPLEMENTATION_GUIDE.md`

### For Quick Reference
→ See `QUICK_START_GUIDE.md`

### For Architecture Details
→ See `VISUAL_GUIDE.md`

---

## 🎉 Summary

Your TerraBot backend now has a **production-ready image management system** that is:

- ✅ **Easy to use** - Simple 3-endpoint API
- ✅ **Secure** - Multiple security layers
- ✅ **Scalable** - Works with unlimited files
- ✅ **Well-documented** - Comprehensive guides
- ✅ **Tested** - Full test suite included
- ✅ **Extensible** - Ready for advanced features

**Happy image management! 🖼️**

---

## 📋 Implementation Checklist

- ✅ Configuration updated (STORAGE_PATH)
- ✅ Schemas created (ImageUploadResponse, etc.)
- ✅ Routes implemented (3 endpoints)
- ✅ Utilities created (ImageManager)
- ✅ Error handling added
- ✅ Security features implemented
- ✅ Tests created
- ✅ Documentation written
- ✅ Frontend examples provided
- ✅ Ready for production!

---

## 📜 License & Notes

This implementation is part of the TerraBot project. All code follows the project's standards and is ready for immediate use.

For any questions or issues, refer to the documentation files or check the test suite for usage examples.

**Status: ✅ Complete and Production Ready**
