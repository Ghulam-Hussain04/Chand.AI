"""
Model loader — RF-DETR (Roboflow), YOLO, or Mask R-CNN.

All heavy imports are deferred to _load_model() so the module can be
imported without GPU/Roboflow packages present.  A module-level singleton
(get_model / preload_model) avoids repeated initialisation across requests.
"""
import os
from typing import Optional
from app.config import settings

_model_instance: Optional["ModelLoader"] = None


class ModelLoader:
    """Loads and wraps an object-detection model for lunar scene analysis."""

    def __init__(self, choice: str, num_classes: int):
        self.model_path = settings.INFERENCE_MODEL_PATH
        self.num_classes = num_classes
        self.choice = choice
        self.model_type = self._detect_model_type()
        self.model = self._load_model()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _detect_model_type(self) -> str:
        name = self.choice.lower()
        if "roboflow" in name:
            return "roboflow"
        if "yolov11" in name:
            return "yolov11"
        if "yolov8" in name:
            return "yolov8"
        if "resnet101" in name:
            return "maskrcnn_r101"
        if "resnet50" in name:
            return "maskrcnn_r50"
        return "maskrcnn"

    def _load_model(self):
        if self.model_type == "roboflow":
            from roboflow import Roboflow
            rf = Roboflow(api_key=settings.ROBOFLOW_API_KEY)
            proj = rf.workspace(settings.ROBOFLOW_WORKSPACE).project(settings.ROBOFLOW_PROJECT)
            return proj.version(settings.ROBOFLOW_VERSION).model

        if "yolo" in self.model_type:
            from ultralytics import YOLO
            return YOLO(os.path.join(self.model_path, f"{self.model_type}.pt"))

        # Mask R-CNN branch
        import torch
        from torchvision.models.detection import maskrcnn_resnet50_fpn
        from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
        from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

        model = maskrcnn_resnet50_fpn(weights=None)

        in_features = model.roi_heads.box_predictor.cls_score.in_features
        model.roi_heads.box_predictor = FastRCNNPredictor(in_features, self.num_classes)

        in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
        model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, 256, self.num_classes)

        weight_file = f"{self.model_type}.pth"
        model.load_state_dict(
            torch.load(os.path.join(self.model_path, weight_file), map_location="cpu")
        )
        model.eval()
        return model

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict(self, image_path: str) -> dict:
        """Run inference and return a Roboflow-compatible prediction dict."""
        if self.model_type == "roboflow":
            return self.model.predict(image_path, confidence=40).json()

        if "yolo" in self.model_type:
            results = self.model.predict(image_path, imgsz=640, conf=0.3, verbose=False)
            return self._yolo_to_predictions(results)

        import torch
        import torchvision.transforms as T
        from PIL import Image

        img = Image.open(image_path).convert("RGB")
        tensor = T.ToTensor()(img)
        with torch.no_grad():
            output = self.model([tensor])
        return self._maskrcnn_to_predictions(output)

    # ------------------------------------------------------------------
    # Format converters
    # ------------------------------------------------------------------

    @staticmethod
    def _yolo_to_predictions(results) -> dict:
        """Convert ultralytics Results to Roboflow-format dict."""
        predictions = []
        class_names = results[0].names
        for r in results:
            if r.masks is None:
                continue
            for box, cls, conf, mask_pts in zip(
                r.boxes.xyxy, r.boxes.cls, r.boxes.conf, r.masks.xy
            ):
                points = [{"x": float(p[0]), "y": float(p[1])} for p in mask_pts]
                predictions.append({
                    "class": class_names[int(cls)],
                    "confidence": float(conf),
                    "points": points,
                    "x": float((box[0] + box[2]) / 2),
                    "y": float((box[1] + box[3]) / 2),
                })
        return {"predictions": predictions}

    @staticmethod
    def _maskrcnn_to_predictions(output) -> dict:
        """Convert Mask R-CNN output to Roboflow-format dict."""
        class_labels = {1: "crater", 2: "rock", 3: "boulder", 4: "rocky region", 5: "artifact"}
        predictions = []
        result = output[0]
        for i in range(len(result["labels"])):
            label = int(result["labels"][i])
            score = float(result["scores"][i])
            if score < 0.3:
                continue
            bbox = result["boxes"][i].tolist()
            points = [
                {"x": bbox[0], "y": bbox[1]},
                {"x": bbox[2], "y": bbox[1]},
                {"x": bbox[2], "y": bbox[3]},
                {"x": bbox[0], "y": bbox[3]},
            ]
            predictions.append({
                "class": class_labels.get(label, "unknown"),
                "confidence": score,
                "points": points,
                "x": (bbox[0] + bbox[2]) / 2,
                "y": (bbox[1] + bbox[3]) / 2,
            })
        return {"predictions": predictions}


# ------------------------------------------------------------------
# Module-level singleton
# ------------------------------------------------------------------

def get_model() -> ModelLoader:
    """Return the shared ModelLoader instance, creating it on first call."""
    global _model_instance
    if _model_instance is None:
        _model_instance = ModelLoader(settings.INFERENCE_MODEL_NAME, settings.INFERENCE_NUM_CLASSES)
    return _model_instance


def preload_model() -> None:
    """Warm up the model at server startup. Errors are logged but not fatal."""
    try:
        get_model()
        print("✓ Inference model loaded successfully")
    except Exception as exc:
        print(f"⚠  Inference model failed to load at startup: {exc}")
        print("   Inference will be attempted again on the first request.")
