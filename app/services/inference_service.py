"""
InferenceService — orchestrates model prediction + geo-feature extraction.

Both the model.predict() and geo_pipeline.process_image() calls are
CPU-bound and synchronous, so they are executed in a thread-pool executor
to avoid blocking the async event loop.
"""
import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from app.config import settings

# Shared executor — 2 workers is sufficient for sequential inference requests
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="inference")


def _run_sync_pipeline(image_path: str, specs: dict) -> dict:
    """
    Synchronous entry point executed inside the thread executor.

    1. Opens the image to obtain its dimensions (PIL, no cv2 dependency).
    2. Runs model.predict() to get polygon detections.
    3. Passes detections + specs to geo_pipeline.process_image().
    """
    from PIL import Image as PILImage
    from app.inference.model import get_model
    from app.inference.geo_pipeline import process_image

    with PILImage.open(image_path) as img:
        W, H = img.size                  # PIL convention: (width, height)

    model = get_model()
    predictions = model.predict(image_path)

    return process_image(image_shape=(H, W), outputs=predictions, specs=specs)


class InferenceService:

    @staticmethod
    async def run_pipeline(image_path: str, specs: dict) -> dict:
        """
        Asynchronously run the full inference + geo-feature extraction pipeline.

        Args:
            image_path: Absolute path to the image file on disk.
            specs:      Mission specification dict (must include 'meters_per_pixel').

        Returns:
            Geo-feature dict: {image_features, craters_count, rocks_count,
                               boulders_count, rocky_regions_count}.

        Raises:
            FileNotFoundError: If image_path does not exist.
            RuntimeError:      If model inference or geo-pipeline fails.
        """
        if not os.path.isfile(image_path):
            raise FileNotFoundError(f"Image not found at path: {image_path}")

        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                _executor, _run_sync_pipeline, image_path, specs
            )
        except Exception as exc:
            raise RuntimeError(f"Inference pipeline failed: {exc}") from exc

        return result
