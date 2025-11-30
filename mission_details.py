import pandas as pd
import os
import math
from measurement import compute_resolution_m_per_pixel
mission_file = "missions.csv"

if os.path.exists(mission_file):
    missions_df = pd.read_csv(mission_file)

else:
    missions_df = pd.DataFrame(columns=[
        "Mission", "Rover", "Camera", "Resolution_m_per_pixel", "Rover_Height_m", "Camera_FOV_deg", "Other_Notes"
    ])
    missions_df.to_csv(mission_file, index=False)

    
def show_missions():
    if missions_df.empty:
        print("No missions found. Add a mission first.")
    else:
        print(missions_df)
        
        
# Add or update mission
def add_or_update_mission(mission, rover, camera, resolution_m_per_pixel, rover_height_m, camera_fov_deg=None, other_notes=""):
    global missions_df
    if mission in missions_df["Mission"].values:
        print(f"Mission '{mission}' exists. Updating details...")
        missions_df.loc[missions_df["Mission"] == mission, ["Rover", "Camera", "Resolution_m_per_pixel", "Rover_Height_m", "Camera_FOV_deg", "Other_Notes"]] = \
            [rover, camera, resolution_m_per_pixel, rover_height_m, camera_fov_deg, other_notes]
    else:
        print(f"Adding new mission '{mission}'...")
        missions_df = pd.concat([missions_df, pd.DataFrame([{
            "Mission": mission,
            "Rover": rover,
            "Camera": camera,
            "Resolution_m_per_pixel": resolution_m_per_pixel,
            "Rover_Height_m": rover_height_m,
            "Camera_FOV_deg": camera_fov_deg,
            "Other_Notes": other_notes
        }])], ignore_index=True)
    missions_df.to_csv(mission_file, index=False)
    
    print("Mission details saved!")            
    
    
  
# Example: Chang'e 3 Navcam
focal_length_mm = 50.0       # Navcam / PCAM focal length
sensor_width_mm = 36.0       # full-frame equivalent, adjust for real sensor
image_width_px = 1024        # image width in pixels
distance_to_surface_m = 1.2  # camera height above ground

resolution_m = compute_resolution_m_per_pixel(focal_length_mm, sensor_width_mm, image_width_px, distance_to_surface_m)
#print(f"Estimated ground resolution for Chang'e 3 Navcam: {resolution_m:.6f} m/pixel")

# You can now store this in your mission DB
add_or_update_mission(
    mission="Chang 3",
    rover="Yutu",
    camera="Navcam",
    resolution_m_per_pixel=resolution_m,
    rover_height_m=distance_to_surface_m,
    camera_fov_deg=None,
    other_notes="Lunar landing 2013; estimated resolution"
)
    
    
#show_missions()    
    