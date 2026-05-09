---
name: Dr. Terra Inference Pipeline Integration
description: Key facts about the lunar terrain inference pipeline integrated into dr-terra-backend in May 2026
type: project
---

Full inference pipeline integrated into dr-terra-backend (v3.0.0) on 2026-05-09.

**Why:** User needed RF-DETR model predictions + geo-feature extraction to feed real image data into the existing RAG/LLM pipeline instead of hardcoded test features.

**How to apply:** When working on chat/inference features, understand this full flow:
1. POST /rag/ask {query, file_id} → LunarFeatures cache check
2. Cache miss → get ProjectSpecification (from folder) → InferenceService.run_pipeline() → save LunarFeatures
3. Cache hit → use stored features
4. ask_llm(features=...) → Groq LLM response

**New tables:** `project_specifications` (1:1 with Folder), `lunar_features` (1:1 with File)

**New packages/services:**
- `app/inference/` — geometry, direction, rover_path, objects, json_builder, model, geo_pipeline
- `app/services/specification_service.py` — SpecificationService
- `app/services/lunar_features_service.py` — LunarFeaturesService  
- `app/services/inference_service.py` — InferenceService (async thread executor wrapper)

**Model:** Roboflow API by default (settings: ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE="chandai", ROBOFLOW_PROJECT="lunar-scene-analysis-fejkh", ROBOFLOW_VERSION=5). Configurable via .env.

**Default specs:** Chang3 mission — meters_per_pixel=0.5, camera_angle=15deg, resolution=1024x1024, fov=45deg, rover_height=1.5m
