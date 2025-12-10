from app.rag.llm_client import ask
import json
from app.agents.query_understanding_agent import parse_query_with_llm
from app.agents.retriever_agent import retrieve_document
from app.db.database import ChatSession , Chat , AsyncSession , InferenceCategoryEnum
from datetime import datetime

def prepare_cnn_features(raw_features: dict) -> dict:
 
    img = raw_features.get("image_features", {})

    clean = {
        "craters_count": raw_features.get("craters_count", 0),
        "rocks_count": raw_features.get("rocks_count", 0),
        "boulders_count": raw_features.get("boulders_count", 0),
        "rocky_regions_count": raw_features.get("rocky_regions_count", 0),
        # flatten rocks list
        "rocks": [
            {
                "id": rock_id,
                "size_m": data.get("size_m"),
                "location": data.get("location"),
                "direction_zone": data.get("direction_zone"),
            }
            for rock_id, data in img.get("rocks", {}).items()
        ],
        # flatten boulders list
        "boulders": [
            {
                "id": b_id,
                "size_m": data.get("size_m"),
                "surface_area_m2": data.get("surface_area_m2"),
                "location": data.get("location"),
                "direction_zone": data.get("direction_zone"),
            }
            for b_id, data in img.get("boulders", {}).items()
        ],
        # store whole thing (optional)
        "raw_full_features": raw_features,
    }

    return clean 


async def ask_llm(query: str, db: AsyncSession, session_id: str = None, user_id: int = None ):
    parsed = parse_query_with_llm(query)
    docs, cosine_similarity = retrieve_document(query, parsed)

    cnn_feature_input = {
        "image_features": {
            "craters": {},
            "rocks": {
                "1": {
                    "size_m": 34.713109915419565,
                    "location": {"x": 69.77889918376351, "y": 215.97860136774761},
                    "direction_zone": "NW",
                },
                "2": {
                    "size_m": 29.0,
                    "location": {"x": 110.79778270509978, "y": 358.1330376940133},
                    "direction_zone": "SW",
                },
                "3": {
                    "size_m": 15.890248582070704,
                    "location": {"x": 254.5023148148148, "y": 128.12599206349208},
                    "direction_zone": "NW",
                },
                "4": {
                    "size_m": 26.575364531836623,
                    "location": {"x": 148.00642730496455, "y": 471.4609929078014},
                    "direction_zone": "SW",
                },
                "5": {
                    "size_m": 42.79310692155922,
                    "location": {"x": 79.24640606839175, "y": 461.70202483636143},
                    "direction_zone": "SW",
                },
                "6": {
                    "size_m": 48.58497710198081,
                    "location": {"x": 652.2564339651718, "y": 186.53852673755586},
                    "direction_zone": "NE",
                },
                "7": {
                    "size_m": 28.217902119044926,
                    "location": {"x": 278.226365914787, "y": 233.33904761904762},
                    "direction_zone": "W",
                },
                "8": {
                    "size_m": 45.56862956025779,
                    "location": {"x": 193.68650244487498, "y": 195.85958114217178},
                    "direction_zone": "NW",
                },
            },
            "boulders": {
                "1": {
                    "size_m": 238.6047987782308,
                    "surface_area_m2": 14180.375,
                    "location": {"x": 378.2291517913548, "y": 406.49998677750057},
                    "direction_zone": "S",
                }
            },
            "rocky_regions": {},
            "artifacts": {},
            "artifact_path": {},
            "confidence_score": [
                0.8691344261169434,
                0.8369174599647522,
                0.8291764259338379,
                0.8095374703407288,
                0.755931556224823,
                0.7527718544006348,
                0.7257564067840576,
                0.6900720000267029,
                0.6851709485054016,
            ],
        },
        "craters_count": 0,
        "rocks_count": 8,
        "boulders_count": 1,
        "rocky_regions_count": 0,
    }
    cnn_features_clean = prepare_cnn_features(cnn_feature_input)
    retrieved_text = "\n\n".join([doc.page_content for doc in docs])

    # print("cleaned features: ",cnn_features_clean )
    print("Cosine Similarity Score: ", cosine_similarity)
    prompt = f"""
                You are an expert lunar-terrain analysis assistant. You receive three inputs:
                1. QUERY: The question asked by the user.
                2. CNN_FEATURES_CLEAN: Structured features extracted from the input soil/terrain image.
                3. RETRIEVED_TEXT: Definitions or background information.

                =========================
                INSTRUCTIONS TO THE MODEL
                =========================

                - For questions about the IMAGE, describe **what the terrain looks like** based on CNN_FEATURES_CLEAN.
                - You may interpret the features to provide natural, geologically plausible descriptions (e.g., absence of craters, presence of boulders, erosion effects) without inventing unobserved features.
                - For conceptual or definition questions, use RETRIEVED_TEXT only.
                - If a requested feature is not present, reply naturally: "The image region does not show this feature."
                - Never hallucinate or invent specific numeric values.

                =========================
                OUTPUT RULES
                =========================

                - Provide a **concise, natural answer** (1–2 sentences) if the question does not requires explanation.
                - Provide a **detailed natural answer** (5-7 sentences) if the question requires explanation.
                - Do **not** mention CNN_FEATURES or RETRIEVED_DOCS.
                - Do **not** repeat the question or explain your reasoning.

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
                NOW PRODUCE THE FINAL ANSWER
                =========================
                Provide the concise natural-language answer only.
                """
    answer = ask(prompt)              
    if session_id is None:
        new_session=ChatSession(
            title=f"Session {datetime.utcnow().isoformat()}",
            user_id=user_id,
            created_at=datetime.now(),
            is_deleted=False
        )
        
        db.add(new_session)
        await db.flush()
        
        new_chat=Chat(
            chat_session_id=new_session.id,
            question=query,
            response=answer,
            time=datetime.now(),
            inference_category=InferenceCategoryEnum.lunar_terrain_detection
        )
        db.add(new_chat)
        await db.commit()
        return {"result": answer, "chat_id": new_chat.id, "session_id": new_session.id}
    else:
        new_chat = Chat(
            chat_session_id=session_id,
            question=query,
            response=answer,
            time=datetime.utcnow(),
            inference_category=InferenceCategoryEnum.lunar_terrain_detection
        )
        db.add(new_chat)
        await db.commit()
        return {"result": answer, "chat_id": new_chat.id, "session_id": session_id}

