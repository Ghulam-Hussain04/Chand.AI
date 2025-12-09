# utils/direction.py

def direction_zone(x, y, W, H):
    dx = x - W/2
    dy = H/2 - y  # invert y-axis

    horizontal = "E" if dx > 0 else "W"
    vertical = "N" if dy > 0 else "S"

    if abs(dx) < W*0.05:
        return vertical
    if abs(dy) < H*0.05:
        return horizontal

    return vertical + horizontal


def vector_direction(x1, y1, x2, y2):
    dx, dy = x2 - x1, y1 - y2
    
    if abs(dx) < 2 and abs(dy) < 2:
        return "STABLE"

    horiz = "E" if dx > 0 else "W"
    vert =  "N" if dy > 0 else "S"

    if abs(dx) < abs(dy) / 2:
        return vert
    if abs(dy) < abs(dx) / 2:
        return horiz

    return vert + horiz
