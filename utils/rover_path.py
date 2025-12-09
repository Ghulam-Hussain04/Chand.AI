# utils/rover_path.py
from .direction import vector_direction

def rover_path_direction(poly):
    dirs = []

    for i in range(len(poly)-1):
        p1 = poly[i]
        p2 = poly[i+1]
        d = vector_direction(p1[0], p1[1], p2[0], p2[1])
        if d != "STABLE":
            dirs.append(d)

    if not dirs:
        return ["UNKNOWN"]

    simplified = [dirs[0]]
    for d in dirs:
        if d != simplified[-1]:
            simplified.append(d)

    return simplified
