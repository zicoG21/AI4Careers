"""MongoDB backend for AI4Careers via jac-scale kvstore."""

import from uuid { uuid4 }
import from datetime { datetime }
import from jac_scale.lib { kvstore, Db }

def _db() -> Db {
    return kvstore(db_name='ai4careers', db_type='mongodb');
}

def _now() -> str {
    return str(datetime.now());
}

def _company_sort_key(r: dict) -> str {
    return f"{r.get('name')}";
}

def init_db() -> None {
    return;
}

def create_user(email: str, password_hash: str, name: str) -> str {
    user_id = "u_" + str(uuid4())[:8];
    created_at = _now();
    _db().insert_one('users', {
        'user_id': user_id, 'email': email, 'password_hash': password_hash,
        'name': name, 'created_at': created_at, 'needs_sponsorship': 0,
        'work_authorization': [], 'preferred_locations': [], 'work_modes': [], 'role_types': []
    });
    return user_id;
}

def get_user_by_email(email: str) -> dict | None {
    row: dict | None = _db().find_one('users', {'email': email});
    if row is None { return None; }
    return {
        'user_id': row['user_id'], 'email': row['email'], 'password_hash': row['password_hash'],
        'name': row['name'], 'created_at': row['created_at'],
        'needs_sponsorship': bool(row.get('needs_sponsorship', 0)),
        'work_authorization': row.get('work_authorization', []),
        'preferred_locations': row.get('preferred_locations', []),
        'work_modes': row.get('work_modes', []), 'role_types': row.get('role_types', [])
    };
}

def get_user_by_id(user_id: str) -> dict | None {
    row: dict | None = _db().find_one('users', {'user_id': user_id});
    if row is None { return None; }
    return {
        'user_id': row['user_id'], 'email': row['email'], 'password_hash': row['password_hash'],
        'name': row['name'], 'created_at': row['created_at'],
        'needs_sponsorship': bool(row.get('needs_sponsorship', 0)),
        'work_authorization': row.get('work_authorization', []),
        'preferred_locations': row.get('preferred_locations', []),
        'work_modes': row.get('work_modes', []), 'role_types': row.get('role_types', [])
    };
}

def update_user_preferences(user_id: str, needs_sponsorship: bool, work_authorization: list,
    preferred_locations: list, work_modes: list, role_types: list) -> bool {
    _db().update_one('users', {'user_id': user_id}, {'$set': {
        'needs_sponsorship': int(needs_sponsorship), 'work_authorization': work_authorization,
        'preferred_locations': preferred_locations, 'work_modes': work_modes, 'role_types': role_types
    }});
    return True;
}

def create_resume(user_id: str, filename: str, raw_text: str, pdf_data: str,
    skills: list, experience_bullets: list, projects: list, education: dict) -> str {
    resume_id = "r_" + str(uuid4())[:8];
    uploaded_at = _now();
    _db().insert_one('resumes', {
        'resume_id': resume_id, 'user_id': user_id, 'filename': filename,
        'uploaded_at': uploaded_at, 'raw_text': raw_text, 'pdf_data': pdf_data,
        'skills': skills, 'experience_bullets': experience_bullets,
        'projects': projects, 'education': education
    });
    return resume_id;
}

def get_resume(resume_id: str, user_id: str) -> dict | None {
    row: dict | None = _db().find_one('resumes', {'resume_id': resume_id, 'user_id': user_id});
    if row is None { return None; }
    return {
        'resume_id': row['resume_id'], 'filename': row['filename'], 'uploaded_at': row['uploaded_at'],
        'raw_text': row.get('raw_text', ''), 'pdf_data': row.get('pdf_data', ''),
        'skills': row.get('skills', []), 'experience_bullets': row.get('experience_bullets', []),
        'projects': row.get('projects', []), 'education': row.get('education', {})
    };
}

def _rv_extract(rv: dict) -> dict {
    parsed = rv.get('parsed_data', {}) or {};
    if not isinstance(parsed, dict) { parsed = {}; }
    skills: list = [];
    sk_raw = parsed.get('skills');
    if isinstance(sk_raw, list) {
        for cat in sk_raw {
            if isinstance(cat, dict) and 'items' in cat {
                skills = skills + list(cat['items']);
            } elif isinstance(cat, str) and cat.strip() != '' {
                skills.append(cat.strip());
            }
        }
    } elif isinstance(sk_raw, str) and sk_raw.strip() != '' {
        skills.append(sk_raw.strip());
    }
    bullets: list = [];
    exp = parsed.get('experience');
    if isinstance(exp, list) {
        for e in exp {
            if not isinstance(e, dict) { continue; }
            bs = e.get('bullets');
            if isinstance(bs, list) {
                for b in bs {
                    if isinstance(b, dict) and 'text' in b { bullets.append(b['text']); }
                    else { bullets.append(str(b)); }
                }
            }
        }
    }
    projects: list = [];
    projs = parsed.get('projects');
    if isinstance(projs, list) {
        for p in projs {
            if not isinstance(p, dict) { continue; }
            bs = p.get('bullets');
            if isinstance(bs, list) {
                for b in bs {
                    if isinstance(b, dict) and 'text' in b { projects.append(b['text']); }
                    else { projects.append(str(b)); }
                }
            }
        }
    }
    education: list = [];
    edu = parsed.get('education');
    if isinstance(edu, list) {
        for e in edu {
            if isinstance(e, dict) {
                education.append((e.get('institution', '') or '') + ' ' + (e.get('degree', '') or ''));
            }
        }
    }
    return {'skills': skills, 'experience_bullets': bullets,
            'projects': projects, 'education': education};
}

def get_latest_resume(user_id: str) -> dict | None {
    rv_rows: list[dict] = list(_db().find('resume_versions', {'user_id': user_id}));
    rv_rows.sort(key=lambda r: r['updated_at'], reverse=True);
    legacy_rows: list[dict] = list(_db().find('resumes', {'user_id': user_id}));
    legacy_rows.sort(key=lambda r: r['uploaded_at'], reverse=True);
    rv = rv_rows[0] if rv_rows else None;
    leg = legacy_rows[0] if legacy_rows else None;
    if rv is None and leg is None { return None; }
    use_rv = False;
    if rv is not None and leg is None { use_rv = True; }
    elif rv is not None and leg is not None {
        if rv['updated_at'] > leg['uploaded_at'] { use_rv = True; }
    }
    if use_rv {
        ext = _rv_extract(rv);
        return {
            'resume_id': rv['rv_id'], 'filename': rv['file_name'],
            'uploaded_at': rv['updated_at'],
            'raw_text': rv.get('raw_text', ''), 'pdf_data': '',
            'skills': ext['skills'], 'experience_bullets': ext['experience_bullets'],
            'projects': ext['projects'], 'education': ext['education']
        };
    }
    return {
        'resume_id': leg['resume_id'], 'filename': leg['filename'],
        'uploaded_at': leg['uploaded_at'],
        'raw_text': leg.get('raw_text', ''), 'pdf_data': leg.get('pdf_data', ''),
        'skills': leg.get('skills', []),
        'experience_bullets': leg.get('experience_bullets', []),
        'projects': leg.get('projects', []),
        'education': leg.get('education', {})
    };
}

def list_resumes(user_id: str) -> list {
    rows: list[dict] = list(_db().find('resumes', {'user_id': user_id}));
    rows.sort(key=lambda r: r['uploaded_at'], reverse=True);
    result: list = [];
    for r in rows {
        result.append({'resume_id': r['resume_id'], 'filename': r['filename'],
                 'uploaded_at': r['uploaded_at'], 'skills_count': 0});
    }
    return result;
}

def delete_resume(resume_id: str, user_id: str) -> bool {
    existing: dict | None = _db().find_one('resumes', {'resume_id': resume_id, 'user_id': user_id});
    if existing is None { return False; }
    _db().delete_one('resumes', {'resume_id': resume_id, 'user_id': user_id});
    return True;
}

def get_all_events() -> list {
    rows: list[dict] = list(_db().find('events', {}));
    return [{'event_id': r['event_id'], 'name': r['name'], 'term': r['term'],
             'start_date': r['start_date'], 'end_date': r['end_date']} for r in rows];
}

def get_companies(event_id: str, filters: dict) -> list {
    f: dict = {'event_id': event_id};
    fair_day = filters.get('fair_day', '');
    if fair_day != '' { f['fair_day'] = {'$regex': fair_day, '$options': 'i'}; }
    position_type = filters.get('position_type', '');
    if position_type != '' { f['positions'] = {'$elemMatch': {'$regex': position_type, '$options': 'i'}}; }
    sponsors = filters.get('sponsors', '');
    if sponsors != '' { f['sponsorship_flag'] = sponsors; }
    elif filters.get('needs_sponsorship', False) { f['sponsorship_flag'] = {'$in': ['Yes', 'Maybe']}; }
    region = filters.get('region', '');
    if region != '' { f['regions'] = {'$elemMatch': {'$regex': region, '$options': 'i'}}; }
    major_search = filters.get('major_search', '');
    if major_search != '' { f['majors'] = {'$elemMatch': {'$regex': major_search, '$options': 'i'}}; }
    search = filters.get('search', '');
    if search != '' { f['$or'] = [{'name': {'$regex': search, '$options': 'i'}}, {'description': {'$regex': search, '$options': 'i'}}]; }
    rows: list[dict] = list(_db().find('companies', f));
    rows.sort(key=_company_sort_key);
    return [{'company_id': r['company_id'], 'name': r['name'], 'fair_day': r.get('fair_day', ''),
             'is_multi_day': bool(r.get('is_multi_day', 0)), 'website': r.get('website', ''),
             'careers_url': r.get('careers_url', ''), 'positions': r.get('positions', []),
             'degree_levels': r.get('degree_levels', []), 'academic_years': r.get('academic_years', []),
             'majors': r.get('majors', []), 'sponsorship': r.get('sponsorship', []),
             'sponsorship_notes': r.get('sponsorship_notes', ''), 'sponsorship_flag': r.get('sponsorship_flag', 'No'),
             'sponsorship_status': r.get('sponsorship_status', 'No'), 'regions': r.get('regions', []),
             'accepts_hardcopy': bool(r.get('accepts_hardcopy', 0)), 'description': r.get('description', '')[:200]} for r in rows];
}

def get_company(event_id: str, company_id: str) -> dict | None {
    row: dict | None = _db().find_one('companies', {'event_id': event_id, 'company_id': company_id});
    if row is None { return None; }
    return {'company_id': row['company_id'], 'name': row['name'], 'fair_day': row.get('fair_day', ''),
            'is_multi_day': bool(row.get('is_multi_day', 0)), 'website': row.get('website', ''),
            'careers_url': row.get('careers_url', ''), 'description': row.get('description', ''),
            'positions': row.get('positions', []), 'degree_levels': row.get('degree_levels', []),
            'academic_years': row.get('academic_years', []), 'majors': row.get('majors', []),
            'sponsorship': row.get('sponsorship', []), 'sponsorship_notes': row.get('sponsorship_notes', ''),
            'sponsorship_flag': row.get('sponsorship_flag', 'No'), 'sponsorship_status': row.get('sponsorship_status', 'No'),
            'regions': row.get('regions', []), 'accepts_hardcopy': bool(row.get('accepts_hardcopy', 0))};
}

def get_roles(event_id: str, filters: dict = {}) -> list {
    f: dict = {'event_id': event_id};
    cid = filters.get('company_id', ''); if cid != '' { f['company_id'] = cid; }
    loc = filters.get('location', ''); if loc != '' { f['location'] = {'$regex': loc, '$options': 'i'}; }
    wm = filters.get('work_mode', ''); if wm != '' { f['work_mode'] = {'$regex': wm, '$options': 'i'}; }
    sp = filters.get('sponsors', '');
    if sp != '' { f['sponsorship'] = {'$regex': sp, '$options': 'i'}; }
    elif filters.get('needs_sponsorship', False) { f['sponsorship'] = {'$not': {'$regex': 'Will not', '$options': 'i'}}; }
    sr = filters.get('search', '');
    if sr != '' { f['$or'] = [{'title': {'$regex': sr, '$options': 'i'}}, {'description': {'$regex': sr, '$options': 'i'}}]; }
    rows: list[dict] = list(_db().find('roles', f));
    return [{'role_id': r['role_id'], 'company_id': r.get('company_id', ''), 'title': r['title'],
             'category': r.get('category', ''), 'location': r.get('location', ''),
             'work_mode': r.get('work_mode', ''), 'sponsorship': r.get('sponsorship', 'Unknown'),
             'description': r.get('description', ''), 'tags': r.get('tags', []),
             'role_source_url': r.get('role_source_url', ''), 'role_last_checked': r.get('role_last_checked', '')} for r in rows];
}

def get_role(role_id: str) -> dict | None {
    row: dict | None = _db().find_one('roles', {'role_id': role_id});
    if row is None { return None; }
    return {'role_id': row['role_id'], 'title': row['title'], 'category': row.get('category', ''),
            'location': row.get('location', ''), 'work_mode': row.get('work_mode', ''),
            'sponsorship': row.get('sponsorship', 'Unknown'), 'description': row.get('description', ''),
            'tags': row.get('tags', [])};
}

def save_company(user_id: str, company_id: str, event_id: str) -> bool {
    existing: dict | None = _db().find_one('saved_companies', {'user_id': user_id, 'company_id': company_id, 'event_id': event_id});
    if existing is None {
        _db().insert_one('saved_companies', {'id': "sc_" + str(uuid4())[:8], 'user_id': user_id,
            'company_id': company_id, 'event_id': event_id, 'pitch': '', 'saved_at': _now()});
    }
    return True;
}

def unsave_company(user_id: str, company_id: str, event_id: str) -> bool {
    _db().delete_one('saved_companies', {'user_id': user_id, 'company_id': company_id, 'event_id': event_id});
    return True;
}

def list_saved_companies(user_id: str, event_id: str) -> list {
    rows: list[dict] = list(_db().find('saved_companies', {'user_id': user_id, 'event_id': event_id}));
    rows.sort(key=lambda r: r['saved_at'], reverse=True);
    return [{'company_id': r['company_id'], 'pitch': r.get('pitch', ''), 'saved_at': r['saved_at']} for r in rows];
}

def save_pitch(user_id: str, company_id: str, event_id: str, pitch: str) -> bool {
    _db().update_one('saved_companies', {'user_id': user_id, 'company_id': company_id, 'event_id': event_id}, {'$set': {'pitch': pitch}});
    return True;
}

def get_companies_full(event_id: str) -> list {
    rows: list[dict] = list(_db().find('companies', {'event_id': event_id}));
    return [{'company_id': r['company_id'], 'name': r['name'], 'fair_day': r.get('fair_day', ''),
             'is_multi_day': bool(r.get('is_multi_day', 0)), 'website': r.get('website', ''),
             'careers_url': r.get('careers_url', ''), 'description': r.get('description', ''),
             'positions': r.get('positions', []), 'degree_levels': r.get('degree_levels', []),
             'academic_years': r.get('academic_years', []), 'majors': r.get('majors', []),
             'sponsorship': r.get('sponsorship', []), 'sponsorship_notes': r.get('sponsorship_notes', ''),
             'sponsorship_flag': r.get('sponsorship_flag', 'No'), 'sponsorship_status': r.get('sponsorship_status', 'No'),
             'regions': r.get('regions', []), 'accepts_hardcopy': bool(r.get('accepts_hardcopy', 0))} for r in rows];
}

def create_resume_version(user_id: str, version_name: str, label: str, company_tag: str,
    file_name: str, raw_text: str, parsed_data: str, section_order: str) -> str {
    import json;
    rv_id = "rv_" + str(uuid4())[:8];
    now = _now();
    parsed = json.loads(parsed_data) if parsed_data else {};
    sections = json.loads(section_order) if section_order else [];
    _db().insert_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id, 'version_name': version_name,
        'label': label, 'company_tag': company_tag, 'file_name': file_name, 'raw_text': raw_text,
        'parsed_data': parsed, 'section_order': sections, 'created_at': now, 'updated_at': now});
    return rv_id;
}

def list_resume_versions(user_id: str) -> list {
    rows: list[dict] = list(_db().find('resume_versions', {'user_id': user_id}));
    rows.sort(key=lambda r: r['updated_at'], reverse=True);
    return [{'resume_id': r['rv_id'], 'version_name': r['version_name'], 'label': r['label'],
             'company_tag': r.get('company_tag', 'Other') or 'Other', 'file_name': r['file_name'],
             'name': r.get('parsed_data', {}).get('name', '') if isinstance(r.get('parsed_data'), dict) else '',
             'created_at': r['created_at'], 'updated_at': r['updated_at']} for r in rows];
}

def get_resume_version(rv_id: str, user_id: str) -> dict | None {
    row: dict | None = _db().find_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id});
    if row is None { return None; }
    ct = row.get('company_tag') or 'Other';
    return {'resume_id': row['rv_id'], 'version_name': row['version_name'], 'label': row['label'],
            'company_tag': ct, 'file_name': row['file_name'], 'raw_text': row.get('raw_text', ''),
            'parsed': row.get('parsed_data', {}), 'section_order': row.get('section_order', []),
            'created_at': row['created_at'], 'updated_at': row['updated_at']};
}

def update_resume_version_parsed(rv_id: str, user_id: str, parsed_data: str) -> bool {
    import json;
    now = _now();
    parsed = json.loads(parsed_data) if parsed_data else {};
    _db().update_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id}, {'$set': {'parsed_data': parsed, 'updated_at': now}});
    return True;
}

def update_resume_version_section_order(rv_id: str, user_id: str, section_order: str) -> bool {
    import json;
    now = _now();
    sections = json.loads(section_order) if section_order else [];
    _db().update_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id}, {'$set': {'section_order': sections, 'updated_at': now}});
    return True;
}

def update_resume_version_meta(rv_id: str, user_id: str, version_name: str, label: str, company_tag: str) -> bool {
    now = _now();
    _db().update_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id},
        {'$set': {'version_name': version_name, 'label': label, 'company_tag': company_tag, 'updated_at': now}});
    return True;
}

def delete_resume_version(rv_id: str, user_id: str) -> bool {
    existing: dict | None = _db().find_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id});
    if existing is None { return False; }
    _db().delete_one('resume_versions', {'rv_id': rv_id, 'user_id': user_id});
    return True;
}

def create_experience(user_id: str, company: str, role: str, dates: str,
    location: str, bullets: str, description: str) -> str {
    import json;
    exp_id = "exp_" + str(uuid4())[:8];
    now = _now();
    bullets_val = json.loads(bullets) if isinstance(bullets, str) else bullets;
    _db().insert_one('experiences', {'exp_id': exp_id, 'user_id': user_id, 'company': company,
        'role': role, 'dates': dates, 'location': location, 'bullets': bullets_val,
        'description': description, 'created_at': now});
    return exp_id;
}

def list_experiences(user_id: str) -> list {
    rows: list[dict] = list(_db().find('experiences', {'user_id': user_id}));
    rows.sort(key=lambda r: r['created_at'], reverse=True);
    story_rows: list[dict] = list(_db().find('stories', {'user_id': user_id}));
    result: list = [];
    for r in rows {
        eid: str = f"{r['exp_id']}";
        sc: int = 0;
        for sr in story_rows {
            if f"{sr['exp_id']}" == eid { sc += 1; }
        }
        result.append({'exp_id': r['exp_id'], 'company': r['company'], 'role': r['role'],
                 'dates': r.get('dates', ''), 'location': r.get('location', ''),
                 'bullets': r.get('bullets', []), 'description': r.get('description', ''),
                 'story_count': sc, 'created_at': r['created_at']});
    }
    return result;
}

def update_experience(exp_id: str, user_id: str, company: str, role: str,
    dates: str, location: str, bullets: str, description: str) -> bool {
    import json;
    bullets_val = json.loads(bullets) if isinstance(bullets, str) else bullets;
    _db().update_one('experiences', {'exp_id': exp_id, 'user_id': user_id},
        {'$set': {'company': company, 'role': role, 'dates': dates, 'location': location,
                  'bullets': bullets_val, 'description': description}});
    return True;
}

def delete_experience(exp_id: str, user_id: str) -> bool {
    existing: dict | None = _db().find_one('experiences', {'exp_id': exp_id, 'user_id': user_id});
    if existing is None { return False; }
    _db().delete_many('stories', {'exp_id': exp_id, 'user_id': user_id});
    _db().delete_one('experiences', {'exp_id': exp_id, 'user_id': user_id});
    return True;
}

def get_experience(exp_id: str, user_id: str) -> dict | None {
    row: dict | None = _db().find_one('experiences', {'exp_id': exp_id, 'user_id': user_id});
    if row is None { return None; }
    return {'exp_id': row['exp_id'], 'company': row['company'], 'role': row['role'],
            'dates': row.get('dates', ''), 'location': row.get('location', ''),
            'bullets': row.get('bullets', []), 'description': row.get('description', ''),
            'created_at': row['created_at']};
}

def create_story(user_id: str, exp_id: str, title: str, star_data: str, user_notes: str) -> str {
    import json;
    story_id = "st_" + str(uuid4())[:8];
    now = _now();
    star = json.loads(star_data) if isinstance(star_data, str) else star_data;
    _db().insert_one('stories', {'story_id': story_id, 'user_id': user_id, 'exp_id': exp_id,
        'title': title, 'star_data': star, 'user_notes': user_notes, 'created_at': now, 'updated_at': now});
    return story_id;
}

def list_stories(user_id: str, exp_id: str = '') -> list {
    sf: dict = {'user_id': user_id};
    if exp_id and exp_id != '' { sf['exp_id'] = exp_id; }
    story_rows: list[dict] = list(_db().find('stories', sf));
    story_rows.sort(key=lambda r: r['created_at'], reverse=True);
    results: list = [];
    for row in story_rows {
        exp_doc: dict | None = _db().find_one('experiences', {'exp_id': row['exp_id']});
        results.append({'story_id': row['story_id'], 'exp_id': row['exp_id'],
            'exp_company': exp_doc['company'] if exp_doc else '',
            'exp_role': exp_doc['role'] if exp_doc else '',
            'title': row['title'],
            'themes': [],
            'situation': '',
            'user_notes': row.get('user_notes', ''), 'created_at': row['created_at']});
    }
    return results;
}

def get_story(story_id: str, user_id: str) -> dict | None {
    row: dict | None = _db().find_one('stories', {'story_id': story_id, 'user_id': user_id});
    if row is None { return None; }
    exp_doc: dict | None = _db().find_one('experiences', {'exp_id': row['exp_id']});
    return {'story_id': row['story_id'], 'exp_id': row['exp_id'],
            'exp_company': exp_doc['company'] if exp_doc else '',
            'exp_role': exp_doc['role'] if exp_doc else '',
            'title': row['title'], 'star': row.get('star_data'),
            'user_notes': row.get('user_notes', ''),
            'created_at': row['created_at'], 'updated_at': row['updated_at']};
}

def update_story(story_id: str, user_id: str, title: str, user_notes: str) -> bool {
    now = _now();
    updates: dict = {'updated_at': now};
    if title and title != '' { updates['title'] = title; }
    if user_notes is not None { updates['user_notes'] = user_notes; }
    _db().update_one('stories', {'story_id': story_id, 'user_id': user_id}, {'$set': updates});
    return True;
}

def delete_story(story_id: str, user_id: str) -> bool {
    existing: dict | None = _db().find_one('stories', {'story_id': story_id, 'user_id': user_id});
    if existing is None { return False; }
    _db().delete_one('stories', {'story_id': story_id, 'user_id': user_id});
    return True;
}

def clear_event_import(event_id: str) {
    _db().delete_many('roles', {'event_id': event_id});
    _db().delete_many('companies', {'event_id': event_id});
    _db().delete_one('events', {'event_id': event_id});
}

def insert_event(event_doc: dict) {
    _db().insert_one('events', event_doc);
}

def upsert_company(company_doc: dict) {
    existing: dict | None = _db().find_one('companies', {'company_id': company_doc['company_id']});
    if existing is None {
        _db().insert_one('companies', company_doc);
    } else {
        _db().update_one('companies', {'company_id': company_doc['company_id']}, {'$set': company_doc});
    }
}

def insert_role(role_doc: dict) {
    _db().insert_one('roles', role_doc);
}
