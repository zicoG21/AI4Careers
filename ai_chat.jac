import json;

import from db {
    get_latest_resume,
    get_all_events,
    get_companies,
    get_company,
    get_roles,
    get_user_by_id
}
import from matching {
    rank_companies_for_user,
    find_company_match_for_user,
    render_single_match_text
}

import from security { token_to_user_id }

glob DEFAULT_EVENT_ID: str = "evt_umich_fall_2025";

obj CareerFairAssistant {
    has user_id: str;
    has event_id: str = DEFAULT_EVENT_ID;

    def get_resume_text() -> str {
        resume = get_latest_resume(self.user_id);
        if resume is None {
            return "No resume found for this user.";
        }

        raw_text = resume["raw_text"] if "raw_text" in resume else "";
        if raw_text == "" {
            return "Resume exists, but raw text is empty.";
        }

        if len(raw_text) > 3000 {
            raw_text = raw_text[:3000] + "\n[truncated]";
        }

        return raw_text;
    }

    def get_user_profile() -> str {
        user = get_user_by_id(self.user_id);
        if user is None {
            return "User not found.";
        }

        profile = {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "needs_sponsorship": user["needs_sponsorship"],
            "work_authorization": user["work_authorization"],
            "preferred_locations": user["preferred_locations"],
            "work_modes": user["work_modes"],
            "role_types": user["role_types"]
        };
        return json.dumps(profile);
    }

    def list_event_summary() -> str {
        events = get_all_events();
        return json.dumps(events);
    }

    def list_companies_for_event() -> str {
        companies = get_companies(
            self.event_id,
            {
                "fair_day": "",
                "position_type": "",
                "sponsors": "",
                "region": "",
                "major_search": ""
            }
        );
        return json.dumps(companies[:30]);
    }

    def search_companies(query: str) -> str {
        companies = get_companies(
            self.event_id,
            {
                "fair_day": "",
                "position_type": "",
                "sponsors": "",
                "region": "",
                "major_search": ""
            }
        );

        q = query.lower().strip();
        if q == "" {
            return json.dumps(companies[:20]);
        }

        matched: list = [];
        for company in companies {
            haystack = (
                company["name"] + " " + company["fair_day"] + " " + " ".join(
                    company["positions"]
                ) + " " + " ".join(company["degree_levels"]) + " " + " ".join(
                    company["sponsorship"]
                ) + " " + " ".join(company["regions"]) + " " + company["description"]
            ).lower();

            if q in haystack {
                matched.append(company);
            }
        }

        return json.dumps(matched[:20]);
    }

    def get_company_details(company_id: str) -> str {
        company = get_company(self.event_id, company_id);
        if company is None {
            return "Company not found.";
        }
        return json.dumps(company);
    }

    def list_roles_for_event() -> str {
        roles = get_roles(self.event_id);
        return json.dumps(roles);
    }

    def search_roles(query: str) -> str {
        roles = get_roles(self.event_id);
        q = query.lower().strip();

        if q == "" {
            return json.dumps(roles[:30]);
        }

        matched: list = [];
        for role in roles {
            haystack = (
                role["title"] + " " + role["location"] + " " + role["work_mode"] + " " + role[
                    "sponsorship"
                ]
            ).lower();

            if q in haystack {
                matched.append(role);
            }
        }

        return json.dumps(matched[:30]);
    }

    def answer(question: str, history_text: str) -> str by llm(
        tools=[
            self.get_resume_text,
            self.get_user_profile,
            self.list_event_summary,
            self.list_companies_for_event,
            self.search_companies,
            self.get_company_details,
            self.list_roles_for_event,
            self.search_roles
        ]
    );

    def optimize_resume(resume_text: str, focus: str) -> str by llm();
    def generate_pitch(resume_text: str, target: str) -> str by llm();
}

obj MatchFormatter {
    def render(top_matches_json: str) -> str by llm();
}

sem MatchFormatter.render = "You are formatting pre-ranked career fair company matches for a student. IMPORTANT: Do not change the ranking, do not invent companies, and do not change the provided scores. Use the companies exactly in the given order. Return markdown. Start with a short 1-2 sentence intro, then list all 10 companies. For each company include: 1) company name as a heading, 2) Score in the format 'Score: X/10', 3) Roles, 4) Location, 5) Why Fit as bullet points using the provided why_fit and matched_skills, 6) Action Plan as bullet points using the provided action_plan, 7) Details including sponsorship label, degree levels, and majors. Keep it concise but informative.";
sem MatchFormatter.render.top_matches_json = "JSON list of the top 10 pre-scored companies, already ranked best to worst.";

sem CareerFairAssistant.answer = "You are an AI career fair assistant for a University of Michigan student. Answer naturally and helpfully. Use tools before making claims about the student's resume or the career fair database. If asked for the best-fit companies, compare the student's resume, profile, locations, sponsorship needs, and company/role information, then recommend a few concrete companies with reasons. If resume data is missing, say so clearly and ask the user to upload one.";
sem CareerFairAssistant.answer.question = "The user's newest chat message.";
sem CareerFairAssistant.answer.history_text = "Conversation history formatted as plain text, oldest to newest.";

sem CareerFairAssistant.get_resume_text = "Get the latest uploaded resume text for the current user.";
sem CareerFairAssistant.get_user_profile = "Get the current user's stored profile and job preferences.";
sem CareerFairAssistant.list_event_summary = "List available career fair events in the database.";
sem CareerFairAssistant.list_companies_for_event = "List company summaries for the current career fair event.";
sem CareerFairAssistant.search_companies = "Search company summaries by keyword such as software, robotics, sponsorship, Michigan, or a company name.";
sem CareerFairAssistant.get_company_details = "Get full details for one company using company_id.";
sem CareerFairAssistant.list_roles_for_event = "List role summaries for the current event.";
sem CareerFairAssistant.search_roles = "Search role summaries by keyword such as intern, software, ML, data, embedded, or location.";

sem CareerFairAssistant.optimize_resume = "You are a senior resume editor for US tech recruiting. Rewrite and optimize resume text while preserving truthfulness. Do NOT invent experience, metrics, tools, employers, titles, dates, or outcomes. If a metric is missing, keep it qualitative. If focus is provided, optimize toward that target role. Return markdown with exactly these sections in this order: 1) ## Summary (3-4 lines) 2) ## Experience (rewritten bullet points grouped by role/employer if identifiable) 3) ## Projects (rewritten bullet points) 4) ## Skills (clean grouped list: Languages, Frameworks, Tools) 5) ## Suggested Missing Metrics (a short checklist of where numbers could be added later). Keep strong action verbs and concise recruiter-friendly phrasing.";
sem CareerFairAssistant.optimize_resume.resume_text = "The student's raw resume text.";
sem CareerFairAssistant.optimize_resume.focus = "Optional target role or direction such as backend internship, data science intern, ML engineer intern, product analyst.";

sem CareerFairAssistant.generate_pitch = "You are a career coach. Generate a polished 45-60 second elevator pitch based strictly on the resume text. Keep it concise, natural, and recruiter-friendly. Include: background, core strengths, and target roles. Do NOT fabricate details. Return markdown with sections: 1) Elevator Pitch 2) 20-second Version 3) Delivery Tips.";
sem CareerFairAssistant.generate_pitch.resume_text = "The student's raw resume text.";
sem CareerFairAssistant.generate_pitch.target = "Optional role/company target context from user.";

def history_to_text(history: list) -> str {
    lines: list[str] = [];

    for msg in history {
        role = msg["role"] if "role" in msg else "user";
        content = msg["content"] if "content" in msg else "";
        lines.append(role + ": " + content);
    }

    return "\n".join(lines);
}

walker:pub ChatWithAI {
    has token: str;
    has question: str;
    has history: list = [];
    has event_id: str = DEFAULT_EVENT_ID;

    can chat with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" {
            report {"error": "unauthorized"};
            return;
        }

        assistant = CareerFairAssistant(user_id=uid, event_id=self.event_id);
        recent_history = self.history[-6:] if len(self.history) > 6 else self.history;
        history_text = history_to_text(recent_history);

        q = self.question.strip();
        ql = q.lower();

        try {
            # /match -> either rank all companies or show one specific company
            if ql.startswith("/match") {
                extra = q[6:].strip();

                # Case 1: specific company query, e.g. /match Google
                if extra != "" {
                    single_result = find_company_match_for_user(
                        uid, self.event_id, extra
                    );

                    if "error" in single_result {
                        if single_result["error"] == "no_resume" {
                            report {
                                "answer": "I couldn't find a resume for you yet. Please upload a resume PDF first, then try /match again.",
                                "mode": "match"
                            };
                            return;
                        }

                        if single_result["error"] == "company_not_found" {
                            report {
                                "answer": "I couldn't find a company matching \"" + extra.strip() + "\" in the current career fair database. Please check the spelling and try again.",
                                "mode": "match"
                            };
                            return;
                        }

                        report {
                            "error": "match_failed",
                            "details": single_result["error"]
                        };
                        return;
                    }

                    company_result = single_result["match"];
                    answer = render_single_match_text(company_result);

                    report {"answer": answer, "mode": "match", "match": company_result};
                    return;
                }

                # Case 2: no company specified, return top 10 ranked companies
                result = rank_companies_for_user(uid, self.event_id);

                if "error" in result {
                    if result["error"] == "no_resume" {
                        report {
                            "answer": "I couldn't find a resume for you yet. Please upload a resume PDF first, then try /match again.",
                            "mode": "match"
                        };
                        return;
                    }

                    report {"error": "match_failed", "details": result["error"]};
                    return;
                }

                matches = result["matches"];
                formatter = MatchFormatter();
                answer = formatter.render(json.dumps(matches));

                report {
                    "answer": answer,
                    "mode": "match",
                    "matches": matches,
                    "total_companies_scored": result["total_companies_scored"]
                };
                return;
            }

            # /optimize -> resume optimization
            if ql.startswith("/optimize") {
                focus = q[9:].strip();
                resume_text = assistant.get_resume_text();

                if resume_text.startswith("No resume found")
                or resume_text.startswith("Resume exists, but raw text is empty") {
                    report {
                        "answer": "I couldn't find usable resume text. Please upload a resume PDF first, then try /optimize again.",
                        "mode": "optimize"
                    };
                    return;
                }

                optimized = assistant.optimize_resume(resume_text, focus);
                report {"answer": optimized, "mode": "optimize"};
                return;
            }

            # /pitch -> elevator pitch generation
            if ql.startswith("/pitch") {
                target = q[6:].strip();
                resume_text = assistant.get_resume_text();

                if resume_text.startswith("No resume found")
                or resume_text.startswith("Resume exists, but raw text is empty") {
                    report {
                        "answer": "I couldn't find usable resume text. Please upload a resume PDF first, then try /pitch again.",
                        "mode": "pitch"
                    };
                    return;
                }

                pitch = assistant.generate_pitch(resume_text, target);
                report {"answer": pitch, "mode": "pitch"};
                return;
            }

            # default normal chat
            answer = assistant.answer(q, history_text);
            report {"answer": answer, "mode": "chat"};
        } except Exception as e {
            report {"error": "ai_chat_failed", "details": str(e)};
        }
    }
}

walker:pub GenerateElevatorPitch {
    has token: str;
    has company_id: str;
    has event_id: str = DEFAULT_EVENT_ID;

    can generate with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" {
            report {"error": "unauthorized"};
            return;
        }

        assistant = CareerFairAssistant(user_id=uid, event_id=self.event_id);
        resume_text = assistant.get_resume_text();

        if resume_text.startswith("No resume found")
        or resume_text.startswith("Resume exists, but raw text is empty") {
            report {"error": "no_resume"};
            return;
        }

        company = get_company(self.event_id, self.company_id);
        target = "";
        if company is not None {
            target = company["name"] + " - " + ", ".join(company["positions"]);
        }

        try {
            pitch = assistant.generate_pitch(resume_text, target);
            report {"pitch": pitch};
        } except Exception as e {
            report {"error": "pitch_failed", "details": str(e)};
        }
    }
}
