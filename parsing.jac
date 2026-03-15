# parsing.jac
def parse_resume_text(raw_text: str) -> dict {
    skills: list[str] = [];
    bullets: list[str] = [];

    for line in raw_text.split("\n") {
        if "Python" in line and "Python" not in skills {
            skills.append("Python");
        }
        if "SQL" in line and "SQL" not in skills {
            skills.append("SQL");
        }
        if line.strip().startswith("-") {
            bullets.append(line.strip()[1:]);
        }
    }

    return {
        "skills": skills,
        "experience_bullets": bullets,
        "projects": [],
        "education": {}
    };
}
