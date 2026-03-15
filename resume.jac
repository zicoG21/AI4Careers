# resume.jac
import from db { create_resume, get_resume, get_latest_resume }
import from security { token_to_user_id }
import from parsing { parse_resume_text }

walker:pub ResumeUpload {
    has token: str;
    has filename: str;
    has raw_text: str;

    can upload_resume with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" {
            report {"error": "unauthorized"};
            return;
        }

        # Parse resume text
        extracted = parse_resume_text(self.raw_text);

        # Create resume in database
        resume_id = create_resume(
            uid,
            self.filename,
            self.raw_text,
            extracted["skills"],
            extracted["experience_bullets"],
            extracted["projects"],
            extracted["education"]
        );

        report {
            "resume_id": resume_id,
            "status": "parsed",
            "extraction_summary": {"skills_count": len(extracted["skills"])}
        };
    }
}

walker:pub GetResume {
    has token: str;
    has resume_id: str;

    can fetch with Root entry {
        uid = token_to_user_id(self.token);
        if uid == "" {
            report {"error": "unauthorized"};
            return;
        }

        resume = get_resume(self.resume_id, uid);
        if resume is None {
            report {"error": "not_found"};
            return;
        }

        report resume;
    }
}
