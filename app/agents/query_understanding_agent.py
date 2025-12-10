import json
from app.rag.llm_client import ask   # your DeepSeek call wrapper


def parse_query_with_llm(user_query: str) -> dict:
    print("IN QUA\n")

    prompt = f"""
    You are an advanced Query Understanding Agent (QUA) for a Lunar Geology
    and Crater-Impact Research Retrieval System.

    Your job is to take a noisy, possibly misspelled user query and convert it
    into a clean structured JSON.

    The system contains documents with metadata fields:
    - section_title
    - terrain_type
    - feature_type
    - keywords (list)
    - filename
    - chunk_id

    ---------------------------
    ### YOUR OUTPUT MUST BE:
    A **single JSON object** containing:

    {{
        "corrected_query": "<query with spelling mistakes fixed>",
        "intent": "retrieve | summarize | compare | unknown",
        "references": [
            // items from section titles, keywords, filename, terrain_type,
            // feature_type, or any clear topic/term extracted from query.
        ]
    }}
    ---------------------------

    ### INTENT RULES:
    - Questions asking explanation, details, or info → "retrieve"
    - Questions asking comparison → "compare"
    - Questions asking overall meaning or summary → "summarize"
    - Jokes, stories, irrelevant topics → "unknown"

    ---------------------------
    ### REFERENCE EXTRACTION RULES:
    Extract references based on what is present in your corpus:
    - Geological terms (e.g., "impact cratering", "crater collapse")
    - Section titles (even partial matches)
    - Keywords found in metadata (e.g., "crater")
    - Feature types ("crater")
    - Terrain types ("general terrain")
    - Filenames (e.g., "Lunar Crater Impact Features.pdf")

    If the user query implies a topic (e.g., "how do craters form")
    → map to reference: "impact cratering" or metadata keyword "crater".

    ---------------------------
    ### EXAMPLES:

    User: "explan basiks of imprct cratrring"
    → {{
         "corrected_query": "explain basics of impact cratering",
         "intent": "retrieve",
         "references": ["impact cratering", "2. THE BASICS OF IMPACT CRATERING"]
       }}

    User: "compare crater collapse and crater excavation"
    → {{
         "corrected_query": "compare crater collapse and crater excavation",
         "intent": "compare",
         "references": ["crater collapse", "crater excavation"]
       }}

    User: "what does the lunar crater features file say"
    → {{
         "corrected_query": "what does the Lunar Crater Impact Features file say",
         "intent": "retrieve",
         "references": ["Lunar Crater Impact Features.pdf"]
       }}

    User: "tell me a love story"
    → {{
         "corrected_query": "tell me a love story",
         "intent": "unknown",
         "references": []
       }}

    ---------------------------
    USER QUERY TO PARSE:
    "{user_query}"

    Return ONLY valid JSON. Nothing before or after.
    """

    response = ask(prompt)
    print("LLM Parsed query response: ", response)

    # remove accidental ```json ... ```
    if response.startswith("```"):
        response = response.strip().strip("`").replace("json", "", 1).strip()

    try:
        parsed = json.loads(response.strip())
        if isinstance(parsed, dict):
            return parsed
    except Exception as e:
        print("JSON parsing error:", e)
        print("Raw LLM Response:", response)

    # fallback
    return {
        "corrected_query": user_query,
        "intent": "unknown",
        "references": []
    }
