def build_output(features: dict) -> dict:
    return {
        "image_features": features,
        "craters_count": len(features["craters"]),
        "rocks_count": len(features["rocks"]),
        "boulders_count": len(features["boulders"]),
        "rocky_regions_count": len(features["rocky_regions"]),
    }
