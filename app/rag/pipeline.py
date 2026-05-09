"""RAG pipeline — query understanding → retrieval → LLM response → chat persistence."""
import json
from datetime import datetime
from typing import Optional

from app.rag.llm_client import ask
from app.agents.query_understanding_agent import parse_query_with_llm
from app.agents.retriever_agent import retrieve_document
from app.db.database import ChatSession, Chat, AsyncSession, InferenceCategoryEnum

# ---------------------------------------------------------------------------
# Feature preparation
# ---------------------------------------------------------------------------

def prepare_cnn_features(raw_features: dict) -> dict:
    """Flatten the nested geo-pipeline output into a prompt-friendly structure."""
    img = raw_features.get("image_features", {})

    return {
        "craters_count": raw_features.get("craters_count", 0),
        "rocks_count": raw_features.get("rocks_count", 0),
        "boulders_count": raw_features.get("boulders_count", 0),
        "rocky_regions_count": raw_features.get("rocky_regions_count", 0),
        "craters": [
            {
                "id": k,
                "diameter_m": v.get("diameter_m"),
                "location": v.get("location"),
                "direction_zone": v.get("direction_zone"),
            }
            for k, v in img.get("craters", {}).items()
        ],
        "rocks": [
            {
                "id": k,
                "size_m": v.get("size_m"),
                "location": v.get("location"),
                "direction_zone": v.get("direction_zone"),
            }
            for k, v in img.get("rocks", {}).items()
        ],
        "boulders": [
            {
                "id": k,
                "size_m": v.get("size_m"),
                "surface_area_m2": v.get("surface_area_m2"),
                "location": v.get("location"),
                "direction_zone": v.get("direction_zone"),
            }
            for k, v in img.get("boulders", {}).items()
        ],
        "rocky_regions": [
            {
                "id": k,
                "area_m2": v.get("area_m2"),
                "location": v.get("location"),
                "direction_zone": v.get("direction_zone"),
            }
            for k, v in img.get("rocky_regions", {}).items()
        ],
        "artifacts": [
            {
                "id": k,
                "presence": v.get("presence"),
                "location": v.get("location"),
                "direction_zone": v.get("direction_zone"),
            }
            for k, v in img.get("artifacts", {}).items()
        ],
        "artifact_paths": list(img.get("artifact_path", {}).values()),
        "confidence_scores": img.get("confidence_score", []),
    }


_EMPTY_FEATURES = {
    "image_features": {
        "craters": {},
        "rocks": {},
        "boulders": {},
        "rocky_regions": {},
        "artifacts": {},
        "artifact_path": {},
        "confidence_score": [],
    },
    "craters_count": 0,
    "rocks_count": 0,
    "boulders_count": 0,
    "rocky_regions_count": 0,
}

# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

async def ask_llm(
    query: str,
    db: AsyncSession,
    session_id: Optional[int] = None,
    user_id: Optional[int] = None,
    features: Optional[dict] = None,
    file_id: Optional[int] = None,
) -> dict:
    """
    Full RAG flow: parse intent → retrieve docs → build prompt → LLM → persist chat.

    Args:
        query:      User question.
        db:         Async DB session.
        session_id: Existing chat session to append to (None → create new).
        user_id:    Authenticated user ID.
        features:   Geo-pipeline output dict from InferenceService.run_pipeline().
                    When None the prompt contains no image context.
        file_id:    File ID to link in the Chat record (for history tracking).

    Returns:
        {result, chat_id, session_id}
    """
    parsed = parse_query_with_llm(query)
    docs, cosine_similarity = retrieve_document(query, parsed)
    print(f"Cosine similarity score: {cosine_similarity:.4f}")

    effective_features = features if features is not None else _EMPTY_FEATURES
    cnn_features_clean = prepare_cnn_features(effective_features)
    retrieved_text = "\n\n".join(doc.page_content for doc in docs)

    has_image = bool(
        effective_features.get("craters_count", 0)
        or effective_features.get("rocks_count", 0)
        or effective_features.get("boulders_count", 0)
        or effective_features.get("rocky_regions_count", 0)
        or effective_features.get("image_features", {}).get("artifacts")
    )

    image_context_note = (
        "CNN_FEATURES below contain structured geo-spatial data extracted from the selected image."
        if has_image
        else "No image was selected for this query; CNN_FEATURES is empty. Answer from RETRIEVED_DOCS only."
    )

    prompt = f"""
You are an expert lunar-terrain analysis assistant. You receive three inputs:
1. QUERY: The question asked by the user.
2. CNN_FEATURES: Structured geo-spatial features extracted from the input lunar image.
3. RETRIEVED_DOCS: Background definitions and reference information.

=========================
CONTEXT NOTE
=========================
{image_context_note}

=========================
INSTRUCTIONS
=========================
- ONLY answer questions related to lunar terrain, soil/rock analysis, geology,
  or definitions in RETRIEVED_DOCS.
- If the user asks anything irrelevant (love stories, hacking, finance, etc.),
  reply strictly with: "I can only answer questions about lunar terrain analysis."
- For image questions, describe terrain based on CNN_FEATURES without inventing
  unobserved features.
- For conceptual or definition questions, use RETRIEVED_DOCS only.
- If a requested feature is absent from the data, say so naturally.
- Never hallucinate specific numeric values.

=========================
OUTPUT RULES
=========================
- 1–2 sentences for simple questions; 5–7 sentences for explanations.
- Do NOT mention CNN_FEATURES, RETRIEVED_DOCS, or your reasoning process.
- Do NOT repeat the question.

=========================
AVAILABLE DATA
=========================

USER_QUERY:
{query}

CNN_FEATURES:
{json.dumps(cnn_features_clean, indent=2)}

RETRIEVED_DOCS:
{retrieved_text}

=========================
ANSWER
=========================
"""

    answer = ask(prompt)

    # ------------------------------------------------------------------
    # Persist chat record
    # ------------------------------------------------------------------
    if session_id is None:
        new_session = ChatSession(
            title=f"Session {datetime.utcnow().isoformat()}",
            user_id=user_id,
            is_deleted=False,
        )
        db.add(new_session)
        await db.flush()
        session_id = new_session.id

    new_chat = Chat(
        chat_session_id=session_id,
        file_id=file_id,
        question=query,
        response=answer,
        time=datetime.utcnow(),
        inference_category=InferenceCategoryEnum.lunar_terrain_detection,
    )
    db.add(new_chat)
    await db.commit()

    return {"result": answer, "chat_id": new_chat.id, "session_id": session_id}
