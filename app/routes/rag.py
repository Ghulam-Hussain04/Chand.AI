"""
RAG routes — chat with image analysis, document vectorisation, chunk inspection.

POST /rag/ask   — primary chat endpoint:
    1. If file_id provided → check LunarFeatures cache → run inference if needed
    2. Ask LLM with geo-features + RAG context
    3. Return LLM response

POST /rag/query        — lightweight RAG query without image inference
POST /rag/upload_and_vectorize — admin: add PDF to ChromaDB
GET  /rag/chunks       — admin: inspect ChromaDB chunks
"""
import io
import os
import time
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.config import settings
from app.db.database import AsyncSession, get_db, ChatSession, Chat
from app.rag.pipeline import ask_llm
from app.rag.llm_client import ask as call_llm
from app.schemas import AskRequest
from app.security import verify_token, verify_admin, TokenPayload
from app.services import FileService, FolderService
from app.services.specification_service import SpecificationService
from app.services.lunar_features_service import LunarFeaturesService
from app.services.inference_service import InferenceService
from app.utils.chroma_utils import add_docs_to_chroma, setup_bm25_retriever, list_all_chunks
from app.utils.upload_document_utils import process_single_file

router = APIRouter()

pdf_folder = "docs"


class RAGQueryResponse(BaseModel):
    answer: str
    source_files: Optional[list] = None
    confidence: Optional[float] = None


def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token


# ---------------------------------------------------------------------------
# Primary chat endpoint
# ---------------------------------------------------------------------------

@router.post("/ask")
async def ask(
    data: AskRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Chat with the lunar terrain analysis assistant.

    When `file_id` is provided:
    - Checks the LunarFeatures cache; if a record exists the pipeline is skipped.
    - Otherwise runs RF-DETR inference + geo-feature extraction, then caches the result.
    - The extracted features are injected into the LLM prompt for image-aware responses.

    When no `file_id` is provided the LLM answers from retrieved RAG documents only.
    """
    user_id = current_user.user_id
    start = time.time()

    features: Optional[dict] = None
    cached_feature_id: Optional[int] = None

    if data.file_id:
        # Verify file ownership
        file = await FileService.get_file(db, data.file_id, user_id)
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied",
            )
        if file.file_type != "image":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lunar terrain analysis is only supported for image files",
            )

        # Check cache
        cached = await LunarFeaturesService.get_by_file_id(db, data.file_id)
        if cached:
            features = cached.features
            cached_feature_id = cached.id
        else:
            # Resolve mission specifications for this folder
            spec = await SpecificationService.get_or_create_default(db, file.folder_id)
            specs_dict = SpecificationService.to_dict(spec)

            # Build absolute image path
            image_path = os.path.join(settings.STORAGE_DIR, file.storage_path)

            try:
                features = await InferenceService.run_pipeline(image_path, specs_dict)
            except FileNotFoundError:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Image file not found on disk. Please re-upload.",
                )
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Inference pipeline failed: {exc}",
                )

            # Persist result so the pipeline is never run twice for the same image
            saved = await LunarFeaturesService.create(
                db=db,
                file_id=data.file_id,
                features=features,
                model_name=settings.INFERENCE_MODEL_NAME,
            )
            cached_feature_id = saved.id

    outcome = await ask_llm(
        query=data.query,
        db=db,
        session_id=data.session_id,
        user_id=user_id,
        features=features,
        file_id=data.file_id,
    )

    duration = round(time.time() - start, 2)
    return {
        "response": outcome["result"],
        "chat_id": outcome["chat_id"],
        "session_id": outcome["session_id"],
        "response_time_sec": duration,
        "inference_cached": cached_feature_id is not None,
    }


# ---------------------------------------------------------------------------
# Lightweight RAG-only query (no image inference)
# ---------------------------------------------------------------------------

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Query the RAG pipeline with optional file/folder scoping.

    Does NOT trigger image inference — use /ask for image-aware responses.
    """
    source_files = None

    if request.file_id:
        file = await FileService.get_file(db, request.file_id, current_user.user_id)
        if not file:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or access denied")
        source_files = [file.original_filename]

    elif request.folder_id:
        folder = await FolderService.get_folder(db, request.folder_id, current_user.user_id)
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found or access denied")
        files = await FileService.get_folder_files(db, request.folder_id, current_user.user_id)
        source_files = [f.original_filename for f in files]

    outcome = await ask_llm(
        query=request.query,
        db=db,
        session_id=request.session_id,
        user_id=current_user.user_id,
    )

    return RAGQueryResponse(answer=outcome["result"], source_files=source_files)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.post("/upload_and_vectorize")
async def upload_and_vectorize(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(verify_admin),
):
    """Upload and vectorise a PDF document into ChromaDB. Admin only."""
    file_path = os.path.join(pdf_folder, file.filename)
    if os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File {file.filename} already exists.",
        )

    with open(file_path, "wb") as f:
        f.write(await file.read())

    chunks = process_single_file(file_path)
    add_docs_to_chroma(chunks)
    setup_bm25_retriever(chunks)

    return {"detail": f"Successfully vectorised {file.filename}", "chunks_added": len(chunks)}


@router.get("/chunks")
async def list_chunks_endpoint(current_user: TokenPayload = Depends(verify_admin)):
    """List all chunks stored in ChromaDB. Admin only."""
    try:
        chunks = list_all_chunks()
        return {"total_chunks": len(chunks), "chunks": chunks}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chunks: {exc}",
        )


@router.get("/")
async def get_all_chunks():
    return list_all_chunks()


# ---------------------------------------------------------------------------
# PDF report generation
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    session_id: int


def _build_pdf(session_title: str, report_text: str, chats: list) -> bytes:
    """Render a reportlab PDF and return raw bytes."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.colors import Color, HexColor
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

    page_width, page_height = A4
    logo_resolve = os.path.join("app", "static", "resolve_logo.png")
    logo_fastnu = os.path.join("app", "static", "fastnu_logo.png")
    resolve_exists = os.path.exists(logo_resolve)
    fastnu_exists = os.path.exists(logo_fastnu)

    def draw_decorations(canv, doc):
        canv.saveState()

        # Diagonal watermark
        canv.translate(page_width / 2, page_height / 2)
        canv.rotate(45)
        canv.setFont("Helvetica-Bold", 60)
        canv.setFillColor(Color(0.75, 0.75, 0.75, alpha=0.10))
        canv.drawCentredString(0, 0, "Dr. Terra")
        canv.rotate(-45)
        canv.translate(-page_width / 2, -page_height / 2)

        # Footer separator
        canv.setStrokeColor(Color(0.6, 0.6, 0.6))
        canv.setLineWidth(0.5)
        canv.line(2 * cm, 2.0 * cm, page_width - 2 * cm, 2.0 * cm)

        # Logos in footer
        logo_h = 0.65 * cm
        if resolve_exists:
            try:
                canv.drawImage(logo_resolve, 2 * cm, 1.1 * cm,
                               height=logo_h, preserveAspectRatio=True, anchor="sw")
            except Exception:
                pass
        if fastnu_exists:
            try:
                canv.drawImage(logo_fastnu, page_width - 4.5 * cm, 1.1 * cm,
                               height=logo_h, preserveAspectRatio=True, anchor="sw")
            except Exception:
                pass

        # Page number
        canv.setFont("Helvetica", 8)
        canv.setFillColor(Color(0.5, 0.5, 0.5))
        canv.drawCentredString(page_width / 2, 1.3 * cm, f"Page {canv.getPageNumber()}")

        canv.restoreState()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=3.2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title2",
        parent=styles["Title"],
        fontSize=20,
        textColor=HexColor("#1a1a2e"),
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "Subtitle2",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#666666"),
        spaceAfter=3,
        fontName="Helvetica",
    )
    heading_style = ParagraphStyle(
        "Heading2",
        parent=styles["Heading1"],
        fontSize=13,
        textColor=HexColor("#1a1a2e"),
        spaceBefore=10,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "Body2",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#333333"),
        leading=15,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        fontName="Helvetica",
    )
    q_style = ParagraphStyle(
        "Q2",
        parent=body_style,
        textColor=HexColor("#1a3a5c"),
        fontName="Helvetica-Bold",
        spaceAfter=2,
    )
    a_style = ParagraphStyle(
        "A2",
        parent=body_style,
        textColor=HexColor("#2c2c2c"),
        spaceAfter=8,
    )

    story = []

    # Header
    story.append(Paragraph("Dr. Terra — Lunar Terrain Analysis Report", title_style))
    story.append(Paragraph(f"Session: {session_title}", subtitle_style))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        subtitle_style,
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=HexColor("#1a1a2e")))
    story.append(Spacer(1, 0.3 * cm))

    # Report body — parse paragraphs/headings
    for line in report_text.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.15 * cm))
            continue
        is_heading = (
            line.startswith("#")
            or (len(line) < 70 and line.endswith(":") and not line.startswith("-"))
            or (line[0].isdigit() and ". " in line[:5])
        )
        clean = line.lstrip("#").strip()
        story.append(Paragraph(clean, heading_style if is_heading else body_style))

    # Chat transcript
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#aaaaaa")))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("Chat Session Transcript", heading_style))
    story.append(Spacer(1, 0.1 * cm))
    for i, chat in enumerate(chats, 1):
        story.append(Paragraph(f"Q{i}: {chat.question}", q_style))
        story.append(Paragraph(f"A{i}: {chat.response}", a_style))

    doc.build(story, onFirstPage=draw_decorations, onLaterPages=draw_decorations)
    return buffer.getvalue()


@router.post("/report")
async def generate_report(
    data: ReportRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a PDF report from a chat session."""
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == data.session_id,
            ChatSession.user_id == current_user.user_id,
            ChatSession.is_deleted == False,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    chats_result = await db.execute(
        select(Chat)
        .where(Chat.chat_session_id == data.session_id)
        .order_by(Chat.time.asc())
    )
    chats = chats_result.scalars().all()
    if not chats:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No messages in this session")

    # Ask LLM to generate a structured report from the transcript
    transcript = "\n\n".join(f"Q: {c.question}\nA: {c.response}" for c in chats)
    report_prompt = f"""You are an expert lunar terrain analyst generating a formal technical report.

Based on the following chat session transcript about lunar terrain analysis, produce a professional report with these sections:
1. Executive Summary
2. Analysis Overview
3. Key Findings (terrain features, geological observations, measurements)
4. Technical Details
5. Conclusions and Recommendations

Chat Session Transcript:
{transcript}

Write in a formal, third-person scientific style. Be specific about any terrain features, counts, or measurements mentioned. Length: 500–800 words. Do not repeat the Q&A verbatim — synthesise the information into flowing prose."""

    report_text = call_llm(report_prompt)

    pdf_bytes = _build_pdf(session.title, report_text, chats)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dr-terra-report-{data.session_id}.pdf"'
        },
    )
