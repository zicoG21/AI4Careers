# AI4Careers

AI-powered career fair assistant for University of Michigan students. Helps students discover companies, match their resume to opportunities, generate personalized elevator pitches, and navigate the career fair with an intelligent chatbot.

**Live data**: UMich Fall 2025 Career Fair — Sept 22–23, 2025

---

## Features

### Career Fair Browser
- Browse all companies at UMich Fall 2025 with filters: fair day, position type, sponsorship, region, major
- Per-company detail view: description, positions, degree levels, majors, sponsorship policy, regions, website/careers links
- Save companies to a personal list and store a custom elevator pitch per company
- Sponsorship badge on every card: **Sponsors Visas** / **No Sponsorship** / **Check Details**

### AI-Powered Fit Scoring
- Every company card shows a fit score (0–10) based on your uploaded resume
- Sort companies by fit score
- Computed locally — **zero API credits** — using a weighted algorithm across skills, domain, role type, sponsorship, degree, and location

### AI Chatbot
Chat in natural language or use structured commands:

| Command | What it does |
|---------|-------------|
| `/match` | Rank all companies by fit with your resume (returns top 10) |
| `/match [company name]` | Score your fit with one specific company |
| `/pitch` | Generate a 45–60 second tailored elevator pitch |
| `/optimize` | AI-powered resume polish (preserves truth, improves formatting) |
| `/visual` + image | Upload a company logo → identify the company → show fit score |

Quick-action buttons in the chat UI trigger the main commands in one click. Free-form questions work too.

### Visual Company Recognition
- Upload any company logo — the AI identifies the company and returns your fit score
- Two-pass LLM vision: coarse extraction then fine-grained candidate matching
- Supports company aliases (PWC, GM, RTX, EY, AMD, TikTok, etc.)
- Supports both **OpenAI** (`gpt-5.4-nano`) and **Anthropic** (`claude-3-5-haiku-20241022`) for vision — configured separately from the chat model

### Resume Management
- Upload PDF resumes with browser-side text extraction (pdfjs-dist)
- AI parses and stores skills, experience bullets, projects, and education
- Multiple resumes per user; AI always uses your latest upload
- Preview, download, and delete resumes

### User Profile & Preferences
- Set sponsorship needs, work authorization, preferred locations, work modes, and role types
- Preferences auto-applied to company filtering and fit scoring
- Dashboard shows your setup progress and career fair readiness checklist

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend language | **Jac (jaclang) 0.12.2** — version is critical |
| Backend AI | **byllm 0.5.7** via LiteLLM (OpenAI or Anthropic) |
| Database | SQLite at `.jac/data/ai4careers.db` |
| Frontend | **React 19.2.4**, React Router 7.13.1 |
| PDF parsing | pdfjs-dist 5.5.207 (browser-side) |
| HTTP client | axios 1.13.6 |
| Markdown rendering | react-markdown 10.1.0 + remark-gfm 4.0.1 |

---

## Setup

### Prerequisites

| Tool | Required version | Notes |
|------|-----------------|-------|
| Python | **3.12.x** | Must be 3.12 — tested with 3.12.8 |
| Node.js | **16+** | Tested with 23.7.0 |
| jaclang | **0.12.2** | Installed inside venv |
| byllm | **0.5.7** | Installed inside venv |

> **jaclang version is critical.** The walkers use `walker:pub` visibility and `by llm()` syntax that is version-specific. Do not upgrade without testing.

---

### 1. Enter the project directory

```bash
cd AI4Careers
```

### 2. Create a virtual environment with Python 3.12

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Jac and LLM support

```bash
.venv/bin/pip install "jaclang==0.12.2" "byllm==0.5.7"
```

Verify:
```bash
.venv/bin/jac --version    # must print 0.12.2
.venv/bin/pip show byllm   # must show Version: 0.5.7
```

### 4. Configure your LLM model

`jac.toml` is gitignored — each developer keeps their own. Start from the example:

```bash
cp jac.toml.example jac.toml
```

Open `jac.toml` and set your models. Two sections matter:

**`[plugins.byllm.model]`** — controls chat, matching, resume parsing, and pitch generation:
```toml
# OpenAI
default_model = "gpt-4o-mini"

# OR Anthropic
default_model = "claude-haiku-4-5-20251001"
```

**`[plugins.byllm.visual]`** — controls the `/visual` image recognition feature (separate from chat):
```toml
openai_model = "gpt-5.4-nano"
anthropic_model = "claude-3-5-haiku-20241022"
```

The visual feature automatically picks the model matching your available API key.

### 5. Set API keys

Create a `.env` file in the project root (already gitignored). This is loaded only when starting this project's backend and never affects your global shell:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

You only need the key for whichever model you configured. Having both is fine.

### 6. Import career fair data

One-time step to load companies and roles into the database from `data/umich_fall_2025_company.csv`.

> **The backend must not be running** — both need exclusive SQLite access.

```bash
pkill -f 'jac start'   # stop backend if running

python3 - << 'PYEOF'
import csv, json, os, sqlite3
from uuid import uuid4

DB_PATH = '.jac/data/ai4careers.db'
CSV_PATH = 'data/umich_fall_2025_company.csv'
EVENT_ID = 'evt_umich_fall_2025'
EVENT_NAME = 'University of Michigan Fall 2025 Career Fair'
EVENT_TERM = 'Fall 2025'
EVENT_START = '2025-09-22'
EVENT_END = '2025-09-23'

def safe(v):
    if v is None: return ''
    t = str(v).strip(); return '' if t.lower() == 'nan' else t

def split_list(v):
    t = safe(v)
    if not t: return []
    parts = t.split('\n') if '\n' in t else t.split('|') if '|' in t else t.split(';') if ';' in t else t.split(',')
    seen = []; [seen.append(safe(p)) for p in parts if safe(p) and safe(p) not in seen]; return seen

def split_sp(v):
    t = safe(v)
    if not t: return []
    parts = t.split('\n') if '\n' in t else t.split('|') if '|' in t else t.split(';') if ';' in t else [t]
    seen = []; [seen.append(safe(p)) for p in parts if safe(p) and safe(p) not in seen]; return seen

def to_bool(v): return safe(v).lower() in ['true','1','yes','y']
def norm_url(v): t=safe(v); return t if not t or t.startswith('http') else 'https://'+t

def make_roles(row):
    titles = split_list(row.get('role_titles',''))
    pos = split_list(row['positions_recruited'])
    regions = split_list(row['regions_recruited'])
    sp = ', '.join(split_sp(row['work_authorization_sponsorship'])) or 'Unknown'
    desc = safe(row['description']); tags = pos + split_list(row['degree_levels_recruited'])
    if titles:
        return [{'title':t,'category':pos[0] if pos else '','location':', '.join(regions),'sponsorship':sp,'description':desc,'tags':tags} for t in titles]
    return [{'title':p+' Opportunity - '+safe(row['employer_name']),'category':p,'location':', '.join(regions),'sponsorship':sp,'description':desc,'tags':split_list(row['degree_levels_recruited'])} for p in pos]

os.makedirs('.jac/data', exist_ok=True)
conn = sqlite3.connect(DB_PATH)
conn.execute('PRAGMA journal_mode=WAL'); conn.execute('PRAGMA foreign_keys=ON')
c = conn.cursor()

c.execute('''CREATE TABLE IF NOT EXISTS events (event_id TEXT PRIMARY KEY, name TEXT, term TEXT, start_date TEXT, end_date TEXT)''')
c.execute('''CREATE TABLE IF NOT EXISTS companies (company_id TEXT PRIMARY KEY, event_id TEXT, name TEXT NOT NULL, icon_url TEXT DEFAULT '', fair_day TEXT DEFAULT '', is_multi_day INTEGER DEFAULT 0, website TEXT DEFAULT '', careers_url TEXT DEFAULT '', description TEXT DEFAULT '', positions TEXT DEFAULT '[]', degree_levels TEXT DEFAULT '[]', academic_years TEXT DEFAULT '[]', majors TEXT DEFAULT '[]', sponsorship TEXT DEFAULT '[]', sponsorship_notes TEXT DEFAULT '', sponsorship_flag TEXT DEFAULT 'No', sponsorship_status TEXT DEFAULT 'No', regions TEXT DEFAULT '[]', accepts_hardcopy INTEGER DEFAULT 0)''')
c.execute('''CREATE TABLE IF NOT EXISTS roles (role_id TEXT PRIMARY KEY, event_id TEXT, company_id TEXT DEFAULT '', title TEXT NOT NULL, category TEXT DEFAULT '', location TEXT DEFAULT '', work_mode TEXT DEFAULT '', sponsorship TEXT DEFAULT 'Unknown', description TEXT DEFAULT '', tags TEXT DEFAULT '[]', role_source_url TEXT DEFAULT '', role_last_checked TEXT DEFAULT '')''')

for col, typ in [('sponsorship_flag','TEXT DEFAULT "No"'),('sponsorship_status','TEXT DEFAULT "No"')]:
    if col not in [r[1] for r in c.execute('PRAGMA table_info(companies)').fetchall()]:
        c.execute(f'ALTER TABLE companies ADD COLUMN {col} {typ}')
for col, typ in [('company_id','TEXT DEFAULT ""'),('role_source_url','TEXT DEFAULT ""'),('role_last_checked','TEXT DEFAULT ""')]:
    if col not in [r[1] for r in c.execute('PRAGMA table_info(roles)').fetchall()]:
        c.execute(f'ALTER TABLE roles ADD COLUMN {col} {typ}')

c.execute('DELETE FROM roles WHERE event_id=?',(EVENT_ID,))
c.execute('DELETE FROM companies WHERE event_id=?',(EVENT_ID,))
c.execute('DELETE FROM events WHERE event_id=?',(EVENT_ID,))
c.execute('INSERT INTO events VALUES (?,?,?,?,?)',(EVENT_ID,EVENT_NAME,EVENT_TERM,EVENT_START,EVENT_END))

cc = rc = 0
with open(CSV_PATH,'r',encoding='utf-8-sig',newline='') as f:
    for row in csv.DictReader(f):
        cid = safe(row['company_id'])
        if not cid: continue
        flag = safe(row.get('sponsorship_flag','')) or 'No'
        status = safe(row.get('sponsorship_status','')) or 'No'
        fd = safe(row.get('fair_days', row.get('fair_day','')))
        c.execute('''INSERT INTO companies (company_id,event_id,name,icon_url,fair_day,is_multi_day,website,careers_url,description,positions,degree_levels,academic_years,majors,sponsorship,sponsorship_notes,sponsorship_flag,sponsorship_status,regions,accepts_hardcopy)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(company_id) DO UPDATE SET event_id=excluded.event_id,name=excluded.name,fair_day=excluded.fair_day,is_multi_day=excluded.is_multi_day,website=excluded.website,careers_url=excluded.careers_url,description=excluded.description,positions=excluded.positions,degree_levels=excluded.degree_levels,academic_years=excluded.academic_years,majors=excluded.majors,sponsorship=excluded.sponsorship,sponsorship_notes=excluded.sponsorship_notes,sponsorship_flag=excluded.sponsorship_flag,sponsorship_status=excluded.sponsorship_status,regions=excluded.regions,accepts_hardcopy=excluded.accepts_hardcopy''',
            (cid,EVENT_ID,safe(row['employer_name']),'',fd,1 if to_bool(row['is_multi_day_company']) else 0,
             norm_url(row['website']),norm_url(row['company_careers_website']),safe(row['description']),
             json.dumps(split_list(row['positions_recruited'])),json.dumps(split_list(row['degree_levels_recruited'])),
             json.dumps(split_list(row['academic_years_recruited'])),json.dumps(split_list(row['degrees_majors_recruited'])),
             json.dumps(split_sp(row['work_authorization_sponsorship'])),safe(row['work_authorization_notes']),
             flag,status,json.dumps(split_list(row['regions_recruited'])),1 if to_bool(row['accept_hardcopy_resumes']) else 0))
        cc += 1
        for role in make_roles(row):
            c.execute('INSERT INTO roles (role_id,event_id,company_id,title,category,location,work_mode,sponsorship,description,tags,role_source_url,role_last_checked) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                ('role_'+str(uuid4())[:8],EVENT_ID,cid,role['title'],role['category'],role['location'],'',
                 role['sponsorship'],role['description'],json.dumps(role['tags']),
                 norm_url(row.get('role_source_url','')),safe(row.get('role_last_checked',''))))
            rc += 1

conn.commit(); conn.close()
print(f'Done: {cc} companies, {rc} roles imported')
PYEOF
```

Expected output: `Done: 223 companies, 432 roles imported`

> **Note:** `jac run import_career_fair.jac` may fail with a SQLite disk I/O error due to a conflict with the Jac runtime's internal store. Use the Python script above instead.

### 7. Start the backend

```bash
cd AI4Careers
set -a && source .env && set +a
.venv/bin/jac start main.jac --port 8000
```

The `set -a / set +a` block exports `.env` into the process without polluting your global shell. Backend runs at `http://localhost:8000`.

### 8. Start the frontend

In a separate terminal:

```bash
cd AI4Careers/frontend
npm install    # first time only
npm start
```

Frontend runs at `http://localhost:3000` and opens in your browser automatically.

---

## Project Structure

```
AI4Careers/
├── main.jac                    # Entry point — imports all walkers
├── auth.jac                    # Signup, Login, Me, UpdatePreferences
├── resume.jac                  # ResumeUpload, GetResume, ListResumes, DeleteResume
├── career_fair.jac             # ListEvents, ListCompanies, GetCompany, ListRoles,
│                               # SaveCompany, UnsaveCompany, ListSavedCompanies,
│                               # SavePitch, RankCompanies
├── ai_chat.jac                 # ChatWithAI, GenerateElevatorPitch
├── matching.jac                # Fit scoring algorithm (no API calls)
├── parsing.jac                 # Resume parsing via LLM
├── visual_match.jac            # Company logo identification (OpenAI or Anthropic vision)
├── db.jac                      # All SQLite operations and schema
├── security.jac                # Password hashing, token generation/validation
├── import_career_fair.jac      # One-time CSV → DB importer (Jac version)
├── jac.toml                    # Your local LLM config (gitignored)
├── jac.toml.example            # Shared template — copy to jac.toml
├── .env                        # API keys (gitignored)
├── data/
│   └── umich_fall_2025_company.csv   # Source data: 223 companies, 25 columns
└── frontend/
    ├── public/
    │   └── pdf.worker.min.mjs        # pdfjs web worker (must match pdfjs-dist version)
    └── src/
        ├── pages/
        │   ├── Landing.js            # Public landing page
        │   ├── Login.js              # Login
        │   ├── Signup.js             # Sign up
        │   ├── Dashboard.js          # Main hub with setup progress checklist
        │   ├── Profile.js            # Resume management + preferences editor
        │   ├── ResumeUpload.js       # PDF upload
        │   ├── Companies.js          # Company browser with fit scores and filters
        │   └── ChatWithAI.js         # AI chat interface with quick-action buttons
        ├── context/
        │   └── AuthContext.js        # Global auth state (token, user)
        ├── components/
        │   └── PrivateRoute.js       # Route guard for authenticated pages
        └── services/
            └── api.js                # All API call wrappers (axios)
```

---

## Database Schema

SQLite at `.jac/data/ai4careers.db`, auto-initialized when the backend starts.

| Table | Key columns |
|-------|-------------|
| `users` | `user_id`, `email` (unique), `password_hash`, `name`, `needs_sponsorship`, `work_authorization[]`, `preferred_locations[]`, `work_modes[]`, `role_types[]` |
| `resumes` | `resume_id`, `user_id`, `filename`, `raw_text`, `pdf_data` (base64), `skills[]`, `experience_bullets[]`, `projects[]`, `education{}` |
| `events` | `event_id`, `name`, `term`, `start_date`, `end_date` |
| `companies` | `company_id`, `event_id`, `name`, `fair_day`, `is_multi_day`, `positions[]`, `majors[]`, `sponsorship[]`, `sponsorship_flag`, `sponsorship_status`, `regions[]`, `website`, `careers_url`, `accepts_hardcopy` |
| `roles` | `role_id`, `event_id`, `company_id`, `title`, `category`, `location`, `sponsorship`, `tags[]`, `role_source_url`, `role_last_checked` |
| `saved_companies` | `user_id`, `company_id`, `event_id`, `pitch`, `saved_at` — unique on (user, company, event) |
| `fit_scores` | `user_id`, `role_id`, `score`, `matched_skills[]`, `explanation` |
| `artifacts` | `artifact_id`, `user_id`, `type`, `content`, `model`, `prompt_version`, `created_at` |

---

## API Endpoints

All endpoints are `POST /walker/<WalkerName>` at `http://localhost:8000`.

### Auth
| Walker | Required fields | Returns |
|--------|----------------|---------|
| `Signup` | `email`, `password`, `name` | `{ user_id }` |
| `Login` | `email`, `password` | `{ token }` |
| `Me` | `token` | user profile + `resume_count` + preferences |
| `UpdatePreferences` | `token`, `needs_sponsorship`, `work_authorization[]`, `preferred_locations[]`, `work_modes[]`, `role_types[]` | `{ ok: true }` |

### Resume
| Walker | Required fields | Returns |
|--------|----------------|---------|
| `ResumeUpload` | `token`, `filename`, `raw_text`, `pdf_data` (base64) | `{ resume_id, extraction_summary }` |
| `GetResume` | `token`, `resume_id` | full resume object incl. `pdf_data` |
| `ListResumes` | `token` | `[ { resume_id, filename, uploaded_at, skills_count } ]` |
| `DeleteResume` | `token`, `resume_id` | `{ ok: true }` |

### Career Fair
| Walker | Required | Optional | Returns |
|--------|----------|----------|---------|
| `ListEvents` | — | — | list of events |
| `ListCompanies` | `event_id` | `token`, `fair_day`, `position_type`, `sponsors`, `region`, `major_search`, `search` | list of companies with all fields |
| `GetCompany` | `event_id`, `company_id` | — | full company object |
| `ListRoles` | `event_id` | `token`, `company_id`, `location`, `work_mode`, `sponsors`, `search` | list of roles |
| `RankCompanies` | `token` | `event_id` | all companies sorted by resume fit score |
| `SaveCompany` | `token`, `company_id`, `event_id` | — | `{ ok: true }` |
| `UnsaveCompany` | `token`, `company_id`, `event_id` | — | `{ ok: true }` |
| `ListSavedCompanies` | `token`, `event_id` | — | saved companies with pitches |
| `SavePitch` | `token`, `company_id`, `event_id`, `pitch` | — | `{ ok: true }` |

### AI Chat
| Walker | Required | Optional | Returns |
|--------|----------|----------|---------|
| `ChatWithAI` | `token`, `question`, `history[]` | `event_id`, `image_data` (base64), `image_mime_type` | `{ answer }` |
| `GenerateElevatorPitch` | `token`, `company_id`, `event_id` | — | `{ pitch }` |

---

## Fit Scoring Algorithm

Implemented in `matching.jac` — zero API calls, runs entirely locally.

```
score (0–10) =  0.40 × skill_overlap
              + 0.20 × domain_alignment
              + 0.15 × role_type_match
              + 0.15 × sponsorship_fit
              + 0.05 × degree_level_fit
              + 0.05 × location_fit
```

- **Skill overlap**: weighted match of resume skills/keywords vs. company description and role tags
- **Domain alignment**: inferred domains (software, data, ML, robotics, embedded, mechanical, civil, finance) matched between resume and company
- **Role type**: internship / co-op / full-time preference (from profile) vs. company's offered positions
- **Sponsorship fit**: user's `needs_sponsorship` flag vs. company's `sponsorship_flag` (Yes / No / Maybe)
- **Degree level**: inferred from resume education vs. company's `degree_levels`
- **Location**: user's `preferred_locations` (states) mapped to regions vs. company's `regions`

---

## Troubleshooting

**Backend won't start**
```bash
.venv/bin/jac --version          # must be 0.12.2
lsof -ti:8000 | xargs kill -9    # free the port if in use
ls jac.toml                      # must exist; if not: cp jac.toml.example jac.toml
```

**AI chat returns a random string (e.g. "OhbVrpoiVgRV")**
```bash
.venv/bin/pip install "byllm==0.5.7"
```

**AI chat or visual match returns AuthenticationError**
```bash
cat .env    # verify key is present and correct, then restart the backend
```

**No companies showing in the app**
```bash
pkill -f 'jac start'
# Re-run the import script from step 6
sqlite3 .jac/data/ai4careers.db "SELECT COUNT(*) FROM companies;"  # should be 223
```

**Login not working / token rejected**
```bash
sqlite3 .jac/data/ai4careers.db "SELECT email, user_id FROM users;"
# If empty: sign up first. If exists: clear browser localStorage and retry.
```

**Resume upload fails**
- Ensure `frontend/public/pdf.worker.min.mjs` matches `pdfjs-dist` version `5.5.207`
- Check the browser console for the specific error

**`jac run import_career_fair.jac` fails with disk I/O error**
- Known issue: Jac runtime's internal SQLite store conflicts with the app database
- Use the Python import script from step 6 instead

---

## Security Notes (MVP / Demo)

| Area | Current | Production recommendation |
|------|---------|--------------------------|
| Passwords | Simple prefix hash (`hash:password`) | bcrypt / argon2 |
| Tokens | Plaintext (`token:user_id`) | JWT with expiry + refresh |
| API keys | `.env` file | secrets manager / CI env injection |
| CORS | Not configured | restrict to frontend origin |

---

## License

MIT
