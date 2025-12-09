# main_pipeline.py

from utils.mission_metadata import MissionDB
from utils.direction import direction_zone
from utils.rover_path import rover_path_direction
from utils.objects import *
from utils.json_builder import build_output
from models.inference import run_model
from utils.visualization_utils import visualize_prediction
import json
import cv2
# ---------------------------
# LOAD MODEL (Roboflow)
# ---------------------------
def load_model(api_key, workspace, project, version):
    from roboflow import Roboflow
    rf = Roboflow(api_key=api_key)
    proj = rf.workspace(workspace).project(project)
    model = proj.version(version).model
    return model


def process_image(image, mission_name):
    mission = MissionDB().get(mission_name)
    mpp = mission["mpp"]

    outputs = run_model(image)
    H, W = image.shape[:2]

    features = {
        "craters": {},
        "rocks": {},
        "boulders": {},
        "rocky_regions": {},
        "artifacts": {},
        "artifact_path": {},
        "confidence_score": []
    }

    crater_i = rock_i = boulder_i = region_i = art_i = path_i = 1

    for obj in outputs:
        poly = obj["polygon"]
        clse = obj["class"]
        conf = obj["confidence"]

        features["confidence_score"].append(conf)

        if clse == "crater":
            d = process_crater(poly, mpp)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["craters"][crater_i] = d
            crater_i += 1

        elif clse == "rock":
            d = process_rock(poly, mpp)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["rocks"][rock_i] = d
            rock_i += 1

        elif clse == "boulder":
            d = process_boulder(poly, mpp)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["boulders"][boulder_i] = d
            boulder_i += 1

        elif clse == "rocky_region":
            d = process_rocky_region(poly, mpp)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["rocky_regions"][region_i] = d
            region_i += 1

        elif clse == "artifact":
            d = process_artifact(poly)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["artifacts"][art_i] = d
            art_i += 1

        elif clse == "rover_path":
            directions = rover_path_direction(poly)
            features["artifact_path"][path_i] = {
                "direction_sequence": directions,
                "start": directions[0],
                "end": directions[-1]
            }
            path_i += 1

    return build_output(features)

from tkinter import Tk, filedialog

def pick_image():
    Tk().withdraw()  # hide main window
    file_path = filedialog.askopenfilename(
        title="Select an Image",
        filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tif *.tiff")]
    )
    return file_path

# ---------------------------
# EXAMPLE USAGE
# ---------------------------
if __name__ == "__main__":
    
    # Load Roboflow model
    model = load_model(
        api_key="YOUR_API_KEY",
        workspace="your-workspace",
        project="your-project",
        version=1
    )
    
    img=pick_image()
    
    #image_path = pick_image()
    #print("Selected image:", image_path)
    
    
    # (A) Run on a single image
    results = process_image(
       # "test.png",
        img,
        model,
        mission_name="Apollo_17"
    )

    for  objects in results:
        vis = visualize_prediction(img, objects)
        cv2.imshow("Predictions", vis)
        cv2.waitKey(0)

    cv2.destroyAllWindows()


    

