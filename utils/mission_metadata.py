# utils/mission_metadata.py
import pandas as pd
import os
class MissionDB:
    def __init__(self, path="missions.csv"):
        self.path = path
        self._load_csv()

    def _load_csv(self):
        if os.path.exists(self.path):
            self.df = pd.read_csv(self.path)
        else:
            self.df = pd.DataFrame(columns=[
                "mission_name",
                "meters_per_pixel",
                "camera_angle_deg",
                "camera_resolution_w",
                "camera_resolution_h",
                "camera_fov_deg",
                "rover_height_m",
                "notes"
            ])
            self.df.to_csv(self.path, index=False)


    def get(self, mission_name):
        row = self.df[self.df["mission_name"] == mission_name].iloc[0]
        return {
            "mpp": row["meters_per_pixel"],
            "angle": row["camera_angle_deg"],
            "fov": row["camera_fov_deg"],
            "notes": row["notes"]
        }

    def add_mission(self, data):
        self.df.loc[len(self.df)] = data
        self.df.to_csv(self.path, index=False)

    def show_missions(self):
        if (self.df.empty):
            print("No missions found. Add a mission first.")
        else:
            print(self.df)
        

# def add_or_update_mission(self, **kwargs):
#         mission_name = kwargs.get("mission_name")
#         if mission_name is None:
#             raise ValueError("mission_name is required.")

#         # Check if mission exists
#         idx = self.df.index[self.df["mission_name"] == mission_name]

#         if len(idx) > 0:
#             # Update
#             for key, value in kwargs.items():
#                 if key in self.df.columns:
#                     self.df.at[idx[0], key] = value
#         else:
#             # Add new
#             self.df.loc[len(self.df)] = kwargs

#         self.save()
#         return True