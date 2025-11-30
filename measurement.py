# !pip install shapely
from shapely.geometry import Polygon

import pandas as pd
import math

mission_file = "missions.csv"

# Diameter of a circular object (boulder or crater) in meters
def polygon_diameter_m(polygon_points, mission):
    """
    Approximate diameter of polygon (max distance between any two vertices)
    Returns diameter in meters
    """
    missions_df = pd.read_csv(mission_file)
    mission_data = missions_df[missions_df["Mission"] == mission]
    if mission_data.empty:
        raise ValueError(f"Mission '{mission}' not found.")
    resolution = float(mission_data["Resolution_m_per_pixel"].values[0])
    
    max_dist = 0
    n = len(polygon_points)
    for i in range(n):
        for j in range(i+1, n):
            dx = polygon_points[i][0] - polygon_points[j][0]
            dy = polygon_points[i][1] - polygon_points[j][1]
            dist_px = math.sqrt(dx**2 + dy**2)
            if dist_px > max_dist:
                max_dist = dist_px
    return max_dist * resolution

# Area of a polygonal region (rocky area) in m^2
def polygon_area_m2(polygon_points, mission):
    """
    polygon_points: list of (x, y) pixel coordinates
    Returns area in m^2
    """
    missions_df = pd.read_csv(mission_file)
    poly = Polygon(polygon_points)
    pixel_area = poly.area
    mission_data = missions_df[missions_df["Mission"] == mission]
    if mission_data.empty:
        raise ValueError(f"Mission '{mission}' not found.")
    resolution = float(mission_data["Resolution_m_per_pixel"].values[0])
    return pixel_area * (resolution ** 2)


def compute_resolution_m_per_pixel(focal_length_mm, sensor_width_mm, image_width_px, distance_to_surface_m):
    """
    Compute ground resolution (meters per pixel) for a camera.

    Parameters:
    - focal_length_mm : focal length of camera in mm
    - sensor_width_mm : sensor width in mm
    - image_width_px : number of pixels in image width
    - distance_to_surface_m : distance from camera to surface in meters

    Returns:
    - resolution_m_per_pixel : ground resolution in meters per pixel
    """
    # Field of view (horizontal) in radians
    fov_rad = 2 * math.atan((sensor_width_mm / 2) / focal_length_mm)
    
    # Ground width covered by the image
    ground_width_m = 2 * distance_to_surface_m * math.tan(fov_rad / 2)
    
    # Resolution in meters per pixel
    resolution_m_per_pixel = ground_width_m / image_width_px
    return resolution_m_per_pixel



# Replace `polygon_points` with your polygon label coordinates in pixels.

'''
# Example: Boulder polygon
boulder_polygon = [(10, 10), (15, 12), (14, 18), (9, 16)]
print("Boulder area (m²):", polygon_area_m2(boulder_polygon, "Chang 3"))
print("Boulder diameter (m):", polygon_diameter_m(boulder_polygon, "Chang 3"))


# Example: Crater polygon
crater_polygon = [(50, 50), (60, 55), (55, 65), (48, 60)]
print("Crater area (m²):", polygon_area_m2(crater_polygon, "Chang 3"))
print("Crater diameter (m):", polygon_diameter_m(crater_polygon, "Chang 3"))


# Example: Rocky region polygon
rocky_polygon = [(5, 5), (15, 5), (20, 15), (10, 20)]
print("Rocky region area (m²):", polygon_area_m2(rocky_polygon, "Chang 3"))

'''
