import cv2
import numpy as np

def visualize_prediction(image, objects):
    img = image.copy()

    for obj in objects:
        poly = np.array(obj["polygon"], dtype=np.int32)
        cls = obj["class"]
        conf = obj["confidence"]

        cv2.polylines(img, [poly], True, (0,255,0), 2)

        cx, cy = obj["center_xy"]
        text = f"{cls} ({conf:.2f})"
        cv2.putText(img, text, (int(cx), int(cy)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                    (0,255,0), 2)

    return img
