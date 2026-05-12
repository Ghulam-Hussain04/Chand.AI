"""
FolderService - Role-aware folder hierarchy and access control.

Access model:
  admin      — sees / mutates ALL folders
  researcher — sees own folders + folders shared with them; creates new root projects
  user       — sees only folders explicitly shared with them (read or write level)

SharedFolder.permission_level values: 'read' | 'write'
Computed access_level values returned to callers: 'owner' | 'write' | 'read'
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import Folder, File, SharedFolder, User
from app.schemas import FolderCreate
from typing import List, Optional, Dict, Any


class FolderService:

    # ── Private helpers ──────────────────────────────────────────────────────

    @staticmethod
    async def _get_root_ancestor(db: AsyncSession, folder_id: int) -> Optional[Folder]:
        """Walk up the parent chain and return the root (parent_id is None) folder."""
        result = await db.execute(select(Folder).where(Folder.id == folder_id))
        folder = result.scalar_one_or_none()
        if not folder or folder.parent_id is None:
            return folder
        return await FolderService._get_root_ancestor(db, folder.parent_id)

    @staticmethod
    async def _shared_entry(db: AsyncSession, root_id: int, user_id: int) -> Optional[SharedFolder]:
        """Return the SharedFolder entry for (root_id, user_id), or None."""
        result = await db.execute(
            select(SharedFolder).where(
                (SharedFolder.folder_id == root_id) &
                (SharedFolder.shared_with_user_id == user_id)
            )
        )
        return result.scalar_one_or_none()

    # ── Access level helpers ─────────────────────────────────────────────────

    @staticmethod
    async def get_access_level(
        db: AsyncSession, folder: Folder, user_id: int, role: str
    ) -> str:
        """Compute the caller's access level for a folder."""
        if role == "admin":
            return "owner"
        if folder.user_id == user_id:
            return "owner"
        root = folder if folder.parent_id is None else await FolderService._get_root_ancestor(db, folder.id)
        if root:
            sf = await FolderService._shared_entry(db, root.id, user_id)
            if sf:
                return sf.permission_level  # 'read' or 'write'
        return "read"

    @staticmethod
    async def can_write_to_folder(
        db: AsyncSession, folder_id: int, user_id: int, role: str
    ) -> bool:
        """True if caller may upload / delete files in this folder."""
        if role == "admin":
            return True
        if role == "user":
            return False
        # Researcher: must own the root OR have a 'write' SharedFolder entry on root
        root = await FolderService._get_root_ancestor(db, folder_id)
        if not root:
            return False
        if root.user_id == user_id:
            return True
        sf = await FolderService._shared_entry(db, root.id, user_id)
        return sf is not None and sf.permission_level == "write"

    # ── Single-folder access (read) ──────────────────────────────────────────

    @staticmethod
    async def get_folder(
        db: AsyncSession, folder_id: int, user_id: int, role: str = "user"
    ) -> Optional[Folder]:
        """Return folder if caller can access it, else None."""
        if role == "admin":
            result = await db.execute(select(Folder).where(Folder.id == folder_id))
            return result.scalar_one_or_none()

        # Direct ownership
        result = await db.execute(
            select(Folder).where((Folder.id == folder_id) & (Folder.user_id == user_id))
        )
        folder = result.scalar_one_or_none()
        if folder:
            return folder

        # SharedFolder (for root-level folders)
        result = await db.execute(
            select(Folder)
            .join(SharedFolder, (SharedFolder.folder_id == Folder.id) & (SharedFolder.shared_with_user_id == user_id))
            .where(Folder.id == folder_id)
        )
        folder = result.scalar_one_or_none()
        if folder:
            return folder

        # Subfolders inherit access from their root ancestor
        result = await db.execute(select(Folder).where(Folder.id == folder_id))
        candidate = result.scalar_one_or_none()
        if candidate and candidate.parent_id is not None:
            root = await FolderService._get_root_ancestor(db, folder_id)
            if root:
                if root.user_id == user_id:
                    return candidate
                sf = await FolderService._shared_entry(db, root.id, user_id)
                if sf:
                    return candidate

        return None

    @staticmethod
    async def get_folder_for_mutation(
        db: AsyncSession, folder_id: int, user_id: int, role: str
    ) -> Optional[Folder]:
        """Return folder only if caller may rename/delete/move it (owner or admin)."""
        if role == "admin":
            result = await db.execute(select(Folder).where(Folder.id == folder_id))
            return result.scalar_one_or_none()
        result = await db.execute(
            select(Folder).where((Folder.id == folder_id) & (Folder.user_id == user_id))
        )
        return result.scalar_one_or_none()

    # ── List / hierarchy ─────────────────────────────────────────────────────

    @staticmethod
    async def get_user_root_folders(
        db: AsyncSession, user_id: int, role: str = "user"
    ) -> List[Folder]:
        if role == "admin":
            result = await db.execute(
                select(Folder).where(Folder.parent_id == None).order_by(Folder.name)
            )
            return list(result.scalars().all())

        # Own root folders
        own = await db.execute(
            select(Folder).where((Folder.user_id == user_id) & (Folder.parent_id == None)).order_by(Folder.name)
        )
        own_folders = list(own.scalars().all())

        # Shared root folders
        shared = await db.execute(
            select(Folder)
            .join(SharedFolder, (SharedFolder.folder_id == Folder.id) & (SharedFolder.shared_with_user_id == user_id))
            .where(Folder.parent_id == None)
            .order_by(Folder.name)
        )
        shared_folders = list(shared.scalars().all())

        seen = {f.id for f in own_folders}
        merged = own_folders[:]
        for f in shared_folders:
            if f.id not in seen:
                seen.add(f.id)
                merged.append(f)
        return sorted(merged, key=lambda f: f.name)

    @staticmethod
    async def get_subfolders(
        db: AsyncSession, parent_id: int, user_id: int, role: str = "user"
    ) -> List[Folder]:
        """Return direct children — access to parent already verified by caller."""
        result = await db.execute(
            select(Folder).where(Folder.parent_id == parent_id).order_by(Folder.name)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_folder_hierarchy(
        db: AsyncSession,
        folder_id: int,
        user_id: int,
        role: str = "user",
        _check_access: bool = True,
        _inherited_access: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if _check_access:
            folder = await FolderService.get_folder(db, folder_id, user_id, role)
            if not folder:
                return None
            access_level = await FolderService.get_access_level(db, folder, user_id, role)
        else:
            result = await db.execute(select(Folder).where(Folder.id == folder_id))
            folder = result.scalar_one_or_none()
            if not folder:
                return None
            access_level = _inherited_access

        # All children — access inherited from root, no user_id filter
        sub_result = await db.execute(
            select(Folder).where(Folder.parent_id == folder_id).order_by(Folder.name)
        )
        subfolders = sub_result.scalars().all()

        file_result = await db.execute(
            select(func.count(File.id)).where(File.folder_id == folder_id)
        )
        file_count = file_result.scalar() or 0

        children = []
        for sf in subfolders:
            child = await FolderService.get_folder_hierarchy(
                db, sf.id, user_id, role, _check_access=False, _inherited_access=access_level
            )
            if child:
                children.append(child)

        return {
            "id": folder.id,
            "name": folder.name,
            "description": folder.description,
            "parent_id": folder.parent_id,
            "user_id": folder.user_id,
            "created_at": folder.created_at,
            "updated_at": folder.updated_at,
            "file_count": file_count,
            "children": children,
            "access_level": access_level,
        }

    @staticmethod
    async def get_user_folder_trees(
        db: AsyncSession, user_id: int, role: str = "user"
    ) -> List[Dict[str, Any]]:
        roots = await FolderService.get_user_root_folders(db, user_id, role)
        trees = []
        for root in roots:
            tree = await FolderService.get_folder_hierarchy(db, root.id, user_id, role)
            if tree:
                trees.append(tree)
        return trees

    # ── Mutations ────────────────────────────────────────────────────────────

    @staticmethod
    async def create_folder(
        db: AsyncSession, user_id: int, folder_data: FolderCreate, role: str = "user"
    ) -> Folder:
        if folder_data.parent_id:
            can_write = await FolderService.can_write_to_folder(db, folder_data.parent_id, user_id, role)
            if not can_write:
                raise ValueError("Write access denied to parent folder")

        new_folder = Folder(
            name=folder_data.name,
            parent_id=folder_data.parent_id,
            user_id=user_id,
            description=folder_data.description,
        )
        db.add(new_folder)
        await db.commit()
        await db.refresh(new_folder)
        return new_folder

    @staticmethod
    async def update_folder(
        db: AsyncSession,
        folder_id: int,
        user_id: int,
        role: str = "user",
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Optional[Folder]:
        folder = await FolderService.get_folder_for_mutation(db, folder_id, user_id, role)
        if not folder:
            return None
        if name:
            folder.name = name
        if description is not None:
            folder.description = description
        await db.commit()
        await db.refresh(folder)
        return folder

    @staticmethod
    async def move_folder(
        db: AsyncSession,
        folder_id: int,
        new_parent_id: Optional[int],
        user_id: int,
        role: str = "user",
    ) -> Optional[Folder]:
        folder = await FolderService.get_folder_for_mutation(db, folder_id, user_id, role)
        if not folder:
            return None
        if new_parent_id == folder_id:
            raise ValueError("Cannot move folder to itself")
        if new_parent_id:
            parent = await FolderService.get_folder(db, new_parent_id, user_id, role)
            if not parent:
                raise ValueError("Parent folder not found or access denied")
            current = new_parent_id
            depth = 0
            while current and depth < 100:
                if current == folder_id:
                    raise ValueError("Cannot move folder to one of its children (would create cycle)")
                p = await FolderService.get_folder(db, current, user_id, role)
                current = p.parent_id if p else None
                depth += 1
        folder.parent_id = new_parent_id
        await db.commit()
        await db.refresh(folder)
        return folder

    @staticmethod
    async def delete_folder(
        db: AsyncSession,
        folder_id: int,
        user_id: int,
        role: str = "user",
        cascade: bool = True,
    ) -> bool:
        folder = await FolderService.get_folder_for_mutation(db, folder_id, user_id, role)
        if not folder:
            return False
        if not cascade:
            has_files = await db.execute(select(File).where(File.folder_id == folder_id))
            if has_files.scalar_one_or_none():
                return False
            has_subs = await db.execute(select(Folder).where(Folder.parent_id == folder_id))
            if has_subs.scalar_one_or_none():
                return False
        await db.delete(folder)
        await db.commit()
        return True

    @staticmethod
    async def get_folder_contents_count(db: AsyncSession, folder_id: int) -> Dict[str, int]:
        fc = await db.execute(select(func.count(File.id)).where(File.folder_id == folder_id))
        sc = await db.execute(select(func.count(Folder.id)).where(Folder.parent_id == folder_id))
        return {"files": fc.scalar() or 0, "subfolders": sc.scalar() or 0}

    # ── Admin: access management ─────────────────────────────────────────────

    @staticmethod
    async def get_all_root_folders_with_access(db: AsyncSession) -> List[Dict[str, Any]]:
        """Admin view: all root folders with owner info and access entries."""
        result = await db.execute(
            select(Folder, User)
            .join(User, Folder.user_id == User.id)
            .where(Folder.parent_id == None)
            .order_by(Folder.created_at.desc())
        )
        rows = result.all()

        folders_data = []
        for folder, owner in rows:
            fc = await db.execute(select(func.count(File.id)).where(File.folder_id == folder.id))
            file_count = fc.scalar() or 0

            access_result = await db.execute(
                select(SharedFolder, User)
                .join(User, SharedFolder.shared_with_user_id == User.id)
                .where(SharedFolder.folder_id == folder.id)
            )
            access_entries = [
                {
                    "user_id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "permission_level": sf.permission_level,
                    "granted_at": sf.created_at,
                }
                for sf, u in access_result.all()
            ]

            folders_data.append({
                "id": folder.id,
                "name": folder.name,
                "description": folder.description,
                "owner_id": owner.id,
                "owner_username": owner.username,
                "file_count": file_count,
                "created_at": folder.created_at,
                "access_entries": access_entries,
            })

        return folders_data

    @staticmethod
    async def get_folder_access_entries(db: AsyncSession, folder_id: int) -> List[Dict[str, Any]]:
        result = await db.execute(
            select(SharedFolder, User)
            .join(User, SharedFolder.shared_with_user_id == User.id)
            .where(SharedFolder.folder_id == folder_id)
        )
        return [
            {
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
                "permission_level": sf.permission_level,
                "granted_at": sf.created_at,
            }
            for sf, u in result.all()
        ]

    @staticmethod
    async def grant_access(
        db: AsyncSession, folder_id: int, user_id: int, permission_level: str
    ) -> SharedFolder:
        result = await db.execute(
            select(SharedFolder).where(
                (SharedFolder.folder_id == folder_id) & (SharedFolder.shared_with_user_id == user_id)
            )
        )
        entry = result.scalar_one_or_none()
        if entry:
            entry.permission_level = permission_level
        else:
            entry = SharedFolder(
                folder_id=folder_id,
                shared_with_user_id=user_id,
                permission_level=permission_level,
            )
            db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def revoke_access(db: AsyncSession, folder_id: int, user_id: int) -> bool:
        result = await db.execute(
            select(SharedFolder).where(
                (SharedFolder.folder_id == folder_id) & (SharedFolder.shared_with_user_id == user_id)
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            return False
        await db.delete(entry)
        await db.commit()
        return True
