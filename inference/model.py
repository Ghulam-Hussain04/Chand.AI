import torch
import torchvision.transforms as T
from PIL import Image
import os
from ultralytics import YOLO
from torchvision.models.detection import maskrcnn_resnet50_fpn #, maskrcnn_resnet101_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor


class ModelLoader:

    def __init__(self, choice , num_classes):
        """
        model_path: path to .pt or .pth file
        num_classes: including background
        """
        #self.model_path = model_path
        self.model_path = r'inference\models'
        self.num_classes = num_classes
        self.choice=choice
        self.model_type = self.detect_model_type()
        self.model = self.load_model()
        

    def detect_model_type(self):
        """
        Detect the type of model based on filename.
        """
        name = os.path.basename(self.choice).lower()
        if "roboflow" in name:
          
            return "roboflow"
        if "yolov11" in name:
            return "yolov11"
        elif "yolov18" in name:
            return "yolov8"
        elif "resnet50" in name:
            return "maskrcnn_r50"
        elif "resnet101" in name:
            return "maskrcnn_r101"
        else :
            return "maskrcnn"  # default fallback

    def load_model(self):
        """
        Load model according to detected type.
        """
        if "roboflow" in self.model_type:
           
            from roboflow import Roboflow
            
            rf = Roboflow(api_key="McrhzGgUVuaQbO2a1BX6")
            proj = rf.workspace("chandai").project("lunar-scene-analysis-fejkh") 
            return proj.version(5).model
        
        # ---------- YOLO MODELS (.pt) ----------
        if "yolov" in self.model_type:
            print("Loading YOLO model...")
            
            return YOLO(os.path.join(self.model_path,f'{self.model_type}.pt'))
        
        # ---------- Mask R-CNN ResNet50 (.pth) ----------
        if "maskrcnn_r50" in self.model_type:
            print("Loading Mask R-CNN ResNet50...")
            model = maskrcnn_resnet50_fpn(weights=None)

        # ---------- Mask R-CNN ResNet101 (.pth) ----------
        # elif  "maskrcnn_r101" in self.model_type:
        #     print("Loading Mask R-CNN ResNet101...")
        #     model = maskrcnn_resnet101_fpn(weights=None)

        # Replace the heads for your dataset
        in_features = model.roi_heads.box_predictor.cls_score.in_features
        model.roi_heads.box_predictor = FastRCNNPredictor(in_features, self.num_classes)

        in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
        hidden = 256
        model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, hidden, self.num_classes)

        # Load trained weights
        model.load_state_dict(torch.load(os.path.join(self.model_path,self.model_type), map_location="cpu"))
        model.eval()

        return model

    # -------------------------------------------------------
    # PREDICTION
    # -------------------------------------------------------
    def predict(self, image_path):
        """
        Predict using the loaded model.
        """
        if  "roboflow" in self.model_type:
            return self.model.predict(image_path, confidence=40).json()
        
        if  "yolo" in self.model_type:
            return self.model.predict(image_path , save=True, show=True , imgsz=640, conf=0.3 )

        # ------------- Mask R-CNN inference ----------------
        img = Image.open(image_path).convert("RGB")
        transform = T.Compose([T.ToTensor()])
        input_tensor = transform(img)

        with torch.no_grad():
            output = self.model([input_tensor])

        return output


# ======================================================================
# Example usage:
# ======================================================================

def run_model( name, image_path):

    # User chooses model
    #model_path = "models/yolo_v11.pt"        # change path
    num_classes = 6                          # include background

    ml = ModelLoader(name, num_classes)

    # Predict on an image
    result = ml.predict(image_path)
    return result