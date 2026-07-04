"""
main.py — Tambua Civic Literacy Platform
==========================================
Flask application: serves the frontend and exposes a REST API for
bill browsing, AI-powered summaries, translations, Q&A, impact
analysis, predictions, recommendations, and civic feedback.

Run:
    cd d:\\tambua\\src
    python main.py
"""

import os
import sys
from flask import Flask, render_template, request, jsonify

# ---------------------------------------------------------------------------
# Ensure the src/ package is importable regardless of working directory
# ---------------------------------------------------------------------------
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

import database as db
import pdf_processor as pdf
import ai_engine as ai

# ---------------------------------------------------------------------------
# Flask app setup
# ---------------------------------------------------------------------------
app = Flask(
    __name__,
    static_folder=os.path.join(SRC_DIR, "..", "static"),
    template_folder=os.path.join(SRC_DIR, "..", "templates"),
)
app.config["JSON_SORT_KEYS"] = False

# Simple CORS headers for development
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# Default user ID (created by seed_demo_data)
DEFAULT_USER_ID = 1

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_bill_text(bill: dict) -> str:
    """Return extracted text for a bill, pulling from cache if needed."""
    text = bill.get("extracted_text", "")
    if not text or not text.strip():
        text = pdf.get_cached_text(bill["filename"])
    return text


def _get_language(data: dict = None) -> str:
    """Extract and validate language from request body or query params."""
    lang = "en"
    if data and "language" in data:
        lang = data["language"]
    elif request.args.get("language"):
        lang = request.args.get("language")
    # Validate
    if lang not in ("en", "sw", "ki", "sh", "lu", "ka"):
        lang = "en"
    return lang


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the main single-page application."""
    return render_template("index.html")


# ---------------------------------------------------------------------------
# API — Bills
# ---------------------------------------------------------------------------

@app.route("/api/bills", methods=["GET"])
def api_list_bills():
    """List all bills. Optionally filter by status via ?status=active."""
    status = request.args.get("status")
    if status == "active":
        bills = db.get_active_bills()
    elif status in ("passed", "rejected"):
        bills = db.get_past_bills()
    else:
        bills = db.get_all_bills()

    # Add a flag indicating whether extracted text is available
    for b in bills:
        b["has_text"] = bool(b.get("extracted_text", "").strip())
        # Don't send the full extracted text in the listing — it's huge
        b.pop("extracted_text", None)

    return jsonify({"bills": bills})


@app.route("/api/bills/<int:bill_id>", methods=["GET"])
def api_get_bill(bill_id):
    """Get full details for a single bill (including extracted text)."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    # Ensure text is populated
    if not bill.get("extracted_text", "").strip():
        text = pdf.get_cached_text(bill["filename"])
        if text.strip():
            db.update_bill(bill_id, extracted_text=text)
            bill["extracted_text"] = text

    bill["has_text"] = bool(bill.get("extracted_text", "").strip())

    # Log the view interaction
    db.log_interaction(DEFAULT_USER_ID, bill_id, "view")

    return jsonify({"bill": bill})


# ---------------------------------------------------------------------------
# API — AI-powered endpoints
# ---------------------------------------------------------------------------

@app.route("/api/bills/<int:bill_id>/interact", methods=["POST"])
def api_bill_interact(bill_id):
    """Unified endpoint for bill interactions requested by the frontend."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    text = _get_bill_text(bill)
    if not text.strip():
        return jsonify({"error": "No text available for this bill"}), 400

    data = request.get_json(silent=True) or {}
    interaction_type = data.get("interaction_type")
    language = _get_language(data)

    if interaction_type == "summary":
        summary = ai.summarize_bill(text, language)
        db.log_interaction(
            DEFAULT_USER_ID, bill_id, "summarize",
            query_text=f"Summary in {language}",
            response_text=summary[:500],
            language=language,
        )
        return jsonify({"summary": summary, "language": language, "bill_id": bill_id})

    elif interaction_type == "translate":
        chunk = text[:8000]
        translation = ai.translate_bill(chunk, language)
        db.log_interaction(
            DEFAULT_USER_ID, bill_id, "translate",
            query_text=f"Translate to {language}",
            response_text=translation[:500],
            language=language,
        )
        return jsonify({"translation": translation, "language": language, "bill_id": bill_id})

    elif interaction_type == "analyze":
        analysis = ai.analyze_bill(text, language)
        db.log_interaction(
            DEFAULT_USER_ID, bill_id, "summarize",
            query_text=f"Impact analysis in {language}",
            response_text=analysis[:500],
            language=language,
        )
        return jsonify({"analysis": analysis, "language": language, "bill_id": bill_id})

    elif interaction_type == "civic_guidance":
        guidance = ai.civic_guidance(text, language)
        db.log_interaction(
            DEFAULT_USER_ID, bill_id, "summarize",
            query_text=f"Civic guidance in {language}",
            response_text=guidance[:500],
            language=language,
        )
        return jsonify({"guidance": guidance, "language": language, "bill_id": bill_id})

    elif interaction_type == "query":
        question = data.get("query", "").strip()
        if not question:
            return jsonify({"error": "Please provide a question"}), 400
        answer = ai.answer_question(text, question, language)
        db.log_interaction(
            DEFAULT_USER_ID, bill_id, "query",
            query_text=question,
            response_text=answer[:500],
            language=language,
        )
        return jsonify({"answer": answer, "question": question, "language": language, "bill_id": bill_id})

    else:
        return jsonify({"error": f"Invalid interaction type: {interaction_type}"}), 400


@app.route("/api/bills/<int:bill_id>/summary", methods=["POST"])
def api_summarize_bill(bill_id):
    """Generate an AI plain-language summary of a bill."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    text = _get_bill_text(bill)
    if not text.strip():
        return jsonify({"error": "No text available for this bill"}), 400

    data = request.get_json(silent=True) or {}
    language = _get_language(data)

    summary = ai.summarize_bill(text, language)

    # Log interaction
    db.log_interaction(
        DEFAULT_USER_ID, bill_id, "summarize",
        query_text=f"Summary in {language}",
        response_text=summary[:500],
        language=language,
    )

    return jsonify({"summary": summary, "language": language, "bill_id": bill_id})


@app.route("/api/bills/<int:bill_id>/translate", methods=["POST"])
def api_translate_bill(bill_id):
    """Translate a bill's text (or its summary) into a target language."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    text = _get_bill_text(bill)
    if not text.strip():
        return jsonify({"error": "No text available for this bill"}), 400

    data = request.get_json(silent=True) or {}
    language = _get_language(data)

    # Translate a summary-length chunk rather than the entire bill
    # to stay within token limits and keep costs down
    chunk = text[:8000]
    translation = ai.translate_bill(chunk, language)

    # Log interaction
    db.log_interaction(
        DEFAULT_USER_ID, bill_id, "translate",
        query_text=f"Translate to {language}",
        response_text=translation[:500],
        language=language,
    )

    return jsonify({"translation": translation, "language": language, "bill_id": bill_id})


@app.route("/api/bills/<int:bill_id>/query", methods=["POST"])
def api_query_bill(bill_id):
    """Ask a question about a specific bill."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    text = _get_bill_text(bill)
    if not text.strip():
        return jsonify({"error": "No text available for this bill"}), 400

    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    if not question:
        return jsonify({"error": "Please provide a question"}), 400

    language = _get_language(data)

    answer = ai.answer_question(text, question, language)

    # Log interaction
    db.log_interaction(
        DEFAULT_USER_ID, bill_id, "query",
        query_text=question,
        response_text=answer[:500],
        language=language,
    )

    return jsonify({"answer": answer, "question": question, "language": language, "bill_id": bill_id})


@app.route("/api/bills/<int:bill_id>/analysis", methods=["POST"])
def api_analyze_bill(bill_id):
    """Get an AI-powered impact analysis of a bill."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    text = _get_bill_text(bill)
    if not text.strip():
        return jsonify({"error": "No text available for this bill"}), 400

    data = request.get_json(silent=True) or {}
    language = _get_language(data)

    analysis = ai.analyze_bill(text, language)

    # Log interaction
    db.log_interaction(
        DEFAULT_USER_ID, bill_id, "summarize",
        query_text=f"Impact analysis in {language}",
        response_text=analysis[:500],
        language=language,
    )

    return jsonify({"analysis": analysis, "language": language, "bill_id": bill_id})


# ---------------------------------------------------------------------------
# API — Recommendations & Predictions
# ---------------------------------------------------------------------------

@app.route("/api/recommendations", methods=["GET"])
def api_recommendations():
    """Get AI-powered bill recommendations for the current user."""
    user_history = db.get_user_interactions(DEFAULT_USER_ID)
    available_bills = db.get_active_bills()

    if not available_bills:
        return jsonify({"recommendations": [], "message": "No active bills available."})

    raw = ai.recommend_bills(user_history, available_bills)

    # Try to parse as JSON; otherwise return as text
    import json
    try:
        recommendations = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        recommendations = raw

    return jsonify({"recommendations": recommendations})


@app.route("/api/predictions", methods=["GET"])
def api_predictions():
    """Get outcome predictions for all active bills."""
    active_bills = db.get_active_bills()
    past_bills = db.get_past_bills()

    if not active_bills:
        return jsonify({"predictions": [], "message": "No active bills to predict."})

    predictions = []
    for bill in active_bills:
        text = _get_bill_text(bill)
        if not text.strip():
            predictions.append({
                "bill_id": bill["id"],
                "title": bill["title"],
                "prediction": "No text available for prediction.",
            })
            continue

        prediction = ai.predict_outcome(text, past_bills)
        predictions.append({
            "bill_id": bill["id"],
            "title": bill["title"],
            "prediction": prediction,
        })

    return jsonify({"predictions": predictions})


@app.route("/api/past-bills", methods=["GET"])
@app.route("/api/bills/past", methods=["GET"])
def api_past_bills():
    """Get bills that have been passed or rejected (historical view)."""
    bills = db.get_past_bills()
    # Strip heavy extracted_text from the listing
    for b in bills:
        b.pop("extracted_text", None)
    return jsonify({"bills": bills})


# ---------------------------------------------------------------------------
# API — Forums
# ---------------------------------------------------------------------------

@app.route("/api/forums", methods=["GET"])
def api_forums():
    """List public participation forums. Filter by ?county=Nairobi."""
    county = request.args.get("county")
    forums = db.get_forums(county)
    return jsonify({"forums": forums})


# ---------------------------------------------------------------------------
# API — User profile
# ---------------------------------------------------------------------------

@app.route("/api/profile", methods=["GET"])
def api_get_profile():
    """Get the current user's profile (default user id=1)."""
    user = db.get_user(DEFAULT_USER_ID)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"profile": user})


@app.route("/api/profile", methods=["PUT"])
def api_update_profile():
    """Update the current user's profile."""
    data = request.get_json(silent=True) or {}

    allowed = ("name", "county", "preferred_language")
    updates = {k: v for k, v in data.items() if k in allowed and v}

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    db.update_user(DEFAULT_USER_ID, **updates)
    user = db.get_user(DEFAULT_USER_ID)
    return jsonify({"profile": user, "message": "Profile updated successfully."})


@app.route("/api/profile/history", methods=["GET"])
@app.route("/api/interactions", methods=["GET"])
def api_user_history():
    """Get the current user's interaction history."""
    limit = request.args.get("limit", 50, type=int)
    history = db.get_user_interactions(DEFAULT_USER_ID, limit)
    return jsonify({"history": history})


# ---------------------------------------------------------------------------
# API — Feedback
# ---------------------------------------------------------------------------

@app.route("/api/feedback", methods=["GET"])
def api_list_feedback():
    """Get all feedback entries."""
    limit = request.args.get("limit", 100, type=int)
    feedbacks = db.get_all_feedback(limit)
    return jsonify(feedbacks)


@app.route("/api/feedback", methods=["POST"])
def api_submit_feedback():
    """Submit citizen feedback on a bill."""
    data = request.get_json(silent=True) or {}
    bill_id = data.get("bill_id")
    stance = data.get("stance", "").strip()
    comment = data.get("comment", "").strip()

    if not bill_id:
        return jsonify({"error": "bill_id is required"}), 400
    if stance not in ("support", "oppose", "neutral"):
        return jsonify({"error": "stance must be 'support', 'oppose', or 'neutral'"}), 400

    # Verify bill exists
    bill = db.get_bill(int(bill_id))
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    db.add_feedback(DEFAULT_USER_ID, int(bill_id), stance, comment)

    # Also log as an interaction
    db.log_interaction(
        DEFAULT_USER_ID, int(bill_id), "feedback",
        query_text=f"Stance: {stance}",
        response_text=comment,
    )

    return jsonify({"message": "Feedback submitted. Asante sana! 🙏", "bill_id": bill_id, "stance": stance})


@app.route("/api/feedback/<int:bill_id>", methods=["GET"])
def api_get_feedback(bill_id):
    """Get all feedback for a specific bill, plus a summary."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    feedback_list = db.get_bill_feedback(bill_id)
    summary = db.get_feedback_summary(bill_id)

    return jsonify({
        "bill_id": bill_id,
        "feedback": feedback_list,
        "summary": summary,
    })


# ---------------------------------------------------------------------------
# API — Civic guidance
# ---------------------------------------------------------------------------

@app.route("/api/bills/<int:bill_id>/civic-guidance", methods=["POST"])
def api_civic_guidance(bill_id):
    """Get civic participation guidance related to a bill."""
    bill = db.get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    text = _get_bill_text(bill)
    data = request.get_json(silent=True) or {}
    language = _get_language(data)

    guidance = ai.civic_guidance(text, language)

    return jsonify({"guidance": guidance, "language": language, "bill_id": bill_id})


# ---------------------------------------------------------------------------
# Startup initialisation
# ---------------------------------------------------------------------------

def initialise():
    """
    Run all startup tasks:
      1. Create DB tables
      2. Seed bills from PDF filenames
      3. Extract text from all PDFs (cached)
      4. Store extracted text in the bills table
      5. Seed demo data (default user, forums, historical bills)
    """
    print("=" * 60)
    print("  TAMBUA — Civic Literacy & AI Platform")
    print("  Initialising…")
    print("=" * 60)

    # 1. Database schema
    db.init_db()

    # 2. Seed bills from data/ directory
    db.seed_bills(r"d:\tambua\data")

    # 3. Extract text from all PDFs
    print("[INIT] Extracting text from PDFs (this may take a moment)…")
    extracted = pdf.extract_all_bills()

    # 4. Update bills table with extracted text and descriptions
    bills = db.get_all_bills()
    updated = 0
    for bill in bills:
        filename = bill["filename"]
        text = extracted.get(filename, "")
        if text.strip():
            # Generate clean preview/description
            cleaned = " ".join(text.split())
            preview = cleaned[:200].strip() + "..." if len(cleaned) > 200 else cleaned
            
            updates = {}
            if not bill.get("extracted_text", "").strip():
                updates["extracted_text"] = text
            if not bill.get("description", "").strip():
                updates["description"] = preview
                
            if updates:
                db.update_bill(bill["id"], **updates)
                updated += 1
    print(f"[INIT] Updated extracted text/description for {updated} bill(s).")

    # 5. Demo data
    db.seed_demo_data()

    print("=" * 60)
    print("  ✅  Tambua is ready!")
    print("  🌐  Open http://localhost:5000 in your browser")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    initialise()
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False,   # Avoid running initialise() twice
    )
