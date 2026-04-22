"""Database dispatcher — routes to db_sqlite (dev) or db_mongo (prod) based on MONGODB_URI."""

import os;
glob _USE_MONGO: bool = os.environ.get('MONGODB_URI', '') != '';

def init_db() -> None {
    if _USE_MONGO { return; }
    import from db_sqlite { init_db as _f };
    _f();
}

def create_user(email: str, password_hash: str, name: str) -> str {
    if _USE_MONGO {
        import from db_mongo { create_user as _f };
        return _f(email, password_hash, name);
    }
    import from db_sqlite { create_user as _f };
    return _f(email, password_hash, name);
}

def get_user_by_email(email: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_user_by_email as _f };
        return _f(email);
    }
    import from db_sqlite { get_user_by_email as _f };
    return _f(email);
}

def get_user_by_id(user_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_user_by_id as _f };
        return _f(user_id);
    }
    import from db_sqlite { get_user_by_id as _f };
    return _f(user_id);
}

def update_user_preferences(user_id: str, needs_sponsorship: bool, work_authorization: list,
    preferred_locations: list, work_modes: list, role_types: list) -> bool {
    if _USE_MONGO {
        import from db_mongo { update_user_preferences as _f };
        return _f(user_id, needs_sponsorship, work_authorization, preferred_locations, work_modes, role_types);
    }
    import from db_sqlite { update_user_preferences as _f };
    return _f(user_id, needs_sponsorship, work_authorization, preferred_locations, work_modes, role_types);
}

def create_resume(user_id: str, filename: str, raw_text: str, pdf_data: str,
    skills: list, experience_bullets: list, projects: list, education: dict) -> str {
    if _USE_MONGO {
        import from db_mongo { create_resume as _f };
        return _f(user_id, filename, raw_text, pdf_data, skills, experience_bullets, projects, education);
    }
    import from db_sqlite { create_resume as _f };
    return _f(user_id, filename, raw_text, pdf_data, skills, experience_bullets, projects, education);
}

def get_resume(resume_id: str, user_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_resume as _f };
        return _f(resume_id, user_id);
    }
    import from db_sqlite { get_resume as _f };
    return _f(resume_id, user_id);
}

def get_latest_resume(user_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_latest_resume as _f };
        return _f(user_id);
    }
    import from db_sqlite { get_latest_resume as _f };
    return _f(user_id);
}

def list_resumes(user_id: str) -> list {
    if _USE_MONGO {
        import from db_mongo { list_resumes as _f };
        return _f(user_id);
    }
    import from db_sqlite { list_resumes as _f };
    return _f(user_id);
}

def delete_resume(resume_id: str, user_id: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { delete_resume as _f };
        return _f(resume_id, user_id);
    }
    import from db_sqlite { delete_resume as _f };
    return _f(resume_id, user_id);
}

def get_all_events() -> list {
    if _USE_MONGO {
        import from db_mongo { get_all_events as _f };
        return _f();
    }
    import from db_sqlite { get_all_events as _f };
    return _f();
}

def get_companies(event_id: str, filters: dict) -> list {
    if _USE_MONGO {
        import from db_mongo { get_companies as _f };
        return _f(event_id, filters);
    }
    import from db_sqlite { get_companies as _f };
    return _f(event_id, filters);
}

def get_company(event_id: str, company_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_company as _f };
        return _f(event_id, company_id);
    }
    import from db_sqlite { get_company as _f };
    return _f(event_id, company_id);
}

def get_roles(event_id: str, filters: dict = {}) -> list {
    if _USE_MONGO {
        import from db_mongo { get_roles as _f };
        return _f(event_id, filters);
    }
    import from db_sqlite { get_roles as _f };
    return _f(event_id, filters);
}

def get_role(role_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_role as _f };
        return _f(role_id);
    }
    import from db_sqlite { get_role as _f };
    return _f(role_id);
}

def save_company(user_id: str, company_id: str, event_id: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { save_company as _f };
        return _f(user_id, company_id, event_id);
    }
    import from db_sqlite { save_company as _f };
    return _f(user_id, company_id, event_id);
}

def unsave_company(user_id: str, company_id: str, event_id: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { unsave_company as _f };
        return _f(user_id, company_id, event_id);
    }
    import from db_sqlite { unsave_company as _f };
    return _f(user_id, company_id, event_id);
}

def list_saved_companies(user_id: str, event_id: str) -> list {
    if _USE_MONGO {
        import from db_mongo { list_saved_companies as _f };
        return _f(user_id, event_id);
    }
    import from db_sqlite { list_saved_companies as _f };
    return _f(user_id, event_id);
}

def save_pitch(user_id: str, company_id: str, event_id: str, pitch: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { save_pitch as _f };
        return _f(user_id, company_id, event_id, pitch);
    }
    import from db_sqlite { save_pitch as _f };
    return _f(user_id, company_id, event_id, pitch);
}

def get_companies_full(event_id: str) -> list {
    if _USE_MONGO {
        import from db_mongo { get_companies_full as _f };
        return _f(event_id);
    }
    import from db_sqlite { get_companies_full as _f };
    return _f(event_id);
}

def create_resume_version(user_id: str, version_name: str, label: str, company_tag: str,
    file_name: str, raw_text: str, parsed_data: str, section_order: str) -> str {
    if _USE_MONGO {
        import from db_mongo { create_resume_version as _f };
        return _f(user_id, version_name, label, company_tag, file_name, raw_text, parsed_data, section_order);
    }
    import from db_sqlite { create_resume_version as _f };
    return _f(user_id, version_name, label, company_tag, file_name, raw_text, parsed_data, section_order);
}

def list_resume_versions(user_id: str) -> list {
    if _USE_MONGO {
        import from db_mongo { list_resume_versions as _f };
        return _f(user_id);
    }
    import from db_sqlite { list_resume_versions as _f };
    return _f(user_id);
}

def get_resume_version(rv_id: str, user_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_resume_version as _f };
        return _f(rv_id, user_id);
    }
    import from db_sqlite { get_resume_version as _f };
    return _f(rv_id, user_id);
}

def update_resume_version_parsed(rv_id: str, user_id: str, parsed_data: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { update_resume_version_parsed as _f };
        return _f(rv_id, user_id, parsed_data);
    }
    import from db_sqlite { update_resume_version_parsed as _f };
    return _f(rv_id, user_id, parsed_data);
}

def update_resume_version_section_order(rv_id: str, user_id: str, section_order: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { update_resume_version_section_order as _f };
        return _f(rv_id, user_id, section_order);
    }
    import from db_sqlite { update_resume_version_section_order as _f };
    return _f(rv_id, user_id, section_order);
}

def update_resume_version_meta(rv_id: str, user_id: str, version_name: str, label: str, company_tag: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { update_resume_version_meta as _f };
        return _f(rv_id, user_id, version_name, label, company_tag);
    }
    import from db_sqlite { update_resume_version_meta as _f };
    return _f(rv_id, user_id, version_name, label, company_tag);
}

def delete_resume_version(rv_id: str, user_id: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { delete_resume_version as _f };
        return _f(rv_id, user_id);
    }
    import from db_sqlite { delete_resume_version as _f };
    return _f(rv_id, user_id);
}

def create_experience(user_id: str, company: str, role: str, dates: str,
    location: str, bullets: str, description: str) -> str {
    if _USE_MONGO {
        import from db_mongo { create_experience as _f };
        return _f(user_id, company, role, dates, location, bullets, description);
    }
    import from db_sqlite { create_experience as _f };
    return _f(user_id, company, role, dates, location, bullets, description);
}

def list_experiences(user_id: str) -> list {
    if _USE_MONGO {
        import from db_mongo { list_experiences as _f };
        return _f(user_id);
    }
    import from db_sqlite { list_experiences as _f };
    return _f(user_id);
}

def update_experience(exp_id: str, user_id: str, company: str, role: str,
    dates: str, location: str, bullets: str, description: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { update_experience as _f };
        return _f(exp_id, user_id, company, role, dates, location, bullets, description);
    }
    import from db_sqlite { update_experience as _f };
    return _f(exp_id, user_id, company, role, dates, location, bullets, description);
}

def delete_experience(exp_id: str, user_id: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { delete_experience as _f };
        return _f(exp_id, user_id);
    }
    import from db_sqlite { delete_experience as _f };
    return _f(exp_id, user_id);
}

def get_experience(exp_id: str, user_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_experience as _f };
        return _f(exp_id, user_id);
    }
    import from db_sqlite { get_experience as _f };
    return _f(exp_id, user_id);
}

def create_story(user_id: str, exp_id: str, title: str, star_data: str, user_notes: str) -> str {
    if _USE_MONGO {
        import from db_mongo { create_story as _f };
        return _f(user_id, exp_id, title, star_data, user_notes);
    }
    import from db_sqlite { create_story as _f };
    return _f(user_id, exp_id, title, star_data, user_notes);
}

def list_stories(user_id: str, exp_id: str = '') -> list {
    if _USE_MONGO {
        import from db_mongo { list_stories as _f };
        return _f(user_id, exp_id);
    }
    import from db_sqlite { list_stories as _f };
    return _f(user_id, exp_id);
}

def get_story(story_id: str, user_id: str) -> dict | None {
    if _USE_MONGO {
        import from db_mongo { get_story as _f };
        return _f(story_id, user_id);
    }
    import from db_sqlite { get_story as _f };
    return _f(story_id, user_id);
}

def update_story(story_id: str, user_id: str, title: str, user_notes: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { update_story as _f };
        return _f(story_id, user_id, title, user_notes);
    }
    import from db_sqlite { update_story as _f };
    return _f(story_id, user_id, title, user_notes);
}

def delete_story(story_id: str, user_id: str) -> bool {
    if _USE_MONGO {
        import from db_mongo { delete_story as _f };
        return _f(story_id, user_id);
    }
    import from db_sqlite { delete_story as _f };
    return _f(story_id, user_id);
}

def clear_event_import(event_id: str) {
    if _USE_MONGO {
        import from db_mongo { clear_event_import as _f };
        _f(event_id);
    } else {
        import from db_sqlite { clear_event_import as _f };
        _f(event_id);
    }
}

def insert_event(event_doc: dict) {
    if _USE_MONGO {
        import from db_mongo { insert_event as _f };
        _f(event_doc);
    } else {
        import from db_sqlite { insert_event as _f };
        _f(event_doc);
    }
}

def upsert_company(company_doc: dict) {
    if _USE_MONGO {
        import from db_mongo { upsert_company as _f };
        _f(company_doc);
    } else {
        import from db_sqlite { upsert_company as _f };
        _f(company_doc);
    }
}

def insert_role(role_doc: dict) {
    if _USE_MONGO {
        import from db_mongo { insert_role as _f };
        _f(role_doc);
    } else {
        import from db_sqlite { insert_role as _f };
        _f(role_doc);
    }
}

def _do_init() -> bool {
    init_db();
    return True;
}

glob _db_initialized: bool = _do_init();
