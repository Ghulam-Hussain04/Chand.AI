import numpy as np
import math

# --- Function to describe location in user-friendly terms ---
def describe_location(x, y, w, h, img_width, img_height):
    """
    Convert bounding box coordinates into human-friendly location labels.
    Divides image into 3x3 grid: top/middle/bottom and left/center/right
    """
    # Compute center of object
    cx = x + w / 2
    cy = y + h / 2
    
    # Horizontal position
    if cx < img_width / 3:
        horiz = "left"
    elif cx < 2 * img_width / 3:
        horiz = "center"
    else:
        horiz = "right"
    
    # Vertical position
    if cy < img_height / 3:
        vert = "top"
    elif cy < 2 * img_height / 3:
        vert = "middle"
    else:
        vert = "bottom"
    
    return f"{vert}-{horiz}"

