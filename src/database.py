"""
database.py — Tambua Civic Literacy Platform
=============================================
SQLite database layer: schema creation, seeding, and CRUD operations.
All tables live in d:/tambua/src/tambua.db.
"""

import sqlite3
import os
import glob
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tambua.db")


def get_connection():
    """Return a new SQLite connection with row_factory set to sqlite3.Row."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ---------------------------------------------------------------------------
# Schema initialisation
# ---------------------------------------------------------------------------

def init_db():
    """Create all tables if they do not already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # Bills table — each row is one legislative document
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bills (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT    NOT NULL,
            filename        TEXT    NOT NULL UNIQUE,
            description     TEXT    DEFAULT '',
            extracted_text  TEXT    DEFAULT '',
            status          TEXT    DEFAULT 'active'
                            CHECK (status IN ('active', 'passed', 'rejected')),
            ruling_reason   TEXT    DEFAULT '',
            upload_date     TEXT    DEFAULT (datetime('now')),
            category        TEXT    DEFAULT 'general'
        )
    """)

    # Schema migration: Add description column to existing databases
    try:
        cursor.execute("ALTER TABLE bills ADD COLUMN description TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            name                TEXT    NOT NULL,
            county              TEXT    DEFAULT '',
            preferred_language  TEXT    DEFAULT 'en',
            created_at          TEXT    DEFAULT (datetime('now'))
        )
    """)

    # Interactions — every API call a user makes is logged here
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interactions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            bill_id         INTEGER,
            action          TEXT    NOT NULL
                            CHECK (action IN ('view','query','summarize','translate','feedback')),
            query_text      TEXT    DEFAULT '',
            response_text   TEXT    DEFAULT '',
            language        TEXT    DEFAULT 'en',
            timestamp       TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (bill_id) REFERENCES bills(id)
        )
    """)

    # Feedback — citizen stance on a bill
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            bill_id     INTEGER NOT NULL,
            stance      TEXT    NOT NULL
                        CHECK (stance IN ('support','oppose','neutral')),
            comment     TEXT    DEFAULT '',
            timestamp   TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (bill_id) REFERENCES bills(id)
        )
    """)

    # Public participation forums
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS forums (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id     INTEGER,
            county      TEXT    NOT NULL,
            venue       TEXT    NOT NULL,
            date        TEXT    NOT NULL,
            time        TEXT    NOT NULL,
            description TEXT    DEFAULT '',
            FOREIGN KEY (bill_id) REFERENCES bills(id)
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Tables initialised.")


# ---------------------------------------------------------------------------
# Seeding helpers
# ---------------------------------------------------------------------------

# Maps filename fragments to human‑friendly categories
_CATEGORY_MAP = {
    "budget":       "finance",
    "finance":      "finance",
    "appropriation":"finance",
    "allocation":   "finance",
    "revenue":      "finance",
    "employment":   "labour",
    "ict":          "technology",
    "information":  "technology",
    "communication":"technology",
    "micro":        "business",
    "small":        "business",
    "enterprise":   "business",
    "participation":"governance",
    "public":       "governance",
}


def _categorise(filename: str) -> str:
    """Guess a bill category from its filename."""
    lower = filename.lower()
    for keyword, cat in _CATEGORY_MAP.items():
        if keyword in lower:
            return cat
    return "general"


def _title_from_filename(filename: str) -> str:
    """Derive a readable title from the PDF filename."""
    title = os.path.splitext(filename)[0]
    # Clean up common noise
    for char in ["_", "  "]:
        title = title.replace(char, " ")
    return title.strip()


def seed_bills(data_dir: str = r"d:\tambua\data"):
    """
    Scan *data_dir* for PDF files and insert each one into the bills table
    if it is not already present (matched by filename).
    """
    conn = get_connection()
    cursor = conn.cursor()

    pdf_pattern = os.path.join(data_dir, "*.pdf")
    pdf_files = glob.glob(pdf_pattern)

    inserted = 0
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        # Skip if already seeded
        existing = cursor.execute(
            "SELECT id FROM bills WHERE filename = ?", (filename,)
        ).fetchone()
        if existing:
            continue

        title = _title_from_filename(filename)
        category = _categorise(filename)

        cursor.execute(
            """INSERT INTO bills (title, filename, category)
               VALUES (?, ?, ?)""",
            (title, filename, category),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"[DB] Seeded {inserted} new bill(s) from {data_dir}.")


def seed_demo_data():
    """
    Populate the database with demo content:
      • Default user "Mwananchi"
      • Public‑participation forum entries
      • Mark a few bills as passed / rejected with ruling reasons
    Idempotent — skips if default user already exists.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # ---- Default user ----
    existing_user = cursor.execute(
        "SELECT id FROM users WHERE id = 1"
    ).fetchone()
    if not existing_user:
        cursor.execute(
            """INSERT INTO users (id, name, county, preferred_language)
               VALUES (1, 'Mwananchi', 'Nairobi', 'en')"""
        )
        print("[DB] Default user 'Mwananchi' created.")

    # ---- Mark historical bills ----
    # ICT Practitioners Bill 2020 → passed
    cursor.execute("""
        UPDATE bills SET status = 'passed',
            ruling_reason = 'Passed by the National Assembly in 2024 to regulate ICT practitioners, establish a professional body, and ensure standards in the growing tech sector. Signed into law to support Kenya''s Vision 2030 digital economy pillar.'
        WHERE filename LIKE '%ICT%' OR filename LIKE '%Information Communication%'
    """)

    # Employment Amendment Bill 2023 → passed
    cursor.execute("""
        UPDATE bills SET status = 'passed',
            ruling_reason = 'Enacted to strengthen worker protections, align labour laws with ILO conventions, and address emerging gig-economy employment relationships. The amendment was welcomed by trade unions as a step toward decent work for all Kenyans.'
        WHERE filename LIKE '%EMPLOYMENT%'
    """)

    # Micro and Small Enterprise Amendment Bill → rejected
    cursor.execute("""
        UPDATE bills SET status = 'rejected',
            ruling_reason = 'Rejected by the Senate Committee on Trade and Enterprise due to concerns that proposed registration fees would burden jua-kali artisans and small traders. Stakeholders argued the bill lacked sufficient public participation as required by Article 118 of the Constitution of Kenya, 2010.'
        WHERE filename LIKE '%MICRO%' OR filename LIKE '%SMALL ENTERPRISE%'
    """)

    # ---- Forum data ----
    # We only insert if the forums table is empty to stay idempotent
    forum_count = cursor.execute("SELECT COUNT(*) FROM forums").fetchone()[0]
    if forum_count == 0:
        # Pick some bill IDs for forums (use the first few active bills)
        active_bills = cursor.execute(
            "SELECT id FROM bills WHERE status = 'active' LIMIT 4"
        ).fetchall()
        bill_ids = [row["id"] for row in active_bills] if active_bills else [None, None, None, None]
        # Pad list so we always have 4 entries
        while len(bill_ids) < 4:
            bill_ids.append(bill_ids[0] if bill_ids else None)

        # Future dates for realistic upcoming forums
        base = datetime.now()
        forums = [
            # Nairobi
            (bill_ids[0], "Nairobi", "Kenyatta International Convention Centre (KICC), Hall A",
             (base + timedelta(days=14)).strftime("%Y-%m-%d"), "09:00",
             "Public participation session on the Finance Bill 2026. "
             "All Nairobi residents are invited to present memoranda. Interpretation in Kiswahili and KSL provided."),
            (bill_ids[1], "Nairobi", "University of Nairobi, Taifa Hall",
             (base + timedelta(days=21)).strftime("%Y-%m-%d"), "10:00",
             "Youth engagement forum on the Appropriation Bill. "
             "Open to all citizens aged 18+. Light refreshments provided."),

            # Kiambu
            (bill_ids[0], "Kiambu", "Thika Stadium Main Hall",
             (base + timedelta(days=18)).strftime("%Y-%m-%d"), "10:00",
             "County public hearing on the Finance Bill. Organised by the Kiambu County Assembly. "
             "Transport facilitated from Ruiru, Juja, and Gatundu sub-counties."),
            (bill_ids[2], "Kiambu", "Alliance Girls High School Auditorium, Kikuyu",
             (base + timedelta(days=25)).strftime("%Y-%m-%d"), "14:00",
             "Afternoon session on the Public Participation Bill. Focus on how the bill empowers "
             "citizen voices at the county level."),

            # Mombasa
            (bill_ids[1], "Mombasa", "Mama Ngina Waterfront, Open-Air Pavilion",
             (base + timedelta(days=16)).strftime("%Y-%m-%d"), "09:30",
             "Coast region public forum on the Appropriation Bill. "
             "Simultaneous translation in Kiswahili. Persons with disabilities accommodated."),
            (bill_ids[3], "Mombasa", "Technical University of Mombasa, Auditorium",
             (base + timedelta(days=30)).strftime("%Y-%m-%d"), "11:00",
             "Forum on the County Allocation of Revenue Bill. Focus on equitable revenue sharing "
             "for coastal counties."),

            # Nakuru
            (bill_ids[0], "Nakuru", "Afraha Stadium Conference Room",
             (base + timedelta(days=20)).strftime("%Y-%m-%d"), "10:00",
             "Rift Valley regional forum on the Finance Bill 2026. Co-hosted by Nakuru County "
             "Government and the National Assembly Finance Committee."),
            (bill_ids[2], "Nakuru", "Egerton University, Njoro Campus Hall",
             (base + timedelta(days=28)).strftime("%Y-%m-%d"), "13:00",
             "Academic and community dialogue on the Public Participation Bill. Panel includes "
             "constitutional law scholars and civic leaders."),
        ]

        for f in forums:
            cursor.execute(
                """INSERT INTO forums (bill_id, county, venue, date, time, description)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                f,
            )
        print(f"[DB] Seeded {len(forums)} forum entries.")

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# CRUD — Bills
# ---------------------------------------------------------------------------

def get_all_bills():
    """Return every bill as a list of dicts."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM bills ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_active_bills():
    """Return only bills with status = 'active'."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM bills WHERE status = 'active' ORDER BY id"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_past_bills():
    """Return bills that are passed or rejected (historical view)."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM bills WHERE status IN ('passed', 'rejected') ORDER BY upload_date DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_bill(bill_id: int):
    """Return a single bill by ID, or None."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_bill(bill_id: int, **kwargs):
    """
    Update arbitrary columns on a bill.
    Usage: update_bill(1, extracted_text='...', status='passed')
    """
    if not kwargs:
        return
    columns = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [bill_id]
    conn = get_connection()
    conn.execute(f"UPDATE bills SET {columns} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_bill(bill_id: int):
    """Delete a bill by ID."""
    conn = get_connection()
    conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# CRUD — Users
# ---------------------------------------------------------------------------

def get_user(user_id: int):
    """Return a single user by ID."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(name: str, county: str = "", preferred_language: str = "en"):
    """Insert a new user and return their ID."""
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO users (name, county, preferred_language) VALUES (?, ?, ?)",
        (name, county, preferred_language),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


def update_user(user_id: int, **kwargs):
    """Update arbitrary columns on a user."""
    if not kwargs:
        return
    columns = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [user_id]
    conn = get_connection()
    conn.execute(f"UPDATE users SET {columns} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_user(user_id: int):
    """Delete a user by ID."""
    conn = get_connection()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# CRUD — Interactions
# ---------------------------------------------------------------------------

def log_interaction(user_id: int, bill_id: int, action: str,
                    query_text: str = "", response_text: str = "",
                    language: str = "en"):
    """Record a user interaction for the recommendation engine."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO interactions (user_id, bill_id, action, query_text, response_text, language)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, bill_id, action, query_text, response_text, language),
    )
    conn.commit()
    conn.close()


def get_user_interactions(user_id: int, limit: int = 50):
    """
    Fetch the most recent interactions for a user.
    Used by the recommendation engine to understand user interests.
    """
    conn = get_connection()
    rows = conn.execute(
        """SELECT i.*, b.title AS bill_title, b.category AS bill_category
           FROM interactions i
           LEFT JOIN bills b ON i.bill_id = b.id
           WHERE i.user_id = ?
           ORDER BY i.timestamp DESC
           LIMIT ?""",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_interactions():
    """Return all interactions (admin view)."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM interactions ORDER BY timestamp DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# CRUD — Feedback
# ---------------------------------------------------------------------------

def add_feedback(user_id: int, bill_id: int, stance: str, comment: str = ""):
    """Submit citizen feedback on a bill."""
    conn = get_connection()
    conn.execute(
        "INSERT INTO feedback (user_id, bill_id, stance, comment) VALUES (?, ?, ?, ?)",
        (user_id, bill_id, stance, comment),
    )
    conn.commit()
    conn.close()


def get_bill_feedback(bill_id: int):
    """Get all feedback entries for a specific bill."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT f.*, u.name AS user_name
           FROM feedback f
           LEFT JOIN users u ON f.user_id = u.id
           WHERE f.bill_id = ?
           ORDER BY f.timestamp DESC""",
        (bill_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_feedback(limit: int = 100):
    """Get all feedback entries across all bills."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT f.*, u.name AS user_name, b.title AS bill_title
           FROM feedback f
           LEFT JOIN users u ON f.user_id = u.id
           LEFT JOIN bills b ON f.bill_id = b.id
           ORDER BY f.timestamp DESC
           LIMIT ?""",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]



def get_feedback_summary(bill_id: int):
    """Return aggregated stance counts for a bill."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT stance, COUNT(*) as count
           FROM feedback WHERE bill_id = ?
           GROUP BY stance""",
        (bill_id,),
    ).fetchall()
    conn.close()
    summary = {"support": 0, "oppose": 0, "neutral": 0}
    for r in rows:
        summary[r["stance"]] = r["count"]
    return summary


def delete_feedback(feedback_id: int):
    """Delete a single feedback entry."""
    conn = get_connection()
    conn.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# CRUD — Forums
# ---------------------------------------------------------------------------

def get_forums(county: str = None):
    """
    Return forum entries. Optionally filter by county (case-insensitive).
    """
    conn = get_connection()
    if county:
        rows = conn.execute(
            """SELECT f.*, b.title AS bill_title
               FROM forums f
               LEFT JOIN bills b ON f.bill_id = b.id
               WHERE LOWER(f.county) = LOWER(?)
               ORDER BY f.date, f.time""",
            (county,),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT f.*, b.title AS bill_title
               FROM forums f
               LEFT JOIN bills b ON f.bill_id = b.id
               ORDER BY f.date, f.time"""
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_forum(bill_id: int, county: str, venue: str,
                 date: str, time: str, description: str = ""):
    """Insert a new forum entry."""
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO forums (bill_id, county, venue, date, time, description)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (bill_id, county, venue, date, time, description),
    )
    conn.commit()
    forum_id = cursor.lastrowid
    conn.close()
    return forum_id


def delete_forum(forum_id: int):
    """Delete a forum entry."""
    conn = get_connection()
    conn.execute("DELETE FROM forums WHERE id = ?", (forum_id,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    init_db()
    seed_bills()
    seed_demo_data()
    print("[DB] Bills:", [b["title"] for b in get_all_bills()])
    print("[DB] Forums:", len(get_forums()), "entries")
    print("[DB] User:", get_user(1))
