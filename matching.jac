import from db { get_latest_resume, get_user_by_id, get_companies_full }

glob DOMAIN_KEYWORDS: dict = {
         "software": [
             "software",
             "backend",
             "frontend",
             "full stack",
             "web",
             "api",
             "database",
             "distributed",
             "react",
             "node",
             "java",
             "python",
             "javascript",
             "typescript",
             "sql"
         ],
         "data": [
             "data",
             "analytics",
             "analyst",
             "sql",
             "pandas",
             "numpy",
             "etl",
             "dashboard",
             "bi",
             "statistics"
         ],
         "ml": [
             "machine learning",
             "ml",
             "ai",
             "llm",
             "nlp",
             "computer vision",
             "deep learning",
             "tensorflow",
             "pytorch"
         ],
         "robotics": ["robotics", "controls", "autonomous", "ros", "perception"],
         "embedded": [
             "embedded",
             "firmware",
             "microcontroller",
             "rtos",
             "hardware",
             "c++",
             "c"
         ],
         "electrical": ["electrical", "pcb", "fpga", "verilog", "vhdl", "signal"],
         "mechanical": [
             "mechanical",
             "cad",
             "solidworks",
             "manufacturing",
             "thermal",
             "fea"
         ],
         "civil": [
             "civil",
             "structural",
             "construction",
             "geotechnical",
             "transportation"
         ],
         "finance": [
             "trading",
             "quant",
             "options",
             "risk",
             "finance",
             "capital markets"
         ]
     };

glob SKILL_WEIGHTS: dict = {
         "python": 1.0,
         "java": 1.0,
         "javascript": 1.0,
         "typescript": 1.0,
         "sql": 1.0,
         "react": 0.9,
         "node": 0.9,
         "docker": 0.9,
         "kubernetes": 0.9,
         "aws": 0.9,
         "pytorch": 1.0,
         "tensorflow": 1.0,
         "machine learning": 1.0,
         "data science": 1.0,
         "robotics": 1.0,
         "embedded": 1.0,
         "firmware": 1.0,
         "c++": 1.0,
         "c": 0.9
     };

glob STATE_TO_REGION: dict = {
         "michigan": "Midwest",
         "illinois": "Midwest",
         "indiana": "Midwest",
         "ohio": "Midwest",
         "wisconsin": "Midwest",
         "minnesota": "Midwest",
         "iowa": "Midwest",
         "missouri": "Midwest",
         "north dakota": "Midwest",
         "south dakota": "Midwest",
         "nebraska": "Midwest",
         "kansas": "Midwest",
         "california": "West",
         "washington": "West",
         "oregon": "West",
         "nevada": "West",
         "arizona": "West",
         "utah": "West",
         "colorado": "West",
         "idaho": "West",
         "montana": "West",
         "wyoming": "West",
         "alaska": "West",
         "hawaii": "West",
         "new mexico": "West",
         "new york": "Northeast",
         "new jersey": "Northeast",
         "pennsylvania": "Northeast",
         "massachusetts": "Northeast",
         "connecticut": "Northeast",
         "rhode island": "Northeast",
         "vermont": "Northeast",
         "new hampshire": "Northeast",
         "maine": "Northeast",
         "delaware": "Northeast",
         "virginia": "Southeast",
         "maryland": "Southeast",
         "north carolina": "Southeast",
         "south carolina": "Southeast",
         "georgia": "Southeast",
         "florida": "Southeast",
         "tennessee": "Southeast",
         "alabama": "Southeast",
         "mississippi": "Southeast",
         "kentucky": "Southeast",
         "arkansas": "Southeast",
         "louisiana": "Southeast",
         "west virginia": "Southeast",
         "texas": "Southwest",
         "oklahoma": "Southwest"
     };

def clamp01(value: float) -> float {
    if value < 0.0 {
        return 0.0;
    }
    if value > 1.0 {
        return 1.0;
    }
    return value;
}

def normalize_text(text: str) -> str {
    out: str = str(text).lower();

    for ch in [
        ",",
        ".",
        ";",
        ":",
        "(",
        ")",
        "[",
        "]",
        "{",
        "}",
        "/",
        "\\",
        "|",
        "-",
        "_",
        "\n",
        "\t"
    ] {
        out = out.replace(str(ch), " ");
    }

    while "  " in out {
        out = out.replace("  ", " ");
    }

    return out.strip();
}


def join_list(items: list, sep: str = ", ") -> str {
    parts: list[str] = [];
    for item in items {
        parts.append(str(item));
    }
    return sep.join(parts);
}

def round1(value: float) -> float {
    scaled: float = value * 10.0;
    if scaled >= 0.0 {
        scaled_int: int = int(scaled + 0.5);
        return float(scaled_int) / 10.0;
    }
    scaled_int: int = int(scaled - 0.5);
    return float(scaled_int) / 10.0;
}

def round4(value: float) -> float {
    scaled: float = value * 10000.0;
    if scaled >= 0.0 {
        scaled_int: int = int(scaled + 0.5);
        return float(scaled_int) / 10000.0;
    }
    scaled_int: int = int(scaled - 0.5);
    return float(scaled_int) / 10000.0;
}


def unique_lower_list(items: list) -> list[str] {
    result: list[str] = [];
    for item in items {
        x: str = str(item).strip().lower();
        if x != "" and x not in result {
            result.append(x);
        }
    }
    return result;
}

def slice_list(items: list, limit: int) -> list {
    result: list = [];
    idx: int = 0;

    for item in items {
        if idx >= limit {
            break;
        }
        result.append(item);
        idx += 1;
    }

    return result;
}

def infer_domains(blob: str) -> list[str] {
    text: str = normalize_text(blob);
    found: list[str] = [];

    for raw_domain in DOMAIN_KEYWORDS {
        domain: str = str(raw_domain);
        keywords = DOMAIN_KEYWORDS[domain];

        for raw_kw in keywords {
            kw: str = str(raw_kw);
            if kw in text {
                if domain not in found {
                    found.append(domain);
                }
                break;
            }
        }
    }

    return found;
}

def skill_weight(skill: str) -> float {
    key: str = str(skill).strip().lower();

    if key in SKILL_WEIGHTS {
        return float(SKILL_WEIGHTS[key]);
    }

    if len(key) >= 12 {
        return 0.8;
    }

    return 0.6;
}

def weighted_skill_overlap(resume_skills: list, company_blob: str) -> dict {
    blob: str = normalize_text(company_blob);
    total: float = 0.0;
    matched: float = 0.0;
    matched_skills: list[str] = [];

    for raw_skill in resume_skills {
        skill: str = str(raw_skill).strip();
        s: str = skill.lower();

        if s == "" {
            continue;
        }

        w: float = skill_weight(skill);
        total += w;

        if s in blob {
            matched += w;
            matched_skills.append(skill);
        }
    }

    if total == 0.0 {
        return {"score": 0.0, "matched_skills": []};
    }

    return {"score": matched / total, "matched_skills": matched_skills};
}


def overlap_ratio(left: list, right: list) -> float {
    if len(left) == 0 {
        return 0.0;
    }

    hit: int = 0;
    for item in left {
        if item in right {
            hit += 1;
        }
    }

    return float(hit) / float(len(left));
}

def classify_sponsorship(sponsorship: list) -> str {
    normalized: list[str] = unique_lower_list(sponsorship);

    has_no: bool = (
        "authorized to work in the united states and will not require future sponsorship" in normalized
    );
    has_future: bool = False;

    for item in normalized {
        item_text: str = str(item);
        if item_text.startswith("work visa that will require future sponsorship") {
            has_future = True;
            break;
        }
    }

    if has_no and has_future {
        return "Sponsors Visas";
    }

    if has_no and not has_future and len(normalized) == 1 {
        return "No Sponsorship";
    }

    return "Check Details";
}


def sponsorship_score(needs_sponsorship: bool, label: str) -> float {
    if not needs_sponsorship {
        return 1.0;
    }
    if label == "Sponsors Visas" {
        return 1.0;
    }
    if label == "Check Details" {
        return 0.35;
    }
    return 0.0;
}

def infer_degree(raw_text: str) -> str {
    text: str = normalize_text(raw_text);

    if "phd" in text or "doctoral" in text or "doctorate" in text {
        return "Doctoral";
    }

    if "master" in text
    or "masters" in text
    or "m.s." in text
    or "ms " in text
    or "mse" in text {
        return "Masters";
    }

    return "Bachelors";
}

def degree_score(user_degree: str, company_degree_levels: list) -> float {
    degrees: list[str] = unique_lower_list(company_degree_levels);
    user_degree_lower: str = user_degree.lower();

    if len(degrees) == 0 {
        return 0.5;
    }

    if user_degree_lower in degrees {
        return 1.0;
    }

    return 0.0;
}


def preferred_regions(states: list) -> list[str] {
    result: list[str] = [];

    for raw_state in states {
        key: str = str(raw_state).strip().lower();

        if key in STATE_TO_REGION {
            region: str = str(STATE_TO_REGION[key]);
            if region not in result {
                result.append(region);
            }
        }
    }

    return result;
}

def location_score(preferred_locations: list, company_regions: list) -> float {
    if len(preferred_locations) == 0 {
        return 0.5;
    }

    prefs: list[str] = preferred_regions(preferred_locations);

    if len(prefs) == 0 or len(company_regions) == 0 {
        return 0.5;
    }

    regions: list[str] = unique_lower_list(company_regions);

    for pref in prefs {
        pref_text: str = str(pref).lower();
        if pref_text in regions {
            return 1.0;
        }
    }

    return 0.0;
}

def role_type_score(user_role_types: list, company_positions: list) -> float {
    positions: list[str] = unique_lower_list(company_positions);
    prefs: list[str] = unique_lower_list(user_role_types);

    if len(prefs) == 0 {
        return 0.6;
    }

    for pref in prefs {
        if pref in positions {
            return 1.0;
        }
    }

    if "internship" in prefs and "co-op" in positions {
        return 0.5;
    }

    if "co-op" in prefs and "internship" in positions {
        return 0.5;
    }

    return 0.0;
}

def dict_cast(value: dict) -> dict {
    return value;
}


def build_why_fit(
    matched_skills: list,
    matched_domains: list,
    company: dict,
    sponsorship_label: str,
    scores: dict
) -> list {
    reasons: list[str] = [];

    if len(matched_skills) > 0 {
        reasons.append(
            "Matched resume skills: " + join_list(slice_list(matched_skills, 5))
        );
    }

    if len(matched_domains) > 0 {
        reasons.append("Aligned technical domains: " + join_list(matched_domains));
    }

    role_type_fit_value: float = float(scores["role_type_fit"]);
    company_positions: list = [];
    if "positions" in company {
        for item in company["positions"] {
            company_positions.append(item);
        }
    }

    if role_type_fit_value >= 0.99 {
        reasons.append(
            "Your preferred role type matches this company's openings: " + join_list(
                company_positions
            )
        );
    }

    if sponsorship_label == "Sponsors Visas" {
        reasons.append(
            "This company appears open to candidates who may need sponsorship."
        );
    } elif sponsorship_label == "Check Details" {
        reasons.append(
            "Sponsorship policy is not fully explicit, so this may be worth clarifying with recruiters."
        );
    }

    location_fit_value: float = float(scores["location_fit"]);
    company_regions: list = [];
    if "regions" in company {
        for item in company["regions"] {
            company_regions.append(item);
        }
    }

    if location_fit_value >= 0.99 and len(company_regions) > 0 {
        reasons.append(
            "The company recruits in one of your preferred regions: " + join_list(
                company_regions
            )
        );
    }

    return reasons;
}


def build_action_plan(
    company: dict, sponsorship_label: str, matched_skills: list
) -> list {
    actions: list[str] = [];
    company_positions: list = [];
    if "positions" in company {
        for item in company["positions"] {
            company_positions.append(item);
        }
    }

    if len(matched_skills) > 0 {
        actions.append(
            "Lead with 1-2 projects or experiences tied to " + join_list(
                slice_list(matched_skills, 3)
            ) + "."
        );
    } else {
        actions.append(
            "Lead with your strongest technical project and ask which teams are hiring."
        );
    }

    actions.append(
        "Ask which specific roles or teams fall under " + join_list(
            company_positions
        ) + "."
    );

    if sponsorship_label != "No Sponsorship" {
        actions.append(
            "Clarify sponsorship and work authorization expectations early in the conversation."
        );
    }

    return actions;
}

def score_company(resume: dict, user: dict, company: dict) -> dict {
    resume_skills: list = [];
    if "skills" in resume {
        for item in resume["skills"] {
            resume_skills.append(item);
        }
    }
    raw_text: str = str(resume["raw_text"]) if "raw_text" in resume else "";
    bullets: list = [];
    if "experience_bullets" in resume {
        for item in resume["experience_bullets"] {
            bullets.append(item);
        }
    }

    company_description: str = str(company["description"])
        if "description" in company
        else "";
    company_positions: list = [];
    if "positions" in company {
        for item in company["positions"] {
            company_positions.append(item);
        }
    }
    company_majors: list = [];
    if "majors" in company {
        for item in company["majors"] {
            company_majors.append(item);
        }
    }
    company_degree_levels: list = [];
    if "degree_levels" in company {
        for item in company["degree_levels"] {
            company_degree_levels.append(item);
        }
    }

    company_regions: list = [];
    if "regions" in company {
        for item in company["regions"] {
            company_regions.append(item);
        }
    }
    company_sponsorship: list = [];
    if "sponsorship" in company {
        for item in company["sponsorship"] {
            company_sponsorship.append(item);
        }
    }
    resume_blob: str = raw_text + " " + join_list(bullets, " ") + " " + join_list(
        resume_skills, " "
    );
    company_blob: str = (
        company_description + " " + join_list(company_positions, " ") + " " + join_list(
            company_majors, " "
        ) + " " + join_list(company_degree_levels, " ")
    );

    skill_result: dict = weighted_skill_overlap(resume_skills, company_blob);

    resume_domains: list[str] = infer_domains(resume_blob);
    company_domains: list[str] = infer_domains(company_blob);

    domain_overlap: float = 0.35;
    if len(resume_domains) > 0 {
        domain_overlap = overlap_ratio(resume_domains, company_domains);
    }

    skill_score_value: float = float(skill_result["score"]);
    experience_skill_fit: float = clamp01(
        0.75 * skill_score_value + 0.25 * domain_overlap
    );

    domain_major_fit: float = 0.4;
    if len(resume_domains) > 0 and len(company_domains) > 0 {
        domain_major_fit = overlap_ratio(resume_domains, company_domains);
    }

    user_role_types: list = [];
    if "role_types" in user {
        for item in user["role_types"] {
            user_role_types.append(item);
        }
    }
    role_type_fit: float = role_type_score(user_role_types, company_positions);

    sponsorship_label: str = classify_sponsorship(company_sponsorship);
    needs_sponsorship: bool = bool(user["needs_sponsorship"])
        if "needs_sponsorship" in user
        else False;
    sponsorship_fit: float = sponsorship_score(needs_sponsorship, sponsorship_label);

    user_degree: str = infer_degree(raw_text);
    degree_fit: float = degree_score(user_degree, company_degree_levels);

    preferred_locations: list = [];
    if "preferred_locations" in user {
        for item in user["preferred_locations"] {
            preferred_locations.append(item);
        }
    }

    location_fit: float = location_score(preferred_locations, company_regions);

    company_fit_raw: float = (
        0.40 * experience_skill_fit + 0.20 * domain_major_fit + 0.15 * role_type_fit + 0.15 * sponsorship_fit + 0.05 * degree_fit + 0.05 * location_fit
    );

    matched_domains: list[str] = [];
    for d in resume_domains {
        if d in company_domains and d not in matched_domains {
            matched_domains.append(d);
        }
    }

    score_breakdown: dict = {
        "experience_skill_fit": round4(experience_skill_fit),
        "domain_major_fit": round4(domain_major_fit),
        "role_type_fit": round4(role_type_fit),
        "sponsorship_fit": round4(sponsorship_fit),
        "degree_fit": round4(degree_fit),
        "location_fit": round4(location_fit)
    };

    matched_skills: list = [];
    if "matched_skills" in skill_result {
        for item in skill_result["matched_skills"] {
            matched_skills.append(item);
        }
    }

    why_fit = build_why_fit(
        matched_skills, matched_domains, company, sponsorship_label, score_breakdown
    );

    action_plan = build_action_plan(company, sponsorship_label, matched_skills);

    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "score": round1(10.0 * clamp01(company_fit_raw)),
        "score_breakdown": score_breakdown,
        "positions": company_positions,
        "regions": company_regions,
        "degree_levels": company_degree_levels,
        "majors": slice_list(company_majors, 8),
        "sponsorship_label": sponsorship_label,
        "matched_skills": slice_list(matched_skills, 6),
        "matched_domains": matched_domains,
        "why_fit": why_fit,
        "action_plan": action_plan,
        "details": {
            "fair_day": company["fair_day"] if "fair_day" in company else "",
            "website": company["website"] if "website" in company else "",
            "careers_url": company["careers_url"] if "careers_url" in company else "",
            "sponsorship_notes": company["sponsorship_notes"]
                if "sponsorship_notes" in company
                else ""
        }
    };
}


def insert_sorted_by_score(items: list, item: dict) -> list {
    result: list = [];
    inserted: bool = False;
    item_score: float = float(item["score"]);

    for existing in items {
        existing_score: float = float(existing["score"]);
        if not inserted and item_score > existing_score {
            result.append(item);
            inserted = True;
        }
        result.append(existing);
    }

    if not inserted {
        result.append(item);
    }

    return result;
}

def rank_companies_for_user(user_id: str, event_id: str) -> dict {
    user = get_user_by_id(user_id);
    if user is None {
        return {"error": "user_not_found"};
    }

    resume = get_latest_resume(user_id);
    if resume is None {
        return {"error": "no_resume"};
    }

    companies = get_companies_full(event_id);
    ranked: list = [];

    for raw_company in companies {
        company: dict = {};
        for k in raw_company {
            company[k] = raw_company[k];
        }

        scored = score_company(resume, user, company);
        ranked = insert_sorted_by_score(ranked, scored);
    }

    return {"matches": slice_list(ranked, 10), "total_companies_scored": len(ranked)};
}
