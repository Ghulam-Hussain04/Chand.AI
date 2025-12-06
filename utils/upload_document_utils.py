import os ,json , re
from typing import List
from PyPDF2 import PdfReader
from langchain.schema import Document
from llm_client import ask
import tiktoken



def split_into_safe_chunks(text: str, max_tokens: int = 6000) -> list[str]:
    # Use GPT-4 tokenizer (works for most models)
    enc = tiktoken.get_encoding("cl100k_base")

    # Normalize spacing
    text = text.replace("\r", "").strip()

    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current_chunk = ""

    for para in paragraphs:
        para_tokens = len(enc.encode(para))
        chunk_tokens = len(enc.encode(current_chunk))

        # If adding this paragraph exceeds the limit -> start new chunk
        if chunk_tokens + para_tokens > max_tokens:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"
        else:
            current_chunk += para + "\n\n"

    # Add last chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def extract_text_from_pdf(path:str)->str:
    reader=PdfReader(path)
    return "\n".join(
        [page.extract_text() for page in reader.pages if page.extract_text()]
    )
    
def insert_breakpoints_with_llm(document_text:str)->str:
    prompt=f"""
        You are a document chunking assistant.

        Your goal is to split lunar geology and lunar surface analysis documents into
        logical, meaningful chunks based strictly on natural structure and scientific relevance.

        These documents may include descriptions of lunar surface terrain, craters,
        boulder fields, regolith composition, morphology, spectral analysis, rover
        navigation logs, and geological interpretations.

        ---------------------------------------------------
        ### GENERAL CHUNKING RULES
        ---------------------------------------------------

        ### **1. Insert `<<<BREAK>>>` before each major geological section**
        Major sections usually include titles/headings like:
        - "1. Introduction"
        - "Geological Context"
        - "Craters and Depressions"
        - "Regolith Properties"
        - "Boulder Distribution Analysis"
        - "Spectral Characterization"
        - "Morphology and Terrain Classification"
        - "Observations"
        - "Discussion"
        - "Conclusion"

        ### **2. Sub-sections**
        - Insert a break before each **clear sub-section** if it represents a meaningful change of topic.
        - If subpoints are **long, dense, or technical**, split them into **separate chunks per subpoint**.
        - If subpoints are short or tightly related, keep them together.

        ### **3. Figures, maps, tables, and datasets**
        - Each figure/table/map (and its caption/description) should be **one chunk**.
        - NEVER split inside a table, figure description, or dataset block.

        ### **4. Rover logs / sequential observations**
        For observational logs or ordered rover movements:
        - Keep consecutive steps in **one chunk** unless exceeding 600 words.
        - Insert breakpoints when the rover enters a **new terrain type** or **new geologic feature**.

        ### **5. Natural Geological Breaks**
        Insert a `<<<BREAK>>>` when the text transitions between:
        - One crater to another
        - Boulder field to regolith area
        - Highland terrain to mare terrain
        - Observations to interpretations
        - Raw data to analysis
        - Geologic description to conclusions

        ---------------------------------------------------
        ### WORD-LIMIT RULE (CRITICAL)
        ---------------------------------------------------

        ### **Chunk Size Rule**
        - Each chunk should be **500–600 words maximum**.

        ### **Exception (Relevance-Based Override)**
        You may exceed 600 words **ONLY IF**:
        - The following paragraphs are *highly* related to the current scientific concept.
        - Splitting would break scientific continuity or separate tightly connected geological explanations.

        Otherwise, always break before reaching 600 words.

        ---------------------------------------------------
        ### DO NOT:
        ---------------------------------------------------

        - Do NOT summarize or rewrite anything.
        - Do NOT split inside a sentence.
        - Do NOT split inside a table, figure description, or equation block.
        - Do NOT over-fragment scientific explanations.
        - Do NOT modify the original text.

        ---------------------------------------------------
        ### INPUT FORMAT:
        The file will be wrapped like this:
        <<FILE:filename.pdf>>
        ... document text ...
        <<END_OF_FILE>>

        ---------------------------------------------------
        ### OUTPUT FORMAT:
        Return the document text with `<<<BREAK>>>` inserted at correct positions.
        No additional explanation. No changes to wording.
        Only insert breakpoints.

        ---------------------------------------------------

        Here is the document:

        {document_text}

    """
    answer=ask(prompt)
    print("BreakPoints",answer)
    return answer


def parse_llm_chunks_lunar(llm_output: str, filename: str) -> List[Document]:
    docs = []
    current_file = filename
    chunks = llm_output.split("<<<BREAK>>>")

    # --- REGEX patterns based on actual lunar geology documents ---
    feature_patterns = {
        "crater": r"\bcrater[s]?\b|\bimpact feature\b|\bejecta\b|\brays?\b",
        "maria": r"\bmaria\b|\bmare\b",
        "regolith": r"\bregolith\b|\blunar soil\b",
        "basalt": r"\bbasalt\b|\bigneous\b",
        "dome": r"\bdome\b|\bshield volcano\b",
        "lava_tube": r"\blava tube\b|\bskylight\b",
        "wrinkle_ridge": r"\bwrinkle ridges?\b",
        "highland": r"\bhighlands?\b|\bmountains?\b",
        "valley": r"\bvalley\b|\brilles?\b",
        "rift": r"\brift\b",
    }

    geologic_periods = [
        "Pre-Nectarian", "Nectarian", "Imbrian",
        "Eratosthenian", "Copernican"
    ]

    for idx, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue

        # Remove PDF markers
        chunk_clean = re.sub(r"<<.*?>>", "", chunk).strip()
        lines = chunk_clean.split("\n")

        # SECTION TITLE → first non-empty line
        section_title = next((line.strip() for line in lines if line.strip()), "Uncategorized Section")

        # --- FEATURE TYPE DETECTION ---
        feature_type = None
        for ft, pattern in feature_patterns.items():
            if re.search(pattern, chunk_clean, re.IGNORECASE):
                feature_type = ft
                break

        # --- GEOLOGICAL PERIOD DETECTION ---
        geo_period = None
        for period in geologic_periods:
            if period.lower() in chunk_clean.lower():
                geo_period = period
                break

        # --- TERRAIN TYPE ---
        if re.search(r"\bmaria\b|\bmare\b|\bbasalt\b", chunk_clean, re.IGNORECASE):
            terrain_type = "mare terrain"
        elif re.search(r"\bhighland\b|\bmountain\b", chunk_clean, re.IGNORECASE):
            terrain_type = "lunar highlands"
        else:
            terrain_type = "general terrain"

        # --- FIGURE/TABLE CHECK ---
        has_figures = bool(re.search(r"Figure|Table|Fig\.", chunk_clean, re.IGNORECASE))

        # --- KEYWORD EXTRACTION ---
        keywords = []
        for k, pattern in feature_patterns.items():
            if re.search(pattern, chunk_clean, re.IGNORECASE):
                keywords.append(k)

        # Build metadata dict
        metadata = {
            "filename": filename,
            "chunk_id": idx,
            "section_title": section_title,
            "feature_type": feature_type,
            "geologic_period": geo_period,
            "terrain_type": terrain_type,
            "has_figures": has_figures,
            "keywords": keywords
        }

        docs.append(Document(page_content=chunk_clean, metadata=metadata))

    return docs

        

def process_single_file(pdf_path:str)->list[Document]:
    all_chunks=[]
    filename=os.path.basename(pdf_path)
    text=extract_text_from_pdf(pdf_path)
    print(f"Extracted text: {text}")
    chunks = split_into_safe_chunks(text, max_tokens=6000)
    for idx, chunk in enumerate(chunks):
        print(f"Sending chunk {idx+1}/{len(raw_chunks)} to LLM...")
        wrapped_text=f"<<FILE:{filename}>>\n{chunk}\n<<END_OF_FILE>>"
        llm_output=insert_breakpoints_with_llm(wrapped_text)
        final_chunks = parse_llm_chunks_lunar(llm_output, filename)
        all_chunks.extend(final_chunks)

    
    
    
    return all_chunks
    