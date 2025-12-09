# utils/geometry.py
import math

def polygon_area(points):
    area = 0
    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i+1) % len(points)]
        area += x1*y2 - x2*y1
    return abs(area) / 2

def polygon_centroid(points):
    A = 0
    Cx = 0
    Cy = 0

    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i+1) % len(points)]
        cross = x1*y2 - x2*y1
        A += cross
        Cx += (x1 + x2) * cross
        Cy += (y1 + y2) * cross

    A *= 0.5
    Cx /= (6 * A)
    Cy /= (6 * A)

    return Cx, Cy


def max_diameter(points):
    max_d = 0
    n = len(points)

    for i in range(n):
        for j in range(i+1, n):
            d = math.dist(points[i], points[j])
            max_d = max(max_d, d)
    return max_d


def bounding_box(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)
