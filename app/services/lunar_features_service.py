"""LunarFeaturesService — persist and retrieve geo-pipeline output per image file."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.database import LunarFeatures


class LunarFeaturesService:

    @staticmethod
    async def get_by_file_id(
        db: AsyncSession, file_id: int
    ) -> Optional[LunarFeatures]:
        result = await db.execute(
            select(LunarFeatures).where(LunarFeatures.file_id == file_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession,
        file_id: int,
        features: dict,
        model_name: Optional[str] = None,
    ) -> LunarFeatures:
        record = LunarFeatures(
            file_id=file_id,
            features=features,
            craters_count=features.get("craters_count", 0),
            rocks_count=features.get("rocks_count", 0),
            boulders_count=features.get("boulders_count", 0),
            rocky_regions_count=features.get("rocky_regions_count", 0),
            model_name=model_name,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def delete_by_file_id(db: AsyncSession, file_id: int) -> bool:
        """Remove cached features so inference runs again on next chat request."""
        record = await LunarFeaturesService.get_by_file_id(db, file_id)
        if record is None:
            return False
        await db.delete(record)
        await db.commit()
        return True
