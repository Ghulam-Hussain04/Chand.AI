"""
ImageProcessor - Utility for processing images (resize, compress, extract features)

Handles image optimization and metadata extraction for stored files.
"""
from PIL import Image as PILImage
from io import BytesIO
from typing import Tuple, Dict, Any, Optional
import json

class ImageProcessor:
    """Service for processing and optimizing images"""
    
    # Image constraints
    MAX_WIDTH = 4000
    MAX_HEIGHT = 4000
    THUMBNAIL_SIZE = (200, 200)
    THUMBNAIL_QUALITY = 85
    FULL_IMAGE_QUALITY = 90
    
    @staticmethod
    def validate_image_format(content: bytes) -> bool:
        """
        Validate if content is a valid image
        
        Returns:
            True if valid image, False otherwise
        """
        try:
            img = PILImage.open(BytesIO(content))
            img.verify()
            return True
        except Exception:
            return False
    
    @staticmethod
    def get_image_dimensions(content: bytes) -> Optional[Tuple[int, int]]:
        """
        Get image width and height
        
        Returns:
            Tuple of (width, height) or None if not an image
        """
        try:
            img = PILImage.open(BytesIO(content))
            return img.size
        except Exception:
            return None
    
    @staticmethod
    def resize_image(
        content: bytes,
        max_width: int = MAX_WIDTH,
        max_height: int = MAX_HEIGHT,
        quality: int = FULL_IMAGE_QUALITY
    ) -> bytes:
        """
        Resize image to fit within max dimensions while maintaining aspect ratio
        
        Args:
            content: Original image bytes
            max_width: Maximum width
            max_height: Maximum height
            quality: JPEG quality (1-100)
            
        Returns:
            Compressed image bytes
        """
        try:
            img = PILImage.open(BytesIO(content))
            
            # Convert RGBA to RGB if needed (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = PILImage.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Calculate new dimensions
            img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)
            
            # Save to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            return output.getvalue()
        
        except Exception as e:
            # If processing fails, return original
            print(f"Warning: Image resize failed: {str(e)}, returning original")
            return content
    
    @staticmethod
    def create_thumbnail(
        content: bytes,
        size: Tuple[int, int] = THUMBNAIL_SIZE,
        quality: int = THUMBNAIL_QUALITY
    ) -> bytes:
        """
        Create thumbnail from image
        
        Args:
            content: Original image bytes
            size: Thumbnail size (width, height)
            quality: JPEG quality (1-100)
            
        Returns:
            Thumbnail image bytes
        """
        try:
            img = PILImage.open(BytesIO(content))
            
            # Convert RGBA to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = PILImage.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Create thumbnail
            img.thumbnail(size, PILImage.Resampling.LANCZOS)
            
            # Save to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            return output.getvalue()
        
        except Exception as e:
            print(f"Warning: Thumbnail creation failed: {str(e)}")
            raise ValueError(f"Failed to create thumbnail: {str(e)}")
    
    @staticmethod
    def extract_image_features(
        content: bytes
    ) -> Dict[str, Any]:
        """
        Extract basic image features
        
        Returns:
            Dictionary with image metadata:
            - format: Image format (JPEG, PNG, etc.)
            - mode: Color mode (RGB, RGBA, etc.)
            - width: Image width
            - height: Image height
            - size_mb: File size in megabytes
            - has_transparency: Boolean for RGBA/transparent images
        """
        try:
            img = PILImage.open(BytesIO(content))
            
            return {
                "format": img.format or "unknown",
                "mode": img.mode,
                "width": img.width,
                "height": img.height,
                "size_mb": round(len(content) / (1024 * 1024), 2),
                "has_transparency": img.mode in ('RGBA', 'LA', 'P'),
                "dpi": img.info.get('dpi', None)
            }
        except Exception as e:
            print(f"Warning: Feature extraction failed: {str(e)}")
            return {
                "error": str(e),
                "size_mb": round(len(content) / (1024 * 1024), 2)
            }
    
    @staticmethod
    def process_uploaded_image(
        content: bytes
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Complete image processing pipeline: validate, resize, extract features
        
        Args:
            content: Original image bytes
            
        Returns:
            Tuple of (processed_image_bytes, features_dict)
            
        Raises:
            ValueError: If image is invalid or processing fails
        """
        # Validate
        if not ImageProcessor.validate_image_format(content):
            raise ValueError("Invalid image format")
        
        # Extract features from original
        features = ImageProcessor.extract_image_features(content)
        
        # Resize/compress for storage
        processed = ImageProcessor.resize_image(content)
        
        return processed, features
    
    @staticmethod
    def convert_color_space(
        content: bytes,
        target_mode: str = 'RGB'
    ) -> bytes:
        """
        Convert image to target color space
        
        Args:
            content: Image bytes
            target_mode: Target PIL image mode (RGB, RGBA, L, etc.)
            
        Returns:
            Converted image bytes
        """
        try:
            img = PILImage.open(BytesIO(content))
            img = img.convert(target_mode)
            
            output = BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True)
            return output.getvalue()
        except Exception as e:
            print(f"Warning: Color space conversion failed: {str(e)}")
            raise ValueError(f"Failed to convert color space: {str(e)}")
    
    @staticmethod
    def rotate_image(
        content: bytes,
        angle: int = 90
    ) -> bytes:
        """
        Rotate image by specified angle
        
        Args:
            content: Image bytes
            angle: Rotation angle in degrees (90, 180, 270, etc.)
            
        Returns:
            Rotated image bytes
        """
        try:
            img = PILImage.open(BytesIO(content))
            img = img.rotate(angle, expand=True)
            
            output = BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True)
            return output.getvalue()
        except Exception as e:
            print(f"Warning: Image rotation failed: {str(e)}")
            raise ValueError(f"Failed to rotate image: {str(e)}")
    
    @staticmethod
    def get_image_info(content: bytes) -> Dict[str, Any]:
        """
        Get comprehensive image information
        
        Args:
            content: Image bytes
            
        Returns:
            Dictionary with detailed image info
        """
        try:
            img = PILImage.open(BytesIO(content))
            
            return {
                "valid": True,
                "format": img.format,
                "mode": img.mode,
                "width": img.width,
                "height": img.height,
                "aspect_ratio": round(img.width / img.height, 2),
                "size_bytes": len(content),
                "size_mb": round(len(content) / (1024 * 1024), 2),
                "is_animated": getattr(img, 'is_animated', False),
                "has_transparency": img.mode in ('RGBA', 'LA', 'P'),
                "info": str(img.info)
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "size_bytes": len(content),
                "size_mb": round(len(content) / (1024 * 1024), 2)
            }
