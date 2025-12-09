from app.utils.chroma_utils import initialize_chroma , bm25_retriever
from langchain.schema import Document
import numpy as np
from numpy.linalg import norm

def retrieve_document(user_query: str, parsed_query: dict) -> tuple[list[Document], float]:
    vectordb = initialize_chroma()
    references = parsed_query.get("references", [])
    intent = parsed_query.get("intent", "unknown")

    # 1) Primary vector search
    results_with_scores = vectordb.similarity_search_with_score(user_query, k=5)
    top_doc = results_with_scores[0][0]
    chroma_score = results_with_scores[0][1] if results_with_scores else 0.0

    # 2) Compute cosine similarity
    try:
        query_emb = vectordb.embedding_function.embed_query(user_query)

        collection = vectordb._collection
        all_data = collection.get(include=["documents", "embeddings", "metadatas"])

        # Find matching embedding safely
        top_doc_id = top_doc.metadata.get("id")

        idx = next(
        (i for i, meta in enumerate(all_data["metadatas"]) 
        if meta.get("id") == top_doc_id),
        None
                  )

        if idx is not None:
            doc_emb = np.array(all_data["embeddings"][idx])
            cosine_score = float(np.dot(query_emb, doc_emb) / (norm(query_emb) * norm(doc_emb)))
            cosine_score = float(np.clip(cosine_score, 0.0, 1.0))
        else:
            cosine_score = chroma_score
    except Exception as e:
          print("Cosine similarity calculation error:", e)
          cosine_score = chroma_score

    # 3) Reference-aware filtering
    if references:
        candidates = vectordb.similarity_search(user_query, k=10)
        matched = []

        for doc in candidates:
            meta_text = " ".join([str(v).lower() for v in doc.metadata.values()])
            content_text = doc.page_content.lower()

            for ref in references:
                ref_l = ref.lower()

                # match in metadata or content
                if ref_l in meta_text or ref_l in content_text:
                    matched.append(doc)
                    break

        if matched:
            unique_docs = list({d.page_content: d for d in matched}.values())
            return unique_docs[:5], cosine_score

    # 4) BM25 fallback
    if bm25_retriever:
        bm25_docs = bm25_retriever.get_relevant_documents(user_query)
        vector_docs = vectordb.similarity_search(user_query, k=5)
        all_docs = list({d.page_content: d for d in (bm25_docs + vector_docs)}.values())
        return all_docs[:5], cosine_score

    return vectordb.similarity_search(user_query, k=3), cosine_score
