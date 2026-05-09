# Inference Architecture — Dr. Terra / Chand.AI

## Overview

When a user sends a chat message with a selected image the backend runs a two-stage pipeline before the LLM produces an answer:

```
Image File (DB)
     │
     ▼
[LunarFeatures cache check]
     │
  Hit ──────────────────────────────────────────────────────────┐
     │                                                           │
  Miss                                                           │
     │                                                           │
     ▼                                                           │
[ProjectSpecification]  (per-folder mission calibration)        │
     │  meters_per_pixel, camera params, etc.                   │
     ▼                                                           │
[RF-DETR / Roboflow Model]  ← inference/model.py               │
     │  predict(image_path) → polygon predictions JSON          │
     ▼                                                           │
[Geo-Feature Pipeline]  ← inference/geo_pipeline.py            │
     │  process_image(shape, predictions, specs)                │
     │  → craters, rocks, boulders, rocky_regions, artifacts   │
     ▼                                                           │
[LunarFeatures record saved to DB]                              │
     │                                                           │
     └──────────────────────────────────────────────────────────┘
                                │
                                ▼
                    [RAG Pipeline] ← rag/pipeline.py
                         │  ChromaDB + BM25 retrieval
                         │  Geo-features injected into prompt
                         ▼
                    [Groq LLM]
                         │
                         ▼
                    [Chat record saved to DB]
                         │
                         ▼
                    JSON response to client
```

---

## Package Structure

```
app/
├── inference/
│   ├── __init__.py
│   ├── model.py          ModelLoader class + get_model() singleton + preload_model()
│   ├── geo_pipeline.py   process_image() — main orchestration function
│   ├── geometry.py       polygon_area, polygon_centroid, max_diameter, bounding_box
│   ├── direction.py      direction_zone, vector_direction
│   ├── rover_path.py     rover_path_direction
│   ├── objects.py        process_crater/rock/boulder/rocky_region/artifact
│   └── json_builder.py   build_output — formats final feature dict
│
├── services/
│   ├── inference_service.py       InferenceService.run_pipeline() — async wrapper
│   ├── specification_service.py   SpecificationService — CRUD for ProjectSpecification
│   └── lunar_features_service.py  LunarFeaturesService — CRUD for LunarFeatures
│
└── db/
    └── database.py   ProjectSpecification model, LunarFeatures model
```

---

## Key Components

### 1. `app/inference/model.py` — Model Loader

**Class**: `ModelLoader(choice, num_classes)`

Supports three model backends:

| choice value  | Backend                         | Weight file                          |
|---------------|---------------------------------|--------------------------------------|
| `"roboflow"`  | Roboflow hosted API             | N/A — loaded via API key             |
| `"yolov11"`   | Ultralytics YOLOv11 (local)     | `{INFERENCE_MODEL_PATH}/yolov11.pt`  |
| `"yolov8"`    | Ultralytics YOLOv8 (local)      | `{INFERENCE_MODEL_PATH}/yolov8.pt`   |
| `"maskrcnn_r50"` | Torchvision Mask R-CNN     | `{INFERENCE_MODEL_PATH}/maskrcnn_r50.pth` |

**Singleton**: `get_model()` returns a module-level instance, created once on first call.  
**Startup warm-up**: `preload_model()` is called at FastAPI startup via the `lifespan` hook. Failures are logged but non-fatal.

**Output format** (Roboflow-compatible):
```json
{
  "predictions": [
    {
      "class": "crater",
      "confidence": 0.87,
      "points": [{"x": 100, "y": 200}, ...],
      "x": 150,
      "y": 250
    }
  ]
}
```

All non-Roboflow backends convert their native output to this format internally.

---

### 2. `app/inference/geo_pipeline.py` — Feature Extraction

**Function**: `process_image(image_shape, outputs, specs) → dict`

**Inputs**:
- `image_shape`: `(height, width)` tuple obtained from PIL.
- `outputs`: Model prediction dict from `ModelLoader.predict()`.
- `specs`: Mission specification dict (must contain `meters_per_pixel`).

**Process** for each detected polygon:
1. Extract polygon points from prediction.
2. Compute centroid, diameter, area via `geometry.py`.
3. Convert pixel measurements to metres using `meters_per_pixel`.
4. Classify spatial position using `direction.py` (N/S/E/W/NE/NW/SE/SW).
5. For rover path polygons, compute direction sequence via `rover_path.py`.

**Output** (stored in `LunarFeatures.features`):
```json
{
  "image_features": {
    "craters":  { "1": {"diameter_m": 12.5, "location": {"x": 320, "y": 240}, "direction_zone": "NE"} },
    "rocks":    { "1": {"size_m": 3.2, "location": {...}, "direction_zone": "SW"} },
    "boulders": { "1": {"size_m": 48.5, "surface_area_m2": 580.0, "location": {...}, "direction_zone": "S"} },
    "rocky_regions": {},
    "artifacts": {},
    "artifact_path": {},
    "confidence_score": [0.87, 0.82, ...]
  },
  "craters_count": 1,
  "rocks_count": 1,
  "boulders_count": 1,
  "rocky_regions_count": 0
}
```

---

### 3. `app/services/inference_service.py` — Async Bridge

Since `ModelLoader.predict()` and `process_image()` are synchronous and CPU-bound, `InferenceService.run_pipeline()` wraps them in a `ThreadPoolExecutor` (2 workers) so the async event loop is never blocked.

```python
async def run_pipeline(image_path: str, specs: dict) -> dict
```

---

### 4. `app/services/specification_service.py` — Mission Calibration

Each project folder has one `ProjectSpecification` record. Default values (Chang'e 3 mission) are applied automatically when a folder is created.

| Field               | Default  | Description                        |
|---------------------|----------|------------------------------------|
| `mission_name`      | Chang3   | Human-readable mission identifier  |
| `meters_per_pixel`  | 0.5      | Critical for metric conversions    |
| `camera_angle_deg`  | 15.0     | Camera depression angle            |
| `camera_resolution_w` | 1024   | Image width in pixels              |
| `camera_resolution_h` | 1024   | Image height in pixels             |
| `camera_fov_deg`    | 45.0     | Camera field of view               |
| `rover_height_m`    | 1.5      | Rover height above ground          |

---

### 5. `app/services/lunar_features_service.py` — Result Cache

`LunarFeatures` table implements a **per-image cache**:

- On first `/rag/ask` with a `file_id` → inference runs and result is saved.
- On subsequent calls with the same `file_id` → cached result is returned immediately (no inference).
- To force re-inference, the admin can delete the cache record via `LunarFeaturesService.delete_by_file_id()`.

---

## Database Schema (new tables)

### `project_specifications`

| Column               | Type     | Description                          |
|----------------------|----------|--------------------------------------|
| `id`                 | Integer  | Primary key                          |
| `folder_id`          | Integer  | FK → folders.id (unique, cascade)    |
| `mission_name`       | String   | Mission identifier                   |
| `meters_per_pixel`   | Float    | Scale calibration                    |
| `camera_angle_deg`   | Float    | Camera angle                         |
| `camera_resolution_w`| Integer  | Image width (px)                     |
| `camera_resolution_h`| Integer  | Image height (px)                    |
| `camera_fov_deg`     | Float    | Field of view                        |
| `rover_height_m`     | Float    | Rover height                         |
| `notes`              | Text     | Free-text notes                      |
| `created_at`         | DateTime | Record creation timestamp            |
| `updated_at`         | DateTime | Last update timestamp                |

### `lunar_features`

| Column               | Type     | Description                          |
|----------------------|----------|--------------------------------------|
| `id`                 | Integer  | Primary key                          |
| `file_id`            | Integer  | FK → files.id (unique, cascade)      |
| `features`           | JSON     | Full geo-pipeline output             |
| `craters_count`      | Integer  | Denormalised count                   |
| `rocks_count`        | Integer  | Denormalised count                   |
| `boulders_count`     | Integer  | Denormalised count                   |
| `rocky_regions_count`| Integer  | Denormalised count                   |
| `model_name`         | String   | Which model was used                 |
| `processed_at`       | DateTime | Pipeline execution timestamp         |

---

## Configuration (`.env` / `config.py`)

| Variable                | Default                              | Purpose                         |
|-------------------------|--------------------------------------|---------------------------------|
| `INFERENCE_MODEL_NAME`  | `roboflow`                           | Model backend selector          |
| `INFERENCE_MODEL_PATH`  | `../dr-terra-inference/inference/models` | Local weight files directory |
| `INFERENCE_NUM_CLASSES` | `6`                                  | Including background class      |
| `ROBOFLOW_API_KEY`      | (set in config)                      | Roboflow cloud API key          |
| `ROBOFLOW_WORKSPACE`    | `chandai`                            | Roboflow workspace slug         |
| `ROBOFLOW_PROJECT`      | `lunar-scene-analysis-fejkh`         | Roboflow project slug           |
| `ROBOFLOW_VERSION`      | `5`                                  | Deployed model version          |

---

## Thread Safety

- `_model_instance` is a module-level global. The assignment is not thread-safe for the very first creation, but in practice only one request races for it and both would produce identical objects. For production a `threading.Lock` can be added trivially.
- The `ThreadPoolExecutor` (2 workers) ensures at most 2 inference jobs run concurrently, preventing GPU/memory exhaustion.
