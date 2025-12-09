# utils/objects.py
from .geometry import polygon_centroid, max_diameter, polygon_area

def process_crater(poly, mpp):
    cx, cy = polygon_centroid(poly)
    diameter_pix = max_diameter(poly)
    return {
        "diameter_m": diameter_pix * mpp,
        "location": {"x": cx, "y": cy}
    }

def process_rock(poly, mpp):
    cx, cy = polygon_centroid(poly)
    size_pix = max_diameter(poly)
    return {
        "size_m": size_pix * mpp,
        "location": {"x": cx, "y": cy}
    }

def process_boulder(poly, mpp):
    cx, cy = polygon_centroid(poly)
    size_pix = max_diameter(poly)
    area_pix = polygon_area(poly)
    return {
        "size_m": size_pix * mpp,
        "surface_area_m2": area_pix * (mpp ** 2),
        "location": {"x": cx, "y": cy}
    }

def process_rocky_region(poly, mpp):
    cx, cy = polygon_centroid(poly)
    area_pix = polygon_area(poly)
    return {
        "area_m2": area_pix * (mpp ** 2),
        "location": {"x": cx, "y": cy}
    }

def process_artifact(poly):
    cx, cy = polygon_centroid(poly)
    return {
        "presence": "yes",
        "location": {"x": cx, "y": cy}
    }
