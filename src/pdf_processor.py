"""
pdf_processor.py — Tambua Civic Literacy Platform
===================================================
Extract text from legislative PDF documents using PyMuPDF (fitz).
Caches extracted text to d:/tambua/data/extracted/ so we only parse once.
"""

import os
import fitz  # PyMuPDF

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATA_DIR = r"d:\tambua\data"
CACHE_DIR = os.path.join(DATA_DIR, "extracted")


def _ensure_cache_dir():
    """Create the cache directory if it doesn't exist."""
    os.makedirs(CACHE_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Core extraction
# ---------------------------------------------------------------------------

def extract_text(pdf_path: str) -> str:
    """
    Extract all text from a single PDF file using PyMuPDF.

    Args:
        pdf_path: Absolute or relative path to the PDF file.

    Returns:
        The concatenated text of every page, or an empty string on failure.
    """
    if not os.path.isfile(pdf_path):
        print(f"[PDF] File not found: {pdf_path}")
        return ""

    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:
        print(f"[PDF] Cannot open {pdf_path}: {exc}")
        return ""

    pages_text = []
    for page_num in range(len(doc)):
        try:
            page = doc[page_num]
            text = page.get_text("text")
            if text and text.strip():
                pages_text.append(text)
        except Exception as exc:
            # Skip corrupt / unreadable pages silently
            print(f"[PDF] Error on page {page_num + 1} of {os.path.basename(pdf_path)}: {exc}")
            continue

    doc.close()

    full_text = "\n\n".join(pages_text)
    if not full_text.strip():
        print(f"[PDF] Warning — no readable text in {os.path.basename(pdf_path)}")

    return full_text


# ---------------------------------------------------------------------------
# Caching layer
# ---------------------------------------------------------------------------

def _cache_path(bill_filename: str) -> str:
    """Return the path to the cached .txt file for a given PDF filename."""
    base = os.path.splitext(bill_filename)[0]
    return os.path.join(CACHE_DIR, f"{base}.txt")


def get_cached_text(bill_filename: str) -> str:
    """
    Return cached extracted text if available.
    If no cache exists, extract from the original PDF and cache the result.

    Args:
        bill_filename: The PDF filename (basename only, e.g. 'THE FINANCE BILL 2026.pdf').

    Returns:
        Extracted text string, or empty string on failure.
    """
    _ensure_cache_dir()
    cache = _cache_path(bill_filename)

    # Return from cache if it exists and is non-empty
    if os.path.isfile(cache):
        try:
            with open(cache, "r", encoding="utf-8") as f:
                text = f.read()
            if text.strip():
                return text
        except Exception as exc:
            print(f"[PDF] Cache read error for {bill_filename}: {exc}")

    # Otherwise, extract fresh
    pdf_path = os.path.join(DATA_DIR, bill_filename)
    text = extract_text(pdf_path)

    # Save to cache
    if text.strip():
        try:
            with open(cache, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"[PDF] Cached text for {bill_filename}")
        except Exception as exc:
            print(f"[PDF] Cache write error for {bill_filename}: {exc}")

    return text


def extract_all_bills(data_dir: str = DATA_DIR, cache_dir: str = CACHE_DIR):
    """
    Extract text from every PDF in *data_dir* and cache results in *cache_dir*.

    Returns:
        dict mapping filename → extracted text
    """
    _ensure_cache_dir()

    results = {}
    if not os.path.isdir(data_dir):
        print(f"[PDF] Data directory not found: {data_dir}")
        return results

    for entry in os.listdir(data_dir):
        if not entry.lower().endswith(".pdf"):
            continue
        text = get_cached_text(entry)
        results[entry] = text
        status = "OK" if text.strip() else "EMPTY"
        print(f"[PDF]  {status}  {entry[:60]}...")

    print(f"[PDF] Processed {len(results)} PDF(s).")
    return results


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    texts = extract_all_bills()
    for fname, txt in texts.items():
        chars = len(txt)
        preview = txt[:120].replace("\n", " ") if txt else "(empty)"
        print(f"  {fname[:50]:50s}  {chars:>8,} chars  |  {preview}...")
