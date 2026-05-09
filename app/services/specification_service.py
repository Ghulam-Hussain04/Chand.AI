"""SpecificationService — CRUD for ProjectSpecification (mission calibration per folder)."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.database import (
    ProjectSpecification,
    DEFAULT_MISSION_NAME,
    DEFAULT_METERS_PER_PIXEL,
    DEFAULT_CAMERA_ANGLE_DEG,
    DEFAULT_CAMERA_RESOLUTION_W,
    DEFAULT_CAMERA_RESOLUTION_H,
    DEFAULT_CAMERA_FOV_DEG,
    DEFAULT_ROVER_HEIGHT_M,
    DEFAULT_NOTES,
)


class SpecificationService:

    @staticmethod
    async def get_by_folder_id(
        db: AsyncSession, folder_id: int
    ) -> Optional[ProjectSpecification]:
        result = await db.execute(
            select(ProjectSpecification).where(ProjectSpecification.folder_id == folder_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_default(db: AsyncSession, folder_id: int) -> ProjectSpecification:
        spec = ProjectSpecification(
            folder_id=folder_id,
            mission_name=DEFAULT_MISSION_NAME,
            meters_per_pixel=DEFAULT_METERS_PER_PIXEL,
            camera_angle_deg=DEFAULT_CAMERA_ANGLE_DEG,
            camera_resolution_w=DEFAULT_CAMERA_RESOLUTION_W,
            camera_resolution_h=DEFAULT_CAMERA_RESOLUTION_H,
            camera_fov_deg=DEFAULT_CAMERA_FOV_DEG,
            rover_height_m=DEFAULT_ROVER_HEIGHT_M,
            notes=DEFAULT_NOTES,
        )
        db.add(spec)
        await db.commit()
        await db.refresh(spec)
        return spec

    @staticmethod
    async def get_or_create_default(
        db: AsyncSession, folder_id: int
    ) -> ProjectSpecification:
        spec = await SpecificationService.get_by_folder_id(db, folder_id)
        if spec is None:
            spec = await SpecificationService.create_default(db, folder_id)
        return spec

    @staticmethod
    async def upsert(
        db: AsyncSession,
        folder_id: int,
        mission_name: str,
        meters_per_pixel: float,
        camera_angle_deg: float,
        camera_resolution_w: int,
        camera_resolution_h: int,
        camera_fov_deg: float,
        rover_height_m: float,
        notes: Optional[str] = None,
    ) -> ProjectSpecification:
        spec = await SpecificationService.get_by_folder_id(db, folder_id)
        if spec is None:
            spec = ProjectSpecification(folder_id=folder_id)
            db.add(spec)

        spec.mission_name = mission_name
        spec.meters_per_pixel = meters_per_pixel
        spec.camera_angle_deg = camera_angle_deg
        spec.camera_resolution_w = camera_resolution_w
        spec.camera_resolution_h = camera_resolution_h
        spec.camera_fov_deg = camera_fov_deg
        spec.rover_height_m = rover_height_m
        spec.notes = notes

        await db.commit()
        await db.refresh(spec)
        return spec

    @staticmethod
    def to_dict(spec: ProjectSpecification) -> dict:
        return {
            "mission_name": spec.mission_name,
            "meters_per_pixel": spec.meters_per_pixel,
            "camera_angle_deg": spec.camera_angle_deg,
            "camera_resolution_w": spec.camera_resolution_w,
            "camera_resolution_h": spec.camera_resolution_h,
            "camera_fov_deg": spec.camera_fov_deg,
            "rover_height_m": spec.rover_height_m,
            "notes": spec.notes,
        }
