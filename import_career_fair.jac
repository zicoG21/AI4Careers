import csv;
import json;
import os;
import from uuid { uuid4 }

import from db { init_db, clear_event_import, insert_event, upsert_company, insert_role }

glob CAREER_FAIR_CSV: str = os.path.join(
         "data", "umich_fall_2025_company.csv"
     );

glob EVENT_ID: str = "evt_umich_fall_2025";
glob EVENT_NAME: str = "University of Michigan Fall 2025 Career Fair";
glob EVENT_TERM: str = "Fall 2025";
glob EVENT_START: str = "2025-09-22";
glob EVENT_END: str = "2025-09-23";

def _safe_str(value: object) -> str {
    if value is None {
        return "";
    }
    txt = str(value).strip();
    if txt.lower() == "nan" {
        return "";
    }
    return txt;
}

def _split_csv_like(value: object) -> list {
    text = _safe_str(value);
    if text == "" {
        return [];
    }

    if "\n" in text {
        parts = text.split("\n");
    } elif "|" in text {
        parts = text.split("|");
    } elif ";" in text {
        parts = text.split(";");
    } else {
        parts = text.split(",");
    }

    cleaned: list = [];
    for part in parts {
        item = _safe_str(part);
        if item != "" and item not in cleaned {
            cleaned.append(item);
        }
    }
    return cleaned;
}

def _split_sponsorship(value: object) -> list {
    text = _safe_str(value);
    if text == "" {
        return [];
    }

    if "\n" in text {
        parts = text.split("\n");
    } elif "|" in text {
        parts = text.split("|");
    } elif ";" in text {
        parts = text.split(";");
    } else {
        parts = [text];
    }

    cleaned: list = [];
    for part in parts {
        item = _safe_str(part);
        if item != "" and item not in cleaned {
            cleaned.append(item);
        }
    }
    return cleaned;
}


def _to_bool(value: object) -> bool {
    text = _safe_str(value).lower();
    return text in ["true", "1", "yes", "y"];
}

def _normalize_url(value: object) -> str {
    text = _safe_str(value);
    if text == "" {
        return "";
    }

    if text.startswith("http://") or text.startswith("https://") {
        return text;
    }

    return "https://" + text;
}

def _make_role_titles(row: dict) -> list {
    role_titles = _split_csv_like(row["role_titles"]);
    positions = _split_csv_like(row["positions_recruited"]);
    sponsorship_list = _split_sponsorship(row["work_authorization_sponsorship"]);
    regions = _split_csv_like(row["regions_recruited"]);
    degree_levels = _split_csv_like(row["degree_levels_recruited"]);

    sponsorship_value = "Unknown";
    if len(sponsorship_list) > 0 {
        sponsorship_value = ", ".join(sponsorship_list);
    }

    role_tags: list = list(positions);
    for d in degree_levels {
        role_tags.append(d);
    }

    roles: list = [];

    if len(role_titles) > 0 {
        for title in role_titles {
            roles.append(
                {
                    "title": title,
                    "category": positions[0] if len(positions) > 0 else "",
                    "location": ", ".join(regions),
                    "work_mode": "",
                    "sponsorship": sponsorship_value,
                    "description": _safe_str(row["description"]),
                    "tags": role_tags
                }
            );
        }
        return roles;
    }

    for position in positions {
        roles.append(
            {
                "title": position + " Opportunity - " + _safe_str(row["employer_name"]),
                "category": position,
                "location": ", ".join(regions),
                "work_mode": "",
                "sponsorship": sponsorship_value,
                "description": _safe_str(row["description"]),
                "tags": degree_levels
            }
        );
    }

    return roles;
}

def import_career_fair(csv_path: str) -> dict {
    init_db();
    clear_event_import(EVENT_ID);

    insert_event({
        'event_id': EVENT_ID,
        'name': EVENT_NAME,
        'term': EVENT_TERM,
        'start_date': EVENT_START,
        'end_date': EVENT_END
    });

    company_count: int = 0;
    role_count: int = 0;

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as csvfile {
        reader = csv.DictReader(csvfile);
        for row in reader {
            company_id = _safe_str(row["company_id"]);

            if company_id == "" {
                continue;
            }

            sponsorship_flag = _safe_str(row.get("sponsorship_flag", ""));
            if sponsorship_flag == "" {
                sponsorship_flag = "No";
            }
            sponsorship_status = _safe_str(row.get("sponsorship_status", ""));
            if sponsorship_status == "" {
                sponsorship_status = "No";
            }

            upsert_company({
                'company_id': company_id,
                'event_id': EVENT_ID,
                'name': _safe_str(row["employer_name"]),
                'icon_url': "",
                'fair_day': _safe_str(row.get("fair_days", row.get("fair_day", ""))),
                'is_multi_day': 1 if _to_bool(row["is_multi_day_company"]) else 0,
                'website': _normalize_url(row["website"]),
                'careers_url': _normalize_url(row["company_careers_website"]),
                'description': _safe_str(row["description"]),
                'positions': _split_csv_like(row["positions_recruited"]),
                'degree_levels': _split_csv_like(row["degree_levels_recruited"]),
                'academic_years': _split_csv_like(row["academic_years_recruited"]),
                'majors': _split_csv_like(row["degrees_majors_recruited"]),
                'sponsorship': _split_sponsorship(row["work_authorization_sponsorship"]),
                'sponsorship_notes': _safe_str(row["work_authorization_notes"]),
                'sponsorship_flag': sponsorship_flag,
                'sponsorship_status': sponsorship_status,
                'regions': _split_csv_like(row["regions_recruited"]),
                'accepts_hardcopy': 1 if _to_bool(row["accept_hardcopy_resumes"]) else 0
            });
            company_count += 1;

            role_defs = _make_role_titles(row);
            for role in role_defs {
                role_id = "role_" + str(uuid4())[:8];

                insert_role({
                    'role_id': role_id,
                    'event_id': EVENT_ID,
                    'company_id': company_id,
                    'title': role["title"],
                    'category': role["category"],
                    'location': role["location"],
                    'work_mode': role["work_mode"],
                    'sponsorship': role["sponsorship"],
                    'description': role["description"],
                    'tags': role["tags"],
                    'role_source_url': _safe_str(row.get("role_source_url", "")),
                    'role_last_checked': _safe_str(row.get("role_last_checked", ""))
                });
                role_count += 1;
            }
        }
    }

    return {
        "ok": True,
        "event_id": EVENT_ID,
        "companies_imported": company_count,
        "roles_imported": role_count,
        "csv_path": csv_path
    };
}

with entry {
    result = import_career_fair(CAREER_FAIR_CSV);
    print(result);
}
