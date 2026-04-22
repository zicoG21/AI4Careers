"""Database module for AI4Careers - SQLite storage for users, resumes, and career fair data."""

import os;
import sqlite3;
import from uuid { uuid4 }
import from datetime { datetime }

glob DB_PATH: str = os.path.join(".jac", "data", "ai4careers.db");

"""Get a connection to the database."""
def _conn() -> sqlite3.Connection {
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True);
    conn = sqlite3.connect(DB_PATH);
    conn.row_factory = sqlite3.Row;
    conn.execute("PRAGMA journal_mode=WAL");
    conn.execute("PRAGMA foreign_keys=ON");
    return conn;
}

"""Initialize database tables."""
def init_db() -> None {
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
        sponsorship_flag TEXT DEFAULT 'No',
        sponsorship_status TEXT DEFAULT 'No',
        regions TEXT DEFAULT '[]',
        accepts_hardcopy INTEGER DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    )"""
    );

    # Migration: add new columns if they don't exist
    existing_company_cols = [col["name"] for col in c.execute("PRAGMA table_info(companies)").fetchall()];
    if "sponsorship_flag" not in existing_company_cols {
        c.execute("ALTER TABLE companies ADD COLUMN sponsorship_flag TEXT DEFAULT 'No'");
    }
    if "sponsorship_status" not in existing_company_cols {
        c.execute("ALTER TABLE companies ADD COLUMN sponsorship_status TEXT DEFAULT 'No'");
    }

    # Roles table
    c.execute(
        """CREATE TABLE IF NOT EXISTS roles (
        role_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        company_id TEXT DEFAULT '',
        title TEXT NOT NULL,
        category TEXT DEFAULT '',
        location TEXT DEFAULT '',
        work_mode TEXT DEFAULT '',
        sponsorship TEXT DEFAULT 'Unknown',
        description TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        role_source_url TEXT DEFAULT '',
        role_last_checked TEXT DEFAULT '',
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    )"""
    );

    # Migration: add new role columns if they don't exist
    existing_role_cols = [col["name"] for col in c.execute("PRAGMA table_info(roles)").fetchall()];
    if "company_id" not in existing_role_cols {
        c.execute("ALTER TABLE roles ADD COLUMN company_id TEXT DEFAULT ''");
    }
    if "role_source_url" not in existing_role_cols {
        c.execute("ALTER TABLE roles ADD COLUMN role_source_url TEXT DEFAULT ''");
    }
    if "role_last_checked" not in existing_role_cols {
        c.execute("ALTER TABLE roles ADD COLUMN role_last_checked TEXT DEFAULT ''");
    }

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

    # Resume versions table (rich structured resume data from Resume Telling)
    c.execute(
        """CREATE TABLE IF NOT EXISTS resume_versions (
        rv_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        version_name TEXT NOT NULL DEFAULT 'My Resume',
        label TEXT NOT NULL DEFAULT 'general',
        company_tag TEXT NOT NULL DEFAULT 'Other',
        file_name TEXT NOT NULL DEFAULT 'resume.txt',
        raw_text TEXT DEFAULT '',
        parsed_data TEXT DEFAULT '{}',
        section_order TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )"""
    );

    rv_cols = [col["name"] for col in c.execute("PRAGMA table_info(resume_versions)").fetchall()];
    if "company_tag" not in rv_cols {
        c.execute(
            "ALTER TABLE resume_versions ADD COLUMN company_tag TEXT NOT NULL DEFAULT 'Other'"
        );
    }

    # Experiences table (for BQ story prep)
    c.execute(
        """CREATE TABLE IF NOT EXISTS experiences (
        exp_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        dates TEXT DEFAULT '',
        location TEXT DEFAULT '',
        bullets TEXT DEFAULT '[]',
        description TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )"""
    );

    # Stories table (STAR BQ stories linked to experiences)
    c.execute(
        """CREATE TABLE IF NOT EXISTS stories (
        story_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exp_id TEXT NOT NULL,
        title TEXT NOT NULL,
        star_data TEXT DEFAULT '{}',
        user_notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (exp_id) REFERENCES experiences(exp_id) ON DELETE CASCADE
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
        "work_authorization": json.loads(row["work_authorization"])
            if row["work_authorization"].startswith('[')
            else [row["work_authorization"]] if row["work_authorization"] else [],
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
        "work_authorization": json.loads(row["work_authorization"])
            if row["work_authorization"].startswith('[')
            else [row["work_authorization"]] if row["work_authorization"] else [],
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

    # Check legacy resumes table
    legacy = conn.execute(
        """SELECT * FROM resumes WHERE user_id = ?
           ORDER BY uploaded_at DESC LIMIT 1""",
        (user_id, )
    ).fetchone();

    # Check Resume Lab versions table
    rv = conn.execute(
        """SELECT rv_id, version_name, file_name, raw_text, parsed_data, updated_at
           FROM resume_versions WHERE user_id = ?
           ORDER BY updated_at DESC LIMIT 1""",
        (user_id, )
    ).fetchone();
    conn.close();

    # Pick whichever was updated most recently
    use_rv = False;
    if legacy is None and rv is None {
        return None;
    }
    if legacy is None and rv is not None {
        use_rv = True;
    } elif legacy is not None and rv is not None {
        if rv["updated_at"] > legacy["uploaded_at"] {
            use_rv = True;
        }
    }

    if use_rv {
        parsed = json.loads(rv["parsed_data"]) if rv["parsed_data"] else {};
        if not isinstance(parsed, dict) {
            parsed = {};
        }
        skills: list = [];
        bullets: list = [];
        projects: list = [];
        education: list = [];
        if "skills" in parsed {
            sk_raw = parsed["skills"];
            skill_iter: list = [];
            if isinstance(sk_raw, list) {
                skill_iter = sk_raw;
            } elif isinstance(sk_raw, str) {
                s0 = sk_raw.strip();
                if s0 != "" {
                    skill_iter = [s0];
                }
            }
            for cat in skill_iter {
                # Resume Lab uses a flat list of skill strings; legacy data may use { "items": [...] }.
                if isinstance(cat, dict) and "items" in cat {
                    skills = skills + cat["items"];
                } elif isinstance(cat, str) {
                    s = cat.strip();
                    if s != "" {
                        skills.append(s);
                    }
                }
            }
        }
        if "experience" in parsed and isinstance(parsed["experience"], list) {
            for exp in parsed["experience"] {
                if not isinstance(exp, dict) {
                    continue;
                }
                if "bullets" in exp and isinstance(exp.get("bullets"), list) {
                    for b in exp["bullets"] {
                        if isinstance(b, dict) {
                            bullets.append(b["text"] if "text" in b else str(b));
                        } else {
                            bullets.append(str(b));
                        }
                    }
                }
            }
        }
        if "projects" in parsed and isinstance(parsed["projects"], list) {
            for proj in parsed["projects"] {
                if not isinstance(proj, dict) {
                    continue;
                }
                if "bullets" in proj and isinstance(proj.get("bullets"), list) {
                    for b in proj["bullets"] {
                        if isinstance(b, dict) {
                            projects.append(b["text"] if "text" in b else str(b));
                        } else {
                            projects.append(str(b));
                        }
                    }
                }
            }
        }
        if "education" in parsed and isinstance(parsed["education"], list) {
            for edu in parsed["education"] {
                if isinstance(edu, dict) {
                    education.append(edu.get("institution", "") + " " + edu.get("degree", ""));
                }
            }
        }
        raw = rv["raw_text"] if rv["raw_text"] else "";
        if raw == "" and parsed {
            # Reconstruct raw text from parsed data for LLM consumption
            parts: list = [];
            if "name" in parsed { parts.append(parsed["name"]); }
            if "summary" in parsed { parts.append(parsed["summary"]); }
            for exp in parsed.get("experience", []) {
                if not isinstance(exp, dict) {
                    continue;
                }
                parts.append(exp.get("company", "") + " - " + exp.get("role", exp.get("title", "")));
                bullets_exp = exp.get("bullets", []);
                if isinstance(bullets_exp, list) {
                    for b in bullets_exp {
                        if isinstance(b, dict) {
                            parts.append("- " + (b["text"] if "text" in b else str(b)));
                        } else {
                            parts.append("- " + str(b));
                        }
                    }
                }
            }
            for proj in parsed.get("projects", []) {
                if not isinstance(proj, dict) {
                    continue;
                }
                parts.append(proj.get("name", ""));
                bullets_proj = proj.get("bullets", []);
                if isinstance(bullets_proj, list) {
                    for b in bullets_proj {
                        if isinstance(b, dict) {
                            parts.append("- " + (b["text"] if "text" in b else str(b)));
                        } else {
                            parts.append("- " + str(b));
                        }
                    }
                }
            }
            raw = "\n".join(parts);
        }
        return {
            "resume_id": rv["rv_id"],
            "filename": rv["file_name"],
            "uploaded_at": rv["updated_at"],
            "raw_text": raw,
            "pdf_data": "",
            "skills": skills,
            "experience_bullets": bullets,
            "projects": projects,
            "education": education
        };
    }

    return {
        "resume_id": legacy["resume_id"],
        "filename": legacy["filename"],
        "uploaded_at": legacy["uploaded_at"],
        "raw_text": legacy["raw_text"],
        "pdf_data": legacy["pdf_data"],
        "skills": json.loads(legacy["skills"]),
        "experience_bullets": json.loads(legacy["experience_bullets"]),
        "projects": json.loads(legacy["projects"]),
        "education": json.loads(legacy["education"])
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
        } for row in rows
    ];
}

"""Delete a resume."""
def delete_resume(resume_id: str, user_id: str) -> bool {
    conn = _conn();
    result = conn.execute(
        "DELETE FROM resumes WHERE resume_id = ? AND user_id = ?", (resume_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

# ========== Event/Company/Role Operations ==========
"""Get all events."""
def get_all_events() -> list {
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
    params: list = [event_id];

    fair_day = filters.get("fair_day", "");
    if fair_day != "" {
        query += " AND fair_day LIKE ?";
        params.append("%" + fair_day + "%");
    }

    position_type = filters.get("position_type", "");
    if position_type != "" {
        query += " AND positions LIKE ?";
        params.append("%" + position_type + "%");
    }

    sponsors = filters.get("sponsors", "");
    if sponsors != "" {
        query += " AND sponsorship_flag = ?";
        params.append(sponsors);
    } elif filters.get("needs_sponsorship", False) {
        query += " AND sponsorship_flag IN ('Yes', 'Maybe')";
    }

    region = filters.get("region", "");
    if region != "" {
        query += " AND regions LIKE ?";
        params.append("%" + region + "%");
    }

    major_search = filters.get("major_search", "");
    if major_search != "" {
        query += " AND majors LIKE ?";
        params.append("%" + major_search + "%");
    }

    search = filters.get("search", "");
    if search != "" {
        query += " AND (name LIKE ? OR description LIKE ?)";
        params.append("%" + search + "%");
        params.append("%" + search + "%");
    }

    query += " ORDER BY name";
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
                "website": row["website"],
                "careers_url": row["careers_url"],
                "positions": json.loads(row["positions"]),
                "degree_levels": json.loads(row["degree_levels"]),
                "academic_years": json.loads(row["academic_years"]),
                "majors": json.loads(row["majors"]),
                "sponsorship": json.loads(row["sponsorship"]),
                "sponsorship_notes": row["sponsorship_notes"],
                "sponsorship_flag": row["sponsorship_flag"],
                "sponsorship_status": row["sponsorship_status"],
                "regions": json.loads(row["regions"]),
                "accepts_hardcopy": bool(row["accepts_hardcopy"]),
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
        "sponsorship_flag": row["sponsorship_flag"],
        "sponsorship_status": row["sponsorship_status"],
        "regions": json.loads(row["regions"]),
        "accepts_hardcopy": bool(row["accepts_hardcopy"])
    };
}

"""Get roles by event with optional filters."""
def get_roles(event_id: str, filters: dict = {}) -> list {
    import json;
    conn = _conn();

    query = "SELECT * FROM roles WHERE event_id = ?";
    params: list = [event_id];

    company_id = filters.get("company_id", "");
    if company_id != "" {
        query += " AND company_id = ?";
        params.append(company_id);
    }

    location = filters.get("location", "");
    if location != "" {
        query += " AND location LIKE ?";
        params.append("%" + location + "%");
    }

    work_mode = filters.get("work_mode", "");
    if work_mode != "" {
        query += " AND work_mode LIKE ?";
        params.append("%" + work_mode + "%");
    }

    sponsors = filters.get("sponsors", "");
    if sponsors != "" {
        query += " AND sponsorship LIKE ?";
        params.append("%" + sponsors + "%");
    } elif filters.get("needs_sponsorship", False) {
        query += " AND sponsorship NOT LIKE '%Will not%'";
    }

    search = filters.get("search", "");
    if search != "" {
        query += " AND (title LIKE ? OR description LIKE ?)";
        params.append("%" + search + "%");
        params.append("%" + search + "%");
    }

    rows = conn.execute(query, params).fetchall();
    conn.close();

    results = [];
    for row in rows {
        results.append(
            {
                "role_id": row["role_id"],
                "company_id": row["company_id"],
                "title": row["title"],
                "category": row["category"],
                "location": row["location"],
                "work_mode": row["work_mode"],
                "sponsorship": row["sponsorship"],
                "description": row["description"],
                "tags": json.loads(row["tags"]),
                "role_source_url": row["role_source_url"],
                "role_last_checked": row["role_last_checked"]
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
    return [
        {
            "company_id": row["company_id"],
            "pitch": row["pitch"],
            "saved_at": row["saved_at"]
        } for row in rows
    ];
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

"""Extract entire data from a specific company."""
def get_companies_full(event_id: str) -> list {
    import json;
    conn = _conn();
    rows = conn.execute(
        "SELECT * FROM companies WHERE event_id = ?", (event_id, )
    ).fetchall();
    conn.close();

    results = [];
    for row in rows {
        results.append(
            {
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
                "sponsorship_flag": row["sponsorship_flag"],
                "sponsorship_status": row["sponsorship_status"],
                "regions": json.loads(row["regions"]),
                "accepts_hardcopy": bool(row["accepts_hardcopy"])
            }
        );
    }
    return results;
}


# ========== Resume Version Operations (Resume Telling) ==========
"""Create a new resume version."""
def create_resume_version(
    user_id: str, version_name: str, label: str, company_tag: str, file_name: str,
    raw_text: str, parsed_data: str, section_order: str
) -> str {
    conn = _conn();
    rv_id = "rv_" + str(uuid4())[:8];
    now = datetime.now().isoformat();
    conn.execute(
        """INSERT INTO resume_versions
           (rv_id, user_id, version_name, label, company_tag, file_name, raw_text, parsed_data, section_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (rv_id, user_id, version_name, label, company_tag, file_name, raw_text, parsed_data, section_order, now, now)
    );
    conn.commit();
    conn.close();
    return rv_id;
}

"""List all resume versions for a user."""
def list_resume_versions(user_id: str) -> list {
    import json;
    conn = _conn();
    rows = conn.execute(
        """SELECT rv_id, version_name, label, company_tag, file_name, parsed_data, created_at, updated_at
           FROM resume_versions WHERE user_id = ? ORDER BY updated_at DESC""",
        (user_id, )
    ).fetchall();
    conn.close();
    results = [];
    for row in rows {
        parsed = json.loads(row["parsed_data"]);
        results.append({
            "resume_id": row["rv_id"],
            "version_name": row["version_name"],
            "label": row["label"],
            "company_tag": row["company_tag"] if row["company_tag"] else "Other",
            "file_name": row["file_name"],
            "name": parsed.get("name", ""),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        });
    }
    return results;
}

"""Get full resume version by ID."""
def get_resume_version(rv_id: str, user_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute(
        "SELECT * FROM resume_versions WHERE rv_id = ? AND user_id = ?",
        (rv_id, user_id)
    ).fetchone();
    conn.close();
    if row is None { return None; }
    ct = "Other";
    try {
        x = row["company_tag"];
        if x { ct = x; }
    } except Exception as _e {
        ct = "Other";
    }
    return {
        "resume_id": row["rv_id"],
        "version_name": row["version_name"],
        "label": row["label"],
        "company_tag": ct,
        "file_name": row["file_name"],
        "raw_text": row["raw_text"],
        "parsed": json.loads(row["parsed_data"]),
        "section_order": json.loads(row["section_order"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"]
    };
}

"""Update parsed data for a resume version."""
def update_resume_version_parsed(rv_id: str, user_id: str, parsed_data: str) -> bool {
    conn = _conn();
    now = datetime.now().isoformat();
    result = conn.execute(
        "UPDATE resume_versions SET parsed_data = ?, updated_at = ? WHERE rv_id = ? AND user_id = ?",
        (parsed_data, now, rv_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Update section order for a resume version."""
def update_resume_version_section_order(rv_id: str, user_id: str, section_order: str) -> bool {
    conn = _conn();
    now = datetime.now().isoformat();
    result = conn.execute(
        "UPDATE resume_versions SET section_order = ?, updated_at = ? WHERE rv_id = ? AND user_id = ?",
        (section_order, now, rv_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Update version name, area label, and/or company tag."""
def update_resume_version_meta(
    rv_id: str, user_id: str, version_name: str, label: str, company_tag: str
) -> bool {
    conn = _conn();
    now = datetime.now().isoformat();
    result = conn.execute(
        "UPDATE resume_versions SET version_name = ?, label = ?, company_tag = ?, updated_at = ? WHERE rv_id = ? AND user_id = ?",
        (version_name, label, company_tag, now, rv_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Delete a resume version."""
def delete_resume_version(rv_id: str, user_id: str) -> bool {
    conn = _conn();
    result = conn.execute(
        "DELETE FROM resume_versions WHERE rv_id = ? AND user_id = ?", (rv_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

# ========== Experience Operations ==========
"""Create an experience."""
def create_experience(
    user_id: str, company: str, role: str, dates: str,
    location: str, bullets: str, description: str
) -> str {
    conn = _conn();
    exp_id = "exp_" + str(uuid4())[:8];
    now = datetime.now().isoformat();
    conn.execute(
        """INSERT INTO experiences (exp_id, user_id, company, role, dates, location, bullets, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (exp_id, user_id, company, role, dates, location, bullets, description, now)
    );
    conn.commit();
    conn.close();
    return exp_id;
}

"""List all experiences for a user."""
def list_experiences(user_id: str) -> list {
    import json;
    conn = _conn();
    rows = conn.execute(
        "SELECT * FROM experiences WHERE user_id = ? ORDER BY created_at DESC",
        (user_id, )
    ).fetchall();
    # Count stories per experience
    story_counts = {};
    srows = conn.execute(
        "SELECT exp_id, COUNT(*) as cnt FROM stories WHERE user_id = ? GROUP BY exp_id",
        (user_id, )
    ).fetchall();
    for sr in srows {
        story_counts[sr["exp_id"]] = sr["cnt"];
    }
    conn.close();
    results = [];
    for row in rows {
        results.append({
            "exp_id": row["exp_id"],
            "company": row["company"],
            "role": row["role"],
            "dates": row["dates"],
            "location": row["location"],
            "bullets": json.loads(row["bullets"]),
            "description": row["description"],
            "story_count": story_counts.get(row["exp_id"], 0),
            "created_at": row["created_at"]
        });
    }
    return results;
}

"""Update an experience."""
def update_experience(
    exp_id: str, user_id: str, company: str, role: str,
    dates: str, location: str, bullets: str, description: str
) -> bool {
    conn = _conn();
    result = conn.execute(
        """UPDATE experiences SET company=?, role=?, dates=?, location=?, bullets=?, description=?
           WHERE exp_id=? AND user_id=?""",
        (company, role, dates, location, bullets, description, exp_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Delete an experience and its stories."""
def delete_experience(exp_id: str, user_id: str) -> bool {
    conn = _conn();
    conn.execute("DELETE FROM stories WHERE exp_id = ? AND user_id = ?", (exp_id, user_id));
    result = conn.execute("DELETE FROM experiences WHERE exp_id = ? AND user_id = ?", (exp_id, user_id));
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Get a single experience."""
def get_experience(exp_id: str, user_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute(
        "SELECT * FROM experiences WHERE exp_id = ? AND user_id = ?",
        (exp_id, user_id)
    ).fetchone();
    conn.close();
    if row is None { return None; }
    return {
        "exp_id": row["exp_id"],
        "company": row["company"],
        "role": row["role"],
        "dates": row["dates"],
        "location": row["location"],
        "bullets": json.loads(row["bullets"]),
        "description": row["description"],
        "created_at": row["created_at"]
    };
}

# ========== Story Operations ==========
"""Create a story."""
def create_story(
    user_id: str, exp_id: str, title: str, star_data: str, user_notes: str
) -> str {
    conn = _conn();
    story_id = "st_" + str(uuid4())[:8];
    now = datetime.now().isoformat();
    conn.execute(
        """INSERT INTO stories (story_id, user_id, exp_id, title, star_data, user_notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (story_id, user_id, exp_id, title, star_data, user_notes, now, now)
    );
    conn.commit();
    conn.close();
    return story_id;
}

"""List stories, optionally filtered by exp_id."""
def list_stories(user_id: str, exp_id: str = "") -> list {
    import json;
    conn = _conn();
    if exp_id and exp_id != "" {
        rows = conn.execute(
            """SELECT s.*, e.company as exp_company, e.role as exp_role
               FROM stories s JOIN experiences e ON s.exp_id = e.exp_id
               WHERE s.user_id = ? AND s.exp_id = ? ORDER BY s.created_at DESC""",
            (user_id, exp_id)
        ).fetchall();
    } else {
        rows = conn.execute(
            """SELECT s.*, e.company as exp_company, e.role as exp_role
               FROM stories s JOIN experiences e ON s.exp_id = e.exp_id
               WHERE s.user_id = ? ORDER BY s.created_at DESC""",
            (user_id, )
        ).fetchall();
    }
    conn.close();
    results = [];
    for row in rows {
        star = json.loads(row["star_data"]);
        results.append({
            "story_id": row["story_id"],
            "exp_id": row["exp_id"],
            "exp_company": row["exp_company"],
            "exp_role": row["exp_role"],
            "title": row["title"],
            "themes": star.get("themes", []),
            "situation": star.get("situation", ""),
            "user_notes": row["user_notes"],
            "created_at": row["created_at"]
        });
    }
    return results;
}

"""Get a single story with full STAR data."""
def get_story(story_id: str, user_id: str) -> dict | None {
    import json;
    conn = _conn();
    row = conn.execute(
        """SELECT s.*, e.company as exp_company, e.role as exp_role
           FROM stories s JOIN experiences e ON s.exp_id = e.exp_id
           WHERE s.story_id = ? AND s.user_id = ?""",
        (story_id, user_id)
    ).fetchone();
    conn.close();
    if row is None { return None; }
    return {
        "story_id": row["story_id"],
        "exp_id": row["exp_id"],
        "exp_company": row["exp_company"],
        "exp_role": row["exp_role"],
        "title": row["title"],
        "star": json.loads(row["star_data"]),
        "user_notes": row["user_notes"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"]
    };
}

"""Update a story's title and/or notes."""
def update_story(story_id: str, user_id: str, title: str, user_notes: str) -> bool {
    conn = _conn();
    now = datetime.now().isoformat();
    sets = ["updated_at = ?"];
    params: list = [now];
    if title and title != "" {
        sets.append("title = ?");
        params.append(title);
    }
    if user_notes is not None {
        sets.append("user_notes = ?");
        params.append(user_notes);
    }
    params.append(story_id);
    params.append(user_id);
    result = conn.execute(
        f"UPDATE stories SET {', '.join(sets)} WHERE story_id = ? AND user_id = ?",
        params
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Delete a story."""
def delete_story(story_id: str, user_id: str) -> bool {
    conn = _conn();
    result = conn.execute(
        "DELETE FROM stories WHERE story_id = ? AND user_id = ?", (story_id, user_id)
    );
    conn.commit();
    conn.close();
    return result.rowcount > 0;
}

"""Delete all roles, companies, and the event record for a given event_id."""
def clear_event_import(event_id: str) {
    conn = _conn();
    conn.execute("DELETE FROM roles WHERE event_id = ?", (event_id,));
    conn.execute("DELETE FROM companies WHERE event_id = ?", (event_id,));
    conn.execute("DELETE FROM events WHERE event_id = ?", (event_id,));
    conn.commit();
    conn.close();
}

"""Insert a new event record."""
def insert_event(event_doc: dict) {
    conn = _conn();
    conn.execute(
        "INSERT INTO events (event_id, name, term, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
        (event_doc['event_id'], event_doc['name'], event_doc['term'],
         event_doc['start_date'], event_doc['end_date'])
    );
    conn.commit();
    conn.close();
}

"""Insert or replace a company record (upsert by company_id)."""
def upsert_company(company_doc: dict) {
    import json;
    conn = _conn();
    conn.execute(
        """INSERT OR REPLACE INTO companies
           (company_id, event_id, name, icon_url, fair_day, is_multi_day, website,
            careers_url, description, positions, degree_levels, academic_years, majors,
            sponsorship, sponsorship_notes, sponsorship_flag, sponsorship_status,
            regions, accepts_hardcopy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            company_doc['company_id'], company_doc['event_id'], company_doc['name'],
            company_doc.get('icon_url', ''), company_doc.get('fair_day', ''),
            company_doc.get('is_multi_day', 0), company_doc.get('website', ''),
            company_doc.get('careers_url', ''), company_doc.get('description', ''),
            json.dumps(company_doc.get('positions', [])),
            json.dumps(company_doc.get('degree_levels', [])),
            json.dumps(company_doc.get('academic_years', [])),
            json.dumps(company_doc.get('majors', [])),
            json.dumps(company_doc.get('sponsorship', [])),
            company_doc.get('sponsorship_notes', ''),
            company_doc.get('sponsorship_flag', 'No'),
            company_doc.get('sponsorship_status', 'No'),
            json.dumps(company_doc.get('regions', [])),
            company_doc.get('accepts_hardcopy', 0)
        )
    );
    conn.commit();
    conn.close();
}

"""Insert a new role record."""
def insert_role(role_doc: dict) {
    import json;
    conn = _conn();
    conn.execute(
        """INSERT INTO roles
           (role_id, event_id, company_id, title, category, location, work_mode,
            sponsorship, description, tags, role_source_url, role_last_checked)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            role_doc['role_id'], role_doc['event_id'], role_doc.get('company_id', ''),
            role_doc['title'], role_doc.get('category', ''), role_doc.get('location', ''),
            role_doc.get('work_mode', ''), role_doc.get('sponsorship', 'Unknown'),
            role_doc.get('description', ''), json.dumps(role_doc.get('tags', [])),
            role_doc.get('role_source_url', ''), role_doc.get('role_last_checked', '')
        )
    );
    conn.commit();
    conn.close();
}

# Auto-initialize database on module load
glob _db_initialized: bool = (lambda : (init_db(), True)[1])();
