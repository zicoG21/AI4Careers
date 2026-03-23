"""Database module for AI4Careers - SQLite storage for users, resumes, and career fair data."""

import os;
import sqlite3;
import from uuid { uuid4 }
import from datetime { datetime }

glob DB_PATH: str = os.path.join(".jac", "data", "ai4careers.db");

"""Get a connection to the database."""
def _conn -> sqlite3.Connection {
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True);
    conn = sqlite3.connect(DB_PATH);
    conn.row_factory = sqlite3.Row;
    conn.execute("PRAGMA journal_mode=WAL");
    conn.execute("PRAGMA foreign_keys=ON");
    return conn;
}

"""Initialize database tables."""
def init_db -> None {
    conn = _conn();
    c = conn.cursor();

    # Users table
    c.execute(
        """CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        needs_sponsorship INTEGER DEFAULT 0,
        work_authorization TEXT DEFAULT '[]',
        preferred_locations TEXT DEFAULT '[]',
        work_modes TEXT DEFAULT '[]',
        role_types TEXT DEFAULT '[]'
    )"""
    );

    # Resumes table
    c.execute(
        """CREATE TABLE IF NOT EXISTS resumes (
        resume_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        raw_text TEXT DEFAULT '',
        pdf_data TEXT DEFAULT '',
        skills TEXT DEFAULT '[]',
        experience_bullets TEXT DEFAULT '[]',
        projects TEXT DEFAULT '[]',
        education TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )"""
    );

    # Backward-compatible migration for older databases
    existing_columns = c.execute("PRAGMA table_info(resumes)").fetchall();
    existing_col_names = [col["name"] for col in existing_columns];

    if "raw_text" not in existing_col_names {
        c.execute("ALTER TABLE resumes ADD COLUMN raw_text TEXT DEFAULT ''");
    }
    if "pdf_data" not in existing_col_names {
        c.execute("ALTER TABLE resumes ADD COLUMN pdf_data TEXT DEFAULT ''");
    }

    # Events table
    c.execute(
        """CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        term TEXT,
        start_date TEXT,
        end_date TEXT
    )"""
    );

    # Companies table
    c.execute(
        """CREATE TABLE IF NOT EXISTS companies (
        company_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon_url TEXT DEFAULT '',
        fair_day TEXT DEFAULT '',
        is_multi_day INTEGER DEFAULT 0,
        website TEXT DEFAULT '',
        careers_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        positions TEXT DEFAULT '[]',
        degree_levels TEXT DEFAULT '[]',
        academic_years TEXT DEFAULT '[]',
        majors TEXT DEFAULT '[]',
        sponsorship TEXT DEFAULT '[]',
        sponsorship_notes TEXT DEFAULT '',
        regions TEXT DEFAULT '[]',
        accepts_hardcopy INTEGER DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    )"""
    );

    # Roles table
    c.execute(
        """CREATE TABLE IF NOT EXISTS roles (
        role_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT DEFAULT '',
        location TEXT DEFAULT '',
        work_mode TEXT DEFAULT '',
        sponsorship TEXT DEFAULT 'Unknown',
        description TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    )"""
    );

    # Fit scores table
    c.execute(
        """CREATE TABLE IF NOT EXISTS fit_scores (
        fit_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        matched_skills TEXT DEFAULT '[]',
        missing_skills TEXT DEFAULT '[]',
        top_keywords TEXT DEFAULT '[]',
        explanation TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
    )"""
    );

    # Saved companies table
    c.execute(
        """CREATE TABLE IF NOT EXISTS saved_companies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        pitch TEXT DEFAULT '',
        saved_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE(user_id, company_id, event_id)
    )"""
    );

    # Artifacts table (AI-generated content)
    c.execute(
        """CREATE TABLE IF NOT EXISTS artifacts (
        artifact_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        role_id TEXT DEFAULT '',
        content TEXT DEFAULT '',
        structured TEXT DEFAULT '{}',
        model TEXT DEFAULT '',
        prompt_version TEXT DEFAULT 'v0',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )"""
    );

    conn.commit();
    conn.close();
}

# ========== User Operations ==========
"""Create a new user."""
def create_user(email: str, password_hash: str, name: str) -> str {
    conn = _conn();
    user_id = "u_" + str(uuid4())[:8];
    created_at = datetime.now().isoformat();

    conn.execute(
        """INSERT INTO users (user_id, email, password_hash, name, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, email, password_hash, name, created_at)
    );
    conn.commit();
    conn.close();
    return user_id;
}

"""Get user by email."""
def get_user_by_email(email: str) -> dict | None {
    conn = _conn();
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email, )).fetchone();
    conn.close();

    if row is None {
        return None;
    }

    import json;
    return {
        "user_id": row["user_id"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "name": row["name"],
        "created_at": row["created_at"],
        "needs_sponsorship": bool(row["needs_sponsorship"]),
        "work_authorization": json.loads(row["work_authorization"]) if row["work_authorization"].startswith('[') else [row["work_authorization"]] if row["work_authorization"] else [],
        "preferred_locations": json.loads(row["preferred_locations"]),
        "work_modes": json.loads(row["work_modes"]),
        "role_types": json.loads(row["role_types"])
    };
}

"""Get user by ID."""
def get_user_by_id(user_id: str) -> dict | None {
    conn = _conn();
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id, )).fetchone();
    conn.close();

    if row is None {
        return None;
    }

    import json;
    return {
        "user_id": row["user_id"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "name": row["name"],
        "created_at": row["created_at"],
        "needs_sponsorship": bool(row["needs_sponsorship"]),
        "work_authorization": json.loads(row["work_authorization"]) if row["work_authorization"].startswith('[') else [row["work_authorization"]] if row["work_authorization"] else [],
        "preferred_locations": json.loads(row["preferred_locations"]),
        "work_modes": json.loads(row["work_modes"]),
        "role_types": json.loads(row["role_types"])
    };
}

"""Update user preferences."""
def update_user_preferences(
    user_id: str,
    needs_sponsorship: bool,
    work_authorization: list,
    preferred_locations: list,
    work_modes: list,
    role_types: list
) -> bool {
    import json;
    conn = _conn();
    conn.execute(
        """UPDATE users SET
           needs_sponsorship = ?,
           work_authorization = ?,
           preferred_locations = ?,
           work_modes = ?,
           role_types = ?
           WHERE user_id = ?""",
        (
            int(needs_sponsorship),
            json.dumps(work_authorization),
            json.dumps(preferred_locations),
            json.dumps(work_modes),
            json.dumps(role_types),
            user_id
        )
    );
    conn.commit();
    conn.close();
    return True;
}

# ========== Resume Operations ==========
"""Create a new resume."""
def create_resume(
    user_id: str,
    filename: str,
    raw_text: str,
    pdf_data: str,
    skills: list,
    experience_bullets: list,
    projects: list,
    education: dict
) -> str {
    import json;
    conn = _conn();
    resume_id = "r_" + str(uuid4())[:8];
    uploaded_at = datetime.now().isoformat();

    conn.execute(
        """INSERT INTO resumes
           (resume_id, user_id, filename, uploaded_at, raw_text, pdf_data, skills, experience_bullets, projects, education)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            resume_id,
            user_id,
            filename,
            uploaded_at,
            raw_text,
            pdf_data,
            json.dumps(skills),
            json.dumps(experience_bullets),
            json.dumps(projects),
            json.dumps(education)
        )
    );
    conn.commit();
    conn.close();
    return resume_id;
}

"""Get resume by ID."""
def get_resume(resume_id: str, user_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute(
        "SELECT * FROM resumes WHERE resume_id = ? AND user_id = ?",
        (resume_id, user_id)
    ).fetchone();
    conn.close();

    if row is None {
        return None;
    }

    return {
        "resume_id": row["resume_id"],
        "filename": row["filename"],
        "uploaded_at": row["uploaded_at"],
        "raw_text": row["raw_text"],
        "pdf_data": row["pdf_data"],
        "skills": json.loads(row["skills"]),
        "experience_bullets": json.loads(row["experience_bullets"]),
        "projects": json.loads(row["projects"]),
        "education": json.loads(row["education"])
    };
}

"""Get latest resume for user."""
def get_latest_resume(user_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute(
        """SELECT * FROM resumes WHERE user_id = ?
           ORDER BY uploaded_at DESC LIMIT 1""",
        (user_id, )
    ).fetchone();
    conn.close();

    if row is None {
        return None;
    }

    return {
        "resume_id": row["resume_id"],
        "filename": row["filename"],
        "uploaded_at": row["uploaded_at"],
        "raw_text": row["raw_text"],
        "pdf_data": row["pdf_data"],
        "skills": json.loads(row["skills"]),
        "experience_bullets": json.loads(row["experience_bullets"]),
        "projects": json.loads(row["projects"]),
        "education": json.loads(row["education"])
    };
}

"""List all resumes for user (metadata only, no pdf_data)."""
def list_resumes(user_id: str) -> list {
    conn = _conn();
    rows = conn.execute(
        """SELECT resume_id, filename, uploaded_at, skills FROM resumes
           WHERE user_id = ? ORDER BY uploaded_at DESC""",
        (user_id, )
    ).fetchall();
    conn.close();

    import json;
    return [
        {
            "resume_id": row["resume_id"],
            "filename": row["filename"],
            "uploaded_at": row["uploaded_at"],
            "skills_count": len(json.loads(row["skills"]))
        }
        for row in rows
    ];
}

"""Delete a resume."""
def delete_resume(resume_id: str, user_id: str) -> bool {
    conn = _conn();
    result = conn.execute(
        "DELETE FROM resumes WHERE resume_id = ? AND user_id = ?",
        (resume_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

# ========== Event/Company/Role Operations ==========
"""Get all events."""
def get_all_events -> list {
    conn = _conn();
    rows = conn.execute("SELECT * FROM events").fetchall();
    conn.close();

    return [dict(row) for row in rows];
}

"""Get companies by event."""
def get_companies(event_id: str, filters: dict) -> list {
    import json;
    conn = _conn();

    query = "SELECT * FROM companies WHERE event_id = ?";
    params = [event_id];

    # Apply filters if provided
    # (simplified - can be extended)
    rows = conn.execute(query, params).fetchall();
    conn.close();

    results = [];
    for row in rows {
        results.append(
            {
                "company_id": row["company_id"],
                "name": row["name"],
                "fair_day": row["fair_day"],
                "is_multi_day": bool(row["is_multi_day"]),
                "positions": json.loads(row["positions"]),
                "degree_levels": json.loads(row["degree_levels"]),
                "sponsorship": json.loads(row["sponsorship"]),
                "regions": json.loads(row["regions"]),
                "description": row["description"][:200]
            }
        );
    }
    return results;
}

"""Get company by ID."""
def get_company(event_id: str, company_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute(
        "SELECT * FROM companies WHERE event_id = ? AND company_id = ?",
        (event_id, company_id)
    ).fetchone();
    conn.close();

    if row is None {
        return None;
    }

    return {
        "company_id": row["company_id"],
        "name": row["name"],
        "fair_day": row["fair_day"],
        "is_multi_day": bool(row["is_multi_day"]),
        "website": row["website"],
        "careers_url": row["careers_url"],
        "description": row["description"],
        "positions": json.loads(row["positions"]),
        "degree_levels": json.loads(row["degree_levels"]),
        "academic_years": json.loads(row["academic_years"]),
        "majors": json.loads(row["majors"]),
        "sponsorship": json.loads(row["sponsorship"]),
        "sponsorship_notes": row["sponsorship_notes"],
        "regions": json.loads(row["regions"]),
        "accepts_hardcopy": bool(row["accepts_hardcopy"])
    };
}

"""Get roles by event."""
def get_roles(event_id: str) -> list {
    import json;
    conn = _conn();
    rows = conn.execute("SELECT * FROM roles WHERE event_id = ?", (event_id, )).fetchall();
    conn.close();

    results = [];
    for row in rows {
        results.append(
            {
                "role_id": row["role_id"],
                "title": row["title"],
                "location": row["location"],
                "work_mode": row["work_mode"],
                "sponsorship": row["sponsorship"]
            }
        );
    }
    return results;
}

"""Get role by ID."""
def get_role(role_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute("SELECT * FROM roles WHERE role_id = ?", (role_id, )).fetchone();
    conn.close();

    if row is None {
        return None;
    }

    return {
        "role_id": row["role_id"],
        "title": row["title"],
        "category": row["category"],
        "location": row["location"],
        "work_mode": row["work_mode"],
        "sponsorship": row["sponsorship"],
        "description": row["description"],
        "tags": json.loads(row["tags"])
    };
}

# ========== Saved Companies Operations ==========
"""Save a company for a user (idempotent)."""
def save_company(user_id: str, company_id: str, event_id: str) -> bool {
    conn = _conn();
    id = "sc_" + str(uuid4())[:8];
    saved_at = datetime.now().isoformat();
    conn.execute(
        """INSERT OR IGNORE INTO saved_companies (id, user_id, company_id, event_id, saved_at)
           VALUES (?, ?, ?, ?, ?)""",
        (id, user_id, company_id, event_id, saved_at)
    );
    conn.commit();
    conn.close();
    return True;
}

"""Remove a saved company."""
def unsave_company(user_id: str, company_id: str, event_id: str) -> bool {
    conn = _conn();
    conn.execute(
        "DELETE FROM saved_companies WHERE user_id = ? AND company_id = ? AND event_id = ?",
        (user_id, company_id, event_id)
    );
    conn.commit();
    conn.close();
    return True;
}

"""List saved companies for a user, with their saved pitch if any."""
def list_saved_companies(user_id: str, event_id: str) -> list {
    conn = _conn();
    rows = conn.execute(
        "SELECT company_id, pitch, saved_at FROM saved_companies WHERE user_id = ? AND event_id = ? ORDER BY saved_at DESC",
        (user_id, event_id)
    ).fetchall();
    conn.close();
    return [{"company_id": row["company_id"], "pitch": row["pitch"], "saved_at": row["saved_at"]} for row in rows];
}

"""Save a pitch to an already-saved company."""
def save_pitch(user_id: str, company_id: str, event_id: str, pitch: str) -> bool {
    conn = _conn();
    conn.execute(
        "UPDATE saved_companies SET pitch = ? WHERE user_id = ? AND company_id = ? AND event_id = ?",
        (pitch, user_id, company_id, event_id)
    );
    conn.commit();
    conn.close();
    return True;
}

# Auto-initialize database on module load
glob _db_initialized: bool = (lambda : (init_db(), True)[1])();
