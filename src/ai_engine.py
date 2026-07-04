"""
ai_engine.py — Tambua Civic Literacy Platform
===============================================
Gemini AI integration for bill summarisation, translation, Q&A,
impact analysis, outcome prediction, recommendations, and civic guidance.

All prompts are crafted for the Kenyan context: simple language,
local examples, and references to the Constitution of Kenya 2010.
"""

import os
import json
from dotenv import load_dotenv

# Load environment variables from project root .env
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

import google.generativeai as genai

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "gemini-2.5-flash"

# Language display names for prompt construction
LANGUAGE_NAMES = {
    "en": "English",
    "sw": "Kiswahili",
    "ki": "Kikuyu",
    "sh": "Sheng",
    "lu": "Luo (Dholuo)",
    "ka": "Kalenjin",
}


def _configure():
    """Configure the Gemini SDK. Call before every generation."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your-gemini-api-key-here":
        raise RuntimeError(
            "GEMINI_API_KEY is not set. "
            "Please add a valid key to d:/tambua/.env — "
            "get one free at https://aistudio.google.com/"
        )
    genai.configure(api_key=GEMINI_API_KEY)


def _get_model():
    """Return a configured GenerativeModel instance."""
    _configure()
    return genai.GenerativeModel(MODEL_NAME)


def _lang(code: str) -> str:
    """Return the full language name for a given code."""
    return LANGUAGE_NAMES.get(code, "English")


def _safe_generate(prompt: str, max_tokens: int = 4096) -> str:
    """
    Generate text from Gemini with error handling.
    Returns the generated text or a user-friendly error message.
    """
    try:
        model = _get_model()
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            ),
        )
        return response.text
    except RuntimeError as exc:
        # Missing API key
        return f"⚠️ Configuration error: {exc}"
    except Exception as exc:
        return f"⚠️ AI service error: {exc}. Please try again shortly."


# ---------------------------------------------------------------------------
# 1. Summarise a bill
# ---------------------------------------------------------------------------

def summarize_bill(text: str, language: str = "en") -> str:
    """
    Generate a plain-language summary of a legislative bill.
    Targeted at semi-literate Kenyan youth aged 18–35.
    """
    lang_name = _lang(language)
    prompt = f"""You are Tambua, a friendly Kenyan civic educator. Your audience is young Kenyans
aged 18-35 who may not have university education. Many are hustlers — bodaboda riders,
mama mboga, small shop owners, farm workers, or fresh graduates looking for jobs.

Summarise the following Kenyan bill in {lang_name}. Follow these rules:
1. Use very simple words and short sentences.
2. Explain legal terms in everyday language (e.g., "appropriation" → "how the government plans to spend money").
3. Use local examples: how it affects food prices at the market, farm inputs,
   rent, hospital bills, school fees, bodaboda licences, mobile money (M-Pesa).
4. Structure your summary as:
   📋 **Title & Purpose** — What is this bill about?
   👥 **Who is affected?** — Which Kenyans does this touch?
   💰 **Money matters** — Any taxes, fees, or budget changes?
   ✅ **Good things** — Potential benefits
   ⚠️ **Concerns** — Potential problems
   🗳️ **Your voice matters** — How citizens can participate (Article 118, Constitution of Kenya 2010)
5. Keep it under 500 words.
6. If the language is not English, respond ENTIRELY in {lang_name}.

--- BILL TEXT ---
{text[:15000]}
"""
    return _safe_generate(prompt)


# ---------------------------------------------------------------------------
# 2. Translate bill text
# ---------------------------------------------------------------------------

def translate_bill(text: str, target_language: str) -> str:
    """Translate bill text (or a summary) into the target language."""
    lang_name = _lang(target_language)
    prompt = f"""Translate the following Kenyan legislative text into {lang_name}.

Rules:
1. Keep the meaning accurate — do not add or remove information.
2. Use simple, everyday {lang_name} that a market trader or farmer would understand.
3. For legal terms that have no direct translation, keep the English term in brackets
   and add a brief explanation. Example: "appropriation (jinsi serikali inatumia pesa)".
4. Maintain any formatting (bullet points, numbering).
5. If the text is very long, translate the most important sections first.

--- TEXT TO TRANSLATE ---
{text[:12000]}
"""
    return _safe_generate(prompt)


# ---------------------------------------------------------------------------
# 3. Question & Answer
# ---------------------------------------------------------------------------

def answer_question(bill_text: str, question: str, language: str = "en") -> str:
    """
    Answer a specific question about a bill using the bill text as context.
    """
    lang_name = _lang(language)
    prompt = f"""You are Tambua, a knowledgeable Kenyan civic assistant.
A citizen is asking about a specific bill. Answer their question using ONLY
the information in the bill text below. If the answer is not in the text, say so honestly.

Rules:
1. Respond in {lang_name}.
2. Use simple language a bodaboda rider or mama mboga would understand.
3. Give specific references (section numbers, clauses) when possible.
4. If the question relates to how the bill affects daily life, give concrete Kenyan examples
   (e.g., "If you sell vegetables at Gikomba market, this clause means...").
5. Reference constitutional rights where relevant (e.g., Article 35 - access to information,
   Article 118 - public participation).
6. Keep the answer concise — under 300 words.

CITIZEN'S QUESTION: {question}

--- BILL TEXT ---
{bill_text[:15000]}
"""
    return _safe_generate(prompt)


# ---------------------------------------------------------------------------
# 4. Impact analysis
# ---------------------------------------------------------------------------

def analyze_bill(text: str, language: str = "en") -> str:
    """
    Analyse a bill's strengths, weaknesses, and impact on the mwananchi.
    """
    lang_name = _lang(language)
    prompt = f"""You are a Kenyan policy analyst explaining a bill to ordinary citizens (wananchi).
Provide a balanced analysis in {lang_name}.

Structure your analysis as follows:

💪 **Strengths (Mambo Mazuri)**
- List 3-5 positive aspects of the bill
- Explain how each benefits ordinary Kenyans

⚠️ **Weaknesses (Changamoto)**
- List 3-5 concerns or weaknesses
- Explain the potential negative impact

📊 **Economic Impact (Uchumi)**
- Effect on jobs and employment
- Effect on prices of basic goods (unga, mafuta, sukari)
- Effect on small businesses and jua kali sector
- Effect on taxes and M-Pesa transactions

🏥 **Impact on Daily Life**
- Healthcare and NHIF/SHIF
- Education and school fees
- Housing and rent
- Transport and fuel prices

👨‍🌾 **Who Benefits? Who Loses?**
- Specific groups that gain from this bill
- Specific groups that may be disadvantaged

📜 **Constitutional Alignment**
- Does this bill align with the Constitution of Kenya 2010?
- Any potential constitutional concerns?

Rules:
1. Be balanced and factual — not politically biased.
2. Use real Kenyan examples and scenarios.
3. Keep language simple for a semi-literate audience.
4. Respond entirely in {lang_name}.

--- BILL TEXT ---
{text[:15000]}
"""
    return _safe_generate(prompt, max_tokens=5000)


# ---------------------------------------------------------------------------
# 5. Predict bill outcome
# ---------------------------------------------------------------------------

def predict_outcome(bill_text: str, past_bills_data: list = None) -> str:
    """
    Forecast the likelihood of a bill passing.
    Optionally uses data from past bills for context.
    """
    past_context = ""
    if past_bills_data:
        past_context = "\n\nHISTORICAL CONTEXT — Past bills and their outcomes:\n"
        for bill in past_bills_data[:5]:
            past_context += (
                f"- {bill.get('title', 'Unknown')}: {bill.get('status', '?')} — "
                f"{bill.get('ruling_reason', 'No reason recorded')}\n"
            )

    prompt = f"""You are a Kenyan parliamentary analyst. Based on the bill text and
any historical context provided, predict the likelihood of this bill passing
into law.

Provide your analysis as:

🔮 **Prediction**
- Likelihood of passing: [give a percentage, e.g., 65%]
- Expected timeline: [e.g., "likely to be debated in the next parliamentary session"]

📊 **Factors Supporting Passage**
- List 3-4 reasons why this bill might pass
- Consider: government support, public sentiment, economic conditions, political dynamics

🚧 **Factors Against Passage**
- List 3-4 reasons why this bill might fail or be amended
- Consider: opposition concerns, constitutional issues, public backlash, cost implications

📝 **Likely Amendments**
- What changes might MPs push for?
- What compromises are likely?

🗣️ **Public Sentiment**
- How are Kenyans likely to feel about this bill?
- Which counties or demographics will react most strongly?

Keep the analysis grounded in real Kenyan political dynamics.
Reference similar past legislation where relevant.
Respond in English.
{past_context}

--- BILL TEXT ---
{bill_text[:15000]}
"""
    return _safe_generate(prompt, max_tokens=4096)


# ---------------------------------------------------------------------------
# 6. Recommend bills
# ---------------------------------------------------------------------------

def recommend_bills(user_history: list, available_bills: list) -> str:
    """
    Match bills to user interests based on their past interactions.

    Args:
        user_history:   List of dicts with keys like bill_title, bill_category, action.
        available_bills: List of dicts with keys id, title, category, status.
    """
    # Build a compact representation of user activity
    history_summary = "USER'S PAST ACTIVITY:\n"
    if user_history:
        for item in user_history[:20]:
            history_summary += (
                f"- {item.get('action', '?')} on \"{item.get('bill_title', '?')}\" "
                f"(category: {item.get('bill_category', '?')})\n"
            )
    else:
        history_summary += "- No prior activity recorded (new user)\n"

    bills_list = "AVAILABLE BILLS:\n"
    for bill in available_bills:
        bills_list += f"- ID {bill['id']}: \"{bill['title']}\" (category: {bill.get('category', 'general')}, status: {bill.get('status', 'active')})\n"

    prompt = f"""You are Tambua's recommendation engine. Based on the user's past
interactions with bills, recommend which bills they should read next.

{history_summary}

{bills_list}

Return a JSON array of recommendations. Each item should have:
- "bill_id": the bill's ID number
- "title": the bill's title
- "reason": a short, friendly explanation of why this bill is relevant to the user (1-2 sentences in simple English)
- "relevance_score": a score from 1-10

Sort by relevance_score descending. Include at most 5 recommendations.
Return ONLY the JSON array, no other text.
"""
    raw = _safe_generate(prompt, max_tokens=2048)

    # Try to parse the JSON; if it fails, return the raw text
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:])
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        parsed = json.loads(cleaned.strip())
        return json.dumps(parsed, indent=2)
    except (json.JSONDecodeError, Exception):
        return raw


# ---------------------------------------------------------------------------
# 7. Civic guidance
# ---------------------------------------------------------------------------

def civic_guidance(bill_text: str, language: str = "en") -> str:
    """
    Advise citizens on how to peacefully participate in the legislative
    process regarding a specific bill.
    """
    lang_name = _lang(language)
    prompt = f"""You are Tambua, a trusted Kenyan civic educator. A citizen wants to know
how they can make their voice heard about the following bill.

Provide guidance in {lang_name} covering:

🗳️ **Your Constitutional Rights**
- Article 1: Sovereignty of the people
- Article 35: Right to access information
- Article 37: Right to peaceful assembly and petition
- Article 118: Public participation in Parliament
- Explain each right in simple terms

📝 **How to Participate**
- Writing a memorandum to the relevant parliamentary committee
- Attending public participation forums (barazas)
- Contacting your MP or Senator (explain how to find them)
- Using the parliamentary petition process
- Engaging through social media and civic platforms like Tambua

⚖️ **Peaceful Participation**
- Emphasise that peaceful engagement is more effective than protests
- Explain how to organise community discussions
- How to form or join a citizen lobby group
- The role of civil society organisations (CSOs)

⚠️ **Know Your Protections**
- Protection against retaliation for civic participation
- What to do if your rights are violated
- How to report intimidation (IPOA, KNCHR, Ombudsman)

🤝 **Community Action**
- How to discuss the bill with neighbours, at church/mosque, in chama groups
- How to use local radio stations and community media
- Engaging county assemblies and ward representatives

Keep language simple and encouraging. The goal is to empower citizens,
not to scare them. Respond entirely in {lang_name}.

--- BILL TEXT (for context) ---
{bill_text[:8000]}
"""
    return _safe_generate(prompt, max_tokens=4096)


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Testing AI engine configuration...")
    try:
        _configure()
        print("✅ Gemini API key configured successfully.")
    except RuntimeError as e:
        print(f"❌ {e}")

    # Quick generation test with a dummy bill snippet
    sample = "This bill proposes to increase VAT on petroleum products from 8% to 16%."
    print("\n--- Sample Summary (English) ---")
    print(summarize_bill(sample, "en"))
