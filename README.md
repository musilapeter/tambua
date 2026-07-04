# Tambua — Sauti Yako ni Kenya

> Built during the **Democracy & AI Hackathon** — July 4th, 2026
> Hosted by **Mozilla Foundation** & **KamiLimu**

---

## Team

| Name | Role | GitHub |
|------|------|--------|
| Faith Jebet | Frontend engineer, UI/UX design mockups, research on data | [@Faith-jebet](https://github.com/Faith-jebet) |
| Musila Peter | Backend Engineer, AI/ML integrations, research on data | [@musilapeter](https://github.com/musilapeter) |

**Team Name:** Tambua
**University:** University of Embu

---

## Problem & User

### Problem Statement

Less-informed, rural youth in Kenyan communities face systemic exclusion from mandatory public consultation processes for national legislation like Finance and Statistics bills, evidenced by a nationwide 2026 Justice and Legal Affairs Committee evaluation noting widespread citizen frustration over inaccessible, dense legal materials. This problem is primarily caused by the total lack of localized, multi-dialect translation pipelines capable of adapting complex statutory provisions into local regional vernaculars, supported by Mzalendo Trust's documentation of technical terminology acting as an intentional civic gatekeeping barrier.

### Target User

| Dimension | Detail |
|-----------|--------|
| **Primary user** | Less-informed, rural youth in Kenyan communities (aged 18–35) |
| **Tech comfort** | High comfort with mobile interfaces, reliant on localized audio and messaging |
| **Language** | Local indigenous languages (Dholuo, Gĩkũyũ, Kalenjin) and Kiswahili/Sheng |
| **Current workflow** | Hears about legislation from local radio or barazas; has no way to verify or read the bills |

### The Specific Gap

1. **What's already there:** Mzalendo’s digital Dokeza platform which leverages legal experts to annotate and summarize active parliamentary bills.
2. **Why it falls short:** Outputs are published as static written text blocks in English and formal textbook Kiswahili on a data-heavy website, remaining completely out of reach for low-literacy rural youth reliant on localized audio.
3. **The gap we fill:** Real-time, simplified local-language (Kiswahili, Sheng, Kikuyu, Luo, Kalenjin) text summaries and interactive civic guidance, allowing grassroots youth to comprehend bills and voice their stance.

### Why It Matters

> When rural youth cannot participate in legislative processes, their voices are silenced, leading to policy tokenism and laws that do not reflect grassroots reality. Closing this linguistic gatekeeping gap transitions marginalized, less-educated rural youth from passive observers to active civic stakeholders who can submit informed feedback on active bills, restoring a basic democratic feedback mechanism.

---

## Run Instructions

### Prerequisites

- Python 3.10+
- PyMuPDF (`fitz`) for PDF processing
- Gemini API Key

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/musilapeter/tambua.git
cd tambua

# 2. Create a virtual environment
python -m venv venv
venv\Scripts\activate   # Linux/macOS: source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables
# Copy configuration to .env and edit with your GEMINI_API_KEY
# GEMINI_API_KEY=your_key_here
# FLASK_ENV=development
# FLASK_DEBUG=1
```

---

## 📁 Project Structure

```
.
├── README.md                   ← You are here
├── docs/
│   └── FaithJebet_MusilaPeter_ProblemStatement.docx.pdf  ← Detailed problem breakdown
├── src/
│   ├── ai_engine.py            ← Gemini integration layer
│   ├── database.py             ← SQLite schema & CRUD helper functions
│   ├── main.py                 ← Flask app entry point
│   ├── pdf_processor.py        ← PDF text extraction & caching logic
│   └── tambua.db               ← SQLite database file
├── static/                     ← Static frontend assets (CSS, JS, Images)
├── templates/                  ← HTML Templates
├── requirements.txt
├── .gitignore
└── LICENSE
```

---

## Approach & Architecture

We use the Gemini 2.5/3.5 models to simplify and translate complex Kenyan legislative text. The system parses PDF bills, extracts clean text blocks, caches the content, and indexes it within a lightweight database. When users select a bill, they can generate summaries, translations, impact analyses, civic participation guidance, and ask custom questions in their preferred language.

```
[User] → [Web Client] → [Flask API backend] → [Gemini AI Engine] → [Response]
                                 ↓
                            [SQLite DB]
```

---

## License

MIT © Tambua, 2026

---
