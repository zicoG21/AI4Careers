# resume_telling.jac — Resume Telling features ported to AI4Careers runtime
import from db {
    create_resume_version, list_resume_versions, get_resume_version,
    update_resume_version_parsed, update_resume_version_section_order,
    update_resume_version_meta, delete_resume_version,
    create_experience, list_experiences, update_experience,
    delete_experience, get_experience,
    create_story, list_stories, get_story, update_story, delete_story
}
import from security { token_to_user_id }
import from resume_utils { parse_resume_file, generate_resume_docx }
import json;

# ---------------------------------------------------------------------------
# LLM-powered types
# ---------------------------------------------------------------------------

obj ContactInfo {
    has email: str;
    has phone: str;
    has linkedin: str;
    has github: str;
    has location: str;
}

obj ExperienceEntry {
    has company: str;
    has role: str;
    has dates: str;
    has location: str;
    has bullets: list[str];
}

sem ExperienceEntry.bullets = "List of resume bullet points for this role";

obj EducationEntry {
    has institution: str;
    has degree: str;
    has dates: str;
    has gpa: str;
}

sem EducationEntry.gpa = "GPA string, e.g. '3.8/4.0', or empty string if not listed";

obj ProjectEntry {
    has name: str;
    has dates: str;
    has bullets: list[str];
    has technologies: list[str];
}

sem ProjectEntry.technologies = "List of technologies/tools used in this project";

obj ResumeStructured {
    has name: str;
    has contact: ContactInfo;
    has summary: str;
    has experience: list[ExperienceEntry];
    has education: list[EducationEntry];
    has skills: list[str];
    has projects: list[ProjectEntry];
    has certifications: list[str];
}

sem ResumeStructured.skills = "All skills, tools, languages, and frameworks extracted from the resume";
sem ResumeStructured.certifications = "List of certifications or awards, empty list if none";

"""Parse raw resume text into a structured resume object."""
def parse_resume_with_llm(raw_text: str) -> ResumeStructured by llm();

"""Rewrite the given resume bullet point to be more concise while preserving all key details. Return ONLY the rewritten bullet point text — no explanations, no meta-commentary."""
def shorten_bullet(bullet: str) -> str by llm();

"""Rewrite the given resume bullet point to be longer and more detailed, adding specifics about impact, scope, or technologies. Return ONLY the rewritten bullet point text — no explanations."""
def lengthen_bullet(bullet: str) -> str by llm();

"""Rewrite the given resume bullet point according to the user's instruction. Return ONLY the rewritten bullet point text — do not explain the changes or include any commentary."""
def rewrite_bullet(bullet: str, instruction: str) -> str by llm();

"""You are rewriting existing resume bullets for a specific job target.

Treat each input bullet as the source of truth. Your job is to REPLACE each original bullet with a better version of that same bullet, not to explain how it should be changed.

CRITICAL RULES:
- Return the SAME NUMBER of bullet points as the input, in the same order.
- Each output item must be a finished resume bullet that could be pasted directly onto the resume.
- Preserve the candidate's actual work, tools, and accomplishments. Rephrase; do not invent new projects or responsibilities.
- Incorporate relevant keywords from the job_description only when they genuinely match the original bullet.
- Start each bullet with a strong past-tense action verb.
- Keep each bullet concise and concrete.

NEVER write bullets that sound like instructions, commentary, or analysis.
Do NOT use phrases like:
- "Highlight..."
- "Emphasize..."
- "Showcase..."
- "Mention..."
- "Aligning with..."
- "Relevant to..."
- "To demonstrate..."
- "To match the role..."
- "To showcase..."
- "Adapted ... to highlight ..."

BAD:
- "Emphasized Python experience to match machine learning qualifications."
- "Showcased collaboration with research labs, aligning with teamwork skills."

GOOD:
- "Built Python-based deep learning pipelines for medical imaging experiments, improving model training workflows and evaluation speed."
- "Collaborated with cross-functional research teams to develop CLI tools and support publication-driven analysis workflows."

Return ONLY the rewritten bullet points with no explanation, no notes, and no extra text."""
def tailor_bullets(bullets: list[str], job_description: str, target_role: str) -> list[str] by llm();

"""Write a 2-3 sentence professional summary for this candidate targeting the given role at the given company. Return ONLY the summary paragraph — no labels, no headings."""
def generate_summary(structured_resume: str, target_role: str, company: str) -> str by llm();

"""Rewrite each bullet point to include quantitative metrics (numbers, percentages, dollar amounts, time saved, users served, etc.) where plausible. Return ONLY the rewritten bullet points — same count, same order. Each must be an actual achievement statement, not a suggestion."""
def quantify_bullets(bullets: list[str]) -> list[str] by llm();

obj SkillMatchResult {
    has matched: list[str];
    has partial: list[str];
    has missing_key: list[str];
    has score: int;
}

sem SkillMatchResult.matched = "Resume skills that clearly satisfy a JD requirement";
sem SkillMatchResult.partial = "Resume skills related or adjacent to JD requirements";
sem SkillMatchResult.missing_key = "Important JD skills the resume lacks entirely";
sem SkillMatchResult.score = "Overall match score 0-100";

"""Compare resume skills against the job description using semantic matching."""
def match_skills(resume_skills: list[str], job_description: str) -> SkillMatchResult by llm();

"""Generate a professional cover letter."""
def generate_cover_letter_llm(
    candidate_name: str, target_role: str, company: str,
    company_info: str, talking_points: list[str],
    tone_notes: str, resume_summary: str
) -> str by llm();

# BQ Story types
obj BQStoryStructure {
    has situation: str;
    has task: str;
    has action: str;
    has result: str;
    has themes: list[str];
    has follow_up_questions: list[str];
}

sem BQStoryStructure.themes = "List of BQ topics this story covers including Amazon Leadership Principles and general behavioral themes";
sem BQStoryStructure.follow_up_questions = "List of 3-5 likely interviewer follow-up questions";

"""Build a complete STAR-format BQ story from an experience and a brief situation seed."""
def build_bq_story(
    experience_context: str, story_seed: str, themes_hint: list[str]
) -> BQStoryStructure by llm();

obj StoryRecommendation {
    has story_index: int;
    has reason: str;
    has key_points_to_emphasize: list[str];
}

sem StoryRecommendation.story_index = "0-based index into the story_summaries list";
sem StoryRecommendation.key_points_to_emphasize = "2-4 specific points from the story to highlight";

"""Recommend the best story for a given BQ interview question."""
def recommend_story_for_question(question: str, story_summaries: list[str]) -> StoryRecommendation by llm();

"""Suggest 3-5 follow-up questions to enrich a story."""
def suggest_story_questions(story_seed: str, experience_context: str) -> list[str] by llm();

# ---------------------------------------------------------------------------
# Helper to serialize parsed LLM result to JSON
# ---------------------------------------------------------------------------
def structured_to_json(s: ResumeStructured) -> str {
    contact_dict = {
        "email": s.contact.email, "phone": s.contact.phone,
        "linkedin": s.contact.linkedin, "github": s.contact.github,
        "location": s.contact.location
    };
    exp_list = [
        {"company": e.company, "role": e.role, "dates": e.dates,
         "location": e.location, "bullets": e.bullets}
        for e in s.experience
    ];
    edu_list = [
        {"institution": e.institution, "degree": e.degree,
         "dates": e.dates, "gpa": e.gpa}
        for e in s.education
    ];
    proj_list = [
        {"name": p.name, "dates": p.dates, "bullets": p.bullets,
         "technologies": p.technologies}
        for p in s.projects
    ];
    return json.dumps({
        "name": s.name, "contact": contact_dict, "summary": s.summary,
        "experience": exp_list, "education": edu_list,
        "skills": s.skills, "projects": proj_list,
        "certifications": s.certifications
    });
}

def derive_section_order(parsed: dict) -> list {
    order = [];
    if parsed is None { return order; }
    if parsed.get("summary") { order.append("summary"); }
    if parsed.get("experience") { order.append("experience"); }
    if parsed.get("projects") { order.append("projects"); }
    if parsed.get("education") { order.append("education"); }
    if parsed.get("skills") { order.append("skills"); }
    if parsed.get("certifications") { order.append("certifications"); }
    return order;
}

# ---------------------------------------------------------------------------
# Resume walkers
# ---------------------------------------------------------------------------

walker:pub RTUploadResume {
    has token: str = "";
    has file_name: str = "resume.txt";
    has file_data: str = "";
    has plain_text: str = "";
    has version_name: str = "My Resume";
    has label: str = "general";
    has company_tag: str = "Other";

    can upload with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }

        raw = "";
        if self.file_data {
            raw = parse_resume_file(self.file_name, self.file_data);
        } elif self.plain_text {
            raw = self.plain_text;
        }
        if not raw { report {"error": "No content provided"}; return; }

        structured = parse_resume_with_llm(raw);
        parsed_json = structured_to_json(structured);
        parsed = json.loads(parsed_json);
        section_order = derive_section_order(parsed);

        ct = self.company_tag if self.company_tag else "Other";
        rv_id = create_resume_version(
            uid, self.version_name, self.label, ct, self.file_name,
            raw, parsed_json, json.dumps(section_order)
        );

        report {
            "resume_id": rv_id,
            "version_name": self.version_name,
            "label": self.label,
            "company_tag": ct,
            "parsed": parsed,
            "section_order": section_order
        };
    }
}

walker:pub RTListResumes {
    has token: str = "";

    can list_all with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        report list_resume_versions(uid);
    }
}

walker:pub RTGetResume {
    has token: str = "";
    has resume_id: str = "";

    can get with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        report rv;
    }
}

walker:pub RTDeleteResume {
    has token: str = "";
    has resume_id: str = "";

    can remove with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        success = delete_resume_version(self.resume_id, uid);
        if not success { report {"error": "Resume not found"}; return; }
        report {"deleted": self.resume_id};
    }
}

walker:pub RTUpdateResumeVersion {
    has token: str = "";
    has resume_id: str = "";
    has version_name: str = "";
    has label: str = "";
    has company_tag: str = "";

    can update with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        vn = self.version_name if self.version_name else rv["version_name"];
        lb = self.label if self.label else rv["label"];
        ct = self.company_tag if self.company_tag else rv["company_tag"];
        if not ct { ct = "Other"; }
        update_resume_version_meta(self.resume_id, uid, vn, lb, ct);
        report {"resume_id": self.resume_id, "version_name": vn, "label": lb, "company_tag": ct};
    }
}

walker:pub RTUpdateResumeParsed {
    has token: str = "";
    has resume_id: str = "";
    has parsed_data: dict = {};

    can update with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        update_resume_version_parsed(self.resume_id, uid, json.dumps(self.parsed_data));
        report {"resume_id": self.resume_id, "updated": True};
    }
}

walker:pub RTUpdateSectionOrder {
    has token: str = "";
    has resume_id: str = "";
    has section_order: list = [];

    can update with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        update_resume_version_section_order(self.resume_id, uid, json.dumps(self.section_order));
        report {"section_order": self.section_order};
    }
}

walker:pub RTMoveSectionItem {
    has token: str = "";
    has resume_id: str = "";
    has section: str = "";
    has index: int = 0;
    has direction: str = "";

    can move with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        parsed = rv["parsed"];
        items = parsed.get(self.section, []);
        idx = self.index;
        if self.direction == "up" and idx > 0 {
            tmp = items[idx - 1]; items[idx - 1] = items[idx]; items[idx] = tmp;
        } elif self.direction == "down" and idx < len(items) - 1 {
            tmp = items[idx + 1]; items[idx + 1] = items[idx]; items[idx] = tmp;
        }
        parsed[self.section] = items;
        update_resume_version_parsed(self.resume_id, uid, json.dumps(parsed));
        report {"ok": True, "section": self.section, "index": idx, "direction": self.direction};
    }
}

# ---------------------------------------------------------------------------
# Tailoring walkers
# ---------------------------------------------------------------------------

walker:pub RTAdjustBullet {
    has token: str = "";
    has bullet: str = "";
    has direction: str = "";
    has prompt: str = "";

    can adjust with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        try {
            if self.prompt {
                result = rewrite_bullet(self.bullet, self.prompt);
            } elif self.direction == "shorten" {
                result = shorten_bullet(self.bullet);
            } else {
                result = lengthen_bullet(self.bullet);
            }
        } except Exception as e {
            report {"error": "Rewrite failed: " + str(e)};
            return;
        }
        report {"bullet": result};
    }
}

walker:pub RTTailorResume {
    has token: str = "";
    has resume_id: str = "";
    has job_description: str = "";
    has target_role: str = "";
    has company: str = "";
    has add_summary: bool = False;
    has quantify: bool = False;
    has keyword_optimize: bool = True;

    can tailor with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        parsed = rv["parsed"];

        def _to_strings(bullets: list) -> list {
            result: list = [];
            for b in bullets {
                if isinstance(b, dict) {
                    result.append(str(b.get("text", b)));
                } else {
                    result.append(str(b));
                }
            }
            return result;
        }

        try {
            for exp in parsed.get("experience", []) {
                if exp.get("bullets") {
                    bullets = _to_strings(exp["bullets"]);
                    if self.keyword_optimize {
                        bullets = tailor_bullets(bullets, self.job_description, self.target_role);
                    }
                    if self.quantify {
                        bullets = quantify_bullets(bullets);
                    }
                    exp["bullets"] = bullets;
                }
            }
            for proj in parsed.get("projects", []) {
                if proj.get("bullets") {
                    bullets = _to_strings(proj["bullets"]);
                    if self.keyword_optimize {
                        bullets = tailor_bullets(bullets, self.job_description, self.target_role);
                    }
                    if self.quantify {
                        bullets = quantify_bullets(bullets);
                    }
                    proj["bullets"] = bullets;
                }
            }
            if self.add_summary {
                parsed["summary"] = generate_summary(json.dumps(parsed), self.target_role, self.company);
            }
        } except Exception as e {
            report {"error": "Tailoring failed: " + str(e)};
            return;
        }
        report {"resume_id": self.resume_id, "tailored_parsed": parsed};
    }
}

walker:pub RTSaveTailoredResume {
    has token: str = "";
    has resume_id: str = "";
    has tailored_parsed: dict = {};
    has save_as_new: bool = False;
    has new_version_name: str = "";
    has company_tag: str = "";

    can save with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }

        try {
            tp = self.tailored_parsed;
            if tp is None { report {"error": "Missing tailored resume data"}; return; }

            ct = rv["company_tag"];
            if not ct { ct = "Other"; }
            co_override = "";
            if self.company_tag {
                co_override = str(self.company_tag).strip();
                if co_override { ct = co_override; }
            }

            parsed_json = json.dumps(tp);

            if self.save_as_new {
                vn = self.new_version_name if self.new_version_name else rv["version_name"] + " (Tailored)";
                so = derive_section_order(tp);
                new_id = create_resume_version(
                    uid, vn, rv["label"], ct, rv["file_name"],
                    rv["raw_text"], parsed_json, json.dumps(so)
                );
                report {"resume_id": new_id, "saved_as_new": True, "company_tag": ct};
            } else {
                update_resume_version_parsed(self.resume_id, uid, parsed_json);
                if co_override {
                    update_resume_version_meta(
                        self.resume_id, uid, rv["version_name"], rv["label"], co_override
                    );
                }
                report {"resume_id": self.resume_id, "saved_as_new": False, "company_tag": ct};
            }
        } except Exception as e {
            report {"error": "Save failed: " + str(e)};
        }
    }
}

walker:pub RTMatchSkills {
    has token: str = "";
    has resume_id: str = "";
    has job_description: str = "";

    can match with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        parsed = rv["parsed"];
        skills = parsed.get("skills", []);
        result = match_skills(skills, self.job_description);
        report {
            "matched": result.matched, "partial": result.partial,
            "missing_key": result.missing_key, "score": result.score
        };
    }
}

walker:pub RTGenerateCoverLetter {
    has token: str = "";
    has resume_id: str = "";
    has target_role: str = "";
    has company: str = "";
    has company_info: str = "";
    has talking_points: list = [];
    has tone_notes: str = "";

    can generate with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        parsed = rv["parsed"];
        letter = generate_cover_letter_llm(
            parsed.get("name", ""), self.target_role, self.company,
            self.company_info, self.talking_points, self.tone_notes,
            parsed.get("summary", "")
        );
        report {"cover_letter": letter};
    }
}

walker:pub RTExportResume {
    has token: str = "";
    has resume_id: str = "";

    can export with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        parsed = rv["parsed"];
        file_data = generate_resume_docx(parsed);
        safe_name = rv["version_name"].replace("/", "-").replace("\\", "-");
        report {"file_data": file_data, "file_name": safe_name + ".docx", "format": "docx"};
    }
}

# ---------------------------------------------------------------------------
# Experience walkers
# ---------------------------------------------------------------------------

walker:pub RTAddExperience {
    has token: str = "";
    has company: str = "";
    has role: str = "";
    has dates: str = "";
    has location: str = "";
    has bullets: list = [];
    has description: str = "";

    can add with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        eid = create_experience(uid, self.company, self.role, self.dates, self.location, json.dumps(self.bullets), self.description);
        report {"exp_id": eid, "company": self.company, "role": self.role};
    }
}

walker:pub RTListExperiences {
    has token: str = "";

    can list_all with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        report list_experiences(uid);
    }
}

walker:pub RTUpdateExperience {
    has token: str = "";
    has exp_id: str = "";
    has company: str = "";
    has role: str = "";
    has dates: str = "";
    has location: str = "";
    has bullets: list = [];
    has description: str = "";

    can update with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        exp = get_experience(self.exp_id, uid);
        if exp is None { report {"error": "Experience not found"}; return; }
        c = self.company if self.company else exp["company"];
        r = self.role if self.role else exp["role"];
        d = self.dates if self.dates else exp["dates"];
        l = self.location if self.location else exp["location"];
        b = json.dumps(self.bullets) if self.bullets else json.dumps(exp["bullets"]);
        desc = self.description if self.description else exp["description"];
        update_experience(self.exp_id, uid, c, r, d, l, b, desc);
        report {"exp_id": self.exp_id, "updated": True};
    }
}

walker:pub RTDeleteExperience {
    has token: str = "";
    has exp_id: str = "";

    can remove with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        success = delete_experience(self.exp_id, uid);
        if not success { report {"error": "Experience not found"}; return; }
        report {"deleted": self.exp_id};
    }
}

walker:pub RTImportExperiences {
    has token: str = "";
    has resume_id: str = "";

    can import_exp with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        rv = get_resume_version(self.resume_id, uid);
        if rv is None { report {"error": "Resume not found"}; return; }
        parsed = rv["parsed"];
        created = [];
        for exp_data in parsed.get("experience", []) {
            eid = create_experience(
                uid, exp_data.get("company", ""), exp_data.get("role", ""),
                exp_data.get("dates", ""), exp_data.get("location", ""),
                json.dumps(exp_data.get("bullets", [])), ""
            );
            created.append({"exp_id": eid, "company": exp_data.get("company", ""), "role": exp_data.get("role", "")});
        }
        for proj_data in parsed.get("projects", []) {
            eid = create_experience(
                uid, proj_data.get("name", ""), "Project",
                proj_data.get("dates", ""), "",
                json.dumps(proj_data.get("bullets", [])), ""
            );
            created.append({"exp_id": eid, "company": proj_data.get("name", ""), "role": "Project"});
        }
        report {"imported": created};
    }
}

# ---------------------------------------------------------------------------
# BQ Story walkers
# ---------------------------------------------------------------------------

walker:pub RTBuildStory {
    has token: str = "";
    has exp_id: str = "";
    has story_seed: str = "";
    has title: str = "";
    has themes_hint: list = [];
    has user_notes: str = "";

    can build with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        exp = get_experience(self.exp_id, uid);
        if exp is None { report {"error": "Experience not found"}; return; }
        context = f"Company: {exp['company']} | Role: {exp['role']} | Dates: {exp['dates']}\nBullets: {json.dumps(exp['bullets'])}\nExtra context: {exp['description']}";
        star = build_bq_story(context, self.story_seed, self.themes_hint);
        star_dict = {
            "situation": star.situation, "task": star.task,
            "action": star.action, "result": star.result,
            "themes": star.themes, "follow_up_questions": star.follow_up_questions
        };
        t = self.title if self.title else self.story_seed[:60];
        sid = create_story(uid, self.exp_id, t, json.dumps(star_dict), self.user_notes);
        report {"story_id": sid, "exp_id": self.exp_id, "title": t, "star": star_dict};
    }
}

walker:pub RTSuggestStoryQuestions {
    has token: str = "";
    has exp_id: str = "";
    has story_seed: str = "";

    can suggest with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        exp = get_experience(self.exp_id, uid);
        if exp is None { report {"error": "Experience not found"}; return; }
        context = f"Company: {exp['company']} | Role: {exp['role']}\nContext: {exp['description']}";
        questions = suggest_story_questions(self.story_seed, context);
        report {"questions": questions};
    }
}

walker:pub RTListStories {
    has token: str = "";
    has exp_id: str = "";

    can collect with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        report list_stories(uid, self.exp_id);
    }
}

walker:pub RTGetStory {
    has token: str = "";
    has story_id: str = "";

    can find with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        s = get_story(self.story_id, uid);
        if s is None { report {"error": "Story not found"}; return; }
        report s;
    }
}

walker:pub RTUpdateStory {
    has token: str = "";
    has story_id: str = "";
    has title: str = "";
    has user_notes: str = "";

    can update with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        update_story(self.story_id, uid, self.title, self.user_notes);
        report {"story_id": self.story_id, "updated": True};
    }
}

walker:pub RTDeleteStory {
    has token: str = "";
    has story_id: str = "";

    can remove with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        success = delete_story(self.story_id, uid);
        if not success { report {"error": "Story not found"}; return; }
        report {"deleted": self.story_id};
    }
}

walker:pub RTRecommendStory {
    has token: str = "";
    has question: str = "";

    can recommend with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" { report {"error": "unauthorized"}; return; }
        all_stories_data = list_stories(uid, "");
        if not all_stories_data {
            report {"error": "No stories prepared yet"};
            return;
        }
        story_list = [];
        for s in all_stories_data {
            story_list.append({
                "story_id": s["story_id"],
                "title": s["title"],
                "summary": f"S: {s.get('situation', '')[:120]}"
            });
        }
        summaries = [s["summary"] for s in story_list];
        rec = recommend_story_for_question(self.question, summaries);
        idx = rec.story_index if rec.story_index < len(story_list) else 0;
        report {
            "story_id": story_list[idx]["story_id"],
            "story_title": story_list[idx]["title"],
            "reason": rec.reason,
            "key_points_to_emphasize": rec.key_points_to_emphasize
        };
    }
}
