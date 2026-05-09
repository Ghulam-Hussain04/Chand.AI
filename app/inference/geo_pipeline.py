"""
Geo-feature extraction pipeline.

Converts raw model predictions (polygon detections) into structured
geo-spatial features (craters, rocks, boulders, etc.) using mission
calibration parameters (meters-per-pixel, image dimensions).
"""
from .direction import direction_zone
from .rover_path import rover_path_direction
from .objects import (
    process_crater,
    process_rock,
    process_boulder,
    process_rocky_region,
    process_artifact,
)
from .json_builder import build_output


def process_image(image_shape: tuple, outputs: dict, specs: dict) -> dict:
    """
    Run geo-feature extraction on model predictions.

    Args:
        image_shape: (height, width) of the source image.
        outputs: Roboflow-format prediction dict with a 'predictions' list.
                 Each prediction: {class, confidence, points: [{x, y}, ...]}.
        specs: Mission specification dict must contain 'meters_per_pixel'.

    Returns:
        Feature dict produced by build_output():
            {image_features, craters_count, rocks_count,
             boulders_count, rocky_regions_count}
    """
    mpp = specs["meters_per_pixel"]
    H, W = image_shape

    features = {
        "craters": {},
        "rocks": {},
        "boulders": {},
        "rocky_regions": {},
        "artifacts": {},
        "artifact_path": {},
        "confidence_score": [],
    }

    crater_i = rock_i = boulder_i = region_i = art_i = path_i = 1

    for obj in outputs.get("predictions", []):
        poly = [(p["x"], p["y"]) for p in obj.get("points", [])]
        if not poly:
            continue

        clse = obj.get("class", "")
        conf = obj.get("confidence", 0.0)
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

        elif clse == "rocky region":
            d = process_rocky_region(poly, mpp)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["rocky_regions"][region_i] = d
            region_i += 1

        elif clse == "artifact":
            d = process_artifact(poly)
            d["direction_zone"] = direction_zone(d["location"]["x"], d["location"]["y"], W, H)
            features["artifacts"][art_i] = d
            art_i += 1

        elif clse == "rover path" and len(poly) >= 2:
            directions = rover_path_direction(poly)
            features["artifact_path"][path_i] = {
                "direction_sequence": directions,
                "start": directions[0],
                "end": directions[-1],
            }
            path_i += 1

    return build_output(features)
